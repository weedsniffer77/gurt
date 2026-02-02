
// js/ui/deployment_screen.js
(function() {
    const DeploymentScreen = {
        deathInfoElement: null,
        
        init() {
            this.deathInfoElement = document.getElementById('death-cam-overlay');
        },
        
        // Shows the 5-second death camera info (Killer name + Skip)
        showDeathInfo(killerName) {
            if (!this.deathInfoElement) this.init();
            
            const nameEl = document.getElementById('death-killer-name');
            if (nameEl) {
                nameEl.textContent = killerName || 'UNKNOWN';
            }
            
            if (this.deathInfoElement) {
                this.deathInfoElement.style.display = 'flex';
                this.deathInfoElement.classList.add('active');
            }
        },
        
        hideDeathInfo() {
            if (this.deathInfoElement) {
                this.deathInfoElement.classList.remove('active');
                this.deathInfoElement.style.display = 'none';
            }
        },
        
        // REPLACED: Redirect to Main Menu
        show() {
            // Ensure blur is on
            const canvas = document.getElementById('game-canvas');
            if (canvas) canvas.classList.add('canvas-blur');
            
            if (window.TacticalShooter.MultiplayerUI) {
                window.TacticalShooter.MultiplayerUI.showMainMenu();
            }
            
            // Ensure mouse is unlocked
            if (document.exitPointerLock) document.exitPointerLock();
            
            // Hide HUD
            if (window.TacticalShooter.MultiplayerUI) {
                window.TacticalShooter.MultiplayerUI.setHUDVisible(false);
            }
        },
        
        hide() {
             // MultiplayerUI handles hiding itself when Deploy is clicked
             this.hideDeathInfo();
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.DeploymentScreen = DeploymentScreen;
})();
