
// js/ui/hud/basic_hud.js
(function() {
    const BasicHUD = {
        container: null,
        chargeContainer: null,
        chargeFill: null,
        
        init() {
            this.container = document.getElementById('ammo-display');
            this.chargeContainer = document.getElementById('grenade-charge-container');
            this.chargeFill = document.getElementById('grenade-charge-fill');
        },
        
        show() {
            if (this.container) this.container.style.display = 'block';
        },
        
        hide() {
            if (this.container) this.container.style.display = 'none';
            if (this.chargeContainer) this.chargeContainer.style.display = 'none';
        },
        
        update(playerState, weaponDef) {
            if (!this.container) return;
            
            if (weaponDef.type === 'throwable') {
                // For Grenades, show TOTAL count (Inventory based)
                let count = 0;
                if (window.TacticalShooter.InventoryController) {
                    const slot = window.TacticalShooter.LoadoutManager ? window.TacticalShooter.LoadoutManager.activeSlot : 'equipment1';
                    count = window.TacticalShooter.InventoryController.getGrenadeCount(slot);
                }
                this.container.innerHTML = `${count}`;
                this.container.style.color = "#fff";
                
                // Charge Bar Logic
                if (this.chargeContainer && this.chargeFill) {
                    const wm = window.TacticalShooter.WeaponManager;
                    // Check if charging (state is 'primed') AND NOT Quick Action (hide during quick throw)
                    const isQuickAction = wm && wm.quickActionState !== 'none';
                    
                    if (wm && wm.grenadeState === 'primed' && !isQuickAction) {
                        this.chargeContainer.style.display = 'block';
                        // Max time updated to 1.5s
                        const chargeRatio = Math.min(1.0, wm.grenadeChargeTimer / 1.5); 
                        this.chargeFill.style.width = `${chargeRatio * 100}%`;
                        
                        // Color Shift
                        if (chargeRatio > 0.9) this.chargeFill.style.backgroundColor = '#ff4444';
                        else this.chargeFill.style.backgroundColor = '#ffaa00';
                        
                    } else {
                        this.chargeContainer.style.display = 'none';
                    }
                }
                return;
            } else {
                // Hide charge bar for guns
                if (this.chargeContainer) this.chargeContainer.style.display = 'none';
            }

            if (playerState.isReloading) {
                this.container.innerHTML = `RELOADING... <span class="ammo-reserve">${playerState.reserveAmmo}</span>`;
                this.container.style.color = "#fff";
            } else {
                // If melee, show --
                if (weaponDef.magazineSize === 0) {
                    this.container.innerHTML = "--";
                } else {
                    this.container.innerHTML = `${playerState.currentAmmo} <span class="mag-cap">/ ${playerState.maxAmmo}</span> <span class="ammo-reserve">${playerState.reserveAmmo}</span>`;
                }
                this.container.style.color = "#fff";
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.BasicHUD = BasicHUD;
})();
