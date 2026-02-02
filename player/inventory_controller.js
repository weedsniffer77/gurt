
// js/player/inventory_controller.js
(function() {
    const InventoryController = {
        slots: ['primary', 'secondary', 'melee', 'equipment1', 'equipment2'],
        throwCooldown: 0,
        grenadeInventory: [null, null], 
        
        // Tracks preference: 0 for Eq1, 1 for Eq2
        activeGrenadeIndex: 0, 

        init() {
            console.log('InventoryController: Initializing...');
            this.retryInit();
        },
        
        retryInit() {
            if (window.TacticalShooter.GameData && window.TacticalShooter.GameData.Throwables) {
                // Ready
            } else {
                setTimeout(() => this.retryInit(), 100);
            }
        },
        
        initInventoryFromLoadout() {
            const LM = window.TacticalShooter.LoadoutManager;
            if (!LM) return;
            const active = LM.activeLoadout;
            if (!active) return;
            const GD = window.TacticalShooter.GameData;
            this.grenadeInventory = [null, null];
            this.activeGrenadeIndex = 0; // Default to first slot on respawn
            
            const processSlot = (slotName, index) => {
                if (LM.isSlotLocked(slotName, active)) return;
                const slotData = active[slotName];
                if (!slotData || !slotData.id) return;
                
                let def = GD.Throwables[slotData.id];
                if (!def) def = GD.Weapons[slotData.id];
                if (!def) return;
                
                const count = (def.count !== undefined) ? def.count : 1;
                
                if (def.type === 'ammo') {
                    if (window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.modules.ammo && def.ammoPoolType) {
                        const PA = window.TacticalShooter.PlayerState.modules.ammo;
                        PA.ammoPools[def.ammoPoolType] = (PA.ammoPools[def.ammoPoolType] || 0) + count;
                        if (PA.currentAmmoType === def.ammoPoolType && window.TacticalShooter.PlayerState.updateHUD) {
                             window.TacticalShooter.PlayerState.updateHUD();
                        }
                    }
                } else {
                    if (this.grenadeInventory[0] && this.grenadeInventory[0].id === def.id) {
                        this.grenadeInventory[0].count += count;
                    } else if (index === 0) {
                        this.grenadeInventory[0] = { id: def.id, count: count, def: def };
                    } else if (index === 1) {
                         this.grenadeInventory[1] = { id: def.id, count: count, def: def };
                    }
                }
            };
            processSlot('equipment1', 0);
            processSlot('equipment2', 1);
        },
        
        refillAll() {
            this.initInventoryFromLoadout();
            // Also refresh HUD logic for current grenade if held
            const WM = window.TacticalShooter.WeaponManager;
            if (WM && WM.currentWeapon && WM.currentWeapon.type === 'throwable') {
                const ps = window.TacticalShooter.PlayerState;
                if (ps) {
                    const LM = window.TacticalShooter.LoadoutManager;
                    const count = this.getGrenadeCount(LM.activeSlot);
                    ps.reserveAmmo = Math.max(0, count - 1);
                    ps.currentAmmo = (count > 0) ? 1 : 0;
                    ps.updateHUD();
                }
            }
        },
        
        update(inputManager, playerState) {
            if (window.TacticalShooter.ScorestreakManager) {
                window.TacticalShooter.ScorestreakManager.update(inputManager);
            }

            if (this.throwCooldown > 0) this.throwCooldown -= 0.016; 
            if (window.TacticalShooter.MatchState && window.TacticalShooter.MatchState.state.status === 'PRE_ROUND') return;
            if (playerState.isDead) return;
            
            // Handle Slot 4 Toggle Logic
            if (inputManager.wasActionJustPressed('Slot4')) {
                const WM = window.TacticalShooter.WeaponManager;
                
                // RPG Special Case: Swap Rocket Type
                if (WM && WM.currentWeapon && WM.currentWeapon.id === 'RPG7') {
                     WM.swapRocketType();
                     return; 
                }
                
                this.toggleGrenadeSlot();
                return;
            }

            let requestedSlot = null;
            const currentSlot = window.TacticalShooter.LoadoutManager.activeSlot || 'primary';
            const activeLoadout = window.TacticalShooter.LoadoutManager.activeLoadout;

            if (inputManager.wasActionJustPressed('Slot1')) requestedSlot = 'primary';
            else if (inputManager.wasActionJustPressed('Slot2')) requestedSlot = 'secondary';
            else if (inputManager.wasActionJustPressed('Slot3')) requestedSlot = 'melee'; 
            
            // Cycle Logic
            const findNextValidSlot = (dir) => {
                const currentIndex = this.slots.indexOf(currentSlot);
                let checkIndex = currentIndex;
                const LM = window.TacticalShooter.LoadoutManager;
                let safety = 0;
                while(safety < this.slots.length) {
                    checkIndex += dir;
                    if (checkIndex >= this.slots.length) checkIndex = 0;
                    if (checkIndex < 0) checkIndex = this.slots.length - 1;
                    const slotName = this.slots[checkIndex];
                    if (LM.isSlotLocked(slotName, activeLoadout)) { safety++; continue; }
                    if (slotName.startsWith('equipment')) {
                        const gIdx = slotName === 'equipment1' ? 0 : 1;
                        if (this.grenadeInventory[gIdx] && this.grenadeInventory[gIdx].count > 0) return slotName;
                        safety++; continue;
                    }
                    if (activeLoadout[slotName] && activeLoadout[slotName].id) return slotName;
                    safety++;
                }
                return null;
            };

            if (inputManager.wasActionJustPressed('CycleUp') || inputManager.wasActionJustPressed('WheelUp')) requestedSlot = findNextValidSlot(-1);
            else if (inputManager.wasActionJustPressed('CycleDown') || inputManager.wasActionJustPressed('WheelDown')) requestedSlot = findNextValidSlot(1);

            if (requestedSlot && requestedSlot !== currentSlot) {
                // If cycling into a grenade slot, update activeGrenadeIndex to match
                if (requestedSlot === 'equipment1') this.activeGrenadeIndex = 0;
                else if (requestedSlot === 'equipment2') this.activeGrenadeIndex = 1;
                
                this.requestSwitch(requestedSlot);
            }
        },
        
        toggleGrenadeSlot() {
            // Logic:
            // 1. If currently holding a grenade, switch to the OTHER grenade slot (if available).
            // 2. If NOT holding a grenade, switch to the last activeGrenadeIndex (if available).
            // 3. Fallback to other index if preferred is empty.
            
            const currentSlot = window.TacticalShooter.LoadoutManager.activeSlot;
            const isHoldingGrenade = (currentSlot === 'equipment1' || currentSlot === 'equipment2');
            
            let targetIndex = this.activeGrenadeIndex;
            
            if (isHoldingGrenade) {
                // Toggle index
                targetIndex = (this.activeGrenadeIndex === 0) ? 1 : 0;
            }
            
            // Check availability of target
            if (!this.grenadeInventory[targetIndex] || this.grenadeInventory[targetIndex].count <= 0) {
                // Fallback to other
                targetIndex = (targetIndex === 0) ? 1 : 0;
                // If other is also empty, do nothing
                if (!this.grenadeInventory[targetIndex] || this.grenadeInventory[targetIndex].count <= 0) {
                    return;
                }
            }
            
            // Update preference
            this.activeGrenadeIndex = targetIndex;
            const targetSlot = (targetIndex === 0) ? 'equipment1' : 'equipment2';
            
            this.requestSwitch(targetSlot);
        },
        
        requestSwitch(slotName) {
            const WM = window.TacticalShooter.WeaponManager;
            if (WM) WM.initiateSwitch(slotName);
        },
        
        getGrenadeCount(slotName) {
            let idx = -1;
            if (slotName === 'equipment1') idx = 0; else if (slotName === 'equipment2') idx = 1;
            if (idx === -1) return 0;
            const LM = window.TacticalShooter.LoadoutManager;
            if (LM && LM.isSlotLocked(slotName, LM.activeLoadout)) return 0;
            const item = this.grenadeInventory[idx];
            return item ? item.count : 0;
        },
        
        consumeGrenade(slotName) {
            let idx = -1;
            if (slotName === 'equipment1') idx = 0; else if (slotName === 'equipment2') idx = 1;
            if (idx === -1) return false;
            const item = this.grenadeInventory[idx];
            if (item && item.count > 0) {
                item.count--;
                if (idx === 0 && item.count <= 0) {
                    // Auto-switch logic handled in WeaponManager recovery
                }
                return true;
            }
            return false;
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.InventoryController = InventoryController;
})();
