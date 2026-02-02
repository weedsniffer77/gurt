
// js/ui/menus/loadout_stats.js
(function() {
    const LoadoutStats = {
        container: null,
        
        init(parentElement) {
            this.container = document.createElement('div');
            this.container.id = 'ls-stats-panel';
            parentElement.appendChild(this.container);
        },
        
        update(currentDef, savedDef) {
            if (!this.container) return;
            
            const StatSystem = window.TacticalShooter.StatSystem;
            if (!StatSystem) return;

            // Helper to merge ammo stats into base weapon stats for display
            const resolveStats = (def) => {
                if (!def) return null;
                let workingDef = def;

                // SPECIAL CASE: AMMO ITEMS (Inventory)
                if (def.id && def.id.startsWith('AMMO_') && def.id !== 'AMMO_BOX') {
                    const rpgDef = window.TacticalShooter.GameData.Weapons["RPG7"];
                    if (rpgDef) {
                        workingDef = JSON.parse(JSON.stringify(rpgDef));
                        if (def.id === 'AMMO_OGV7') {
                            workingDef.reloadTime *= 1.17;
                            workingDef.explosive.radius = 10.0;
                            workingDef.explosive.damage = 150;
                        } else {
                            workingDef.explosive.radius = 4.0;
                            workingDef.explosive.damage = 200;
                        }
                    }
                }
                
                return StatSystem.getDisplayStats(workingDef);
            };

            const curr = resolveStats(currentDef);
            const saved = resolveStats(savedDef);
            
            if (!curr) {
                this.container.innerHTML = '';
                return; 
            }

            // --- DETERMINE LABELS ---
            let labels = {};

            if (curr.viewerConfig && curr.viewerConfig.labels) {
                labels = curr.viewerConfig.labels;
            }
            else if (curr.isRPG) {
                labels = {
                    damage: "DAMAGE",
                    blastRadius: "BLAST RADIUS",
                    mobility: "MOBILITY",
                    reload: "RELOAD SPEED"
                };
            } else if (curr.isThrowable) {
                labels = {
                    damage: "DAMAGE",
                    radius: "EFFECT RADIUS",
                    mobility: "MOBILITY"
                };
            } else if (curr.isMelee) {
                labels = {
                    damage: "DAMAGE",
                    mobility: "MOBILITY",
                    attackSpeed: "ATTACK SPEED"
                };
            } else {
                labels = {
                    damage: "DAMAGE",
                    fireRate: "FIRE RATE",
                    range: "RANGE",
                    accuracy: "ACCURACY",
                    control: "CONTROL",
                    mobility: "MOBILITY",
                    reload: "RELOAD SPEED"
                };
            }

            // --- RENDER ---
            let html = `<div class="stats-grid">`;
            
            for (const key in labels) {
                let valCurr = curr[key];
                let valSaved = (saved && saved[key] !== undefined) ? saved[key] : valCurr; 
                
                if (valSaved === undefined || valSaved === null) valSaved = valCurr;
                
                let displayVal = valCurr;
                let suffix = "";
                
                if (key === 'reload' && curr.rawReload) { displayVal = curr.rawReload.toFixed(1); suffix = "s"; }
                else if (key === 'attackSpeed' && curr.rawSpeed) { displayVal = curr.rawSpeed.toFixed(2); suffix = "s"; }
                else if (key === 'radius' && curr.rawRadius) { displayVal = curr.rawRadius; suffix = "m"; }
                else if (key === 'damage' && curr.rawDamage !== undefined) { displayVal = curr.rawDamage; }
                else if (key === 'range' && curr.rawRange !== undefined) { displayVal = curr.rawRange; suffix = "m"; }
                else if (key === 'mobility' && curr.rawSprint) { displayVal = curr.rawSprint; suffix = "%"; }
                else if (key === 'blastRadius' && curr.rawBlast) { displayVal = curr.rawBlast; }
                
                let valueHtml = `<span class="stat-num">${displayVal}${suffix}</span>`;
                
                if (key === 'fireRate' && curr.isRPG) valueHtml = `<span class="stat-num">N/A</span>`;

                const pctCurr = Math.min(100, valCurr / 2); 
                const pctSaved = Math.min(100, valSaved / 2);
                
                let diffHtml = '';
                
                if (valCurr > valSaved) {
                    const diffPct = Math.max(0, pctCurr - pctSaved);
                    diffHtml = `<div class="stat-delta gain" style="left: ${pctSaved}%; width: ${diffPct}%;"></div>`;
                    valueHtml = `<span class="stat-num gain">${displayVal}${suffix}</span>`; 
                } else if (valCurr < valSaved) {
                    const diffPct = Math.max(0, pctSaved - pctCurr);
                    diffHtml = `<div class="stat-delta loss" style="left: ${pctCurr}%; width: ${diffPct}%;"></div>`;
                    valueHtml = `<span class="stat-num loss">${displayVal}${suffix}</span>`;
                }
                
                const whiteWidth = (valCurr > valSaved) ? pctSaved : pctCurr;

                html += `
                    <div class="stat-row">
                        <div class="stat-label">${labels[key]}</div>
                        <div class="stat-track">
                            <div class="stat-bar-bg"></div>
                            <div class="stat-bar-fill" style="width: ${whiteWidth}%"></div>
                            ${diffHtml}
                            ${key === 'mobility' ? '<div class="stat-marker" style="left: 50%;"></div>' : ''}
                        </div>
                        <div class="stat-value-box">${valueHtml}</div>
                    </div>
                `;
            }
            
            html += `</div>`;
            this.container.innerHTML = html;
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.LoadoutStats = LoadoutStats;
})();
