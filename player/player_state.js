
// js/player/player_state.js
(function() {
    // Facade Pattern: Aggregates sub-modules while maintaining original API
    const PlayerState = {
        modules: {
            health: null,
            ammo: null
        },

        // Animation/Action Flags
        isADS: false,
        isInspecting: false,
        isAttachmentOn: false,
        currentActionId: 0,
        actionStartTime: 0,
        
        // Visibility Flag (GOLDEN STATE)
        isSpectating: true,
        isControllingDrone: false,
        
        // Cache for attachment states per weapon ID
        weaponAttachmentStates: {},
        
        DEATH_CAM_DURATION: 5.0,
        deathTimestamp: 0, 

        // --- Getters/Setters directing to Modules ---
        get health() { return this.modules.health ? this.modules.health.hp : 100; },
        set health(v) { if(this.modules.health) this.modules.health.hp = v; },
        
        get maxHealth() { return this.modules.health ? this.modules.health.maxHp : 100; },
        get isDead() { return this.modules.health ? this.modules.health.isDead : false; },
        set isDead(v) { if(this.modules.health) this.modules.health.isDead = v; },
        
        get damageHealth() { return this.modules.health ? this.modules.health.damageHealth : 100; },
        get deathTimer() { return this.modules.health ? this.modules.health.deathTimer : 0; },
        set deathTimer(v) { if(this.modules.health) this.modules.health.deathTimer = v; },
        
        get deployWaitTimer() { return this.modules.health ? this.modules.health.deployWaitTimer : 0; },
        set deployWaitTimer(v) { if(this.modules.health) this.modules.health.deployWaitTimer = v; },

        get currentAmmo() { return this.modules.ammo ? this.modules.ammo.currentAmmo : 0; },
        set currentAmmo(v) { if(this.modules.ammo) this.modules.ammo.currentAmmo = v; },
        
        get maxAmmo() { return this.modules.ammo ? this.modules.ammo.maxAmmo : 0; },
        set maxAmmo(v) { if(this.modules.ammo) this.modules.ammo.maxAmmo = v; },
        
        get reserveAmmo() { return this.modules.ammo ? this.modules.ammo.reserve : 0; },
        set reserveAmmo(v) { if(this.modules.ammo) this.modules.ammo.reserve = v; },
        
        get isReloading() { return this.modules.ammo ? this.modules.ammo.isReloading : false; },
        set isReloading(v) { if(this.modules.ammo) this.modules.ammo.isReloading = v; },
        
        get reloadTimer() { return this.modules.ammo ? this.modules.ammo.reloadTimer : 0; },
        get reloadPhase() { return this.modules.ammo ? this.modules.ammo.reloadPhase : 'none'; },
        
        get reloadChamberingRequired() { return this.modules.ammo ? this.modules.ammo.chamberingRequired : false; },
        
        get hasDroppedMag() { return this.modules.ammo ? this.modules.ammo.hasDroppedMag : false; },
        set hasDroppedMag(v) { if(this.modules.ammo) this.modules.ammo.hasDroppedMag = v; },
        
        get hasDroppedMagLeft() { return this.modules.ammo ? this.modules.ammo.hasDroppedMagLeft : false; },
        set hasDroppedMagLeft(v) { if(this.modules.ammo) this.modules.ammo.hasDroppedMagLeft = v; },
        
        get pumpStage() { return this.modules.ammo ? this.modules.ammo.pumpStage : 0; },
        get pumpTimer() { return this.modules.ammo ? this.modules.ammo.pumpTimer : 0; },
        
        get needsPump() { return this.modules.ammo ? this.modules.ammo.needsPump : false; },
        get isPumping() { return this.modules.ammo ? this.modules.ammo.isPumping : false; },

        init() {
            console.log('PlayerState: Initializing (Facade Mode)...');
            if (window.TacticalShooter.PlayerHealth) this.modules.health = new window.TacticalShooter.PlayerHealth(this);
            if (window.TacticalShooter.PlayerAmmo) this.modules.ammo = new window.TacticalShooter.PlayerAmmo(this);
            
            this.resetSession();
            
            if (window.TacticalShooter.HUDManager) window.TacticalShooter.HUDManager.init();
            if (window.TacticalShooter.DeploymentScreen) window.TacticalShooter.DeploymentScreen.init();
            if (window.TacticalShooter.DamageIndicatorSystem) window.TacticalShooter.DamageIndicatorSystem.init();
            
            this.updateHUD();
        },
        
        resetSession() {
            if (this.modules.health) this.modules.health.reset();
            if (this.modules.ammo) this.modules.ammo.reset();
            
            this.isADS = false;
            this.isInspecting = false;
            this.isAttachmentOn = false;
            this.isControllingDrone = false; 
            this.currentActionId = 0;
            this.weaponAttachmentStates = {};
            this.deathTimestamp = 0;
            
            if (window.TacticalShooter.WeaponManager) {
                const def = window.TacticalShooter.WeaponManager.currentWeapon;
                if (def) this.setWeapon(def);
            }
            this.updateHUD();
        },
        
        enterSpectatorMode() {
            this.resetSession();
            this.isSpectating = true;
            this.isDead = false; 
            
            this.health = Infinity; 
            
            if (window.TacticalShooter.GunRenderer) {
                window.TacticalShooter.GunRenderer.setVisible(false);
            }
            if (window.TacticalShooter.PostProcessor) {
                window.TacticalShooter.PostProcessor.reset();
            }
            
            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                window.TacticalShooter.PlayroomManager.myPlayer.setState('status', 'SPECTATING', true);
                window.TacticalShooter.PlayroomManager.myPlayer.setState('ragdollData', null, true);
            }

            // CHECK SETTING FOR DRONE SPECTATOR
            const settings = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings : {};
            
            if (settings.spectateDrone && window.TacticalShooter.DroneController) {
                // Launch Spectator Drone
                this.isControllingDrone = true;
                
                // Move Character Controller WAY OUT OF THE WAY so it doesn't get hit
                if (window.TacticalShooter.CharacterController) {
                    window.TacticalShooter.CharacterController.position.set(0, -9000, 0); // Void
                    window.TacticalShooter.CharacterController.velocity.set(0, 0, 0);
                    window.TacticalShooter.CharacterController.isNoclip = true; // Stop physics
                }
                
                // Spawn at a good vantage point
                const startPos = new window.THREE.Vector3(0, 10, 0);
                const startRot = new window.THREE.Quaternion();
                window.TacticalShooter.DroneController.activateSpectator(startPos, startRot);
                
            } else {
                // Standard Noclip (Free Cam)
                if (window.TacticalShooter.CharacterController) {
                    window.TacticalShooter.CharacterController.isNoclip = true;
                    window.TacticalShooter.CharacterController.position.set(0, 7.5, 0);
                }
            }
        },
        
        setWeapon(weaponDef) {
            if (this.modules.ammo) this.modules.ammo.setWeapon(weaponDef);
            this.isInspecting = false;
            if (weaponDef && weaponDef.id) {
                if (this.weaponAttachmentStates[weaponDef.id] !== undefined) {
                    this.isAttachmentOn = this.weaponAttachmentStates[weaponDef.id];
                } else {
                    this.isAttachmentOn = false; 
                }
            } else {
                this.isAttachmentOn = false;
            }
            this.updateHUD();
        },
        
        takeDamage(amount, sourceId, hitPart, impulseForce, isStealth, damageOrigin, overrideImpulseDir) {
            if (this.isSpectating) return; 
            if (this.isDead) return;
            
            if (this.modules.health) {
                this.modules.health.takeDamage(amount, sourceId, hitPart, impulseForce, isStealth, damageOrigin, overrideImpulseDir);
                // Trigger Drone Detonation if killed
                if (this.modules.health.hp <= 0) {
                    if (this.deathTimestamp === 0) this.deathTimestamp = Date.now();
                    if (this.isControllingDrone && window.TacticalShooter.DroneController) {
                        window.TacticalShooter.DroneController.detonate();
                    }
                }
            }
        },
        
        cancelSpawnProtection() {
            if (this.modules.health) this.modules.health.cancelSpawnProtection();
        },
        
        respawn() {
            if (window.TacticalShooter.MatchState && window.TacticalShooter.MatchState.state.status === 'GAME_OVER') {
                if (window.TacticalShooter.UIManager) {
                    window.TacticalShooter.UIManager.showNotification("MATCH ENDED - WAITING FOR RESET", "red");
                }
                return;
            }

            if (this.modules.health && !this.modules.health.isDead && !this.isSpectating) return;
            
            // CLEANUP DRONE IF WAS SPECTATING AS DRONE
            if (this.isSpectating && this.isControllingDrone && window.TacticalShooter.DroneController) {
                window.TacticalShooter.DroneController.deactivate();
            }

            this.isSpectating = false; 
            this.isControllingDrone = false;
            
            this.resetSession();
            
            // EQUIP LOADOUT & INIT INVENTORY
            if (window.TacticalShooter.LoadoutManager) {
                const lm = window.TacticalShooter.LoadoutManager;
                lm.equipLoadout(lm.currentLoadoutIndex); 
                lm.activeSlot = 'primary';
            }
            
            if (window.TacticalShooter.WeaponManager) {
                window.TacticalShooter.WeaponManager.reset(); 
                if (window.TacticalShooter.GunRenderer) {
                    window.TacticalShooter.GunRenderer.setVisible(true);
                }
            }

            if (window.TacticalShooter.CharacterController) {
                window.TacticalShooter.CharacterController.isNoclip = false;
            }
            
            if (window.TacticalShooter.PostProcessor) {
                window.TacticalShooter.PostProcessor.reset();
            }
            const canvas = document.getElementById('game-canvas');
            if (canvas) canvas.classList.remove('canvas-blur');
            
            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                window.TacticalShooter.PlayroomManager.myPlayer.setState('ragdollData', null, true);
                window.TacticalShooter.PlayroomManager.myPlayer.setState('status', 'ALIVE', true);
                window.TacticalShooter.PlayroomManager.myPlayer.setState('droneData', null, true); // Clear drone
            }
            
            if (window.TacticalShooter.DeathCameraController) window.TacticalShooter.DeathCameraController.stop();
            if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.spawnPlayer();
            if (window.TacticalShooter.DeploymentScreen) window.TacticalShooter.DeploymentScreen.hide();
            
            if (window.TacticalShooter.MultiplayerUI) {
                window.TacticalShooter.MultiplayerUI.requestPointerLock();
                window.TacticalShooter.MultiplayerUI.setHUDVisible(true);
            }
            
            this.updateHUD();
        },
        
        update(dt) {
            const MS = window.TacticalShooter.MatchState;
            const IM = window.TacticalShooter.InputManager;
            if (MS && MS.state.status === 'PRE_ROUND' && IM) {
                if (IM.justPressed['Digit1']) this.applyLoadout(0);
                if (IM.justPressed['Digit2']) this.applyLoadout(1);
                if (IM.justPressed['Digit3']) this.applyLoadout(2);
                if (IM.justPressed['Digit4']) this.applyLoadout(3);
                if (IM.justPressed['Digit5']) this.applyLoadout(4);
            }

            // --- ROCKET SIGMA HEALTH CHECK ---
            // If active weapon is SIGMA, enforce god-like HP
            const WM = window.TacticalShooter.WeaponManager;
            if (WM && WM.currentWeapon && WM.currentWeapon.id === 'RPG_SIGMA' && !this.isDead && !this.isSpectating) {
                 if (this.modules.health && this.modules.health.maxHp < 1000) {
                     this.modules.health.maxHp = 1000;
                     if (this.modules.health.hp < 1000) this.modules.health.hp = 1000;
                     this.modules.health.updateUI();
                 }
            }

            if (this.modules.health) {
                if (this.modules.health.isDead) {
                    this._updateDead(dt);
                    return;
                }
                this.modules.health.update(dt);
            }
            
            if (this.modules.ammo) {
                this.modules.ammo.update(dt);
            }
            
            this.updateHUD();
            
            const nameEl = document.getElementById('player-name-display');
            if (nameEl && window.TacticalShooter.PlayroomManager) {
                const actualName = window.TacticalShooter.PlayroomManager.localPlayerName || 'OPERATOR';
                if (nameEl.textContent !== actualName) nameEl.textContent = actualName;
            }
        },
        
        _updateDead(dt) {
            // Check Skip
            let skipPressed = false;
            if (window.TacticalShooter.InputManager) {
                if (window.TacticalShooter.InputManager.justPressed['Space'] || 
                    window.TacticalShooter.InputManager.wasActionJustPressed('Jump')) {
                    skipPressed = true;
                }
            }
            
            // Failsafe: Set timestamp if missing (e.g. Force Death from Network)
            if (this.deathTimestamp === 0) {
                this.deathTimestamp = Date.now();
            }
            
            // Failsafe: Ensure Timer is valid if we just died
            if (this.deathTimer <= 0 && (Date.now() - this.deathTimestamp) < 500) {
                this.deathTimer = 5.0; // Force reset if it glitches to 0 instantly
            }
            
            const elapsed = (Date.now() - this.deathTimestamp) / 1000;
            
            // Only allow skipping after 1 second (Accidental press protection)
            if (skipPressed && elapsed < 1.0) {
                skipPressed = false;
            }
            
            if (this.deathTimer > 0) {
                this.deathTimer -= dt;
            }

            // Only exit if timer expired OR explicit skip allowed
            if (this.deathTimer <= 0 || (skipPressed && elapsed >= 1.0) || elapsed > this.DEATH_CAM_DURATION + 1.0) {
                this.deathTimer = 0;
                
                if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentState === 'MENU') {
                    return;
                }

                if (window.TacticalShooter.DeploymentScreen) {
                    window.TacticalShooter.DeploymentScreen.hideDeathInfo();
                    window.TacticalShooter.DeploymentScreen.hide(); 
                    
                    // AUTO SHOW DEPLOYMENT SCREEN
                    if (window.TacticalShooter.MatchState && window.TacticalShooter.MatchState.state.status !== 'GAME_OVER') {
                         window.TacticalShooter.DeploymentScreen.show();
                    }
                }
                
                if (window.TacticalShooter.GameManager) {
                    window.TacticalShooter.GameManager.enterMenu();
                }
                
                if (window.TacticalShooter.DeathCameraController) {
                    window.TacticalShooter.DeathCameraController.stop();
                }
            }
        },
        
        toggleAttachment() { 
            this.isAttachmentOn = !this.isAttachmentOn;
            if (window.TacticalShooter.WeaponManager) {
                const def = window.TacticalShooter.WeaponManager.currentWeapon;
                if (def && def.id) {
                    this.weaponAttachmentStates[def.id] = this.isAttachmentOn;
                }
            }
        },
        
        setADS(active) {
            if (this.isDead || this.isReloading || this.isSpectating || this.isControllingDrone) { this.isADS = false; return; }
            this.isADS = active;
            if (active) this.isInspecting = false;
        },
        
        toggleInspect() {
            if (!this.isDead && !this.isReloading && !this.isADS && !this.isPumping && !this.needsPump && !this.isSpectating && !this.isControllingDrone) {
                this.isInspecting = !this.isInspecting;
            }
        },
        
        startReload() { return this.modules.ammo ? this.modules.ammo.startReload() : false; },
        cancelReload() { if(this.modules.ammo) this.modules.ammo.cancelReload(); },
        consumeAmmo(n) { 
            if (this.isInspecting) this.isInspecting = false; 
            return this.modules.ammo ? this.modules.ammo.consume(n) : false; 
        },
        markNeedsPump() { if(this.modules.ammo) this.modules.ammo.markNeedsPump(); },
        triggerPump() { if(this.modules.ammo) this.modules.ammo.triggerPump(); },
        canShoot() { 
            if (this.maxAmmo === 0) return !this.isDead && !this.isReloading && !this.isSpectating && !this.isControllingDrone;
            return !this.isDead && !this.isReloading && !this.needsPump && !this.isPumping && this.currentAmmo > 0 && !this.isSpectating && !this.isControllingDrone;
        },

        updateHUD() {
            if (window.TacticalShooter.HUDManager) {
                const weapon = window.TacticalShooter.WeaponManager ? window.TacticalShooter.WeaponManager.currentWeapon : null;
                if(weapon) window.TacticalShooter.HUDManager.update(this, weapon);
            }
        },
        
        toggleInGameLoadoutPicker(show) {
             const picker = document.getElementById('ingame-loadout-picker');
            const status = document.getElementById('player-status');
            if (!picker || !status) return;
            if (show) {
                this.renderLoadoutPicker('ilp-list');
                picker.style.display = 'block';
                picker.classList.remove('fade-out');
                status.style.display = 'none';
            } else {
                picker.classList.add('fade-out');
                status.style.display = 'block';
                setTimeout(() => { if (picker.classList.contains('fade-out')) picker.style.display = 'none'; }, 500);
            }
        },
        
        renderLoadoutPicker(containerId) {
             const container = document.getElementById(containerId);
             if (!container) return;
             container.innerHTML = '';
             const LM = window.TacticalShooter.LoadoutManager;
             const GD = window.TacticalShooter.GameData;
             const currentIdx = LM.currentLoadoutIndex;
             LM.savedLoadouts.forEach((l, i) => {
                 const slot = document.createElement('div');
                 slot.className = `ilp-slot ${i === currentIdx ? 'active' : ''}`;
                 
                 const getWepName = (id) => {
                     if(GD.Weapons[id]) return GD.Weapons[id].name;
                     if(GD.Throwables[id]) return GD.Throwables[id].name;
                     if(GD.Scorestreaks && GD.Scorestreaks[id]) return GD.Scorestreaks[id].name;
                     return id;
                 };
                 const getAttString = (id, atts) => {
                      if (!atts || atts.length === 0) return "";
                      const names = atts.map(aId => GD.Attachments[aId] ? GD.Attachments[aId].name : aId);
                      return names.join(" + ");
                 };
                 
                 const pName = getWepName(l.primary.id);
                 const sName = getWepName(l.secondary.id);
                 const mName = getWepName(l.melee.id);
                 const t1 = l.equipment1 ? getWepName(l.equipment1.id) : "EMPTY";
                 const t2 = l.equipment2 ? getWepName(l.equipment2.id) : "EMPTY";
                 
                 const secLocked = LM.isSlotLocked('secondary', l) ? 'locked' : '';
                 const eqLocked = LM.isSlotLocked('equipment2', l) ? 'locked' : ''; 

                 let gNameHtml = `<span class="ilp-wep">${t1}</span> + <span class="ilp-wep ${eqLocked}">${t2}</span>`;
                 if (t1 === "EMPTY" && t2 === "EMPTY") gNameHtml = `<span class="ilp-wep">EMPTY</span>`;

                 let html = `<div class="ilp-num">${(i+1).toString().padStart(2, '0')}</div>
                    <div class="ilp-content">
                        <span class="ilp-wep" ${getAttString(l.primary.id, l.primary.attachments) ? `data-tooltip="${pName}: ${getAttString(l.primary.id, l.primary.attachments)}"` : ''}>${pName}</span>
                        <span class="ilp-sep">|</span>
                        <span class="ilp-wep ${secLocked}" ${getAttString(l.secondary.id, l.secondary.attachments) ? `data-tooltip="${sName}: ${getAttString(l.secondary.id, l.secondary.attachments)}"` : ''}>${sName}</span>
                        <span class="ilp-sep">|</span>
                        <span class="ilp-wep">${mName}</span>
                        <span class="ilp-sep">|</span>
                        ${gNameHtml}
                    </div>`;
                 
                 slot.innerHTML = html;
                 slot.onclick = () => this.applyLoadout(i);
                 container.appendChild(slot);
             });
        },
        
        applyLoadout(index) {
             const LM = window.TacticalShooter.LoadoutManager;
             LM.equipLoadout(index);
             this.renderLoadoutPicker('ilp-list');
             this.renderLoadoutPicker('deployment-loadout-container');
             if (document.getElementById('menu-loadout-quick-select')) {
                 this.renderLoadoutPicker('menu-loadout-quick-select');
             }
             if (!this.isDead && !this.isSpectating) {
                 this.resetSession(); 
                 if (window.TacticalShooter.InventoryController) {
                     window.TacticalShooter.InventoryController.initInventoryFromLoadout();
                 }
                 if (window.TacticalShooter.WeaponManager) window.TacticalShooter.WeaponManager.refreshCurrentWeapon();
             }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.PlayerState = PlayerState;
})();
