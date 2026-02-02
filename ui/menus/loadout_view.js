
// js/ui/menus/loadout_view.js
(function() {
    const LoadoutView = {
        buildUI(container) {
            container.innerHTML = `
                <div id="ls-preview-container"><div id="ls-3d-target"></div></div>
                <div id="ls-attachment-overlay"></div>
                <div class="ls-ui-layer">
                    <div id="ls-header-area">
                        <button class="ls-back-btn" onclick="window.TacticalShooter.LoadoutUI.close()">
                            <span class="ls-back-symbol">&#8592;</span> CLOSE
                        </button>
                        <div class="ls-screen-title" id="ls-main-title">CUSTOMIZE</div>
                    </div>
                    <div id="ls-sidebar"></div>
                    
                    <!-- PERK COLUMN -->
                    <div id="ls-perk-column">
                        <div class="perk-box damage" id="perk-box-0" onclick="window.TacticalShooter.LoadoutUI.togglePerkDrawer(0)">
                            <div class="perk-icon"></div>
                        </div>
                        <div class="perk-box mobility" id="perk-box-1" onclick="window.TacticalShooter.LoadoutUI.togglePerkDrawer(1)">
                            <div class="perk-icon"></div>
                        </div>
                        <div class="perk-box utility" id="perk-box-2" onclick="window.TacticalShooter.LoadoutUI.togglePerkDrawer(2)">
                            <div class="perk-icon"></div>
                        </div>
                    </div>
                    
                    <!-- PERK DRAWER -->
                    <div id="ls-perk-drawer">
                        <div id="ls-perk-list"></div>
                    </div>

                    <div id="ls-slots-grid"></div>
                    <div id="ls-unsaved-warning">CLICK SLOT TO SAVE &gt;&gt;</div>
                    <div id="ls-bottom-bar">
                        <div id="ls-tabs-container"></div>
                        <div id="ls-weapon-scroller"></div>
                    </div>
                </div>
            `;
        },

        renderSlotGrid(controller) {
            const container = document.getElementById('ls-slots-grid');
            if (!container) return;
            container.innerHTML = '';
            
            const LM = window.TacticalShooter.LoadoutManager;
            if (!LM) return;

            const L = LM.getLoadout(controller.activeSlotIndex);
            const W = window.TacticalShooter.GameData.Weapons;
            const T = window.TacticalShooter.GameData.Throwables;
            const S = window.TacticalShooter.GameData.Scorestreaks || {};
            
            const getName = (id) => {
                if (W[id]) return W[id].name;
                if (T[id]) return T[id].name;
                if (S[id]) return S[id].name;
                return id || "EMPTY";
            };
            
            const getGrenadeLabel = (slotName, id) => {
                const def = T[id];
                const base = (slotName === 'equipment1') ? "SLOT 4" : "SLOT 5";
                if (def && def.slotType) return `${base} (${def.slotType.toUpperCase()})`;
                return `${base} (EMPTY)`;
            };
            
            let anyPending = false;
            
            const createBox = (type, label, weaponId, onClick, isSmall = false, isStreak = false) => {
                const wName = getName(weaponId);
                const isEditing = (controller.activeSlotType === type);
                const isLocked = !isStreak && LM.isSlotLocked(type, L);
                
                let extraClass = isEditing ? 'active' : '';
                if (isLocked) extraClass += ' locked';
                if (isStreak) extraClass += ' streak-slot';
                
                if (controller.hasPendingChanges(type)) {
                    extraClass += ' pending-save';
                    if (controller.activeSlotType === type) anyPending = true;
                }

                const box = document.createElement('div');
                box.className = `ls-slot-box ${isSmall?'small':''} ${extraClass}`;
                box.id = `slot-box-${type}`;
                
                if (!isLocked) {
                    box.onclick = onClick;
                } else {
                    box.setAttribute('data-tooltip', 'LOCKED BY HEAVY WEAPON');
                }
                
                let displayName = wName;
                if (isEditing && controller.currentWeaponId !== weaponId) {
                    displayName = getName(controller.currentWeaponId) + "*"; 
                }

                box.innerHTML = `
                    <div class="ls-box-label" style="${isSmall?'font-size:8px;':''}">${label}</div>
                    <div class="ls-box-name" style="${isSmall?'font-size:16px;':''}">${displayName}</div>
                `;
                return box;
            };

            container.appendChild(createBox('primary', 'PRIMARY', L.primary.id, () => controller.selectSlotType('primary')));
            container.appendChild(createBox('secondary', 'SECONDARY', L.secondary.id, () => controller.selectSlotType('secondary')));
            container.appendChild(createBox('melee', 'MELEE', L.melee.id, () => controller.selectSlotType('melee')));
            
            const grenadeGroup = document.createElement('div');
            grenadeGroup.className = 'ls-split-group';
            const g1Id = L.equipment1 ? L.equipment1.id : 'FRAG';
            const g2Id = L.equipment2 ? L.equipment2.id : 'FLASH';
            grenadeGroup.appendChild(createBox('equipment1', getGrenadeLabel('equipment1', g1Id), g1Id, () => controller.selectSlotType('equipment1'), true));
            grenadeGroup.appendChild(createBox('equipment2', getGrenadeLabel('equipment2', g2Id), g2Id, () => controller.selectSlotType('equipment2'), true));
            container.appendChild(grenadeGroup);

            const streaks = L.scorestreaks || [null, null, null];
            const streakGroup = document.createElement('div');
            streakGroup.className = 'ls-split-group';
            streakGroup.style.flexDirection = 'row'; 
            streakGroup.style.gridColumn = 'span 2'; 
            streakGroup.style.height = '60px'; 
            
            for(let i=0; i<3; i++) {
                const sId = streaks[i];
                let reqText = "STREAK";
                if (sId && S[sId]) reqText = `${S[sId].killsRequired} KILLS`;
                streakGroup.appendChild(createBox(`streak${i}`, reqText, sId, () => controller.selectSlotType(`streak${i}`), true, true));
            }
            
            container.style.gridTemplateRows = "80px 80px 60px"; 
            container.appendChild(streakGroup);
            
            const warningEl = document.getElementById('ls-unsaved-warning');
            if (warningEl) {
                if (anyPending) warningEl.classList.add('visible');
                else warningEl.classList.remove('visible');
            }
            
            // UPDATE PERK VISUALS
            const perks = L.perks || [null, null, null];
            
            for(let i=0; i<3; i++) {
                const box = document.getElementById(`perk-box-${i}`);
                if (box) {
                    const pid = perks[i];
                    box.style.borderWidth = pid ? '2px' : '1px';
                    box.style.opacity = pid ? '1.0' : '0.5';
                    
                    if (pid) {
                        box.classList.add('active-perk');
                    } else {
                        box.classList.remove('active-perk');
                    }
                    
                    // Removed Tooltip Logic
                    box.removeAttribute('data-perk-desc');
                    box.removeAttribute('data-perk-downside');
                    box.removeAttribute('data-perk-name');
                }
            }
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.LoadoutView = LoadoutView;
})();
