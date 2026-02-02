
// js/multiplayer/remote_player.js
(function() {
    class RemotePlayer {
        constructor(player, visualConfig) {
            this.id = player.id;
            this.player = player;
            
            // Visual Components
            this.name = visualConfig.name;
            this.teamId = visualConfig.teamId;
            this.teamColor = visualConfig.teamColor;
            this.symbol = visualConfig.symbol;
            this.mesh = visualConfig.mesh;
            this.parts = visualConfig.parts;
            this.collisionBox = visualConfig.collisionBox;
            this.tagGroup = visualConfig.tagGroup;
            
            // UI Sprites
            this.nameSprite = visualConfig.nameSprite;
            this.markerSprite = visualConfig.markerSprite;
            this.hpBgSprite = visualConfig.hpBgSprite;
            this.hpDamageSprite = visualConfig.hpDamageSprite;
            this.hpFillSprite = visualConfig.hpFillSprite;
            this.hpWidthBase = visualConfig.hpWidthBase;
            this.hpHeightBase = visualConfig.hpHeightBase;
            
            // State
            this.targetPosition = new THREE.Vector3();
            this.targetRotationY = 0;
            this.currentStatus = 'SPECTATING'; 
            
            // Vector Pool (Optimization 3)
            this._prevPos = new THREE.Vector3();
            this._velocity = new THREE.Vector3();
            
            this.damageHealth = 100;
            this.prevHealth = 100;
            this.damageTimer = 0;
            this.isRagdolled = false;
            this.initialHideTimer = 2.0;
            this.joinTime = Date.now();
            
            // Weapon System
            this.currentWeaponId = null;
            this.currentAttachmentsHash = "";
            this.weaponMesh = null;
            this.weaponParts = null;
            this.weaponDef = null;
            this.animator = null;
            this.muzzleFlashGroup = null;
            this.muzzleFlashLight = null;
            
            this.isSuppressed = false;
            
            // Attachments
            this.attachmentLights = [];
            this.attachmentLasers = [];
            this.attachmentLensMeshes = [];
            this.attachmentEmitterMeshes = [];
            this.attachmentGlares = [];
            
            // Drone
            this.droneMesh = null;
            this.droneProps = null;
            
            // Hit Reg
            this.processedHitIds = new Set();
            
            this.lodOffset = Math.floor(Math.random() * 4); 
            
            // CRITICAL: Initialize position and visibility immediately
            this.snapToState();
        }
        
        snapToState() {
            const pos = this.player.getState('position');
            const rot = this.player.getState('rotation');
            
            // FIX: TRUST THE STATUS. Do not override SPECTATING just because pos exists.
            let status = this.player.getState('status') || 'SPECTATING';
            
            this.currentStatus = status;
            
            if (pos) {
                this.targetPosition.set(pos.x, pos.y, pos.z);
                this.mesh.position.copy(this.targetPosition);
            } else {
                this.mesh.position.set(0, -1000, 0);
            }
            
            if (rot) {
                this.targetRotationY = rot.y;
                this.mesh.rotation.y = this.targetRotationY;
            }
            
            this.updateVisibility();
        }
        
        updateVisibility() {
            // FIX: If flagged as ragdolled, force mesh hidden regardless of status until reset
            if (this.isRagdolled) {
                if (this.mesh) this.mesh.visible = false;
                if (this.tagGroup) this.tagGroup.visible = false;
                return;
            }

            const isAlive = (this.currentStatus === 'ALIVE');
            
            if (this.mesh) {
                if (isAlive && !this.mesh.parent && window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.scene) {
                    window.TacticalShooter.GameManager.scene.add(this.mesh);
                }

                if (this.mesh.visible !== isAlive) {
                    this.mesh.visible = isAlive;
                }
                
                if (!isAlive) {
                    this.mesh.position.set(0, -1000, 0);
                }
            }
            
            if (this.tagGroup) {
                this.tagGroup.visible = isAlive;
            }
        }
        
        cleanup() {
            const scene = window.TacticalShooter.GameManager ? window.TacticalShooter.GameManager.scene : null;
            window.TacticalShooter.RemotePlayerVisuals.cleanupWeapon(this);
            if (scene && this.mesh) {
                scene.remove(this.mesh);
                [this.nameSprite, this.markerSprite, this.hpBgSprite, this.hpDamageSprite, this.hpFillSprite].forEach(s => {
                    if(s && s.material.map) s.material.map.dispose();
                    if(s) s.material.dispose();
                });
            }
            if (this.droneMesh && scene) {
                scene.remove(this.droneMesh);
            }
        }
        
        update(dt) {
            // 1. Fetch Network State
            const pos = this.player.getState('position');
            const rot = this.player.getState('rotation');
            
            // FIX: Trust status update directly
            let newStatus = this.player.getState('status') || 'SPECTATING';
            
            // 2. Handle Status Change
            if (newStatus !== this.currentStatus) {
                if (newStatus === 'ALIVE' && this.currentStatus !== 'ALIVE') {
                    if (pos) {
                        this.mesh.position.set(pos.x, pos.y, pos.z);
                        this.targetPosition.set(pos.x, pos.y, pos.z);
                        this.damageHealth = 100; // Reset bars on respawn
                        this.prevHealth = 100;
                    }
                    // Reset Ragdoll
                    this.isRagdolled = false;
                }
                this.currentStatus = newStatus;
                this.updateVisibility();
                
                if (newStatus === 'DEAD' && !this.isRagdolled) {
                    this.triggerRagdoll();
                }
            }
            
            if (this.currentStatus === 'ALIVE' && this.mesh && !this.mesh.visible && !this.isRagdolled) {
                this.mesh.visible = true;
                if (!this.mesh.parent && window.TacticalShooter.GameManager) {
                    window.TacticalShooter.GameManager.scene.add(this.mesh);
                }
            }
            
            // 3. Movement Interpolation (Optimized with Vector Pooling)
            if (pos) {
                this.targetPosition.set(pos.x, pos.y, pos.z);
            }
            
            if (this.mesh.position.distanceToSquared(this.targetPosition) > 25) {
                this.mesh.position.copy(this.targetPosition);
            }
            
            const smoothFactor = 1.0 - Math.exp(-15.0 * dt);
            
            // Use pool to calculate delta
            this._prevPos.copy(this.mesh.position);
            this.mesh.position.lerp(this.targetPosition, smoothFactor);
            
            // Calc velocity into pool
            this._velocity.copy(this.mesh.position).sub(this._prevPos).divideScalar(dt);
            
            const lookYaw = (rot && typeof rot.y === 'number') ? rot.y : 0;
            const isSliding = this.player.getState('isSliding');
            
            let targetBodyYaw = lookYaw;
            if (isSliding && this._velocity.length() > 0.5) {
                targetBodyYaw = Math.atan2(this._velocity.x, this._velocity.z) + Math.PI;
            }
            
            this.targetRotationY = targetBodyYaw;
            let diff = this.targetRotationY - this.mesh.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2; 
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * smoothFactor;
            
            return this._velocity;
        }
        
        updateDrone(dt) {
            const droneData = this.player.getState('droneData');
            const scene = window.TacticalShooter.GameManager ? window.TacticalShooter.GameManager.scene : null;
            if (!scene) return;
            
            if (droneData) {
                if (!this.droneMesh && window.TacticalShooter.DroneModel) {
                    this.droneMesh = window.TacticalShooter.DroneModel.buildMesh();
                    
                    // SAVE PROPS BEFORE OVERWRITE
                    const builtProps = this.droneMesh.userData.props;
                    
                    this.droneMesh.userData = { type: 'drone', ownerId: this.id };
                    
                    // RESTORE PROPS FOR ANIMATION
                    if (builtProps) { 
                        this.droneMesh.userData.props = builtProps;
                        this.droneProps = builtProps; 
                    } else {
                        this.droneProps = [];
                    }
                    
                    this.droneMesh.traverse(c => { 
                        c.userData.type = 'drone'; 
                        c.userData.ownerId = this.id; 
                        c.userData.bulletTransparent = false; 
                    });
                    scene.add(this.droneMesh);
                }
                
                if (this.droneMesh) {
                    const targetPos = new THREE.Vector3(droneData.x, droneData.y, droneData.z);
                    const targetQuat = new THREE.Quaternion(droneData.qx, droneData.qy, droneData.qz, droneData.qw);
                    
                    // SMOOTH INTERPOLATION
                    this.droneMesh.position.lerp(targetPos, dt * 15.0);
                    this.droneMesh.quaternion.slerp(targetQuat, dt * 15.0);
                    
                    // SPIN PROPS - High Speed Visual
                    if (this.droneProps) {
                        this.droneProps.forEach(p => p.rotateY(200.0 * dt));
                    }
                }
            } else {
                if (this.droneMesh) { scene.remove(this.droneMesh); this.droneMesh = null; this.droneProps = null; }
            }
        }
        
        triggerRagdoll(overrideImpulse = null) {
            // DUPLICATE CHECK: This prevents multiple calls (local predict + network confirm) from spawning >1 ragdoll
            if (this.isRagdolled) return;
            
            this.isRagdolled = true;
            this.mesh.visible = false; 
            
            // Hide Tag
            if (this.tagGroup) this.tagGroup.visible = false;
            
            const ragdollData = this.player.getState('ragdollData');
            
            if (ragdollData && window.TacticalShooter.RagdollManager) {
                // Authoritative Spawn
                const spawnPos = new THREE.Vector3(ragdollData.x, ragdollData.y, ragdollData.z);
                const impulse = new THREE.Vector3(ragdollData.vx, ragdollData.vy, ragdollData.vz);
                let momentum = null;
                if (ragdollData.mvx !== undefined) momentum = new THREE.Vector3(ragdollData.mvx, ragdollData.mvy, ragdollData.mvz);
                const hitOffset = ragdollData.offX !== undefined ? new THREE.Vector3(ragdollData.offX, ragdollData.offY, ragdollData.offZ) : null;
                
                window.TacticalShooter.RagdollManager.spawn(this.mesh, this.teamColor, spawnPos, ragdollData.ry, impulse, hitOffset, momentum);
            } 
            else if (window.TacticalShooter.RagdollManager) {
                 // Predictive Spawn
                 const imp = overrideImpulse || new THREE.Vector3(0, 5, 0);
                 window.TacticalShooter.RagdollManager.spawn(this.mesh, this.teamColor, this.mesh.position, this.mesh.rotation.y, imp);
            }
        }
        
        updateAnim(dt, worldVelocity) {
            const isControllingDrone = this.player.getState('isControllingDrone');
            const state = {
                lean: this.player.getState('lean') || 0,
                isCrouching: isControllingDrone ? true : this.player.getState('isCrouching'), // Force Crouch if Drone
                isSliding: this.player.getState('isSliding'),
                isSprinting: this.player.getState('isSprinting'),
                isADS: this.player.getState('isADS'),
                isProne: this.player.getState('isProne'),
                currentAmmo: this.player.getState('currentAmmo'),
                lookPitch: (this.player.getState('rotation') || {}).x || 0,
                lookYaw: (this.player.getState('rotation') || {}).y || 0
            };
            
            const speed = worldVelocity.length();
            const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(this.mesh.rotation);
            const fwdSpeed = worldVelocity.dot(forwardDir);
            
            const isMoving = speed > 0.1;
            const isSprinting = (typeof state.isSprinting === 'boolean') ? state.isSprinting : (fwdSpeed > 5.5);
            
            const isGunBlocked = this.player.getState('isGunBlocked');
            const wallDistance = (isGunBlocked === true) ? 0.5 : 999.0;
            
            const derivedStats = { isMoving, isSprinting, isStrafing: false, isSliding: state.isSliding, isCrouching: state.isCrouching, speed, wallDistance };
            
            if (this.animator) {
                this.animator.update(dt, state, derivedStats);
            }
        }
        
        updateLogic(dt, frameCount) {
            this.processHitQueue();
            if (this.currentStatus !== 'ALIVE') return;
            this.updateHealthBar(dt);
            
            const freq = this.weaponMesh ? 30 : 5;
            if ((frameCount + this.lodOffset) % freq === 0) {
                this.syncWeaponState();
            }
            
            const lastFired = this.player.getState('lastFired') || 0;
            if (this.animator && this.animator.updateWeaponMechanics) {
                this.animator.updateWeaponMechanics(dt, lastFired);
            }
        }
        
        // REVERTED TO 62 LOGIC: Strictly Visual Interpolation of Authoritative Health
        updateHealthBar(dt) {
            const health = this.player.getState('health') !== undefined ? this.player.getState('health') : 100;
            
            // Visual Damage Flash
            if (health < this.prevHealth) this.damageTimer = 0.5; 
            this.prevHealth = health;
            
            if (this.damageHealth > health) {
                if (this.damageTimer > 0) this.damageTimer -= dt;
                else {
                    this.damageHealth = THREE.MathUtils.lerp(this.damageHealth, health, dt * 5.0);
                    if (Math.abs(this.damageHealth - health) < 0.5) this.damageHealth = health;
                }
            } else { 
                this.damageHealth = health; 
                this.damageTimer = 0; 
            }
        }
        
        syncWeaponState() {
            const netWeapon = this.player.getState('weaponId');
            const netAttachments = this.player.getState('attachments') || [];
            const attHash = JSON.stringify(netAttachments);
            
            if (netWeapon && (netWeapon !== this.currentWeaponId || attHash !== this.currentAttachmentsHash)) {
                window.TacticalShooter.RemotePlayerVisuals.equipWeapon(this, netWeapon, netAttachments);
                if (this.animator) {
                    const currentLastFired = this.player.getState('lastFired') || 0;
                    this.animator.setWeaponContext(this.weaponMesh, this.weaponParts, this.weaponDef, this.muzzleFlashGroup, currentLastFired);
                }
            }
        }
        
        processHitQueue() {
            const hitQueue = this.player.getState('hitQueue');
            if (!Array.isArray(hitQueue)) return;
            
            const myId = window.TacticalShooter.PlayroomManager.myPlayer.id;
            const PM = window.TacticalShooter.ParticleManager;
            const MS = window.TacticalShooter.MatchState;
            const TM = window.TacticalShooter.TeamManager;
            const localTeamId = TM ? TM.getLocalTeamId() : 0;
            const isFFA = MS && MS.state.gamemode === 'FFA';
            
            hitQueue.forEach(hit => {
                if (this.processedHitIds.has(hit.id)) return;
                this.processedHitIds.add(hit.id);
                if (this.processedHitIds.size > 100) { const arr = Array.from(this.processedHitIds).slice(-50); this.processedHitIds = new Set(arr); }
                
                if (hit.targetId === myId) {
                    if (window.TacticalShooter.PlayerState) {
                        let canDmg = true;
                        if (!isFFA && !MS.state.friendlyFire && this.teamId === localTeamId) canDmg = false; 
                        if (hit.part === 'Drone') canDmg = false;

                        if (canDmg) {
                            let damageOrigin = null;
                            if (hit.ox !== undefined) damageOrigin = new THREE.Vector3(hit.ox, hit.oy, hit.oz);
                            let impulseOverride = null;
                            if (hit.nx !== undefined) impulseOverride = new THREE.Vector3(hit.nx, hit.ny, hit.nz);

                            window.TacticalShooter.PlayerState.takeDamage(
                                hit.dmg || 0, 
                                this.id, 
                                hit.part, 
                                hit.imp, 
                                hit.stealth, 
                                damageOrigin,
                                impulseOverride 
                            );
                        } else if (hit.part === 'Drone' && window.TacticalShooter.DroneController) {
                             if (window.TacticalShooter.DroneController.active) { 
                                 window.TacticalShooter.DroneController.takeDamage(hit.dmg || 0); 
                             }
                        }
                    }
                } else if (hit.targetId) {
                    const victim = window.TacticalShooter.RemotePlayerManager.remotePlayers[hit.targetId];
                    // 59 Logic: Flinch Only. Do NOT update damageHealth locally (Trust Server State in updateHealthBar)
                    if (victim && victim.animator && victim.animator.triggerFlinch && hit.part !== 'Drone') {
                        let canFlinch = true;
                        if (!isFFA && !MS.state.friendlyFire && this.teamId === victim.teamId) canFlinch = false;
                        if (canFlinch) victim.animator.triggerFlinch(hit.part || 'Torso', new THREE.Vector3(hit.nx, hit.ny, hit.nz));
                    }
                    // TRIGGER PREDICTIVE RAGDOLL IF KILL
                    if (victim && hit.part !== 'Drone' && victim.damageHealth > 0) {
                        // Check if this hit would kill (approximation)
                        const predictedHP = victim.damageHealth - (hit.dmg || 0);
                        if (predictedHP <= 0 && !victim.isRagdolled) {
                             const imp = new THREE.Vector3(hit.dx || hit.nx, hit.dy || hit.ny, hit.dz || hit.nz);
                             const finalImp = imp.multiplyScalar(hit.imp || 5.0);
                             victim.triggerRagdoll(finalImp);
                        }
                    }
                }
                
                if (hit.targetId !== myId && PM) {
                    const effectsConfig = (this.weaponDef && this.weaponDef.effects) ? this.weaponDef.effects.impact : {};
                    if (hit.part === 'Drone' || hit.part === 'drone_explosion_fx') effectsConfig.color = 0xcccccc;
                    
                    // VFX for Drone Explosion Sync
                    if (hit.part === 'drone_explosion_fx') {
                         PM.createGrenadeExplosion(new THREE.Vector3(hit.x, hit.y, hit.z), new THREE.Vector3(0,1,0), 'metal', 2.5);
                         PM.spawnExplosionLight(new THREE.Vector3(hit.x, hit.y, hit.z), 0xff8800, 100.0, 50.0, 1.2);
                    } else {
                         PM.createImpactSparks(new THREE.Vector3(hit.x, hit.y, hit.z), new THREE.Vector3(hit.nx, hit.ny, hit.nz), effectsConfig);
                    }
                }
            });
        }
    }
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.RemotePlayer = RemotePlayer;
})();
