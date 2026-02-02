
// js/multiplayer/remote_player_visuals.js
(function() {
    const RemotePlayerVisuals = {
        _laserDotTexture: null,
        _glareTexture: null,
        _tempScale: null,
        _tempQuat: null,
        raycaster: null,
        _initialized: false,
        
        _ensureInit() {
            if (this._initialized) return;
            if (!window.THREE) return;
            
            this._tempScale = new THREE.Vector3();
            this._tempQuat = new THREE.Quaternion();
            this.raycaster = new THREE.Raycaster();
            this._initTextures();
            this._initialized = true;
            
            if (window.TacticalShooter.NametagSystem) {
                window.TacticalShooter.NametagSystem.init();
            }
        },

        _initTextures() {
            if (!this._laserDotTexture) {
                const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
                const ctx = canvas.getContext('2d');
                const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
                grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); grad.addColorStop(0.3, 'rgba(0, 255, 0, 1)'); grad.addColorStop(1, 'rgba(0, 255, 0, 0)');
                ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);
                this._laserDotTexture = new THREE.CanvasTexture(canvas);
            }
            if (!this._glareTexture) {
                const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
                const ctx = canvas.getContext('2d');
                const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
                grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); grad.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)'); grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)'); grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
                ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
                this._glareTexture = new THREE.CanvasTexture(canvas);
            }
        },
        
        // --- NEW UPDATE FRAME METHOD ---
        // Consolidates visual updates that were polluting RemotePlayerManager
        updateFrame(rp, dt, frameCount, context) {
            if (!rp.mesh || !rp.mesh.visible) {
                 if (rp.tagGroup) rp.tagGroup.visible = false;
                 return;
            }

            const { 
                camera, 
                frustum, 
                cullingEnabled, 
                collidables, 
                hitboxes,
                showNametags, 
                isLobby, 
                isNightMap, 
                localTeamId,
                isFFA 
            } = context;

            // 1. Culling
            if (cullingEnabled && frustum) {
                if (!frustum.intersectsObject(rp.collisionBox || rp.mesh)) {
                    rp.mesh.visible = false; // Hide if culled
                    if (rp.tagGroup) rp.tagGroup.visible = false;
                    return; // Skip rest
                }
            }

            // 2. Attachments (Raycasts throttled)
            const isAttachmentOn = rp.player.getState('isAttachmentOn') !== false;
            const shouldCheckRaycasts = ((frameCount + rp.lodOffset) % 10 === 0);
            
            // Filter self out of collision checks for lasers
            const others = hitboxes.filter(h => h !== rp.mesh);
            const finalCollidables = collidables.concat(others);
            
            this.updateAttachmentEffects(rp, isAttachmentOn, camera, finalCollidables, shouldCheckRaycasts);
            
            // 3. UI / Nametags
            if (rp.tagGroup && !isLobby) {
                const isEnemy = isFFA || (rp.teamId !== localTeamId);
                const health = rp.player.getState('health') !== undefined ? rp.player.getState('health') : 100;
                const state = { 
                    isCrouching: rp.player.getState('isCrouching'), 
                    isProne: rp.player.getState('isProne') 
                };
                this.updateUI(rp, camera, dt, showNametags, isNightMap, state, isEnemy, health, rp.isSuppressed);
            } else if (rp.tagGroup) {
                rp.tagGroup.visible = false;
            }
        },

        createVisuals(playerId, name, assignment) {
            this._ensureInit();
            const scene = window.TacticalShooter.GameManager ? window.TacticalShooter.GameManager.scene : null;
            if (!scene) {
                console.warn("RemotePlayerVisuals: Scene not ready.");
                return null;
            }

            let mesh, parts;
            if (window.TacticalShooter.PlayerModelBuilder) {
                const buildResult = window.TacticalShooter.PlayerModelBuilder.build();
                mesh = buildResult.mesh;
                parts = buildResult.parts;
                
                if (parts.leftLeg) parts.leftLeg.rotation.order = 'YXZ';
                if (parts.rightLeg) parts.rightLeg.rotation.order = 'YXZ';
                if (parts.leftArm) parts.leftArm.rotation.order = 'XYZ';
                if (parts.rightArm) parts.rightArm.rotation.order = 'XYZ';
                
                mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.collidable = true;
                        child.userData.type = 'player';
                        child.userData.playerId = playerId; 
                        child.userData.bulletTransparent = false; 
                    }
                });
            } else {
                const geo = new THREE.CapsuleGeometry(0.4, 1.85, 4, 8);
                const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.name = "Torso"; 
                mesh.userData.collidable = true;
                mesh.userData.type = 'player';
                mesh.userData.playerId = playerId;
                mesh.userData.bulletTransparent = false;
                parts = {};
            }

            const colGeo = new THREE.BoxGeometry(0.6, 1.85, 0.6);
            const colMat = new THREE.MeshBasicMaterial({ visible: false });
            const collisionBox = new THREE.Mesh(colGeo, colMat);
            collisionBox.position.y = 0.925; 
            collisionBox.userData.collidable = true; 
            collisionBox.userData.type = 'player';
            collisionBox.userData.playerId = playerId;
            collisionBox.userData.bulletTransparent = true; 
            
            mesh.add(collisionBox);

            let tags = null;
            if (window.TacticalShooter.NametagSystem) {
                tags = window.TacticalShooter.NametagSystem.createTag(name, assignment.teamColor, assignment.symbol);
                if (tags && tags.group) {
                    mesh.add(tags.group);
                }
            }
            
            scene.add(mesh);

            return {
                mesh, parts, collisionBox,
                tagGroup: tags ? tags.group : null,
                nameSprite: tags ? tags.nameSprite : null,
                markerSprite: tags ? tags.markerSprite : null,
                hpBgSprite: tags ? tags.hpBgSprite : null,
                hpDamageSprite: tags ? tags.hpDamageSprite : null,
                hpFillSprite: tags ? tags.hpFillSprite : null,
                hpWidthBase: tags ? tags.hpWidthBase : 1.0,
                hpHeightBase: tags ? tags.hpHeightBase : 0.1
            };
        },

        updateVisualIdentity(rp, name, assignment) {
            if (window.TacticalShooter.NametagSystem) {
                window.TacticalShooter.NametagSystem.updateIdentity(rp, name, assignment.teamColor, assignment.symbol);
            }
        },

        updateUI(rp, camera, dt, showNametags, isNightMap, state, isEnemy, health, isSuppressed) {
            if (window.TacticalShooter.NametagSystem && rp.tagGroup) {
                // FIXED: Use rp.maxHealth instead of defaulting to 100
                if (rp.maxHealth === undefined) rp.maxHealth = 100;
                window.TacticalShooter.NametagSystem.updateTag(rp, camera, dt, showNametags, isNightMap, state, isEnemy, health, isSuppressed);
            }
        },
        
        // REFACTORED: Now accepts externalCollidables explicitly to break circular dependency
        updateAttachmentEffects(rp, isAttachmentOn, camera, externalCollidables, shouldCheckRaycasts = true) {
            this._ensureInit();
            rp.attachmentLights.forEach(l => l.visible = isAttachmentOn);
            rp.attachmentLasers.forEach(l => { l.beam.visible = isAttachmentOn; if (!isAttachmentOn) l.dot.visible = false; });
            
            if (isAttachmentOn) {
                 rp.attachmentLensMeshes.forEach(m => { m.material.color.setHex(0xeeffff); m.material.emissiveIntensity = 1.0; });
                 rp.attachmentEmitterMeshes.forEach(m => { m.material.color.setHex(0x00ff00); m.material.emissiveIntensity = 1.0; });
            } else {
                 rp.attachmentLensMeshes.forEach(m => { m.material.color.setHex(0x111111); m.material.emissiveIntensity = 0; });
                 rp.attachmentEmitterMeshes.forEach(m => { m.material.color.setHex(0x001100); m.material.emissiveIntensity = 0; });
                 rp.attachmentGlares.forEach(g => { g.sprite.visible = false; });
                 return;
            }

            if (!camera) return;
            const camPos = camera.position;
            
            if (shouldCheckRaycasts) {
                if (this.raycaster) this.raycaster.camera = camera;

                rp.attachmentGlares.forEach(g => {
                    if (!g.parent || !g.sprite) return;
                    const worldPos = new THREE.Vector3(); g.parent.getWorldPosition(worldPos); g.parent.getWorldQuaternion(this._tempQuat);
                    const beamDir = new THREE.Vector3(0,0,1).applyQuaternion(this._tempQuat).normalize();
                    const toCam = camPos.clone().sub(worldPos); const dist = toCam.length(); toCam.normalize();
                    const align = beamDir.dot(toCam);
                    let isOccluded = false;
                    
                    if (this.raycaster && dist > 0.5) {
                        this.raycaster.set(worldPos, toCam); this.raycaster.far = dist - 0.2; 
                        let hits = this.raycaster.intersectObjects(externalCollidables, true);
                        hits = hits.filter(h => !h.object.isSprite);
                        if (hits.length > 0) isOccluded = true;
                    }
                    
                    g._lastVisible = (!isOccluded && align > 0.996);
                    g._lastScaleBase = (g.type === 'light') ? 0.4 : 0.15;
                    g._lastAlign = align;
                    g._lastDist = dist;
                });

                if (rp.attachmentLasers.length > 0 && this.raycaster) {
                    rp.attachmentLasers.forEach(laserData => {
                        const emitter = laserData.parent;
                        const origin = new THREE.Vector3(); const direction = new THREE.Vector3(0, 0, 1);
                        emitter.getWorldPosition(origin); emitter.getWorldQuaternion(this._tempQuat); direction.applyQuaternion(this._tempQuat);
                        const backtrackDist = 0.5; const safeOrigin = origin.clone().sub(direction.clone().multiplyScalar(backtrackDist));
                        this.raycaster.set(safeOrigin, direction); this.raycaster.far = 200 + backtrackDist;
                        
                        let hits = this.raycaster.intersectObjects(externalCollidables, true);
                        hits = hits.filter(h => !h.object.isSprite && (!h.object.userData.bulletTransparent || h.object.userData.collidable === true));
                        
                        const validHit = hits.length > 0 ? hits[0] : null;
                        
                        if (validHit) {
                            laserData._lastDist = validHit.distance - backtrackDist;
                            if (laserData._lastDist < 0) laserData._lastDist = 0;
                            laserData._dotVisible = true;
                        } else {
                            laserData._dotVisible = false;
                            laserData._lastDist = 200;
                        }
                    });
                }
            }
            
            rp.attachmentGlares.forEach(g => {
                if (g._lastVisible) {
                    g.sprite.visible = true;
                    const f = (g._lastAlign - 0.996) / 0.004; 
                    let dynamicScale = g._lastScaleBase * (1.0 + (f * f * 2.0)); 
                    if (g._lastDist > 50) dynamicScale *= Math.max(0, 1.0 - (g._lastDist-50)/50);
                    g.sprite.scale.set(dynamicScale, dynamicScale, 1);
                    g.sprite.material.opacity = f;
                } else {
                    g.sprite.visible = false;
                }
            });
            
            rp.attachmentLasers.forEach(l => {
                const dist = l._lastDist || 200;
                l.dot.visible = l._dotVisible || false;
                if (!this._tempScale) this._tempScale = new THREE.Vector3(); 
                l.parent.getWorldScale(this._tempScale);
                const worldScaleZ = this._tempScale.z; 
                let localDist = dist; 
                if (worldScaleZ > 0.001) localDist = dist / worldScaleZ;
                if (l.dot.visible) l.dot.position.set(0, 0, localDist - 0.05);
                l.beam.scale.set(1, 1, localDist);
                let opacity = 0.25; if (dist > 150) opacity *= Math.max(0, 1.0 - ((dist - 150) / 50.0)); l.mat.opacity = opacity;
            });
        },

        equipWeapon(rp, weaponId, attachments = []) {
            this._ensureInit();
            if (!rp.parts || !rp.parts.rightArm || !rp.parts.rightArm.userData.elbow) return;
            const attHash = JSON.stringify(attachments);
            if (rp.currentWeaponId === weaponId && rp.currentAttachmentsHash === attHash) return;
            this.cleanupWeapon(rp);
            
            let baseDef = window.TacticalShooter.GameData.Weapons[weaponId];
            if (!baseDef) baseDef = window.TacticalShooter.GameData.Throwables[weaponId];
            if (!baseDef) return;
            
            let def = baseDef;
            if (window.TacticalShooter.StatSystem && window.TacticalShooter.GameData.Weapons[weaponId]) {
                def = window.TacticalShooter.StatSystem.calculateWeaponStats(weaponId, attachments, window.TacticalShooter.GameData);
            } else {
                def = { ...baseDef, attachments: attachments };
            }
            
            rp.weaponDef = def;
            rp.currentWeaponId = weaponId;
            rp.currentAttachmentsHash = attHash;
            
            if (def.visuals && def.visuals.muzzleFlashScale <= 0.05) {
                rp.isSuppressed = true;
            } else {
                rp.isSuppressed = false;
            }
            
            if (baseDef.buildMesh) {
                const built = baseDef.buildMesh.call(def); 
                rp.weaponMesh = built.mesh;
                rp.weaponParts = built.parts;
                rp.weaponMesh.traverse((child) => { child.userData.bulletTransparent = true; });
                rp.parts.rightArm.userData.elbow.add(rp.weaponMesh);
                if (rp.weaponParts.muzzle) {
                    this.createMuzzleFlash(rp, def);
                }
                this.setupAttachments(rp);
            }
        },

        cleanupWeapon(rp) {
            if (rp.weaponMesh) {
                if(rp.weaponMesh.parent) rp.weaponMesh.parent.remove(rp.weaponMesh);
                rp.weaponMesh = null;
                rp.weaponParts = null;
                rp.muzzleFlashGroup = null;
                rp.muzzleFlashGroupLeft = null;
                rp.attachmentLights = [];
                rp.attachmentLasers = [];
                rp.attachmentLensMeshes = [];
                rp.attachmentEmitterMeshes = [];
                rp.attachmentGlares = [];
            }
        },

        createMuzzleFlash(rp, baseDef) {
            const createFlash = (parent) => {
                const group = new THREE.Group();
                group.visible = false;
                parent.add(group);
                
                if (rp.isSuppressed) return group;
                
                const flashConfig = (baseDef.visuals && baseDef.visuals.muzzleFlash) ? baseDef.visuals.muzzleFlash : {};
                const legacyConfig = (baseDef.effects && baseDef.effects.muzzle) ? baseDef.effects.muzzle : {};
                const flashColor = flashConfig.color || legacyConfig.color || 0xffaa00;
                
                const fMat = new THREE.MeshBasicMaterial({ 
                    color: flashColor, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending 
                });
                const fGeo = new THREE.PlaneGeometry(0.3, 0.3);
                const p1 = new THREE.Mesh(fGeo, fMat);
                const p2 = new THREE.Mesh(fGeo, fMat); 
                p2.rotation.z = Math.PI/2;
                p1.userData.bulletTransparent = true; p2.userData.bulletTransparent = true; 
                let sX = 1, sY = 1, sZ = 1;
                if (flashConfig.tpvScale) { sX = flashConfig.tpvScale.x || 1; sY = flashConfig.tpvScale.y || 1; sZ = flashConfig.tpvScale.z || 1; } 
                else if (flashConfig.scale) { sX = sY = sZ = (typeof flashConfig.scale === 'object' ? 1 : flashConfig.scale); }
                p1.scale.set(sX, sY, 1); p2.scale.set(sX, sY, 1);
                group.add(p1); group.add(p2);
                if (parent === rp.weaponParts.muzzle) {
                     rp.muzzleFlashLight = new THREE.PointLight(flashColor, 0, 8);
                     group.add(rp.muzzleFlashLight);
                }
                return group;
            };
            rp.muzzleFlashGroup = createFlash(rp.weaponParts.muzzle);
            if (rp.weaponParts.muzzleLeft) rp.muzzleFlashGroupLeft = createFlash(rp.weaponParts.muzzleLeft);
        },

        setupAttachments(rp) {
            if (!rp.weaponMesh) return;
            rp.attachmentLights = []; rp.attachmentLasers = []; rp.attachmentLensMeshes = []; rp.attachmentEmitterMeshes = []; rp.attachmentGlares = [];
            
            rp.weaponMesh.traverse(c => {
                if (c.name === "ATTACHMENT_FLASHLIGHT_LENS" && c.parent) {
                    const spot = new THREE.SpotLight(0xffffee, 25.0, 150, Math.PI / 6, 0.2, 2.0);
                    c.parent.add(spot); spot.position.copy(c.position); spot.target.position.set(0, 0, -50.0); c.parent.add(spot.target); spot.visible = false; spot.castShadow = false; 
                    rp.attachmentLights.push(spot);
                    
                    const mat = new THREE.SpriteMaterial({ map: this._glareTexture, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true });
                    const glare = new THREE.Sprite(mat);
                    glare.scale.set(0.2, 0.2, 1); glare.visible = false; glare.userData.bulletTransparent = true; 
                    c.add(glare); glare.position.z = -0.05; 
                    rp.attachmentGlares.push({ sprite: glare, parent: c, type: 'light' });

                    if (c.material) { c.material = c.material.clone(); rp.attachmentLensMeshes.push(c); }
                }
                if (c.name === "ATTACHMENT_LASER_EMITTER") {
                    const beamGeo = new THREE.CylinderGeometry(0.0005, 0.0005, 1, 4); beamGeo.rotateX(Math.PI / 2); beamGeo.translate(0, 0, 0.5); 
                    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
                    const beam = new THREE.Mesh(beamGeo, beamMat); beam.userData.bulletTransparent = true; c.add(beam);
                    
                    const dotMat = new THREE.SpriteMaterial({ map: this._laserDotTexture, color: 0x88ff88, blending: THREE.AdditiveBlending, depthTest: true });
                    const dot = new THREE.Sprite(dotMat); dot.scale.set(0.05, 0.05, 1); dot.userData.bulletTransparent = true; c.add(dot);
                    
                    beam.visible = false; dot.visible = false;
                    rp.attachmentLasers.push({ beam, dot, parent: c, mat: beamMat });
                    
                    const mat = new THREE.SpriteMaterial({ map: this._glareTexture, color: 0x00ff00, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true });
                    const glare = new THREE.Sprite(mat); glare.scale.set(0.02, 0.02, 1); glare.visible = false; glare.userData.bulletTransparent = true; c.add(glare); glare.position.z = -0.02;
                    rp.attachmentGlares.push({ sprite: glare, parent: c, type: 'laser' });
                    
                    if (c.material) { c.material = c.material.clone(); rp.attachmentEmitterMeshes.push(c); }
                }
            });
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.RemotePlayerVisuals = RemotePlayerVisuals;
})();
