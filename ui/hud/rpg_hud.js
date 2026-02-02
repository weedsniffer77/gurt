
// js/ui/hud/rpg_hud.js
(function() {
    const RPGHUD = {
        container: null,
        counterEl: null,
        shellsEl: null,
        
        init() {
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
            
            if (!document.getElementById('rpg-hud-styles')) {
                const style = document.createElement('style');
                style.id = 'rpg-hud-styles';
                style.innerHTML = `
                    /* Ensure container is horizontal for rockets, revert flex-col breakage */
                    #shotgun-shells {
                        display: flex;
                        flex-direction: row-reverse; /* Default for shotgun (right aligned) */
                        gap: 4px;
                        justify-content: flex-end;
                        align-items: center;
                    }
                    /* Specific override class for RPG mode if needed */
                    .rpg-mode-shells {
                        flex-direction: row !important; /* Left to Right */
                        justify-content: flex-end;
                    }
                    
                    .rpg-icon {
                        width: 14px; height: 40px; margin-left: 4px;
                        display: inline-block;
                        position: relative;
                        opacity: 1.0; 
                        transition: transform 0.2s, filter 0.2s;
                    }
                    .rpg-icon.active { 
                        filter: drop-shadow(0 0 6px rgba(255,200,100,0.8)); 
                        transform: scale(1.1);
                        z-index: 10;
                    }
                    
                    /* PG-7 HEAT (Bulbous) */
                    .rpg-icon-heat { background: transparent; }
                    .rpg-icon-heat::before { content: ''; position: absolute; bottom: 0; left: 5px; width: 4px; height: 20px; background: #557755; }
                    .rpg-icon-heat::after { content: ''; position: absolute; bottom: 20px; left: 2px; width: 10px; height: 16px; background: #557755; border-radius: 50% 50% 10% 10%; }
                    .rpg-icon-heat.active::before, .rpg-icon-heat.active::after { background: #88aa88; }
                    
                    /* OGV-7 FRAG (Pencil) */
                    .rpg-icon-frag { background: transparent; }
                    .rpg-icon-frag::before { content: ''; position: absolute; bottom: 0; left: 4px; width: 6px; height: 35px; background: #555; }
                    .rpg-icon-frag.active::before { background: #999; }
                `;
                document.head.appendChild(style);
            }
        },
        
        show() {
            if (this.container) this.container.style.display = 'block';
            if (this.shellsEl) this.shellsEl.classList.add('rpg-mode-shells');
        },
        
        hide() {
            if (this.container) this.container.style.display = 'none';
            if (this.shellsEl) this.shellsEl.classList.remove('rpg-mode-shells');
        },
        
        update(playerState, weaponDef) {
            if (!this.container) return;
            
            let color = '#ccc';
            if (playerState.isReloading) color = '#888';
            else if (playerState.currentAmmo === 0) color = '#ff4444';
            
            this.counterEl.innerHTML = `${playerState.currentAmmo} <span class="mag-cap">/ ${weaponDef.magazineSize}</span>`;
            this.counterEl.style.color = color;
            
            this.shellsEl.innerHTML = '';
            
            const PA = playerState.modules.ammo;
            if (!PA) return;
            
            const heatCount = PA.ammoPools['rocket_heat'] || 0;
            const fragCount = PA.ammoPools['rocket_frag'] || 0;
            const currentType = PA.currentAmmoType;
            
            // Render logic: One single row.
            // Active Type goes LEFT (First in DOM).
            // Then inactive type.
            
            const renderIcons = (type, count, isActive) => {
                let totalVisual = count;
                // If this is the active type and gun is loaded, add +1 for the chambered round
                if (isActive && playerState.currentAmmo > 0) totalVisual += 1;
                
                // Increased to 12 to show all potential rockets
                const maxIcons = 12;
                const visibleCount = Math.min(totalVisual, maxIcons);
                
                for(let i=0; i<visibleCount; i++) {
                    const icon = document.createElement('div');
                    icon.className = `rpg-icon ${type === 'rocket_heat' ? 'rpg-icon-heat' : 'rpg-icon-frag'}`;
                    // If active type, the very first icon represents the loaded round
                    if (isActive && playerState.currentAmmo > 0 && i === 0) {
                        icon.classList.add('active');
                    }
                    this.shellsEl.appendChild(icon);
                }
                
                if (totalVisual > maxIcons) {
                    const plus = document.createElement('div');
                    plus.style.color = '#888';
                    plus.style.fontSize = '12px';
                    plus.textContent = `+${totalVisual - maxIcons}`;
                    plus.style.marginLeft = '2px';
                    plus.style.marginRight = '6px';
                    this.shellsEl.appendChild(plus);
                }
            };
            
            // SORTING: Active First, No Divider
            if (currentType === 'rocket_heat') {
                renderIcons('rocket_heat', heatCount, true);
                if (fragCount > 0) {
                    renderIcons('rocket_frag', fragCount, false);
                }
            } else {
                renderIcons('rocket_frag', fragCount, true);
                if (heatCount > 0) {
                    renderIcons('rocket_heat', heatCount, false);
                }
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.RPGHUD = RPGHUD;
})();
