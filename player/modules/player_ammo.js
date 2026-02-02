
// js/player/modules/player_ammo.js
(function() {
    class PlayerAmmo {
        constructor(stateContext) {
            this.state = stateContext; 
            
            this.currentAmmo = 0;
            this.maxAmmo = 0;
            this.currentAmmoType = 'none';
            this.currentWeaponId = null;
            
            this.ammoPools = {};
            this.weaponMagCache = {};
            
            // Reload State
            this.isReloading = false;
            this.reloadTimer = 0;
            this.reloadPhase = 'none';
            this.chamberingRequired = false;
            this.hasAddedRound = false;
            
            // Flags
            this.hasDroppedMag = false;
            this.hasDroppedMagLeft = false;
            
            // Pump Action
            this.pumpStage = 0;
            this.pumpTimer = 0;
            
            // Rocket Swap
            this.isSwappingAmmo = false;
            this.pendingSwapType = null;
        }

        get reserve() {
            if (this.currentAmmoType && this.ammoPools[this.currentAmmoType] !== undefined) {
                return this.ammoPools[this.currentAmmoType];
            }
            return 0;
        }

        get needsPump() { return this.pumpStage === 1; }
        get isPumping() { return this.pumpStage === 2; }

        reset() {
            this.weaponMagCache = {};
            this.ammoPools = {};
            this.currentWeaponId = null; 
            
            this.isReloading = false;
            this.reloadPhase = 'none';
            this.chamberingRequired = false;
            this.pumpStage = 0;
            this.pumpTimer = 0;
            this.isSwappingAmmo = false;
            
            this._initFromLoadout();
        }

        _initFromLoadout() {
            if (!window.TacticalShooter.LoadoutManager) return;
            const loadout = window.TacticalShooter.LoadoutManager.activeLoadout;
            if (!loadout) return;
            
            const processSlot = (slotData) => {
                if (!slotData || !slotData.id) return;
                const def = window.TacticalShooter.LoadoutManager.generateModifiedDef(slotData.id, slotData.attachments);
                if (def && def.ammoType) {
                    const type = def.ammoType;
                    const amount = def.reserveAmmo || 0;
                    
                    if (type.startsWith('rocket')) {
                        if (this.ammoPools['rocket_heat'] === undefined) this.ammoPools['rocket_heat'] = 0;
                        if (this.ammoPools['rocket_frag'] === undefined) this.ammoPools['rocket_frag'] = 0;
                    }
                    
                    this.ammoPools[type] = (this.ammoPools[type] || 0) + amount;
                    this.weaponMagCache[def.id] = def.magazineSize;
                }
            };
            
            processSlot(loadout.primary);
            processSlot(loadout.secondary);
        }

        setWeapon(weaponDef) {
            if (!weaponDef) return;
            
            if (this.currentWeaponId) {
                const prevDef = window.TacticalShooter.GameData.Weapons[this.currentWeaponId];
                if (prevDef && prevDef.type !== 'throwable' && prevDef.type !== 'melee') {
                    this.weaponMagCache[this.currentWeaponId] = this.currentAmmo;
                }
            }
            
            this.currentWeaponId = weaponDef.id;
            
            if (weaponDef.type === 'throwable') {
                this.maxAmmo = 1;
                this.currentAmmo = 1;
                this.currentAmmoType = 'none';
            } 
            else if (weaponDef.type === 'melee') {
                this.maxAmmo = 0;
                this.currentAmmo = 0;
                this.currentAmmoType = 'none';
            }
            else {
                this.maxAmmo = weaponDef.magazineSize;
                this.currentAmmoType = weaponDef.ammoType || 'none';
                
                if (this.weaponMagCache[this.currentWeaponId] !== undefined) {
                    this.currentAmmo = this.weaponMagCache[this.currentWeaponId];
                } else {
                    this.currentAmmo = this.maxAmmo;
                    this.weaponMagCache[this.currentWeaponId] = this.currentAmmo;
                }
            }
            
            this.cancelReload();
            this.pumpStage = 0;
            this.pumpTimer = 0;
            this.isSwappingAmmo = false;
        }

        consume(amount = 1) {
            if (this.needsPump || this.isPumping || this.isSwappingAmmo) return false;
            if (this.maxAmmo === 0) return true; 
            
            if (this.currentAmmo > 0) {
                this.currentAmmo = Math.max(0, this.currentAmmo - amount);
                if (this.currentWeaponId) {
                     this.weaponMagCache[this.currentWeaponId] = this.currentAmmo;
                }
                return true;
            }
            return false;
        }
        
        startAmmoSwap(targetType) {
            if (this.isReloading || this.isPumping || this.isSwappingAmmo) return;
            
            if (this.ammoPools[targetType] <= 0) {
                if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification("NO AMMO FOR SWAP", "red");
                return;
            }
            
            if (this.currentAmmoType === targetType) return;
            
            if (this.currentAmmo === 0) {
                this.currentAmmoType = targetType;
                if (window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.updateHUD) {
                    window.TacticalShooter.PlayerState.updateHUD();
                }
                this.startReload();
                return;
            }
            
            this.isSwappingAmmo = true;
            this.pendingSwapType = targetType;
            this.isReloading = true;
            this.reloadTimer = 0;
            this.reloadPhase = 'unload_swap';
        }

        startReload() {
            if (this.isReloading || this.isPumping || this.isSwappingAmmo) return false;
            if (this.maxAmmo === 0 || this.currentAmmo === this.maxAmmo) return false;
            if (this.reserve <= 0) return false;
            
            if (this.pumpStage !== 0) {
                this.chamberingRequired = true;
                this.pumpStage = 0;
            } else {
                this.chamberingRequired = (this.currentAmmo === 0);
            }

            this.isReloading = true;
            this.reloadTimer = 0;
            this.hasAddedRound = false;
            this.hasDroppedMag = false;
            this.hasDroppedMagLeft = false;
            
            const weapon = window.TacticalShooter.WeaponManager.currentWeapon;
            if (weapon.reloadType === 'incremental') this.reloadPhase = 'start';
            else this.reloadPhase = 'standard';
            
            return true;
        }

        cancelReload() {
            if (this.isReloading) {
                this.isReloading = false;
                this.reloadPhase = 'none';
                this.isSwappingAmmo = false;
                
                if (this.chamberingRequired && this.currentAmmo > 0) {
                    this.pumpStage = 1; 
                } else {
                    this.chamberingRequired = false;
                }
            }
        }
        
        finishReload() {
            if (this.reloadPhase === 'standard') {
                const needed = this.maxAmmo - this.currentAmmo;
                const toAdd = Math.min(needed, this.reserve);
                this.currentAmmo += toAdd;
                this.ammoPools[this.currentAmmoType] -= toAdd;
                this.weaponMagCache[this.currentWeaponId] = this.currentAmmo;
                this.isReloading = false;
                this.reloadPhase = 'none';
            }
        }

        update(dt) {
            const wm = window.TacticalShooter.WeaponManager;
            if (wm && wm.currentWeapon && wm.currentWeapon.actionType === 'pump' && this.pumpStage === 2) {
                this.pumpTimer += dt;
                const cycle = wm.currentWeapon.pumpCycleTime || 0.35;
                if (this.pumpTimer >= cycle) {
                    this.pumpStage = 0; 
                    this.pumpTimer = 0;
                }
            }

            if (this.isReloading) {
                this.reloadTimer += dt;
                
                if (this.reloadPhase === 'unload_swap') {
                    let swapDuration = 0.8; 
                    // ROCKET_JUMP Perk: 75% Reduction -> 0.25 multiplier
                    if (window.TacticalShooter.PerkSystem && window.TacticalShooter.PerkSystem.hasPerk('ROCKET_JUMP')) {
                        swapDuration *= 0.25;
                    }
                    if (this.reloadTimer >= swapDuration) {
                        this.currentAmmo = 0;
                        this.ammoPools[this.currentAmmoType]++;
                        this.weaponMagCache[this.currentWeaponId] = 0;
                        this.currentAmmoType = this.pendingSwapType;
                        this.reloadPhase = 'standard';
                        this.reloadTimer = 0;
                        this.isSwappingAmmo = false;
                        if (this.state.updateHUD) this.state.updateHUD();
                    }
                    return;
                }

                const weapon = wm.currentWeapon;
                if (!weapon) { this.cancelReload(); return; }

                if (this.reloadPhase === 'standard') {
                    if (this.reloadTimer >= weapon.reloadTime) {
                        this.finishReload();
                    }
                }
                else if (this.reloadPhase === 'start') {
                    const startDur = weapon.reloadStart || 1.0;
                    
                    // Specific logic for Shotgun chamber load during start animation
                    if (weapon.reloadStartAddsAmmo && !this.hasAddedRound) {
                        const insertTime = weapon.reloadStartInsertTime || 0.9;
                        if (this.reloadTimer >= insertTime) {
                            this._addSingleRound();
                            this.hasAddedRound = true;
                        }
                    }

                    if (this.reloadTimer >= startDur) {
                        this.reloadPhase = 'loop';
                        this.reloadTimer = 0; 
                        this.hasAddedRound = false;
                        
                        // If we filled up during start (e.g. 1-round cap), finish
                        if (this.currentAmmo >= this.maxAmmo || this.reserve <= 0) {
                            this.finishReload();
                        }
                    }
                }
                else if (this.reloadPhase === 'loop') {
                    const loopDur = weapon.reloadLoop || 0.5;
                    if (this.reloadTimer >= loopDur * 0.5 && !this.hasAddedRound) {
                        this._addSingleRound();
                        this.hasAddedRound = true;
                    }
                    
                    if (this.reloadTimer >= loopDur) {
                        if (this.currentAmmo < this.maxAmmo && this.reserve > 0 && !window.TacticalShooter.InputManager.isActionActive('Shoot')) {
                            this.reloadTimer = 0;
                            this.hasAddedRound = false;
                        } else {
                            this.isReloading = false;
                            this.reloadPhase = 'none';
                            if (this.chamberingRequired) {
                                this.pumpStage = 1; 
                                this.chamberingRequired = false;
                            }
                        }
                    }
                }
            }
        }
        
        _addSingleRound() {
            if (this.reserve > 0 && this.currentAmmo < this.maxAmmo) {
                this.currentAmmo++;
                this.ammoPools[this.currentAmmoType]--;
                this.weaponMagCache[this.currentWeaponId] = this.currentAmmo;
            }
        }
        
        markNeedsPump() {
            this.pumpStage = 1;
        }
        
        triggerPump() {
            if (this.pumpStage === 1) {
                this.pumpStage = 2; 
                this.pumpTimer = 0;
            }
        }
    }
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.PlayerAmmo = PlayerAmmo;
})();
