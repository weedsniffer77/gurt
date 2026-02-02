
// js/gameplay/drone_hud.js
(function() {
    const DroneHUD = {
        element: null,
        horizon: null,
        fuelBar: null,
        hpBar: null,
        fpvMarker: null,
        prompt: null,
        subPrompt: null,
        
        init() {
            this.element = document.getElementById('drone-hud');
            this.horizon = document.getElementById('drone-horizon-container');
            this.fuelBar = document.getElementById('drone-fuel-fill');
            this.hpBar = document.getElementById('drone-hp-fill');
            this.fpvMarker = document.getElementById('drone-fpv-marker');
            this.prompt = document.getElementById('drone-controls-prompt');
            this.subPrompt = document.getElementById('drone-sub-prompt');
        },
        
        show(isSpectator = false) {
            if (!this.element) this.init();
            if (this.element) {
                this.element.style.display = 'block';
                
                // Update Text based on mode
                if (this.prompt) {
                    this.prompt.textContent = isSpectator ? "[SPACEBAR] to exit spectator" : "[SPACEBAR] to manually detonate";
                }
                
                if (this.subPrompt) {
                    this.subPrompt.style.display = isSpectator ? 'block' : 'none';
                }
                
                // --- SELECTIVE HUD HIDING ---
                const toHide = ['ammo-display', 'crosshair', 'ingame-loadout-picker'];
                toHide.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
            }
        },
        
        hide() {
            if (this.element) this.element.style.display = 'none';
            if (this.subPrompt) this.subPrompt.style.display = 'none';
            
            // Restore Main HUD if in-game
            if (window.TacticalShooter.MultiplayerUI && window.TacticalShooter.GameManager.currentState === 'IN_GAME') {
                window.TacticalShooter.MultiplayerUI.setHUDVisible(true);
            }
        },
        
        update(state) {
            if (!this.element) return;
            
            const rollDeg = (state.roll * 180 / Math.PI);
            const pitchDeg = (state.pitch * 180 / Math.PI);
            const pitchPx = pitchDeg * 8; 
            
            if (this.horizon) {
                this.horizon.style.transform = `translate(-50%, -50%) rotate(${rollDeg}deg) translateY(${pitchPx}px)`;
            }
            
            if (this.fpvMarker && state.velocity) {
                const vel = state.velocity;
                const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);
                
                if (speed > 1.0) {
                    const angleX = Math.atan2(vel.x, -vel.z);
                    const angleY = Math.atan2(vel.y, -vel.z);
                    
                    const pxPerRad = (window.innerHeight / 2) / (45 * Math.PI / 180); 
                    const offX = angleX * pxPerRad;
                    const offY = angleY * pxPerRad;
                    
                    this.fpvMarker.style.transform = `translate(calc(-50% + ${offX}px), calc(-50% + ${-offY}px))`; 
                    this.fpvMarker.style.opacity = '1';
                } else {
                    this.fpvMarker.style.transform = `translate(-50%, -50%)`;
                    this.fpvMarker.style.opacity = '0.5';
                }
            }
            
            if (this.fuelBar) {
                const fuelPct = Math.max(0, (state.fuel / state.maxFuel) * 100);
                this.fuelBar.style.height = `${fuelPct}%`;
                if (fuelPct < 20) this.fuelBar.parentElement.classList.add('drone-warn');
                else this.fuelBar.parentElement.classList.remove('drone-warn');
            }
            
            if (this.hpBar) {
                const hpPct = Math.max(0, (state.health / state.maxHealth) * 100);
                this.hpBar.style.height = `${hpPct}%`;
                if (hpPct < 30) this.hpBar.parentElement.classList.add('drone-warn');
                else this.hpBar.parentElement.classList.remove('drone-warn');
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.DroneHUD = DroneHUD;
})();
