
// js/ui/hud/hud_manager.js
(function() {
    const HUDManager = {
        activeHUD: null,
        
        // Registry of HUD Renderers
        renderers: {
            'basic': null,
            'shotgun': null,
            'rifle': null,
            'rpg': null
        },
        
        init() {
            console.log('HUDManager: Initializing...');
            
            // Init Sub-Modules
            if (window.TacticalShooter.BasicHUD) {
                this.renderers.basic = window.TacticalShooter.BasicHUD;
                this.renderers.basic.init();
            }
            if (window.TacticalShooter.ShotgunHUD) {
                this.renderers.shotgun = window.TacticalShooter.ShotgunHUD;
                this.renderers.shotgun.init();
            }
            if (window.TacticalShooter.RifleHUD) {
                this.renderers.rifle = window.TacticalShooter.RifleHUD;
                this.renderers.rifle.init();
            }
            if (window.TacticalShooter.RPGHUD) {
                this.renderers.rpg = window.TacticalShooter.RPGHUD;
                this.renderers.rpg.init();
            }
            
            this.activeHUD = this.renderers.basic;
        },
        
        update(playerState) {
            if (!playerState) return;
            
            const weapon = window.TacticalShooter.WeaponManager ? window.TacticalShooter.WeaponManager.currentWeapon : null;
            if (!weapon) return;
            
            // Switch Logic: Check hudType attribute
            let targetRenderer = this.renderers.basic;
            
            if (weapon.hudType === 'shotgun') {
                targetRenderer = this.renderers.shotgun;
            } else if (weapon.hudType === 'rifle') {
                targetRenderer = this.renderers.rifle;
            } else if (weapon.hudType === 'rpg') {
                targetRenderer = this.renderers.rpg;
            }
            
            // Transition
            if (this.activeHUD !== targetRenderer) {
                if (this.activeHUD) this.activeHUD.hide();
                this.activeHUD = targetRenderer;
                if (this.activeHUD) this.activeHUD.show();
            }
            
            // Render
            if (this.activeHUD) {
                this.activeHUD.update(playerState, weapon);
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.HUDManager = HUDManager;
})();
