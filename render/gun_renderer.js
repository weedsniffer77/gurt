
// js/render/gun_renderer.js
(function() {
    const GunRenderer = {
        camera: null,
        scene: null, 
        useFullBody: false,
        weaponContainer: null, 
        recoilContainer: null, 
        gunMeshGroup: null,    
        fullBodyMesh: null,
        fullBodyParts: null,
        fullBodyAnimator: null,
        
        slideMesh: null, triggerMesh: null, muzzlePoint: null, ejectionPoint: null, magGroup: null,
        handLeft: null, handRight: null,
        slideMeshLeft: null, triggerMeshLeft: null, muzzlePointLeft: null, ejectionPointLeft: null, magGroupLeft: null,
        danglerMesh: null, 
        
        // --- DELEGATED SYSTEMS ---
        barrelRaycaster: null,
        isBarrelBlocked: false,
        obstructionCheckFrame: 0,
        
        currentWeaponDef: null,
        visualConfig: null, 
        
        init(camera) {
            if (!window.THREE) return;
            this.camera = camera;
            this.scene = window.TacticalShooter.GameManager ? window.TacticalShooter.GameManager.scene : null;
            this.barrelRaycaster = new THREE.Raycaster();
            
            const existing = this.camera.children.find(c => c.name === 'FPS_GUN_CONTAINER');
            if (existing) this.camera.remove(existing);

            this.weaponContainer = new THREE.Group();
            this.weaponContainer.name = 'FPS_GUN_CONTAINER'; 
            this.camera.add(this.weaponContainer);
            this.recoilContainer = new THREE.Group();
            this.weaponContainer.add(this.recoilContainer);
            
            if(window.TacticalShooter.GunAnimator) window.TacticalShooter.GunAnimator.init();
            
            // Init Sub-Systems
            if (window.TacticalShooter.GunAttachmentSystem) window.TacticalShooter.GunAttachmentSystem.init();
            if (window.TacticalShooter.GunFXSystem) window.TacticalShooter.GunFXSystem.init();
        },
        
        // Compatibility Proxy
        set muzzleFlashEnabled(val) {
            if(window.TacticalShooter.GunFXSystem) window.TacticalShooter.GunFXSystem.enabled = val;
        },
        get muzzleFlashEnabled() {
            return window.TacticalShooter.GunFXSystem ? window.TacticalShooter.GunFXSystem.enabled : true;
        },
        
        warmup() {},

        setVisible(visible) {
            if (this.useFullBody) { if (this.fullBodyMesh) this.fullBodyMesh.visible = visible; } 
            else { if (this.weaponContainer) this.weaponContainer.visible = visible; }
        },
        
        setUseFullBody(enabled) {
            if (this.useFullBody === enabled) return;
            this.useFullBody = enabled;
            if (this.weaponContainer) this.weaponContainer.visible = false;
            if (this.fullBodyMesh) this.fullBodyMesh.visible = false;
            if (this.currentWeaponDef) this.loadWeapon(this.currentWeaponDef);
        },

        loadWeapon(weaponDef) {
            this.currentWeaponDef = weaponDef;
            this.visualConfig = weaponDef.visuals;
            this.resetRefs();
            
            const gm = window.TacticalShooter.GameManager;
            const inGame = gm && gm.currentState === 'IN_GAME';
            
            if (this.weaponContainer) this.weaponContainer.visible = inGame;

            if (this.useFullBody) this.setupFullBody(weaponDef);
            else this.setupFPSHands(weaponDef);
            
            // --- SETUP SUBSYSTEMS ---
            const FX = window.TacticalShooter.GunFXSystem;
            const ATT = window.TacticalShooter.GunAttachmentSystem;
            
            if (FX) {
                FX.setup(weaponDef, {
                    muzzle: this.muzzlePoint,
                    muzzleLeft: this.muzzlePointLeft,
                    ejection: this.ejectionPoint,
                    ejectionLeft: this.ejectionPointLeft
                }, {
                    fullBodyMesh: this.fullBodyMesh,
                    weaponContainer: this.weaponContainer
                });
            }
            
            if (ATT && !this.useFullBody) {
                ATT.setup(this.gunMeshGroup);
            }
            
            if(window.TacticalShooter.GunAnimator) {
                const startPos = new THREE.Vector3(this.visualConfig.hipPosition.x, this.visualConfig.hipPosition.y, this.visualConfig.hipPosition.z);
                window.TacticalShooter.GunAnimator.init(startPos);
                if(window.TacticalShooter.GunAnimator.danglerState) {
                    window.TacticalShooter.GunAnimator.danglerState.angle = 0;
                    window.TacticalShooter.GunAnimator.danglerState.velocity = 0;
                }
            }
        },
        
        setupFPSHands(weaponDef) {
            if (!this.weaponContainer) return; 
            const gm = window.TacticalShooter.GameManager;
            const inGame = gm && gm.currentState === 'IN_GAME';
            this.weaponContainer.visible = inGame; 
            
            if (typeof weaponDef.buildMesh === 'function') {
                const built = weaponDef.buildMesh.call(weaponDef);
                this.gunMeshGroup = built.mesh;
                
                this.slideMesh = built.parts.slide; this.triggerMesh = built.parts.trigger; this.muzzlePoint = built.parts.muzzle;
                this.ejectionPoint = built.parts.ejection; this.danglerMesh = built.parts.dangler; this.magGroup = built.parts.magazine;
                this.handLeft = built.parts.handLeft; this.handRight = built.parts.handRight;
                this.slideMeshLeft = built.parts.slideLeft; this.triggerMeshLeft = built.parts.triggerLeft;
                this.muzzlePointLeft = built.parts.muzzleLeft; this.ejectionPointLeft = built.parts.ejectionLeft; this.magGroupLeft = built.parts.magazineLeft;
                
                this.recoilContainer.add(this.gunMeshGroup);
            }
        },
        
        setupFullBody(weaponDef) {
            if (!window.TacticalShooter.PlayerModelBuilder) return;
            const buildResult = window.TacticalShooter.PlayerModelBuilder.build('#222222'); 
            this.fullBodyMesh = buildResult.mesh; this.fullBodyParts = buildResult.parts;
            if (this.fullBodyParts.head) this.fullBodyParts.head.visible = false;
            this.fullBodyMesh.traverse((child) => { child.userData.bulletTransparent = true; });
            
            const p = this.fullBodyParts;
            if (p.leftLeg) p.leftLeg.rotation.order = 'YXZ'; if (p.rightLeg) p.rightLeg.rotation.order = 'YXZ';
            if (p.leftArm) p.leftArm.rotation.order = 'XYZ'; if (p.rightArm) p.rightArm.rotation.order = 'XYZ';
            
            let weaponMesh, weaponParts;
            if (typeof weaponDef.buildMesh === 'function') {
                const built = weaponDef.buildMesh.call(weaponDef);
                weaponMesh = built.mesh; weaponParts = built.parts;
                weaponMesh.traverse((c) => c.userData.bulletTransparent = true);
                p.rightArm.userData.elbow.add(weaponMesh);
                
                this.slideMesh = weaponParts.slide; this.triggerMesh = weaponParts.trigger; this.muzzlePoint = weaponParts.muzzle;
                this.ejectionPoint = weaponParts.ejection; this.danglerMesh = weaponParts.dangler; this.magGroup = weaponParts.magazine;
                this.handLeft = weaponParts.handLeft; this.handRight = weaponParts.handRight;
                this.slideMeshLeft = weaponParts.slideLeft; this.triggerMeshLeft = weaponParts.triggerLeft;
                this.muzzlePointLeft = weaponParts.muzzleLeft; this.ejectionPointLeft = weaponParts.ejectionLeft; this.magGroupLeft = weaponParts.magazineLeft;
            }
            if (window.TacticalShooter.RemotePlayerAnimator) {
                this.fullBodyAnimator = new window.TacticalShooter.RemotePlayerAnimator(this.fullBodyMesh, this.fullBodyParts, weaponParts, weaponMesh, weaponDef);
            }
            this.scene.add(this.fullBodyMesh);
            
            const gm = window.TacticalShooter.GameManager;
            const inGame = gm && gm.currentState === 'IN_GAME';
            this.fullBodyMesh.visible = inGame;
        },
        
        resetRefs() {
            if (this.recoilContainer) { while(this.recoilContainer.children.length > 0) this.recoilContainer.remove(this.recoilContainer.children[0]); }
            this.gunMeshGroup = null;
            if (this.fullBodyMesh) { this.scene.remove(this.fullBodyMesh); this.fullBodyMesh = null; this.fullBodyParts = null; this.fullBodyAnimator = null; }
            this.slideMesh = null; this.triggerMesh = null; this.muzzlePoint = null; this.ejectionPoint = null; this.danglerMesh = null;
            this.magGroup = null; this.slideMeshLeft = null; this.triggerMeshLeft = null; this.muzzlePointLeft = null; this.ejectionPointLeft = null; this.magGroupLeft = null;
            
            if (window.TacticalShooter.GunAttachmentSystem) window.TacticalShooter.GunAttachmentSystem.reset();
            if (window.TacticalShooter.GunFXSystem) window.TacticalShooter.GunFXSystem.reset();
        },
        
        triggerMeleeAnimation() { if(window.TacticalShooter.GunAnimator) window.TacticalShooter.GunAnimator.triggerMelee(); },
        applyRecoil() { if(window.TacticalShooter.GunAnimator) window.TacticalShooter.GunAnimator.applyRecoil(this.currentWeaponDef.recoilPitch, this.currentWeaponDef.recoilYaw); },
        
        update(dt, playerState, characterController, inputManager, isFiring) {
            if (!this.scene) this.scene = window.TacticalShooter.GameManager.scene;
            this.checkBarrelObstruction();
            
            // --- VISIBILITY OVERRIDE FOR DRONE ---
            if (playerState.isControllingDrone) {
                // HIDE EVERYTHING
                if (this.weaponContainer) this.weaponContainer.visible = false;
                if (this.fullBodyMesh) this.fullBodyMesh.visible = false;
                return; // SKIP UPDATE
            } else {
                 // Normal Visibility
                 if (!this.useFullBody) {
                     if(this.weaponContainer) this.weaponContainer.visible = !playerState.isSpectating;
                     if(this.fullBodyMesh) this.fullBodyMesh.visible = false; // Ensure body is hidden
                 }
                 else if (this.useFullBody && this.fullBodyMesh) {
                     this.fullBodyMesh.visible = !playerState.isSpectating;
                     if (this.weaponContainer) this.weaponContainer.visible = false; // Ensure arms hidden
                     // Hide head for FPV
                     if (this.fullBodyParts && this.fullBodyParts.head) {
                         this.fullBodyParts.head.visible = false;
                     }
                 }
            }

            // --- UPDATE SUBSYSTEMS ---
            const ATT = window.TacticalShooter.GunAttachmentSystem;
            const FX = window.TacticalShooter.GunFXSystem;
            
            if (FX) FX.update(dt, isFiring, this.muzzlePoint, this.muzzlePointLeft);
            if (ATT) ATT.update(playerState.isAttachmentOn);
            
            this.updateWeaponParts(dt, isFiring, playerState);
            
            if (window.TacticalShooter.GunAnimator) {
                const anim = window.TacticalShooter.GunAnimator.update(dt, playerState, characterController, inputManager, this.currentWeaponDef, isFiring, this.isBarrelBlocked);
                
                if (this.useFullBody) this.updateFullBody(dt, playerState, characterController, isFiring, anim);
                else this.applyToFPSHands(anim);
                
                if (this.danglerMesh) {
                    const ang = window.TacticalShooter.GunAnimator.danglerState ? window.TacticalShooter.GunAnimator.danglerState.angle : 0;
                    this.danglerMesh.rotation.x = ang;
                }
            }
        },
        
        updateWeaponParts(dt, isFiring, playerState) {
             // ... (Logic same as before) ...
             if (this.currentWeaponDef && this.currentWeaponDef.animationLogic && this.currentWeaponDef.animationLogic.updateParts) {
                const dropCallback = (isLeft = false) => {
                    const mag = isLeft ? this.magGroupLeft : this.magGroup;
                    if (mag && window.TacticalShooter.ParticleManager) {
                        const wasVisible = mag.visible; mag.visible = true; mag.updateMatrixWorld(true);
                        const worldPos = new THREE.Vector3(); const worldRot = new THREE.Quaternion();
                        mag.getWorldPosition(worldPos); mag.getWorldQuaternion(worldRot);
                        mag.visible = wasVisible;
                        
                        const type = (this.currentWeaponDef.effects && this.currentWeaponDef.effects.magType) ? this.currentWeaponDef.effects.magType : 'pistol';
                        const isExtended = this.currentWeaponDef.attachments && this.currentWeaponDef.attachments.includes('pistol_mag_ext'); 
                        window.TacticalShooter.ParticleManager.createDroppingMag(worldPos, worldRot, type, isExtended);
                    }
                };
                
                this.currentWeaponDef.animationLogic.updateParts(dt, playerState, { 
                    slide: this.slideMesh, trigger: this.triggerMesh, magazine: this.magGroup, handLeft: this.handLeft, handRight: this.handRight,
                    slideLeft: this.slideMeshLeft, triggerLeft: this.triggerMeshLeft, magazineLeft: this.magGroupLeft,
                    rightRoot: this.gunMeshGroup ? this.gunMeshGroup.children.find(c => c.children.includes(this.slideMesh)) : null,
                    leftRoot: this.gunMeshGroup ? this.gunMeshGroup.children.find(c => c.children.includes(this.slideMeshLeft)) : null,
                    bolt: this.currentWeaponDef.parts ? this.currentWeaponDef.parts.bolt : null,
                    shell: this.currentWeaponDef.parts ? this.currentWeaponDef.parts.shell : null
                }, this.currentWeaponDef, (side) => this.ejectShell(side), dropCallback); 
            }
            if (this.triggerMesh) {
                const targetRot = isFiring ? 0.6 : 0; const triggerSpeed = isFiring ? 40.0 : 10.0; 
                this.triggerMesh.rotation.x = THREE.MathUtils.lerp(this.triggerMesh.rotation.x, -targetRot, dt * triggerSpeed);
            }
        },
        
        updateFullBody(dt, playerState, charController, isFiring, animData) {
            if (!this.fullBodyAnimator || !this.fullBodyMesh) return;
            const pc = window.TacticalShooter.PlayerCamera; 
            const velocity = charController.velocity;
            const horizontalSpeed = new THREE.Vector3(velocity.x, 0, velocity.z).length();
            const forward = new THREE.Vector3(0,0,-1).applyQuaternion(pc.camera.quaternion); forward.y = 0; forward.normalize();
            const right = new THREE.Vector3(1,0,0).applyQuaternion(pc.camera.quaternion);
            const fwdSpeed = velocity.dot(forward); const strafeSpeed = velocity.dot(right);
            const isMoving = horizontalSpeed > 0.1; const isSprinting = isMoving && horizontalSpeed > (charController.config.walkSpeed + 1.0);
            const isStrafing = Math.abs(strafeSpeed) > Math.abs(fwdSpeed) && !isSprinting;
            const isCrouching = charController.isCrouching;
            
            const derivedStats = { isMoving, isSprinting, isStrafing, isSliding: charController.isSliding, isCrouching: isCrouching, speed: horizontalSpeed, strafeSpeed, wallDistance: this.isBarrelBlocked ? 0.5 : 999 };
            
            this.fullBodyMesh.position.copy(charController.position); 
            
            // Standard yaw control
            this.fullBodyMesh.rotation.y = pc.yaw;
            
            const weaponPosLocal = animData.pos.clone();
            weaponPosLocal.x += animData.bobPos.x; weaponPosLocal.y += animData.bobPos.y;
            const weaponRotLocal = new THREE.Euler(animData.rot.x + animData.bobRot.x, animData.rot.y, animData.rot.z + animData.bobRot.z);
            const weaponQuatLocal = new THREE.Quaternion().setFromEuler(weaponRotLocal);
            const recoilPos = new THREE.Vector3(0, 0, animData.recoil.z); recoilPos.applyQuaternion(weaponQuatLocal); weaponPosLocal.add(recoilPos);
            const recoilRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(animData.recoil.x, 0, animData.recoil.y)); weaponQuatLocal.multiply(recoilRot);
            
            const worldGunPos = weaponPosLocal.clone().applyMatrix4(this.camera.matrixWorld);
            const worldGunRot = weaponQuatLocal.clone().premultiply(this.camera.quaternion);
            
            this.fullBodyAnimator.update(dt, { lean: charController.effectiveLean, isCrouching: isCrouching, isSliding: charController.isSliding, isProne: charController.isProne, isSprinting: isSprinting, isADS: playerState.isADS, currentAmmo: playerState.currentAmmo, lookPitch: pc.pitch, lookYaw: pc.yaw }, derivedStats, null, null, worldGunPos, worldGunRot);
        },
        
        applyToFPSHands(animData) {
            if (!this.weaponContainer) return;
            this.weaponContainer.position.copy(animData.pos);
            this.weaponContainer.position.x += animData.bobPos.x;
            this.weaponContainer.position.y += animData.bobPos.y;
            this.weaponContainer.rotation.x = animData.rot.x + animData.bobRot.x;
            this.weaponContainer.rotation.y = animData.rot.y;
            this.weaponContainer.rotation.z = animData.rot.z + animData.bobRot.z;
            this.recoilContainer.position.z = animData.recoil.z;
            this.recoilContainer.rotation.x = animData.recoil.x;
            this.recoilContainer.rotation.z = animData.recoil.y;
        },
        
        checkBarrelObstruction() {
            // ... (Same)
            if (!this.scene || !this.camera) return;
            if (this.currentWeaponDef && this.currentWeaponDef.type === 'melee') { this.isBarrelBlocked = false; return; }
            this.obstructionCheckFrame++; if (this.obstructionCheckFrame % 4 !== 0) return;
            const origin = this.camera.position.clone(); const camQuat = this.camera.quaternion; const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat); const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camQuat); const offsets = [ new THREE.Vector3(0, 0, 0), right.clone().multiplyScalar(0.1), right.clone().multiplyScalar(-0.1) ];
            let collidables = []; if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.staticCollider) { collidables = [window.TacticalShooter.GameManager.staticCollider]; } else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) { collidables = window.TacticalShooter.GameManager.currentMap.geometry; } else { return; }
            this.isBarrelBlocked = false; this.barrelRaycaster.far = 0.8; 
            for (const offset of offsets) { const rayOrigin = origin.clone().add(offset); this.barrelRaycaster.set(rayOrigin, forward); const hits = this.barrelRaycaster.intersectObjects(collidables, true); if (hits.length > 0) { this.isBarrelBlocked = true; break; } }
        },
        
        triggerMuzzleFlash(weaponConfig, doEject = true) { if(window.TacticalShooter.GunFXSystem) window.TacticalShooter.GunFXSystem.triggerMuzzleFlash(weaponConfig, doEject); },
        ejectShell(side) { if(window.TacticalShooter.GunFXSystem) window.TacticalShooter.GunFXSystem.ejectShell(side); },
        getMuzzleState() { if(window.TacticalShooter.GunFXSystem) return window.TacticalShooter.GunFXSystem.getMuzzleState(this.muzzlePoint, this.muzzlePointLeft); return { position: new THREE.Vector3(), direction: new THREE.Vector3(0,0,-1) }; }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GunRenderer = GunRenderer;
})();
