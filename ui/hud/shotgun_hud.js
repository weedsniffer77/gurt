
// js/ui/hud/shotgun_hud.js
(function() {
    const ShotgunHUD = {
        container: null,
        counterEl: null,
        shellsEl: null,
        
        init() {
            // Create container if not exists
            let hud = document.getElementById('shotgun-hud');
            if (!hud) {
                hud = document.createElement('div');
                hud.id = 'shotgun-hud';
                hud.style.display = 'none';
                hud.innerHTML = `<div id="shotgun-counter"></div><div id="shotgun-shells"></div>`;
                
                const parent = document.getElementById('hud');
                if (parent) parent.appendChild(hud);
            }
            
            this.container = hud;
            this.counterEl = document.getElementById('shotgun-counter');
            this.shellsEl = document.getElementById('shotgun-shells');
        },
        
        show() {
            if (this.container) this.container.style.display = 'block';
        },
        
        hide() {
            if (this.container) this.container.style.display = 'none';
        },
        
        update(playerState, weaponDef) {
            if (!this.container) return;
            
            // 1. Update Text Counter with Reserve
            let color = '#ccc';
            if (playerState.isReloading) color = '#888';
            else if (playerState.needsPump) color = '#ffaa00';
            
            this.counterEl.innerHTML = `${playerState.currentAmmo} <span class="mag-cap">/ ${playerState.maxAmmo}</span> <span class="ammo-reserve">${playerState.reserveAmmo}</span>`;
            this.counterEl.style.color = color;
            
            // 2. Render Shells
            this.shellsEl.innerHTML = '';
            const maxShells = playerState.maxAmmo;
            
            const wm = window.TacticalShooter.WeaponManager;
            const isCycling = wm && wm.fireTimer > 0;
            
            const isReadyToFire = !playerState.isReloading && !playerState.needsPump && !playerState.isPumping && !isCycling && playerState.currentAmmo > 0;

            for (let i = 0; i < maxShells; i++) {
                const div = document.createElement('div');
                div.className = 'shell-icon';
                
                if (i < playerState.currentAmmo) {
                    div.classList.add('loaded');
                    // Highlight the shell in the chamber (index = count - 1)
                    if (i === (playerState.currentAmmo - 1) && isReadyToFire) {
                        div.classList.add('chambered');
                    }
                }
                
                this.shellsEl.appendChild(div);
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ShotgunHUD = ShotgunHUD;
})();
