
// js/gameplay/drone_controller.js
(function() {
    const DroneController = {
        active: false,
        mesh: null,
        meshContainer: null, 
        body: null,
        
        // Physics Config
        config: {
            speed: 56.0,        
            strafeSpeed: 40.0,  
            drag: 0.8,          
            mass: 4.0, 
            tiltAngle: 0.55,      
            correctionSpeed: 8.0,
            realisticMode: false // Synced from settings
        },
        
        // State
        health: 75,
        maxHealth: 75,
        fuel: 30.0,
        maxFuel: 30.0,
        activationTime: 0,
        
        controlStartTime: 0, 
        zoomTimer: 0,
        launchPos: null,
        launchRot: null,
        originalYaw: 0,
        originalPitch: 0,
        ownerId: null,
        raycaster: null,
        fakeOperator: null,
        operatorAnimator: null,
        isSpectator: false,
        
        init() {
            console.log("DroneController: Initialized");
            this.raycaster = new THREE.Raycaster();
        },
        
        activateSpectator(startPos, startRotQuaternion) {
            // Activate in spectator mode
            this.activate(startPos, startRotQuaternion, "SELF", new THREE.Vector3(0,0,0), true);
            this.fuel = 9999;
            this.health = 9999; 
            this.maxHealth = 9999;
        },
        
        activate(startPos, startRotQuaternion, ownerId, initialVelocity, isSpectatorMode = false) {
            if (this.active) return;
            if (!this.raycaster) this.raycaster = new THREE.Raycaster();
            
            this.isSpectator = isSpectatorMode;
            
            // SYNC SETTINGS HERE (Applies to both modes)
            if (window.TacticalShooter.SettingsManager) {
                this.config.realisticMode = window.TacticalShooter.SettingsManager.settings.realisticDrone;
            }
            
            if (window.TacticalShooter.PlayerCamera) {
                this.originalYaw = window.TacticalShooter.PlayerCamera.yaw;
                this.originalPitch = window.TacticalShooter.PlayerCamera.pitch;
            } else {
                this.originalYaw = 0;
                this.originalPitch = 0;
            }
            
            const scene = window.TacticalShooter.GameManager.scene;
            const PE = window.TacticalShooter.PhysicsEngine;
            
            if (!window.TacticalShooter.DroneModel) return;
            
            this.mesh = window.TacticalShooter.DroneModel.buildMesh();
            this.mesh.rotation.y = Math.PI; 
            
            this.meshContainer = new THREE.Group();
            this.meshContainer.add(this.mesh);
            this.meshContainer.position.copy(startPos);
            this.meshContainer.quaternion.copy(startRotQuaternion);
            
            // HIDE DRONE MESH IF SPECTATOR (Invisible Camera)
            if (this.isSpectator) {
                this.meshContainer.visible = false;
            }
            
            this.mesh.userData = { 
                type: 'drone', 
                ownerId: ownerId, 
                controller: this,
                props: this.mesh.userData.props 
            };
            
            this.mesh.traverse(c => {
                if (c !== this.mesh) {
                    c.userData.type = 'drone';
                    c.userData.ownerId = ownerId;
                    c.userData.controller = this;
                    c.userData.bulletTransparent = false; 
                }
            });
            
            scene.add(this.meshContainer);
            
            if (PE && window.RAPIER) {
                const RAPIER = window.RAPIER;
                try {
                    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                        .setTranslation(startPos.x, startPos.y, startPos.z)
                        .setRotation(startRotQuaternion)
                        .setLinearDamping(this.config.drag) 
                        .setAngularDamping(2.0) 
                        .setCcdEnabled(true); 
                    
                    if (initialVelocity) bodyDesc.setLinvel(initialVelocity.x, initialVelocity.y, initialVelocity.z);
                    
                    this.body = PE.world.createRigidBody(bodyDesc);
                    const colDesc = RAPIER.ColliderDesc.cuboid(0.4, 0.15, 0.4).setMass(this.config.mass).setRestitution(0.3);
                    PE.world.createCollider(colDesc, this.body);
                } catch (e) { console.error("DroneController: Physics fail", e); }
            }
            
            this.active = true;
            this.health = this.maxHealth;
            this.fuel = this.maxFuel;
            this.ownerId = ownerId;
            this.activationTime = Date.now();
            this.controlStartTime = Date.now() + 700;
            this.zoomTimer = 0;
            this.launchPos = startPos.clone();
            this.launchRot = startRotQuaternion.clone();
            
            if (window.TacticalShooter.PlayerState) {
                // ALWAYS set flag so controls work
                window.TacticalShooter.PlayerState.isControllingDrone = true;
                
                // ONLY spawn fake operator if NOT spectating (i.e. playing and deployed drone)
                if (!this.isSpectator) {
                    this.spawnFakeOperator(ownerId);
                }
                
                if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.setVisible(false);
            }
        },
        
        spawnFakeOperator(ownerId) {
             const builder = window.TacticalShooter.PlayerModelBuilder;
             if (!builder) return;
             const buildResult = builder.build(0x444444); 
             this.fakeOperator = { mesh: buildResult.mesh, parts: buildResult.parts };
             const CC = window.TacticalShooter.CharacterController;
             this.fakeOperator.mesh.position.copy(CC.position);
             this.fakeOperator.mesh.rotation.y = this.originalYaw; 
             const makeCollidable = (obj) => { obj.userData.type = 'player'; obj.userData.playerId = ownerId; obj.userData.collidable = true; obj.userData.bulletTransparent = false; };
             makeCollidable(this.fakeOperator.mesh);
             this.fakeOperator.mesh.traverse(c => makeCollidable(c));
             
             if (window.TacticalShooter.LoadoutManager && window.TacticalShooter.RemotePlayerAnimator) {
                 const weaponDef = window.TacticalShooter.LoadoutManager.getActiveWeaponDef();
                 if (weaponDef && weaponDef.buildMesh) {
                     const built = weaponDef.buildMesh.call(weaponDef);
                     const wMesh = built.mesh;
                     const wParts = built.parts;
                     if (this.fakeOperator.parts.rightArm && this.fakeOperator.parts.rightArm.userData.elbow) {
                         this.fakeOperator.parts.rightArm.userData.elbow.add(wMesh);
                         this.operatorAnimator = new window.TacticalShooter.RemotePlayerAnimator(this.fakeOperator.mesh, this.fakeOperator.parts, wParts, wMesh, weaponDef);
                         const state = { lean: 0, isCrouching: true, isSliding: false, isSprinting: false, isADS: false, isProne: false, currentAmmo: 100, lookPitch: this.originalPitch, lookYaw: this.originalYaw };
                         const derivedStats = { isMoving: false, isSprinting: false, isStrafing: false, isSliding: false, isCrouching: true, speed: 0, wallDistance: 999 };
                         this.operatorAnimator.update(0.016, state, derivedStats);
                     }
                 }
             }
             window.TacticalShooter.GameManager.scene.add(this.fakeOperator.mesh);
        },
        
        removeFakeOperator() {
            if (this.fakeOperator) {
                if (window.TacticalShooter.GameManager.scene) window.TacticalShooter.GameManager.scene.remove(this.fakeOperator.mesh);
                this.fakeOperator.mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
                this.fakeOperator = null;
                this.operatorAnimator = null;
            }
        },
        
        detonate() {
            if (this.isSpectator) { this.handleSpectatorExit(); return; }
            if (!this.active) return;
            const PM = window.TacticalShooter.ParticleManager;
            const pos = this.meshContainer ? this.meshContainer.position.clone() : new THREE.Vector3();
            if (window.TacticalShooter.NetworkEventHandler) window.TacticalShooter.NetworkEventHandler.broadcastBulletHit(pos, new THREE.Vector3(0,1,0), null, 0, 'drone_explosion_fx', 0, false, pos, null, 'drone_explosion');
            if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.dealAreaDamage(pos, 8.25, 200, 25.0, 2.0, true, 'drone_explosion');
            if (PM) {
                PM.spawnExplosionLight(pos, 0xff8800, 100.0, 60.0, 1.2);
                PM.createGrenadeExplosion(pos, new THREE.Vector3(0,1,0), 'metal', 1.0);
            }
            if (window.TacticalShooter.PlayerCamera) {
                const dist = window.TacticalShooter.PlayerCamera.camera.position.distanceTo(pos);
                if (dist < 15.0) window.TacticalShooter.PlayerCamera.applyExplosionShake(2.0 * (1.0 - (dist/15.0)));
            }
            this.deactivate();
        },
        
        handleSpectatorExit() {
            this.deactivate();
            if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.enterMenu();
            if (window.TacticalShooter.MultiplayerUI) window.TacticalShooter.MultiplayerUI.showMainMenu();
            if (window.TacticalShooter.DroneHUD) window.TacticalShooter.DroneHUD.hide(); // Clear HUD
        },
        
        takeDamage(amount) {
            if (!this.active) return;
            if (this.isSpectator) return; // Invulnerable
            
            this.health -= amount;
            if (window.TacticalShooter.PlayerCamera) window.TacticalShooter.PlayerCamera.applyExplosionShake(0.5);
            if (window.TacticalShooter.ParticleManager && this.meshContainer) {
                const pos = this.meshContainer.position.clone();
                const normal = new THREE.Vector3(0, 1, 0);
                window.TacticalShooter.ParticleManager.createImpactSparks(pos, normal, { count: 5, speed: 5.0 });
            }
            if (this.health <= 0) {
                if (this.isSpectator) this.handleSpectatorExit();
                else this.detonate();
            }
        },
        
        deactivate() {
            this.active = false;
            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                if (!this.isSpectator) window.TacticalShooter.PlayroomManager.myPlayer.setState('droneData', null, true);
            }
            if (this.body && window.TacticalShooter.PhysicsEngine) {
                window.TacticalShooter.PhysicsEngine.world.removeRigidBody(this.body);
                this.body = null;
            }
            if (this.meshContainer) {
                if (window.TacticalShooter.GameManager.scene) window.TacticalShooter.GameManager.scene.remove(this.meshContainer);
                this.meshContainer = null;
                this.mesh = null;
            }
            this.removeFakeOperator();
            if (window.TacticalShooter.PlayerState) {
                window.TacticalShooter.PlayerState.isControllingDrone = false;
                if (window.TacticalShooter.WeaponManager) {
                     window.TacticalShooter.WeaponManager.initiateSwitch('primary');
                     window.TacticalShooter.WeaponManager.refreshCurrentWeapon();
                }
                if (window.TacticalShooter.GunRenderer) {
                    if (!this.isSpectator) window.TacticalShooter.GunRenderer.setVisible(true);
                    const setting = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings.bodyEnabled : false;
                    window.TacticalShooter.GunRenderer.setUseFullBody(setting);
                }
            }
            if (window.TacticalShooter.DroneHUD) window.TacticalShooter.DroneHUD.hide();
            if (window.TacticalShooter.PlayerCamera) {
                window.TacticalShooter.PlayerCamera.camera.fov = window.TacticalShooter.SettingsManager.settings.baseFOV;
                window.TacticalShooter.PlayerCamera.camera.updateProjectionMatrix();
                window.TacticalShooter.PlayerCamera.pitch = this.originalPitch;
                window.TacticalShooter.PlayerCamera.yaw = this.originalYaw;
            }
        },
        
        checkCollisions(dt) {
            if (!this.meshContainer || !this.body) return;
            if (!this.raycaster) this.raycaster = new THREE.Raycaster();

            // GRACE PERIOD: Ignore collisions for 2 seconds after activation to prevent spawn crash
            if (Date.now() - this.activationTime < 2000) return;

            const vel = this.body.linvel();
            const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);
            const currentPos = this.meshContainer.position.clone();
            
            // Check Map Collision (For both modes)
            // INCREASED THRESHOLD for Spectators to be more forgiving
            const threshold = this.isSpectator ? 8.0 : 2.0;

            if (speed > threshold) {
                const direction = new THREE.Vector3(vel.x, vel.y, vel.z).normalize();
                const checkDist = speed * dt + 0.5; 
                this.raycaster.set(currentPos, direction);
                this.raycaster.far = checkDist;
                
                let collidables = [];
                if (window.TacticalShooter.GameManager.staticCollider) collidables.push(window.TacticalShooter.GameManager.staticCollider);
                else if (window.TacticalShooter.GameManager.currentMap) collidables = window.TacticalShooter.GameManager.currentMap.geometry;
                
                const hits = this.raycaster.intersectObjects(collidables, true);
                
                // Spectator Logic: Bounce but do NOT take damage
                if (this.isSpectator) {
                    const validMapHit = hits.find(h => !h.object.userData.type && !h.object.isSprite);
                    if (validMapHit) {
                        // Just bounce
                        const normal = validMapHit.face ? validMapHit.face.normal : direction.clone().negate();
                        const reflect = direction.clone().reflect(normal).multiplyScalar(speed * 0.5); 
                        this.body.setLinvel({x: reflect.x, y: reflect.y, z: reflect.z}, true);
                    }
                    return; // Spectator ignores players
                }

                // Regular Logic: Explode on player or hard map hit
                const validHit = hits.find(h => {
                    if (h.object.isSprite) return false;
                    if (h.object.userData.bulletTransparent) return false;
                    if (h.object.userData.type === 'player' && h.object.userData.playerId === this.ownerId) return false;
                    return true;
                });
                
                if (validHit) {
                     const dmg = Math.max(25, speed * 2.0);
                     this.takeDamage(dmg); 
                     
                     if (window.TacticalShooter.ParticleManager) {
                         window.TacticalShooter.ParticleManager.createImpactSparks(validHit.point, validHit.face.normal, {count:5});
                     }
                     
                     const normal = validHit.face ? validHit.face.normal : direction.clone().negate();
                     const reflect = direction.clone().reflect(normal).multiplyScalar(speed * 0.4); 
                     this.body.setLinvel({x: reflect.x, y: reflect.y, z: reflect.z}, true);
                }
            }

            // Proximity Check for Players (Regular Mode Only)
            if (!this.isSpectator && window.TacticalShooter.RemotePlayerManager) {
                const players = window.TacticalShooter.RemotePlayerManager.remotePlayers;
                const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                const TM = window.TacticalShooter.TeamManager;
                const myTeam = TM ? TM.getLocalTeamId() : 0;
                const MS = window.TacticalShooter.MatchState;
                const isFFA = MS && MS.state.gamemode === 'FFA';

                for (const pid in players) {
                    if (pid === myId) continue;
                    const rp = players[pid];
                    if (rp.currentStatus !== 'ALIVE') continue;
                    if (!isFFA && rp.teamId === myTeam) continue;
                    if (rp.mesh) {
                        const dist = currentPos.distanceTo(rp.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
                        if (dist < 1.5) { 
                             this.detonate();
                             return;
                        }
                    }
                }
            }
        },
        
        update(dt, inputManager) {
            if (!this.active) return;
            if (this.isSpectator) this.fuel = 9999;
            const isBackground = document.hidden;
            const now = Date.now();
            const waitingForCam = (now < this.controlStartTime);
            
            if (this.operatorAnimator) {
                const state = { lean: 0, isCrouching: true, isSliding: false, isSprinting: false, isADS: false, isProne: false, currentAmmo: 100, lookPitch: this.originalPitch, lookYaw: this.originalYaw };
                const derivedStats = { isMoving: false, isSprinting: false, isStrafing: false, isSliding: false, isCrouching: true, speed: 0, wallDistance: 999 };
                this.operatorAnimator.update(dt, state, derivedStats);
            }

            if (this.body && this.meshContainer) {
                if (waitingForCam) {
                    const t = this.body.translation();
                    const r = this.body.rotation();
                    this.meshContainer.position.set(t.x, t.y, t.z);
                    this.meshContainer.quaternion.set(r.x, r.y, r.z, r.w);
                    const gForce = 9.81 * this.config.mass;
                    this.body.applyImpulse({ x: 0, y: gForce * dt, z: 0 }, true);
                    if (!this.isSpectator && window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                        const droneData = { x: t.x, y: t.y, z: t.z, qx: r.x, qy: r.y, qz: r.z, qw: r.w };
                        window.TacticalShooter.PlayroomManager.myPlayer.setState('droneData', droneData, false);
                    }
                    if (this.mesh.userData.props) this.mesh.userData.props.forEach(p => p.rotateY(200.0 * dt));
                    this.checkCollisions(dt);
                    return; 
                }
                
                if (window.TacticalShooter.DroneHUD && !isBackground) {
                    window.TacticalShooter.DroneHUD.show(this.isSpectator);
                }

                if (!isBackground && inputManager && inputManager.wasActionJustPressed('Jump')) { 
                    if (this.isSpectator) this.handleSpectatorExit();
                    else this.detonate();
                    return;
                }

                this.fuel -= dt;
                if (this.fuel <= 0) {
                    if (this.isSpectator) this.handleSpectatorExit();
                    else this.detonate();
                    return;
                }

                // --- PHYSICS UPDATE ---
                if (window.TacticalShooter.DronePhysics) {
                    window.TacticalShooter.DronePhysics.update(dt, this.body, (!isBackground ? inputManager : null), this.config, {
                        health: this.health,
                        maxHealth: this.maxHealth
                    });
                }

                const t = this.body.translation();
                const r = this.body.rotation();
                this.meshContainer.position.set(t.x, t.y, t.z);
                this.meshContainer.quaternion.set(r.x, r.y, r.z, r.w);
                
                if (!this.isSpectator && window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                    const droneData = { x: t.x, y: t.y, z: t.z, qx: r.x, qy: r.y, qz: r.z, qw: r.w };
                    window.TacticalShooter.PlayroomManager.myPlayer.setState('droneData', droneData, false);
                }

                if (this.mesh.userData.props) {
                    this.mesh.userData.props.forEach(p => p.rotateY(200.0 * dt));
                }
                
                this.checkCollisions(dt);
                
                this.zoomTimer += dt;
                
                if (!isBackground && window.TacticalShooter.PlayerCamera) {
                    const bodyQuat = new THREE.Quaternion(r.x, r.y, r.z, r.w);
                    const lensZ = this.mesh.userData.lensZ || -0.25;
                    const lensY = this.mesh.userData.lensY || 0.05;
                    const fpvOffset = new THREE.Vector3(0, lensY, lensZ).applyQuaternion(bodyQuat);
                    const fpvPos = this.meshContainer.position.clone().add(fpvOffset);
                    const fpvRot = bodyQuat;
                    const cam = window.TacticalShooter.PlayerCamera.camera;
                    if (this.zoomTimer < 0.2) {
                         const p = this.zoomTimer / 0.2;
                         cam.position.lerp(fpvPos, p);
                         cam.quaternion.slerp(fpvRot, p);
                    } else {
                         cam.position.copy(fpvPos);
                         cam.quaternion.copy(fpvRot);
                    }
                }
                
                if (window.TacticalShooter.DroneHUD && !isBackground) {
                    const worldVel = new THREE.Vector3(this.body.linvel().x, this.body.linvel().y, this.body.linvel().z);
                    const bodyQuat = new THREE.Quaternion(r.x, r.y, r.z, r.w);
                    const localVel = worldVel.clone().applyQuaternion(bodyQuat.clone().invert());
                    const currentEuler = new THREE.Euler().setFromQuaternion(bodyQuat, 'YXZ');
                    window.TacticalShooter.DroneHUD.update({
                        pitch: currentEuler.x,
                        roll: currentEuler.z,
                        fuel: this.fuel,
                        maxFuel: this.maxFuel,
                        health: this.health,
                        maxHealth: this.maxHealth,
                        velocity: localVel
                    });
                }
            } else {
                if (this.isSpectator) this.handleSpectatorExit();
                else this.detonate();
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.DroneController = DroneController;
})();
