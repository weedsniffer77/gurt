
// js/ui/menus/loadout_ui.js
(function() {
    const LoadoutUI = {
        loopRunning: false,
        _boundCloseHandler: null,
        _boundEscHandler: null, 
        activePerkDrawer: null,

        init() {
            if (window.TacticalShooter.EditorState) window.TacticalShooter.EditorState.init();
        },
        
        open() {
            const el = document.getElementById('loadout-screen');
            if (el) {
                el.classList.add('active');
                if (!document.getElementById('ls-slots-grid')) {
                    window.TacticalShooter.LoadoutView.buildUI(el);
                    if (window.TacticalShooter.LoadoutStats) {
                         const layer = el.querySelector('.ls-ui-layer');
                         window.TacticalShooter.LoadoutStats.init(layer);
                    }
                }
            }
            
            const mmUI = document.getElementById('multiplayer-menu');
            if (mmUI) mmUI.style.display = 'none';
            const bg = document.getElementById('loadout-bg-cover');
            if (bg) bg.classList.add('active');
            const lobbyLayer = document.getElementById('lobby-ui-layer');
            if (lobbyLayer) lobbyLayer.style.display = 'none';
            document.body.classList.add('loadout-mode');
            
            if (window.TacticalShooter.ChatSystem) {
                window.TacticalShooter.ChatSystem.updateVisibility();
            }

            const State = window.TacticalShooter.EditorState;
            State.init(); 
            
            this.refreshAll();
            
            if (!this.loopRunning) {
                this.loopRunning = true;
                this.updateLoop();
            }
            
            this._boundEscHandler = (e) => {
                if (e.key === 'Escape') {
                    if (this.activePerkDrawer !== null) {
                        this.togglePerkDrawer(null); 
                        return;
                    }

                    const activeNode = document.querySelector('.att-node.active');
                    if (activeNode) {
                        activeNode.classList.remove('active');
                        if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.resetFocus();
                    } else { this.close(); }
                }
            };
            document.addEventListener('keydown', this._boundEscHandler);
        },
        
        close() {
            const el = document.getElementById('loadout-screen');
            if (el) el.classList.remove('active');
            
            const bg = document.getElementById('loadout-bg-cover');
            if (bg) bg.classList.remove('active');
            document.body.classList.remove('loadout-mode');
            
            const gm = window.TacticalShooter.GameManager;
            if (gm && gm.currentState === 'MENU') {
                const mmUI = document.getElementById('multiplayer-menu');
                if (mmUI) mmUI.style.display = 'block';
                mmUI.classList.remove('blurred');
            }
            
            if (window.TacticalShooter.ChatSystem) {
                window.TacticalShooter.ChatSystem.updateVisibility();
            }

            if (window.TacticalShooter.MenuRenderer) {
                window.TacticalShooter.MenuRenderer.stop();
            }
            
            this.loopRunning = false;
            document.removeEventListener('keydown', this._boundEscHandler);
            this.togglePerkDrawer(null);
        },
        
        selectSlot(type) {
            this.togglePerkDrawer(null); 
            const State = window.TacticalShooter.EditorState;
            if (State.activeSlotType === type && State.hasChanges()) {
                this.save();
                return;
            }
            if (State.hasChanges()) {
                if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification("CHANGES DISCARDED", "red");
            }
            
            State.setSlot(type);
            this.refreshAll();
            
            if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.resetFocus();
        },
        
        setWeapon(id) {
            const State = window.TacticalShooter.EditorState;
            State.setWeapon(id);
            this.refreshAll();
            if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.resetFocus();
        },
        
        selectLoadout(index) {
            this.togglePerkDrawer(null);
            const State = window.TacticalShooter.EditorState;
            if (State.hasChanges()) {
                 if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification("CHANGES DISCARDED", "red");
            }
            State.setActiveLoadout(index);
            this.refreshAll();
            if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.resetFocus();
        },

        setMain(index) {
            const LM = window.TacticalShooter.LoadoutManager;
            LM.setMainLoadout(index);
            this.refreshAll();
        },
        
        save() {
            const State = window.TacticalShooter.EditorState;
            const LM = window.TacticalShooter.LoadoutManager;
            
            if (State.activeSlotType.startsWith('streak')) {
                const idx = parseInt(State.activeSlotType.replace('streak',''));
                if (LM.savedLoadouts[State.activeSlotIndex]) {
                     if (!LM.savedLoadouts[State.activeSlotIndex].scorestreaks) LM.savedLoadouts[State.activeSlotIndex].scorestreaks = [null, null, null];
                     LM.savedLoadouts[State.activeSlotIndex].scorestreaks[idx] = State.currentWeaponId;
                     LM.saveToStorage();
                     if (LM.currentLoadoutIndex === State.activeSlotIndex) LM.equipLoadout(State.activeSlotIndex);
                }
            } else {
                LM.commitWeaponChanges(State.activeSlotIndex, State.activeSlotType, State.currentWeaponId, State.currentAttachments);
            }
            
            this.refreshAll();
            if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification("LOADOUT SAVED", "blue");
        },
        
        validatePerk(perk, currentLoadout) {
            if (!perk.requirements) return true;
            
            const reqId = perk.requirements.weaponId;
            let targetSlot = null;
            let targetAtts = [];

            // Check lock status for secondary
            const LM = window.TacticalShooter.LoadoutManager;
            const isSecondaryLocked = LM.isSlotLocked('secondary', currentLoadout);

            // Find if weapon is equipped AND slot is not locked
            if (currentLoadout.primary && currentLoadout.primary.id === reqId) {
                targetSlot = 'primary';
                targetAtts = currentLoadout.primary.attachments || [];
            } else if (currentLoadout.secondary && currentLoadout.secondary.id === reqId) {
                // If the perk requires a secondary weapon, but secondary is locked, invalidate it
                if (isSecondaryLocked) return false;
                targetSlot = 'secondary';
                targetAtts = currentLoadout.secondary.attachments || [];
            }

            if (!targetSlot) return false; // Required weapon not found or locked

            // Check Required Attachments (AND logic)
            if (perk.requirements.requireAttachments) {
                for (const attId of perk.requirements.requireAttachments) {
                    if (!targetAtts.includes(attId)) return false;
                }
            }

            // Check Excluded Attachments (NAND logic)
            if (perk.requirements.excludeAttachments) {
                for (const attId of perk.requirements.excludeAttachments) {
                    if (targetAtts.includes(attId)) return false;
                }
            }
            
            return true;
        },
        
        togglePerkDrawer(slotIndex) {
            const drawer = document.getElementById('ls-perk-drawer');
            const list = document.getElementById('ls-perk-list');
            
            if (slotIndex === null || this.activePerkDrawer === slotIndex) {
                if (drawer) drawer.classList.remove('active');
                this.activePerkDrawer = null;
                return;
            }
            
            this.activePerkDrawer = slotIndex;
            if (drawer) {
                const btn = document.getElementById(`perk-box-${slotIndex}`);
                if (btn) {
                    const rect = btn.getBoundingClientRect();
                    drawer.style.top = (rect.top) + 'px';
                }
                
                drawer.classList.add('active');
                
                if (list) {
                    list.innerHTML = '';
                    const types = ['damage', 'mobility', 'utility'];
                    const targetType = types[slotIndex];
                    const Perks = window.TacticalShooter.GameData.Perks;
                    const LM = window.TacticalShooter.LoadoutManager;
                    const currentL = LM.getLoadout(window.TacticalShooter.EditorState.activeSlotIndex);
                    const currentPerk = currentL.perks[slotIndex];

                    for (const pid in Perks) {
                        const perk = Perks[pid];
                        if (perk.type === targetType) {
                            const opt = document.createElement('div');
                            const isSelected = (currentPerk === pid);
                            const isValid = this.validatePerk(perk, currentL);
                            
                            let className = `perk-option`;
                            if (isSelected) className += ' selected';
                            if (!isValid) className += ' locked-perk';
                            
                            opt.className = className;
                            
                            const innerIcon = perk.iconHtml || '';
                            const iconHtml = `<div class="perk-icon-display" style="width:20px; height:20px; margin-right:8px; display:inline-block; vertical-align:middle;"><div class="${perk.iconClass}">${innerIcon}</div></div>`;
                            
                            let warningHtml = '';
                            if (!isValid && perk.reqText) {
                                warningHtml = `<div style="color:#ff4444; font-weight:bold; font-size:10px; margin-bottom:2px;">${perk.reqText}</div>`;
                            }
                            
                            opt.innerHTML = `
                                ${warningHtml}
                                <div class="perk-opt-name">${iconHtml}${perk.name}</div>
                                <div class="perk-opt-desc">${perk.description}</div>
                                <div class="perk-opt-down">${perk.downside}</div>
                            `;
                            
                            if (isValid) {
                                opt.onclick = () => {
                                     LM.commitPerkChange(window.TacticalShooter.EditorState.activeSlotIndex, slotIndex, pid);
                                     this.togglePerkDrawer(null);
                                     this.refreshAll();
                                };
                            } else {
                                opt.style.cursor = "not-allowed";
                            }
                            list.appendChild(opt);
                        }
                    }
                }
            }
        },
        
        refreshAll() {
            const State = window.TacticalShooter.EditorState;
            const Components = window.TacticalShooter.LoadoutComponents;
            
            const grid = document.getElementById('ls-slots-grid');
            if (grid) Components.renderGrid(grid, State);
            
            const scroll = document.getElementById('ls-weapon-scroller');
            const tabs = document.getElementById('ls-tabs-container');
            if (scroll && tabs) Components.renderSelector(scroll, tabs, State);
            
            const sidebar = document.getElementById('ls-sidebar');
            if (sidebar) Components.renderSidebar(sidebar, State);
            
            const LM = window.TacticalShooter.LoadoutManager;
            const currentL = LM.getLoadout(State.activeSlotIndex);
            const perks = currentL.perks || [null, null, null];
            const PerkData = window.TacticalShooter.GameData.Perks;
            
            for(let i=0; i<3; i++) {
                const box = document.getElementById(`perk-box-${i}`);
                if (box) {
                    box.innerHTML = ''; 
                    box.className = `perk-box ${['damage','mobility','utility'][i]}`; 
                    
                    const pid = perks[i];
                    if (pid && PerkData[pid]) {
                        const pDef = PerkData[pid];
                        box.classList.add('active-perk');
                        
                        // Validate again for visualization
                        if (!this.validatePerk(pDef, currentL)) {
                            box.classList.add('locked-perk-box');
                        }
                        
                        const disp = document.createElement('div');
                        disp.className = 'perk-icon-display';
                        const innerHTML = pDef.iconHtml || '';
                        disp.innerHTML = `<div class="${pDef.iconClass}">${innerHTML}</div>`;
                        box.appendChild(disp);
                    } else {
                        box.classList.remove('active-perk');
                    }
                    
                    box.style.borderWidth = pid ? '2px' : '1px';
                    box.style.opacity = pid ? '1.0' : '0.5';
                }
            }

            this.updatePreview();
            
            const Stats = window.TacticalShooter.LoadoutStats;
            if (Stats) {
                const currDef = State.getCurrentDefinition();
                const savedDef = State.getSavedDefinition();
                Stats.update(currDef, savedDef);
            }
            
            if (window.TacticalShooter.LoadoutScene) {
                const proxy = {
                    currentWeaponId: State.currentWeaponId,
                    currentAttachments: State.currentAttachments,
                    getAttachmentsForSlot: (type) => this.getAttachmentsForSlot(type),
                    toggleAttachment: (id, type) => this.toggleAttachment(id, type)
                };
                window.TacticalShooter.LoadoutScene.updateAttachmentNodes(proxy);
            }
        },
        
        updatePreview() {
            const State = window.TacticalShooter.EditorState;
            const def = State.getCurrentDefinition();
            if (window.TacticalShooter.MenuRenderer) {
                if (def) {
                    window.TacticalShooter.MenuRenderer.setTargetElement('ls-preview-container'); 
                    window.TacticalShooter.MenuRenderer.spawnWeapon(def);
                    window.TacticalShooter.MenuRenderer.start();
                } else {
                    window.TacticalShooter.MenuRenderer.stop();
                }
            }
        },
        
        updateLoop() {
            if (!this.loopRunning) return;
            requestAnimationFrame(() => this.updateLoop());
            
            const State = window.TacticalShooter.EditorState;
            if (window.TacticalShooter.LoadoutScene) {
                 const proxy = {
                    currentWeaponId: State.currentWeaponId,
                    currentAttachments: State.currentAttachments
                 };
                 window.TacticalShooter.LoadoutScene.updateNodePositions(proxy);
            }
        },
        
        getAttachmentsForSlot(type) {
            const State = window.TacticalShooter.EditorState;
            if (State.getAvailableAttachments) {
                return State.getAvailableAttachments(type);
            }
            return [];
        },
        
        toggleAttachment(id, type) {
            const State = window.TacticalShooter.EditorState;
            const StatSystem = window.TacticalShooter.StatSystem;
            const GameData = window.TacticalShooter.GameData;
            const allAtts = StatSystem.getAllAttachmentsForWeapon(State.currentWeaponId, GameData);

            if (!id) {
                State.currentAttachments = State.currentAttachments.filter(aid => {
                    const a = allAtts[aid];
                    return a ? a.type !== type : true;
                });
            } else {
                const list = this.getAttachmentsForSlot(type);
                const item = list.find(i => i.id === id);
                if (item && item.locked) return;
                
                State.currentAttachments = State.currentAttachments.filter(aid => {
                    const a = allAtts[aid];
                    return a ? a.type !== type : true;
                });
                
                const newAtt = allAtts[id];
                if (newAtt && newAtt.excludes) {
                    State.currentAttachments = State.currentAttachments.filter(aid => !newAtt.excludes.includes(aid));
                }
                
                State.currentAttachments.push(id);
            }
            
            let changed = true;
            while(changed) {
                changed = false;
                State.currentAttachments = State.currentAttachments.filter(aid => {
                    const a = allAtts[aid];
                    if (a && a.requirements) {
                        const met = a.requirements.every(req => State.currentAttachments.includes(req));
                        if (!met) { changed = true; return false; }
                    }
                    return true;
                });
            }
            
            this.refreshAll();
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.LoadoutUI = LoadoutUI;
})();
