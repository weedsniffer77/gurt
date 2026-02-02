
// js/weapons/weapon_manager.js
// --- ORCHESTRATOR ONLY: DO NOT ADD CORE FUNCTIONALITIES HERE ---
// Delegate Firing to Ballistics.js
// Delegate Visuals to GunRenderer.js
// Delegate Input to WeaponInputHandler.js

(function() {
    const WeaponManager = {
        // State
        currentWeapon: null, 
        fireTimer: 0, 
        drawTimer: 0, 
        pendingSwitchSlot: null, 
        switchTimer: 0, 
        
        // Grenade State
        grenadeState: 'idle', 
        grenadeThrowTimer: 0, 
        grenadeChargeTimer: 0, 
        
        // Quick Action State
        quickActionState: 'none', 
        quickActionTimer: 0, 
        previousWeaponSlot: null, 
        preMeleeWeaponDef: null, 
        
        // Melee Combo
        comboStep: 0, 
        lastAttackTime: 0,
        
        init() {
            console.log('WeaponManager: Initializing...');
            if (!window.TacticalShooter.GameData || !window.TacticalShooter.GameData.Weapons) { 
                setTimeout(() => this.init(), 100); 
                return; 
            }
            if (window.TacticalShooter.LoadoutManager) window.TacticalShooter.LoadoutManager.init();
            this.refreshCurrentWeapon();
        },
        
        initiateSwitch(slotName) {
            // --- BLOCK IF HOLDING SPECIAL ITEM ---
            if (this.currentWeapon && this.currentWeapon.type === 'special') return;

            if (this.quickActionState !== 'none') this.quickActionState = 'none';
            const LM = window.TacticalShooter.LoadoutManager;
            if (LM && LM.isSlotLocked(slotName, LM.activeLoadout)) return;
            
            if (slotName.startsWith('equipment')) {
                const IC = window.TacticalShooter.InventoryController;
                const count = IC ? IC.getGrenadeCount(slotName) : 0;
                if (count <= 0) { 
                    if (this.currentWeapon && this.currentWeapon.type === 'throwable') { 
                        this.initiateSwitch('primary'); 
                    } 
                    return; 
                }
            }
            
            if (slotName.startsWith('equipment')) {
                if (this.currentWeapon && this.currentWeapon.type === 'throwable') {
                    const nextDef = LM.activeLoadout[slotName];
                    if (nextDef && nextDef.id === this.currentWeapon.id) { return; }
                }
            }
            
            const newDef = LM.switchWeapon(slotName);
            if (newDef) {
                if (this.currentWeapon) {
                    this.pendingSwitchSlot = slotName;
                    this.switchTimer = this.currentWeapon.holsterTime || 0.4;
                    if ((this.currentWeapon.type === 'throwable' && this.grenadeState === 'recovery') || this.currentWeapon.id === 'DRONE_REMOTE') { 
                        this.switchTimer = 0.05; 
                    }
                } else { 
                    this.completeSwitch(newDef); 
                }
            }
        },
        
        completeSwitch(newDef) {
            const playerState = window.TacticalShooter.PlayerState;
            playerState.setWeapon(newDef);
            this.currentWeapon = newDef;
            
            if (newDef.type === 'throwable') {
                const LM = window.TacticalShooter.LoadoutManager;
                const IC = window.TacticalShooter.InventoryController;
                const slot = LM.activeSlot;
                const totalCount = IC ? IC.getGrenadeCount(slot) : 1;
                playerState.currentAmmo = 1;
                playerState.reserveAmmo = Math.max(0, totalCount - 1);
                this.grenadeState = 'idle';
                this.grenadeChargeTimer = 0;
                this.grenadeThrowTimer = 0;
            }
            
            if (window.TacticalShooter.GunRenderer) { 
                window.TacticalShooter.GunRenderer.resetRefs(); 
                window.TacticalShooter.GunRenderer.loadWeapon(newDef); 
                if (window.TacticalShooter.HUDManager) { 
                    window.TacticalShooter.HUDManager.update(playerState); 
                } 
            }
            
            if (this.quickActionState === 'grenade_switch') { 
                this.drawTimer = 0.1; 
            } else { 
                this.drawTimer = newDef.drawTime || 0.5; 
            }
            this.fireTimer = 0; 
            this.comboStep = 0; 
            this.pendingSwitchSlot = null;
        },
        
        refreshCurrentWeapon() { 
            let newDef = window.TacticalShooter.LoadoutManager.getActiveWeaponDef(); 
            if (newDef) { 
                this.currentWeapon = newDef; 
                this.fireTimer = 0; 
                this.drawTimer = 0; 
                this.switchTimer = 0; 
                this.pendingSwitchSlot = null; 
                if (window.TacticalShooter.PlayerState) window.TacticalShooter.PlayerState.setWeapon(this.currentWeapon); 
                if (window.TacticalShooter.GunRenderer) { 
                    window.TacticalShooter.GunRenderer.loadWeapon(this.currentWeapon); 
                } 
            } 
        },
        
        reset() { 
            if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.resetRefs(); 
            if (window.TacticalShooter.LoadoutManager) window.TacticalShooter.LoadoutManager.activeSlot = 'primary'; 
            this.quickActionState = 'none'; 
            this.refreshCurrentWeapon(); 
            if (window.TacticalShooter.GunRenderer && window.TacticalShooter.GunRenderer.warmup) window.TacticalShooter.GunRenderer.warmup(); 
        },
        
        swapRocketType() { 
            const PA = window.TacticalShooter.PlayerState.modules.ammo; 
            const current = PA.currentAmmoType; 
            const target = (current === 'rocket_heat') ? 'rocket_frag' : 'rocket_heat'; 
            PA.startAmmoSwap(target); 
        },
        
        update(dt, inputManager, playerState, playerCamera) {
            // Update Core Physics/Ballistics
            if (window.TacticalShooter.Ballistics) window.TacticalShooter.Ballistics.update(dt);
            if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.update(dt);
            if (window.TacticalShooter.ProjectileManager) window.TacticalShooter.ProjectileManager.update(dt);
            
            if (playerState.isSpectating) return;
            
            const isControllingDrone = playerState.isControllingDrone;
            if (isControllingDrone) { 
                if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.hideTrajectory(); 
                if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.update(dt, playerState, window.TacticalShooter.CharacterController, inputManager, false);
                return;
            }

            // Quick Actions Update
            if (this.quickActionState !== 'none') { 
                this.updateQuickActions(dt, playerState, playerCamera); 
                // Ensure renderer updates even during quick action
                if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.update(dt, playerState, window.TacticalShooter.CharacterController, inputManager, false);
                return;
            }

            // Switching State
            if (this.pendingSwitchSlot) { 
                this.switchTimer -= dt; 
                if (this.switchTimer <= 0) { 
                    const newDef = window.TacticalShooter.LoadoutManager.getActiveWeaponDef(); 
                    if (newDef) this.completeSwitch(newDef); 
                    else this.pendingSwitchSlot = null; 
                } 
                if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.update(dt, playerState, window.TacticalShooter.CharacterController, inputManager, false); 
                return; 
            }
            
            if (!this.currentWeapon) return;

            // RPG Ammo Sync Check
            const PA = playerState.modules.ammo;
            if (PA && !PA.isSwappingAmmo && PA.currentAmmoType !== this.currentWeapon.ammoType) { 
                if (this.currentWeapon.id === 'RPG7') { 
                    this.currentWeapon.ammoType = PA.currentAmmoType; 
                    const atts = this.currentWeapon.attachments || []; 
                    const newAtts = atts.filter(a => !a.startsWith('rpg_rocket')); 
                    if (PA.currentAmmoType === 'rocket_frag') newAtts.push('rpg_rocket_ogv7'); 
                    else newAtts.push('rpg_rocket_pg7v'); 
                    const LM = window.TacticalShooter.LoadoutManager; 
                    if (LM.activeLoadout.primary.id === 'RPG7') { 
                        LM.activeLoadout.primary.attachments = newAtts; 
                    } 
                    const newDef = LM.getActiveWeaponDef(); 
                    this.currentWeapon = newDef; 
                    if (window.TacticalShooter.GunRenderer) { 
                        window.TacticalShooter.GunRenderer.loadWeapon(newDef); 
                    } 
                } 
            }

            // Crosshair Logic
            const crosshairEl = document.getElementById('crosshair'); 
            if (crosshairEl) { 
                const isUIHidden = window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.uiHidden; 
                const shouldHide = playerState.isADS && this.currentWeapon.visuals && this.currentWeapon.visuals.hideCrosshair; 
                if (shouldHide && !isUIHidden) crosshairEl.style.display = 'none'; 
                else if (!isUIHidden) crosshairEl.style.display = 'block'; 
            }

            // Death Logic
            if (playerState.isDead) { 
                if (this.currentWeapon.type === 'throwable' && (this.grenadeState === 'primed' || this.grenadeState === 'throwing')) { 
                    this.performDrop(playerCamera); 
                    this.grenadeState = 'idle'; 
                } 
                if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.hideTrajectory(); 
                return; 
            }

            // Timers
            if (this.fireTimer > 0) this.fireTimer -= dt; 
            if (this.drawTimer > 0) this.drawTimer -= dt;

            // --- DELEGATE INPUT PROCESSING ---
            if (window.TacticalShooter.WeaponInputHandler) {
                window.TacticalShooter.WeaponInputHandler.processInput(dt, inputManager, playerState, this);
            }

            // Auto-Reload (RPG Special Case handled in InputHandler but also failsafe here)
            if (playerState.currentAmmo === 0 && !playerState.isReloading && !playerState.modules.ammo.isSwappingAmmo) { 
                const settings = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings : {}; 
                const autoReload = (settings.autoReload !== false); 
                
                // ROCKET JUMP PERK CHECK: Disable auto-reload for RPG if perk active
                const hasRocketJump = window.TacticalShooter.PerkSystem && window.TacticalShooter.PerkSystem.hasPerk('ROCKET_JUMP');
                const isRPG = this.currentWeapon.id === 'RPG7';
                
                if (autoReload && !(isRPG && hasRocketJump)) { 
                    if (playerState.reserveAmmo > 0) { 
                        // Handled by input or previous frames
                    } else if (isRPG) { 
                        const PA = playerState.modules.ammo; 
                        const currentType = PA.currentAmmoType; 
                        const otherType = (currentType === 'rocket_heat') ? 'rocket_frag' : 'rocket_heat'; 
                        if (PA.ammoPools[otherType] > 0) { 
                            this.swapRocketType(); 
                        } 
                    } 
                } 
            }

            // Grenade Specific Logic (State Machine)
            if (this.currentWeapon.type === 'throwable') { 
                this.updateGrenadeLogic(dt, inputManager, playerState, playerCamera, false); 
                if (window.TacticalShooter.GunRenderer) {
                    if (window.TacticalShooter.GunRenderer.gunMeshGroup) {
                         const mesh = window.TacticalShooter.GunRenderer.gunMeshGroup;
                         if (mesh.userData.updateAnimation) mesh.userData.updateAnimation(dt, this.grenadeChargeTimer);
                    }
                    const isThrowing = (this.grenadeState === 'throwing'); 
                    if (this.grenadeState === 'recovery') window.TacticalShooter.GunRenderer.setVisible(false); 
                    else window.TacticalShooter.GunRenderer.setVisible(true); 
                    window.TacticalShooter.GunRenderer.update(dt, playerState, window.TacticalShooter.CharacterController, inputManager, isThrowing); 
                } 
                return; 
            } else { 
                if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.hideTrajectory(); 
            }

            // Visibility
            if (window.TacticalShooter.GunRenderer && !playerState.isSpectating) window.TacticalShooter.GunRenderer.setVisible(true);

            // Final Render Update
            if (window.TacticalShooter.GunRenderer) { 
                const isFiring = this.fireTimer > 0; 
                window.TacticalShooter.GunRenderer.update(dt, playerState, window.TacticalShooter.CharacterController, inputManager, isFiring); 
            }
        },
        
        // ... (Helper Methods: startQuickMelee, startQuickGrenade, updateQuickActions, performMeleeSweep, updateGrenadeLogic, triggerThrow, performThrow, performDrop, onBulletHit, attemptFire) ...
        
        startQuickMelee() { if (this.quickActionState !== 'none') return; const def = this.currentWeapon; const config = def.quickMelee || { type: 'bash' }; let animType = 1; let duration = 0.6; let shouldSwap = false; if (config.type === 'knife_swap') { animType = 0; duration = 0.5; shouldSwap = true; } else { animType = config.animType !== undefined ? config.animType : 1; duration = config.duration || 0.6; } if (config.duration) duration = config.duration; this.quickActionState = 'melee'; this.quickActionTimer = duration; if (shouldSwap && def.id !== 'KNIFE') { this.preMeleeWeaponDef = this.currentWeapon; const knifeDef = window.TacticalShooter.GameData.Weapons["KNIFE"]; if (knifeDef) { this.currentWeapon = knifeDef; if (window.TacticalShooter.GunRenderer) { window.TacticalShooter.GunRenderer.loadWeapon(knifeDef); } } } else { this.preMeleeWeaponDef = null; } if (window.TacticalShooter.GunAnimator) { window.TacticalShooter.GunAnimator.triggerQuickMelee(duration, animType); } const hitTime = (animType === 0) ? 200 : 200; setTimeout(() => { if (this.quickActionState === 'melee') { const dmg = config.damage || 35; const rng = config.range || 2.5; const arc = 100; this.performMeleeSweep(rng, arc, dmg, (animType === 1)); } }, hitTime); },
        startQuickGrenade() { if (this.quickActionState !== 'none') return; if (this.currentWeapon && this.currentWeapon.type === 'throwable') return; const IC = window.TacticalShooter.InventoryController; const LM = window.TacticalShooter.LoadoutManager; let gSlot = 'equipment1'; if (IC.activeGrenadeIndex === 1) gSlot = 'equipment2'; if (IC.getGrenadeCount(gSlot) <= 0) { gSlot = (gSlot === 'equipment1') ? 'equipment2' : 'equipment1'; if (IC.getGrenadeCount(gSlot) <= 0) return; } this.previousWeaponSlot = LM.activeSlot; this.quickActionState = 'grenade_switch'; const newDef = LM.switchWeapon(gSlot); if (newDef) { this.completeSwitch(newDef); this.grenadeState = 'primed'; this.grenadeChargeTimer = 1.0; this.grenadeThrowTimer = 0; setTimeout(() => { if (this.quickActionState === 'grenade_switch') { this.triggerThrow(window.TacticalShooter.PlayerState); this.quickActionState = 'grenade_throw'; } }, 200); } else { this.quickActionState = 'none'; } },
        updateQuickActions(dt, playerState, playerCamera) { if (this.quickActionState === 'melee') { this.quickActionTimer -= dt; if (this.quickActionTimer <= 0) { this.quickActionState = 'none'; if (this.preMeleeWeaponDef) { this.currentWeapon = this.preMeleeWeaponDef; if (window.TacticalShooter.GunRenderer) { window.TacticalShooter.GunRenderer.loadWeapon(this.preMeleeWeaponDef); } this.preMeleeWeaponDef = null; } } return; } if (this.quickActionState === 'grenade_throw' || this.quickActionState === 'grenade_switch') { if (this.grenadeState === 'throwing') { if (this.grenadeThrowTimer > 0) this.grenadeThrowTimer -= dt; if (this.grenadeThrowTimer <= 0) { this.performThrow(playerCamera, playerState); this.grenadeState = 'recovery'; this.grenadeThrowTimer = 0.3; } } else if (this.grenadeState === 'recovery') { if (this.grenadeThrowTimer > 0) this.grenadeThrowTimer -= dt; if (this.grenadeThrowTimer <= 0) { const returnSlot = this.previousWeaponSlot || 'primary'; this.quickActionState = 'none'; this.previousWeaponSlot = null; this.initiateSwitch(returnSlot); } } } },
        performMeleeSweep(range, arcDegrees, damage, isBash = false) { const PC = window.TacticalShooter.PlayerCamera; if (!PC) return; const origin = PC.camera.position.clone(); const forward = PC.getForwardDirection().normalize(); let targets = []; if (window.TacticalShooter.RemotePlayerManager) { targets = Object.values(window.TacticalShooter.RemotePlayerManager.remotePlayers); } const arcRad = (arcDegrees * Math.PI) / 180; const cosThreshold = Math.cos(arcRad / 2); const raycaster = new THREE.Raycaster(); let mapColliders = []; if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.staticCollider) { mapColliders = [window.TacticalShooter.GameManager.staticCollider]; } else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) { mapColliders = window.TacticalShooter.GameManager.currentMap.geometry; } let hitSomething = false; let hitPlayer = false; targets.forEach(rp => { if (rp.currentStatus !== 'ALIVE' || !rp.mesh) return; const targetCenter = rp.mesh.position.clone().add(new THREE.Vector3(0, 1.3, 0)); const toTarget = targetCenter.clone().sub(origin); const dist = toTarget.length(); if (dist <= range) { const dirToTarget = toTarget.normalize(); const dot = forward.dot(dirToTarget); if (dot >= cosThreshold) { raycaster.set(origin, dirToTarget); raycaster.far = dist; const hits = raycaster.intersectObjects(mapColliders, true); if (hits.length === 0) { const result = { hit: true, point: targetCenter, normal: dirToTarget.clone().negate(), distance: dist, object: rp.mesh, playerId: rp.id }; const weaponData = { id: 'MELEE', type: 'melee', damage: damage, ragdollImpulse: 5.0, isBash: isBash }; this.onBulletHit(result, weaponData, origin); hitSomething = true; hitPlayer = true; } } } }); if (!hitPlayer) { raycaster.set(origin, forward); raycaster.far = range; const hits = raycaster.intersectObjects(mapColliders, true); if (hits.length > 0) { const hit = hits[0]; const result = { hit: true, point: hit.point, normal: hit.face ? hit.face.normal : new THREE.Vector3(0,1,0), distance: hit.distance, object: hit.object, playerId: null }; this.onBulletHit(result, { id: 'MELEE', type: 'melee', damage: 0 }, origin); } } },
        updateGrenadeLogic(dt, inputManager, playerState, playerCamera, inputBlocked) { const settings = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings : { grenadeUseADS: false }; const useADSKey = settings.grenadeUseADS; const isADS = inputManager.isActionActive('ADS'); const isShoot = inputManager.isActionActive('Shoot'); const justShot = inputManager.wasActionJustPressed('Shoot'); if (this.grenadeThrowTimer > 0) this.grenadeThrowTimer -= dt; if (this.grenadeState === 'idle') { this.grenadeChargeTimer = 0; if (useADSKey) { if (isADS && !inputBlocked) { this.grenadeState = 'primed'; playerState.setADS(true); } } else { if (isShoot && !inputBlocked) { this.grenadeState = 'primed'; playerState.setADS(true); } } if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.hideTrajectory(); } else if (this.grenadeState === 'primed') { this.grenadeChargeTimer += dt; playerState.setADS(true); if (window.TacticalShooter.ThrowableManager && playerCamera) { const origin = playerCamera.camera.position.clone(); const dir = playerCamera.getForwardDirection(); dir.y += 0.2; dir.normalize(); const chargeTime = 1.5; const chargeRatio = Math.min(this.grenadeChargeTimer, chargeTime) / chargeTime; const powerMult = 0.6 + (chargeRatio * 0.9); const right = playerCamera.getRightDirection(); origin.add(right.multiplyScalar(0.2)); window.TacticalShooter.ThrowableManager.previewTrajectory(origin, dir, powerMult, this.currentWeapon.id); } if (useADSKey) { if (!isADS) { this.grenadeState = 'idle'; playerState.setADS(false); } else if (justShot && !inputBlocked) { this.triggerThrow(playerState); } } else { if (isADS) { this.grenadeState = 'idle'; playerState.setADS(false); } else if (!isShoot && !inputBlocked) { this.triggerThrow(playerState); } } } else if (this.grenadeState === 'throwing') { if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.hideTrajectory(); if (this.grenadeThrowTimer <= 0) { this.performThrow(playerCamera, playerState); this.grenadeState = 'recovery'; this.grenadeThrowTimer = 0.5; } } else if (this.grenadeState === 'recovery') { if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.hideTrajectory(); if (this.grenadeThrowTimer <= 0) { const LM = window.TacticalShooter.LoadoutManager; const IC = window.TacticalShooter.InventoryController; const slot = LM.activeSlot; const count = IC ? IC.getGrenadeCount(slot) : 0; if (count > 0) { const currentDef = LM.getActiveWeaponDef(); if (currentDef.id !== this.currentWeapon.id) { this.currentWeapon = currentDef; if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.loadWeapon(this.currentWeapon); } this.currentWeapon.reserveAmmo = count - 1; playerState.currentAmmo = 1; playerState.reserveAmmo = count - 1; this.grenadeState = 'idle'; this.drawTimer = this.currentWeapon.drawTime || 0.5; this.grenadeChargeTimer = 0; } else { this.initiateSwitch('primary'); } } } },
        triggerThrow(playerState) { this.grenadeState = 'throwing'; this.grenadeThrowTimer = 0.15; playerState.setADS(false); playerState.cancelSpawnProtection(); if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.triggerMeleeAnimation(); },
        performThrow(playerCamera, playerState) { const TM = window.TacticalShooter.ThrowableManager; const IC = window.TacticalShooter.InventoryController; const LM = window.TacticalShooter.LoadoutManager; const NEH = window.TacticalShooter.NetworkEventHandler; const PM = window.TacticalShooter.PlayroomManager; if (TM && IC) { const origin = playerCamera.camera.position.clone(); const dir = playerCamera.getForwardDirection(); dir.y += 0.2; dir.normalize(); const chargeTime = 1.5; const chargeRatio = Math.min(this.grenadeChargeTimer, chargeTime) / chargeTime; const powerMult = 0.6 + (chargeRatio * 0.9); const right = playerCamera.getRightDirection(); origin.add(right.multiplyScalar(0.2)); const myId = PM && PM.myPlayer ? PM.myPlayer.id : "SELF"; const velocity = TM.throwItem(origin, dir, this.currentWeapon.id, powerMult, myId); if (NEH) { NEH.broadcastThrow(origin, velocity, this.currentWeapon.id); } IC.consumeGrenade(LM.activeSlot); const count = IC.getGrenadeCount(LM.activeSlot); this.currentWeapon.reserveAmmo = Math.max(0, count - 1); playerState.currentAmmo = (count > 0) ? 1 : 0; playerState.reserveAmmo = Math.max(0, count - 1); if (window.TacticalShooter.HUDManager) window.TacticalShooter.HUDManager.update(playerState); this.grenadeChargeTimer = 0; } },
        performDrop(playerCamera) { const TM = window.TacticalShooter.ThrowableManager; const IC = window.TacticalShooter.InventoryController; const LM = window.TacticalShooter.LoadoutManager; if (TM && IC) { const origin = playerCamera.camera.position.clone(); const dir = new window.THREE.Vector3(0, -1, 0); const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF"; TM.throwItem(origin, dir, this.currentWeapon.id, 0.1, myId); IC.consumeGrenade(LM.activeSlot); } },
        
        onBulletHit(result, weapon, damageOrigin) {
            if (weapon.type !== 'melee') {
                if (window.TacticalShooter.ParticleManager) {
                    const start = damageOrigin.clone();
                    const dir = result.direction || new window.THREE.Vector3(0,0,1);
                    window.TacticalShooter.ParticleManager.createBarrelWisp(start, dir, 0.5); 
                }
            }

            if (!result.hit) return;

            const PM = window.TacticalShooter.ParticleManager;
            const PS = window.TacticalShooter.PlayerState;
            const PerkSys = window.TacticalShooter.PerkSystem;
            
            let targetId = result.playerId;
            let hitObj = result.object;
            let isPlayer = (hitObj.userData.type === 'player' || !!targetId);
            
            if (hitObj.userData.type === 'drone') {
                if (PM) PM.createImpactSparks(result.point, result.normal, { color: 0xcccccc, count: 5 });
                if (window.TacticalShooter.HitmarkerSystem) window.TacticalShooter.HitmarkerSystem.show('normal');
                
                if (hitObj.userData.controller) {
                    hitObj.userData.controller.takeDamage(weapon.damage || 20);
                } else if (hitObj.userData.ownerId) {
                    const dmg = weapon.damage || 20;
                    const droneOwner = hitObj.userData.ownerId;
                    window.TacticalShooter.PlayroomManager.broadcastBulletHit(
                        result.point, result.normal, droneOwner, dmg, 'Drone', 0, false, damageOrigin, null, 'gun' 
                    );
                }
                return;
            }

            if (!isPlayer && hitObj.parent) {
                let curr = hitObj.parent;
                while (curr && curr.type !== 'Scene') {
                    if (curr.userData.type === 'player' && curr.userData.playerId) {
                        targetId = curr.userData.playerId;
                        isPlayer = true;
                        break;
                    }
                    if (curr.userData.type === 'drone') {
                         if (PM) PM.createImpactSparks(result.point, result.normal, { color: 0xcccccc, count: 5 });
                         if (window.TacticalShooter.HitmarkerSystem) window.TacticalShooter.HitmarkerSystem.show('normal');
                         if (curr.userData.controller) curr.userData.controller.takeDamage(weapon.damage || 20);
                         else if (curr.userData.ownerId) {
                             window.TacticalShooter.PlayroomManager.broadcastBulletHit(result.point, result.normal, curr.userData.ownerId, weapon.damage || 20, 'Drone', 0, false, damageOrigin, null, 'gun');
                         }
                        return;
                    }
                    curr = curr.parent;
                }
            }

            if (isPlayer) {
                if (PM) PM.createBloodSparks(result.point, result.normal);
                
                if (targetId && window.TacticalShooter.PlayroomManager.myPlayer) {
                    
                    let partName = hitObj.name || 'Torso';
                    let dmg = weapon.damage || 20;
                    const dist = result.distance;

                    if (weapon.damageFalloff) {
                        let profile = weapon.damageFalloff.base;
                        let multiplier = 1.0;

                        if (partName === 'Head') {
                            if (weapon.damageFalloff.head) profile = weapon.damageFalloff.head;
                            else multiplier = 1.5; 
                        } else if (partName === 'Leg' || partName === 'Arm') {
                            multiplier = weapon.damageFalloff.limbMultiplier || 0.7; 
                        }
                        
                        if (weapon.shock) multiplier = 1.0; 

                        for(const bracket of profile) {
                            if (dist <= bracket.maxDist) {
                                dmg = bracket.dmg;
                                break;
                            }
                        }
                        dmg *= multiplier;
                    } else {
                         if (weapon.shock) {
                         } else {
                             if (partName === 'Head') dmg *= 1.5;
                             else if (partName === 'Leg' || partName === 'Arm') dmg *= 0.7;
                         }
                    }
                    
                    if (PerkSys) dmg = PerkSys.modifyOutgoingDamage(dmg);
                    
                    // --- CALCULATE IMPULSE VECTOR FOR RAGDOLL ---
                    const impulseMagnitude = weapon.ragdollImpulse || 2.0;
                    const impulseDir = result.direction ? result.direction.clone().normalize() : result.normal.clone().negate().normalize();
                    const finalImpulse = impulseDir.clone().multiplyScalar(impulseMagnitude);
                    
                    let stealthFlags = { shock: !!weapon.shock };
                    if (weapon.isBash) {
                        stealthFlags.shock = true;
                        stealthFlags.flash = true;
                        stealthFlags.push = 25.0; 
                    }
                    
                    if (weapon.visuals && weapon.visuals.muzzleFlashScale <= 0.05) {
                        stealthFlags.stealth = true;
                    }

                    // --- CHECK FRIENDLY FIRE ---
                    let isFriendly = false;
                    const TM = window.TacticalShooter.TeamManager;
                    const MS = window.TacticalShooter.MatchState;
                    if (TM && MS && MS.state.gamemode !== 'FFA') {
                        const myTeam = TM.getLocalTeamId();
                        // Get victim info
                        const victim = window.TacticalShooter.RemotePlayerManager ? window.TacticalShooter.RemotePlayerManager.remotePlayers[targetId] : null;
                        if (victim && victim.teamId === myTeam) {
                            isFriendly = true;
                        }
                    }

                    // --- PREDICTIVE DEATH ---
                    if (window.TacticalShooter.RemotePlayerManager && window.TacticalShooter.RemotePlayerManager.remotePlayers) {
                         const victim = window.TacticalShooter.RemotePlayerManager.remotePlayers[targetId];
                         if (victim && victim.currentStatus === 'ALIVE' && !victim.isRagdolled) {
                             if (!isFriendly || MS.state.friendlyFire) {
                                 // Apply local predictive damage tracking for HUD/Ragdoll
                                 if (victim.damageHealth > 0) {
                                     victim.damageHealth = Math.max(0, victim.damageHealth - dmg);
                                 }

                                 const remainingHealth = victim.damageHealth; 
                                 if (remainingHealth <= 0) {
                                     victim.triggerRagdoll(finalImpulse);
                                     
                                     // Show KILL hitmarker
                                     if (window.TacticalShooter.HitmarkerSystem) window.TacticalShooter.HitmarkerSystem.show('kill');
                                     
                                     // --- SEND FORCE KILL CONFIRMATION ---
                                     if (window.TacticalShooter.NetworkEventHandler) {
                                         window.TacticalShooter.NetworkEventHandler.broadcastKillConfirm(targetId);
                                     }
                                 } else {
                                     // Not dead yet, just flinch
                                     if (victim.animator && victim.animator.triggerFlinch) {
                                         victim.animator.triggerFlinch(partName, impulseDir);
                                     }
                                     if (window.TacticalShooter.HitmarkerSystem) window.TacticalShooter.HitmarkerSystem.show(partName === 'Head' ? 'headshot' : 'normal');
                                 }
                             } else {
                                 // FRIENDLY FIRE IS OFF:
                                 // Just trigger flinch visually
                                 if (victim.animator && victim.animator.triggerFlinch) {
                                     victim.animator.triggerFlinch(partName, impulseDir);
                                 }
                                 // NO HITMARKER
                                 // NO DAMAGE SUBTRACTION
                             }
                         }
                    }

                    const myId = window.TacticalShooter.PlayroomManager.myPlayer.id;
                    const dmgType = weapon.type === 'melee' ? 'melee' : 'gun';
                    
                    // If Friendly and FF is off, send 0 damage so they still flinch but don't take damage
                    if (isFriendly && !MS.state.friendlyFire) {
                        dmg = 0;
                    }

                    window.TacticalShooter.PlayroomManager.broadcastBulletHit(
                        result.point, 
                        result.normal, 
                        targetId, 
                        dmg, 
                        partName, 
                        impulseMagnitude, 
                        stealthFlags, 
                        damageOrigin,
                        impulseDir, 
                        dmgType 
                    );
                }
            } else {
                if (PM) {
                    const cfg = weapon.effects ? weapon.effects.impact : {};
                    if (weapon.type === 'melee' || weapon.shock) {
                        cfg.color = 0xffffff;
                        cfg.speed = 4.0;
                        cfg.size = 0.05;
                    }
                    PM.createImpactSparks(result.point, result.normal, cfg);
                }
                
                if (PerkSys && weapon.id) { 
                    PerkSys.onBulletImpact(weapon.id, result);
                }
            }
        },

        attemptFire(playerState, playerCamera) {
            // (Same as before...)
            if (!this.currentWeapon || playerState.isReloading) return; 
            if (this.currentWeapon.magazineSize > 0 && playerState.currentAmmo <= 0) { 
                const autoReload = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings.autoReload : true;
                
                // ROCKET JUMP PERK CHECK: Disable auto-reload for RPG if perk active
                const hasRocketJump = window.TacticalShooter.PerkSystem && window.TacticalShooter.PerkSystem.hasPerk('ROCKET_JUMP');
                const isRPG = this.currentWeapon.id === 'RPG7';
                
                if (autoReload && playerState.reserveAmmo > 0 && !(isRPG && hasRocketJump)) playerState.startReload();
                return; 
            }
            if (this.fireTimer > 0 || this.drawTimer > 0 || playerState.needsPump || playerState.isPumping || playerState.modules.ammo.isSwappingAmmo) return;
            playerState.cancelSpawnProtection();
            const ammoToConsume = (this.currentWeapon.ammoPerShot !== undefined) ? this.currentWeapon.ammoPerShot : 1;
            if (!playerState.consumeAmmo(ammoToConsume)) return;
            if (this.currentWeapon.actionType === 'pump') {
                if (playerState.currentAmmo === 0) { 
                    const autoReload = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings.autoReload : true;
                    if (autoReload) playerState.startReload(); 
                } else playerState.markNeedsPump();
            }
            this.fireTimer = this.currentWeapon.fireRate;
            if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.onPlayerFired();
            if (this.currentWeapon.type === 'melee') {
                const now = Date.now();
                if (now - this.lastAttackTime > 1200) this.comboStep = 0; 
                if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.triggerMeleeAnimation(this.comboStep);
                this.lastAttackTime = now;
                this.comboStep = (this.comboStep + 1) % 2; 
                const sweepRange = 3.0; 
                const sweepAngle = 120; 
                this.performMeleeSweep(sweepRange, sweepAngle, this.currentWeapon.damage);
            } else {
                if (window.TacticalShooter.GunRenderer) {
                    if (this.currentWeapon.id !== 'RPG_SIGMA') {
                         window.TacticalShooter.GunRenderer.applyRecoil();
                    }
                    const isManualAction = (this.currentWeapon.actionType === 'pump' || this.currentWeapon.actionType === 'bolt');
                    window.TacticalShooter.GunRenderer.triggerMuzzleFlash(this.currentWeapon, !isManualAction);
                }
            }
            const range = (this.currentWeapon.ballistics && this.currentWeapon.ballistics.maxRange) ? this.currentWeapon.ballistics.maxRange : 100;
            const charController = window.TacticalShooter.CharacterController;
            const horizontalSpeed = new THREE.Vector3(charController.velocity.x, 0, charController.velocity.z).length();
            const isSprinting = horizontalSpeed > charController.config.walkSpeed + 1.0;
            const muzzleState = window.TacticalShooter.GunRenderer ? window.TacticalShooter.GunRenderer.getMuzzleState() : null;
            let muzzlePrimary = muzzleState ? muzzleState.primary : null;
            if (!muzzlePrimary || !muzzlePrimary.position) {
                muzzlePrimary = { position: playerCamera.camera.position.clone(), direction: playerCamera.getForwardDirection() };
            }
            const muzzleSecondary = muzzleState ? muzzleState.secondary : null;
            if (this.currentWeapon.id.includes('RPG') && window.TacticalShooter.ProjectileManager) {
                const PA = playerState.modules.ammo;
                let rocketType = 'PG7V';
                if (PA.currentAmmoType === 'rocket_frag') rocketType = 'OGV7';
                const origin = muzzlePrimary.position;
                const dir = muzzlePrimary.direction; 
                const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                window.TacticalShooter.ProjectileManager.spawnRocket(origin, dir, rocketType, myId);
                if (window.TacticalShooter.NetworkEventHandler) {
                    window.TacticalShooter.NetworkEventHandler.broadcastThrow(origin, dir, rocketType === 'OGV7' ? 'OGV7' : 'RPG7');
                }
                if (muzzleSecondary && muzzleSecondary.position) {
                     window.TacticalShooter.ProjectileManager.spawnRocket(muzzleSecondary.position, muzzleSecondary.direction, rocketType, myId);
                     if (window.TacticalShooter.NetworkEventHandler) {
                        window.TacticalShooter.NetworkEventHandler.broadcastThrow(muzzleSecondary.position, muzzleSecondary.direction, rocketType === 'OGV7' ? 'OGV7' : 'RPG7');
                    }
                }
                if (this.currentWeapon.id !== 'RPG_SIGMA') {
                    playerCamera.addRecoil(this.currentWeapon.recoilPitch, (Math.random() - 0.5) * this.currentWeapon.recoilYaw);
                    playerCamera.applyExplosionShake(0.5);
                }
                return;
            }
            let spread = this.currentWeapon.hipfireSpread;
            if (playerState.isADS) spread = isSprinting ? this.currentWeapon.hipfireSpread * 2.0 : this.currentWeapon.adsSpread;
            else if (isSprinting) spread = this.currentWeapon.sprintSpread || (spread * 3.0);
            if (playerState.isAttachmentOn && this.currentWeapon.activeModifiers && this.currentWeapon.activeModifiers.laser) spread *= this.currentWeapon.activeModifiers.laser.spreadMultiplier;
            const shotCount = this.currentWeapon.projectilesPerShot || 1;
            const hasDual = !!muzzleSecondary && !!muzzleSecondary.position;
            for(let i=0; i<shotCount; i++) {
                let origin, direction;
                if (hasDual) {
                    if (i % 2 === 0) { origin = muzzlePrimary.position; direction = muzzlePrimary.direction; } 
                    else { origin = muzzleSecondary.position; direction = muzzleSecondary.direction; }
                } else { origin = muzzlePrimary.position; direction = muzzlePrimary.direction; }
                if (!hasDual && this.currentWeapon.id !== 'SHOTGUN' && !isSprinting && !playerState.isInspecting) {
                    const targetPoint = window.TacticalShooter.Ballistics.getCrosshairTarget(playerCamera.camera, range);
                    direction = new THREE.Vector3().subVectors(targetPoint, origin).normalize();
                }
                const shotOrigin = origin.clone();
                window.TacticalShooter.Ballistics.fireProjectile(origin, direction, this.currentWeapon, spread, (result) => this.onBulletHit(result, this.currentWeapon, shotOrigin));
            }
            if (this.currentWeapon.id !== 'RPG_SIGMA') {
                playerCamera.addRecoil(this.currentWeapon.recoilPitch, (Math.random() - 0.5) * this.currentWeapon.recoilYaw);
            }
        }
    };
    window.TacticalShooter.WeaponManager = WeaponManager;
})();
