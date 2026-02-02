
// js/player/modules/player_health.js
(function() {
    class PlayerHealth {
        constructor(stateContext) {
            this.state = stateContext; 
            
            this.hp = 100;
            this.maxHp = 100;
            this.isDead = false;
            
            this.damageHealth = 100;
            this.damageTimer = 0;
            
            this.spawnProtectionEndTime = 0;
            this.healingStartTime = 0;
            this.lastHitTime = 0; 
            
            // Adrenaline State
            this.adrenalineActiveUntil = 0;
            this.adrenalineCooldownUntil = 0;
            
            this.deathTimer = 0;
            this.deployWaitTimer = 0;
            this.killerName = null;
            this.lastHitPart = 'Torso';
            this.lastImpulseForce = 2.0;
            this.lastDamageVector = null;
            
            this.lastHitWasStealth = false;
            this.lastDamageOrigin = null; 
        }

        reset() {
            // FIX: Force reset Max HP to clear any cheats or temporary buffs
            let baseMax = 100;
            
            if (window.TacticalShooter.PerkSystem) {
                if (window.TacticalShooter.PerkSystem.hasPerk('SCOUT')) baseMax = 75; 
            }
            
            this.maxHp = baseMax;
            this.hp = this.maxHp;
            
            this.damageHealth = this.maxHp;
            this.isDead = false;
            this.lastImpulseForce = 2.0;
            this.lastHitWasStealth = false;
            this.lastDamageOrigin = null;
            this.lastDamageVector = new THREE.Vector3(0, 0, 1);
            
            this.spawnProtectionEndTime = Date.now() + 5000;
            this.healingStartTime = 0; 
            
            this.adrenalineActiveUntil = 0;
            this.adrenalineCooldownUntil = 0;
            
            this.updateUI();
        }
        
        cancelSpawnProtection() {
            if (Date.now() < this.spawnProtectionEndTime) {
                this.spawnProtectionEndTime = Date.now();
                if (window.TacticalShooter.PostProcessor) {
                    window.TacticalShooter.PostProcessor.setVignetteState('clear');
                }
            }
        }
        
        forceDeath(killerId) {
            if (this.isDead) return;
            console.log("PlayerHealth: FORCE DEATH received from", killerId);
            this.hp = 0;
            this.damageHealth = 0;
            this.die(killerId);
            this.updateUI();
        }

        takeDamage(amount, sourceId, hitPart, impulseForce, isStealth, damageOrigin, overrideImpulseDir) {
            if (this.state.isSpectating) return;
            if (this.isDead) return;
            
            // --- BLOCK DAMAGE IF HITTING DRONE ---
            if (hitPart === 'Drone') return; 
            
            const isSuicide = (amount > 9000); 
            
            // Spawn Protection
            if (!isSuicide && Date.now() < this.spawnProtectionEndTime) return;
            
            let finalAmount = amount;

            // FRIENDLY FIRE CHECK
            if (!isSuicide && window.TacticalShooter.MatchState) {
                const MS = window.TacticalShooter.MatchState.state;
                if (!MS.friendlyFire && MS.gamemode !== 'FFA' && sourceId) {
                    const shooter = window.TacticalShooter.RemotePlayerManager.remotePlayers[sourceId];
                    if (shooter && shooter.teamId === window.TacticalShooter.TeamManager.getLocalTeamId()) {
                        // FRIENDLY FIRE OFF: Set damage to 0 but allow function to proceed for VFX
                        finalAmount = 0;
                    }
                }
            }
            
            let isShock = false;
            let stealthFlag = isStealth;
            let shouldFlash = false;
            let pushForce = 0;
            
            if (typeof isStealth === 'object') {
                if (isStealth.shock) isShock = true;
                if (isStealth.stealth) stealthFlag = true;
                if (isStealth.flash) shouldFlash = true;
                if (isStealth.push) pushForce = isStealth.push;
            }

            if (isShock) {
                 if (window.TacticalShooter.PostProcessor) {
                     window.TacticalShooter.PostProcessor.triggerShock();
                 }
            }
            
            if (shouldFlash) {
                 if (window.TacticalShooter.PostProcessor) {
                     window.TacticalShooter.PostProcessor.triggerFlashBlindness(0.5, 1.0);
                 }
            }

            if (finalAmount > 0) {
                if (window.TacticalShooter.PerkSystem) {
                    finalAmount = window.TacticalShooter.PerkSystem.modifyIncomingDamage(finalAmount, damageOrigin);
                }
                if (sourceId && window.TacticalShooter.ScoreSystem) {
                    window.TacticalShooter.ScoreSystem.recordIncomingDamage(sourceId, finalAmount);
                }
            }

            const now = Date.now();
            if (finalAmount >= 15 && this.hp > 0 && !isSuicide) {
                if (now > this.adrenalineCooldownUntil) {
                    if (window.TacticalShooter.PerkSystem && window.TacticalShooter.PerkSystem.hasPerk('ADRENALINE')) {
                        this.adrenalineActiveUntil = now + 10000; 
                        this.adrenalineCooldownUntil = now + 20000; 
                    }
                }
            }

            this.hp -= finalAmount;
            if (this.hp < 0) this.hp = 0;
            
            let healDelay = 10000;
            if (window.TacticalShooter.PerkSystem && window.TacticalShooter.PerkSystem.modifyHealingParams) {
                const params = window.TacticalShooter.PerkSystem.modifyHealingParams();
                healDelay = params.delay;
            }
            
            // Reset healing timer even on 0 damage hits? No, usually only if damaged.
            if (finalAmount > 0) {
                this.healingStartTime = Date.now() + healDelay;
            }
            this.lastHitTime = Date.now(); 
            
            this.lastHitPart = hitPart || 'Torso';
            this.damageTimer = 0.8;
            this.lastHitWasStealth = (stealthFlag === true);
            this.lastDamageOrigin = damageOrigin; 
            
            if (impulseForce !== undefined) this.lastImpulseForce = impulseForce;
            else this.lastImpulseForce = 2.0;

            if (overrideImpulseDir) {
                this.lastDamageVector = overrideImpulseDir.clone().normalize();
            }
            else if (damageOrigin) {
                const myPos = window.TacticalShooter.CharacterController.position.clone();
                this.lastDamageVector = new THREE.Vector3().subVectors(myPos, damageOrigin).normalize();
            }
            else if (sourceId && window.TacticalShooter.RemotePlayerManager) {
                const shooter = window.TacticalShooter.RemotePlayerManager.remotePlayers[sourceId];
                if (shooter && shooter.mesh) {
                    const myPos = window.TacticalShooter.CharacterController.position.clone();
                    const shooterPos = shooter.mesh.position.clone();
                    this.lastDamageVector = new THREE.Vector3().subVectors(myPos, shooterPos).normalize();
                }
            }
            
            if (window.TacticalShooter.CharacterController && this.lastDamageVector) {
                if (pushForce > 0) {
                    const pushDir = this.lastDamageVector.clone().multiplyScalar(pushForce);
                    window.TacticalShooter.CharacterController.applyImpulse(pushDir);
                } else if (isShock) {
                    const pushDir = this.lastDamageVector.clone().multiplyScalar(4.0); 
                    window.TacticalShooter.CharacterController.applyImpulse(pushDir);
                }
            }
            
            if (window.TacticalShooter.DamageIndicatorSystem && this.lastDamageVector) {
                // Show indicator even for 0 damage hits (awareness)
                window.TacticalShooter.DamageIndicatorSystem.show(Math.max(10, finalAmount), this.lastDamageVector, this.lastHitWasStealth);
            }

            if (this.hp > 0) {
                if (window.TacticalShooter.PlayerCamera) window.TacticalShooter.PlayerCamera.applyFlinch();
                if (window.TacticalShooter.PostProcessor && finalAmount > 0) window.TacticalShooter.PostProcessor.addDamageImpulse(finalAmount);
            }
            
            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                // Only sync health if changed
                if (finalAmount > 0) {
                    window.TacticalShooter.PlayroomManager.myPlayer.setState('health', this.hp, true);
                    window.TacticalShooter.PlayroomManager.myPlayer.setState('maxHealth', this.maxHp, true);
                }
            }

            this.updateUI();
            if (this.hp <= 0) this.die(sourceId);
        }

        die(killerId) {
            if (this.isDead) return;
            this.isDead = true;
            this.spawnProtectionEndTime = 0; 
            
            this.adrenalineActiveUntil = 0;
            this.adrenalineCooldownUntil = 0;
            
            // FORCE TIMER TO 5.0 to prevent instant skipping
            this.deathTimer = 5.0; 
            if (this.state.DEATH_CAM_DURATION) this.deathTimer = this.state.DEATH_CAM_DURATION;
            
            this.deployWaitTimer = 0;
            this.healingStartTime = 0;
            
            if (window.TacticalShooter.LootSystem) {
                const wm = window.TacticalShooter.WeaponManager;
                const cc = window.TacticalShooter.CharacterController;
                const ps = window.TacticalShooter.PlayerState;
                
                let weaponToDrop = wm ? wm.currentWeapon : null;
                
                if (!weaponToDrop || weaponToDrop.id === 'AMMO_BOX_DEPLOY') {
                    if (window.TacticalShooter.LoadoutManager) {
                        weaponToDrop = window.TacticalShooter.LoadoutManager.getActiveWeaponDef();
                    }
                }
                
                if (weaponToDrop && cc && ps && ps.modules.ammo) {
                    window.TacticalShooter.LootSystem.dropLoot(cc.position, weaponToDrop, ps.modules.ammo);
                }
            }
            
            if (window.TacticalShooter.PerkSystem) {
                window.TacticalShooter.PerkSystem.onDeath(window.TacticalShooter.CharacterController.position);
            }

            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                window.TacticalShooter.PlayroomManager.myPlayer.setState('health', 0, true);
            }

            this.killerName = null;
            if (killerId && window.TacticalShooter.RemotePlayerManager) {
                const killer = window.TacticalShooter.RemotePlayerManager.remotePlayers[killerId];
                if (killer) this.killerName = killer.name;
            }

            const cc = window.TacticalShooter.CharacterController;
            const cam = window.TacticalShooter.PlayerCamera;
            
            const impulse = this.lastDamageVector ? this.lastDamageVector.clone().multiplyScalar(this.lastImpulseForce) : new THREE.Vector3(0, 10, 0);
            if (Math.abs(impulse.y) < 1.0) impulse.y += 1.5;

            const momentum = cc.velocity.clone();
            if (momentum.length() > 5.0) momentum.normalize().multiplyScalar(5.0); 

            let hitOffset = new THREE.Vector3(0, 0.2, 0); 
            if (this.lastHitPart === 'Head') hitOffset.set(0, 0.8, 0);

            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                const ragdollData = {
                    x: cc.position.x, y: cc.position.y, z: cc.position.z,
                    ry: cam ? cam.yaw : 0, 
                    vx: impulse.x, vy: impulse.y, vz: impulse.z,
                    mvx: momentum.x, mvy: momentum.y, mvz: momentum.z,
                    offX: hitOffset.x, offY: hitOffset.y, offZ: hitOffset.z,
                    time: Date.now()
                };
                window.TacticalShooter.PlayroomManager.myPlayer.setState('ragdollData', ragdollData, true);
                
                const currentDeaths = window.TacticalShooter.PlayroomManager.myPlayer.getState('deaths') || 0;
                window.TacticalShooter.PlayroomManager.myPlayer.setState('deaths', currentDeaths + 1, true);
                
                if (window.TacticalShooter.NetworkEventHandler) {
                    window.TacticalShooter.NetworkEventHandler.broadcastDeath(killerId, this.lastHitPart);
                }
            }

            let localRagdoll = null;
            if (window.TacticalShooter.RagdollManager) {
                const spawnPos = cc.position.clone();
                localRagdoll = window.TacticalShooter.RagdollManager.spawn(null, '#333333', spawnPos, (cam ? cam.yaw : 0), impulse, hitOffset, momentum);
            }

            if (window.TacticalShooter.DeathCameraController && localRagdoll) {
                let focusBody = this.lastHitWasStealth;
                let focusPoint = null;
                
                if (!focusBody && this.lastDamageOrigin) {
                    focusPoint = this.lastDamageOrigin;
                }
                
                window.TacticalShooter.DeathCameraController.start(
                    localRagdoll, 
                    this.lastDamageVector, 
                    killerId, 
                    focusBody, 
                    focusPoint
                );
            }
            
            // --- CLEANUP ---
            // Hide Drone if active
            if (window.TacticalShooter.DroneController && window.TacticalShooter.DroneController.active) {
                window.TacticalShooter.DroneController.detonate(); 
            }

            if (window.TacticalShooter.MultiplayerUI) window.TacticalShooter.MultiplayerUI.setHUDVisible(false);
            if (window.TacticalShooter.DeploymentScreen) window.TacticalShooter.DeploymentScreen.showDeathInfo(this.killerName);
            if (document.exitPointerLock) document.exitPointerLock();
            if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.setVisible(false);
        }

        update(dt) {
            const now = Date.now();
            const isProtected = now < this.spawnProtectionEndTime;

            if (isProtected && !this.state.isSpectating) {
                if (window.TacticalShooter.PostProcessor) {
                    window.TacticalShooter.PostProcessor.setVignetteState('protection');
                }
            } else {
                if (window.TacticalShooter.PostProcessor && this.state.isSpectating) {
                    window.TacticalShooter.PostProcessor.setVignetteState('clear');
                }
            }

            if (window.TacticalShooter.PostProcessor && !this.state.isSpectating) {
                if (this.hp < this.maxHp) {
                    if (now >= this.healingStartTime) {
                        if (!isProtected) {
                            window.TacticalShooter.PostProcessor.setVignetteState('healing');
                        }
                        
                        let healRate = 15;
                        if (window.TacticalShooter.PerkSystem && window.TacticalShooter.PerkSystem.modifyHealingParams) {
                            const params = window.TacticalShooter.PerkSystem.modifyHealingParams();
                            healRate = params.rate;
                        }

                        this.hp = Math.min(this.maxHp, this.hp + healRate * dt); 
                        this.updateUI();
                    } else {
                        if (!isProtected) {
                            if (this.hp < 25) window.TacticalShooter.PostProcessor.setVignetteState('damaged');
                            else window.TacticalShooter.PostProcessor.setVignetteState('clear');
                        }
                    }
                } else {
                    if (!isProtected) {
                        window.TacticalShooter.PostProcessor.setVignetteState('clear');
                    }
                }
            }

            if (this.hp < this.damageHealth) {
                if (this.damageTimer > 0) this.damageTimer -= dt;
                else {
                    this.damageHealth = THREE.MathUtils.lerp(this.damageHealth, this.hp, dt * 5.0);
                    if (Math.abs(this.damageHealth - this.hp) < 0.5) this.damageHealth = this.hp;
                    this.updateUI();
                }
            } else if (this.hp > this.damageHealth) {
                this.damageHealth = this.hp;
                this.damageTimer = 0;
                this.updateUI();
            }
        }

        updateUI() {
            const bar = document.getElementById('health-fill');
            const damageBar = document.getElementById('health-damage');
            if (bar && damageBar) {
                const pct = (this.hp / this.maxHp) * 100;
                bar.style.width = `${pct}%`;
                damageBar.style.width = `${(this.damageHealth / this.maxHp) * 100}%`;
                if (pct < 30) bar.style.backgroundColor = '#d63333';
                else bar.style.backgroundColor = '#ffffff';
            }
        }
    }
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.PlayerHealth = PlayerHealth;
})();
