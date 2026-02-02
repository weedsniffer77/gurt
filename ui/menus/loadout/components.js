
// js/ui/menus/loadout/components.js
(function() {
    const LoadoutComponents = {
        
        renderSidebar(container, state) {
            container.innerHTML = '';
            const btnContainer = document.createElement('div');
            btnContainer.className = 'ls-loadout-buttons';
            container.appendChild(btnContainer);
            
            const LM = window.TacticalShooter.LoadoutManager;
            const count = 5; // 5 Slots
            
            for(let i=0; i<count; i++) {
                const row = document.createElement('div'); 
                row.className = 'ls-sidebar-row';
                
                const isMain = (i === LM.mainLoadoutIndex);
                const isActive = (i === state.activeSlotIndex);
                
                // Main Select Button (Circle)
                const mainBtn = document.createElement('div'); 
                mainBtn.className = `ls-main-select-btn ${isMain ? 'is-main' : ''}`;
                mainBtn.innerHTML = `<div class="ls-main-text">MAIN</div><div class="ls-main-circle"></div>`; 
                mainBtn.onclick = () => window.TacticalShooter.LoadoutUI.setMain(i);
                
                // Loadout Select Button (Text)
                const editBtn = document.createElement('button'); 
                editBtn.className = `ls-slot-btn ${isActive ? 'active' : ''}`;
                const num = (i + 1).toString().padStart(2, '0'); 
                editBtn.innerHTML = `${num} <span class="ls-slot-label">LOADOUT ${i+1}</span>`; 
                editBtn.onclick = () => window.TacticalShooter.LoadoutUI.selectLoadout(i);
                
                row.appendChild(mainBtn); 
                row.appendChild(editBtn); 
                btnContainer.appendChild(row);
            }
        },

        renderGrid(container, state) {
            container.innerHTML = '';
            const LM = window.TacticalShooter.LoadoutManager;
            const L = LM.getLoadout(state.activeSlotIndex);
            
            // Helper to get name
            const getName = (id) => {
                const GD = window.TacticalShooter.GameData;
                if (GD.Weapons[id]) return GD.Weapons[id].name;
                if (GD.Throwables[id]) return GD.Throwables[id].name;
                if (GD.Scorestreaks && GD.Scorestreaks[id]) return GD.Scorestreaks[id].name;
                return "EMPTY";
            };

            const createBox = (type, label, currentId, onClick, isSmall, isStreak) => {
                const isEditing = (state.activeSlotType === type);
                const isLocked = !isStreak && LM.isSlotLocked(type, L);
                
                let classes = `ls-slot-box ${isSmall?'small':''} ${isEditing?'active':''} ${isLocked?'locked':''}`;
                if (isStreak) classes += ' streak-slot';
                
                // Diff Check
                let showPending = false;
                if (isEditing && state.hasChanges()) {
                    classes += ' pending-save';
                    showPending = true;
                }
                
                // Name Display
                let displayName = getName(currentId);
                if (isEditing && state.currentWeaponId !== currentId) {
                    displayName = getName(state.currentWeaponId) + "*";
                }
                
                const box = document.createElement('div');
                box.className = classes;
                if (!isLocked) box.onclick = onClick;
                else box.setAttribute('data-tooltip', 'LOCKED BY HEAVY WEAPON');
                
                box.innerHTML = `
                    <div class="ls-box-label" style="${isSmall?'font-size:8px;':''}">${label}</div>
                    <div class="ls-box-name" style="${isSmall?'font-size:16px;':''}">${displayName}</div>
                `;
                return { element: box, pending: showPending };
            };
            
            let anyPending = false;
            
            // Primary
            const b1 = createBox('primary', 'PRIMARY', L.primary.id, () => window.TacticalShooter.LoadoutUI.selectSlot('primary'));
            if(b1.pending) anyPending = true; container.appendChild(b1.element);
            
            // Secondary
            const b2 = createBox('secondary', 'SECONDARY', L.secondary.id, () => window.TacticalShooter.LoadoutUI.selectSlot('secondary'));
            if(b2.pending) anyPending = true; container.appendChild(b2.element);
            
            // Melee
            const b3 = createBox('melee', 'MELEE', L.melee.id, () => window.TacticalShooter.LoadoutUI.selectSlot('melee'));
            if(b3.pending) anyPending = true; container.appendChild(b3.element);
            
            // Equipment Split
            const eqDiv = document.createElement('div'); eqDiv.className = 'ls-split-group';
            const e1Id = L.equipment1 ? L.equipment1.id : null;
            const e2Id = L.equipment2 ? L.equipment2.id : null;
            const b4 = createBox('equipment1', 'SLOT 4', e1Id, () => window.TacticalShooter.LoadoutUI.selectSlot('equipment1'), true);
            const b5 = createBox('equipment2', 'SLOT 5', e2Id, () => window.TacticalShooter.LoadoutUI.selectSlot('equipment2'), true);
            if(b4.pending || b5.pending) anyPending = true;
            eqDiv.appendChild(b4.element); eqDiv.appendChild(b5.element);
            container.appendChild(eqDiv);
            
            // Scorestreaks Split
            const ssDiv = document.createElement('div'); 
            ssDiv.className = 'ls-split-group'; 
            ssDiv.style.flexDirection = 'row'; 
            ssDiv.style.gridColumn = 'span 2'; 
            ssDiv.style.height = '60px';
            
            const streaks = L.scorestreaks || [null, null, null];
            streaks.forEach((sid, i) => {
                // Determine Label Kills
                let kReq = "STREAK";
                if (sid && window.TacticalShooter.GameData.Scorestreaks[sid]) {
                    kReq = window.TacticalShooter.GameData.Scorestreaks[sid].killsRequired + " KILLS";
                }
                const bS = createBox(`streak${i}`, kReq, sid, () => window.TacticalShooter.LoadoutUI.selectSlot(`streak${i}`), true, true);
                if(bS.pending) anyPending = true;
                ssDiv.appendChild(bS.element);
            });
            container.style.gridTemplateRows = "80px 80px 60px";
            container.appendChild(ssDiv);
            
            const warn = document.getElementById('ls-unsaved-warning');
            if (warn) {
                if (anyPending) warn.classList.add('visible');
                else warn.classList.remove('visible');
            }
        },
        
        renderSelector(container, tabsContainer, state) {
            container.innerHTML = ''; 
            tabsContainer.innerHTML = '';
            
            // 1. Determine Tabs
            let tabs = [];
            
            const LM = window.TacticalShooter.LoadoutManager;
            const L = LM.getLoadout(state.activeSlotIndex);
            const isRPG = (L.primary.id === 'RPG7');

            if (state.activeSlotType.startsWith('streak')) tabs = ['STREAK'];
            else if (state.activeSlotType.startsWith('equipment')) {
                 tabs = ['LETHAL', 'TACTICAL'];
                 if (isRPG) tabs.push('ROCKET');
            }
            else if (state.activeSlotType === 'primary') tabs = ['ASSAULT', 'SHOTGUN', 'SNIPER', 'SMG', 'HEAVY'];
            else if (state.activeSlotType === 'secondary') tabs = ['PISTOL'];
            else if (state.activeSlotType === 'melee') tabs = ['MELEE'];
            
            // Safety check for active tab
            if (state.activeCategoryTab === 'ROCKET' && !isRPG && state.activeSlotType.startsWith('equipment')) {
                state.activeCategoryTab = 'LETHAL';
            }

            // 2. Render Tabs
            tabs.forEach(t => {
                const btn = document.createElement('button');
                btn.className = `ls-cat-tab ${state.activeCategoryTab === t ? 'active' : ''}`;
                btn.textContent = t;
                btn.onclick = () => {
                    state.activeCategoryTab = t;
                    this.renderSelector(container, tabsContainer, state);
                };
                tabsContainer.appendChild(btn);
            });
            
            // 3. Render Cards
            const GD = window.TacticalShooter.GameData;
            const currentTab = state.activeCategoryTab;
            
            const renderCard = (id, name, typeLabel) => {
                const card = document.createElement('div');
                card.className = `ls-weapon-card ${state.currentWeaponId === id ? 'active' : ''}`;
                card.innerHTML = `<div class="ls-wep-name">${name}</div><div class="ls-wep-type">${typeLabel}</div>`;
                card.onclick = () => window.TacticalShooter.LoadoutUI.setWeapon(id);
                container.appendChild(card);
            };

            if (currentTab === 'STREAK') {
                for (const id in GD.Scorestreaks) renderCard(id, GD.Scorestreaks[id].name, "SCORESTREAK");
            } 
            else if (['LETHAL', 'TACTICAL', 'ROCKET'].includes(currentTab)) {
                for (const id in GD.Throwables) {
                    const t = GD.Throwables[id];
                    let tCat = t.slotType.toUpperCase();
                    if (t.type === 'ammo') tCat = 'ROCKET';
                    if (tCat === currentTab) renderCard(id, t.name, tCat); 
                } 
            } 
            else {
                for (const id in GD.Weapons) {
                    if (id.endsWith('_DEPLOY')) continue; // EXCLUDE SCORESTREAK DEPLOY ITEMS

                    const w = GD.Weapons[id];
                    let wCat = 'ASSAULT'; 
                    if (w.type === 'secondary') wCat = 'PISTOL'; else if (w.type === 'melee') wCat = 'MELEE'; else if (w.type === 'heavy') wCat = 'HEAVY'; else if (id.includes('SHOTGUN')) wCat = 'SHOTGUN'; else if (id === 'M24' || id.includes('SNIPER')) wCat = 'SNIPER'; else if (id.includes('SMG')) wCat = 'SMG'; else if (id === 'TYPE92') wCat = 'PISTOL';
                    if (wCat === currentTab) renderCard(id, w.name, w.type.toUpperCase());
                }
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.LoadoutComponents = LoadoutComponents;
})();
