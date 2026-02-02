
// js/core/scorestreak_manager.js
(function() {
    const ScorestreakManager = {
        currentStreak: 0,
        slots: [],
        bannerTimeout: null,
        
        // Generic active streaks list
        // [{ id, defId, data, ownerId, teamId }]
        activeStreaks: [],
        
        init() {
            console.log("ScorestreakManager: Initializing...");
            this.reset();
        },
        
        reset() {
            this.currentStreak = 0;
            this.activeStreaks = [];
            this.loadSlots();
        },
        
        loadSlots() {
            const LM = window.TacticalShooter.LoadoutManager;
            const activeLoadout = LM ? LM.activeLoadout : null;
            const streakIds = (activeLoadout && activeLoadout.scorestreaks) ? activeLoadout.scorestreaks : ['AMMO_BOX', 'FPV_DRONE', 'AIRSTRIKE'];
            
            const PerkSys = window.TacticalShooter.PerkSystem;
            let modifier = 0;
            if (PerkSys) {
                if (PerkSys.hasPerk('HARDLINE')) modifier -= 1;
            }
            
            this.slots = streakIds.map(id => {
                if (!id) return null;
                const def = window.TacticalShooter.GameData.Scorestreaks[id];
                if (!def) return null;
                
                const baseReq = Math.max(2, def.killsRequired + modifier);
                let cycleStep = 0;
                if (id === 'AMMO_BOX') cycleStep = 8;
                else if (id === 'FPV_DRONE') cycleStep = 8;
                else if (id === 'AIRSTRIKE') cycleStep = 9;
                
                return { 
                    id: id, 
                    def: def, 
                    earned: false, 
                    baseReq: baseReq,
                    nextUnlock: baseReq, 
                    cycleStep: cycleStep
                };
            });
        },
        
        onKill() {
            if (window.TacticalShooter.ScoreSystem) {
                this.currentStreak = window.TacticalShooter.ScoreSystem.currentKillstreak;
                this.checkUnlock();
            }
        },
        
        checkUnlock() {
            let newlyEarned = null;
            let slotIndex = -1;
            this.slots.forEach((slot, index) => {
                if (slot && this.currentStreak >= slot.nextUnlock) {
                    if (!slot.earned) {
                        slot.earned = true;
                        newlyEarned = slot.def;
                        slotIndex = index;
                        if (slot.cycleStep > 0) {
                            slot.nextUnlock += slot.cycleStep;
                        } else {
                            slot.nextUnlock = 9999; 
                        }
                    }
                }
            });
            
            if (newlyEarned) {
                this.showBanner(newlyEarned, slotIndex + 1);
                if (window.TacticalShooter.PostProcessor) {
                    window.TacticalShooter.PostProcessor.triggerGoldenFlash();
                }
            }
        },
        
        showBanner(streakDef, index) {
            const banner = document.getElementById('scorestreak-banner');
            const text = document.getElementById('ss-text');
            const sub = document.getElementById('ss-sub');
            if (banner && text && sub) {
                text.textContent = `${streakDef.name} READY`;
                const keyIndex = 7 + (index - 1);
                sub.textContent = `PRESS [${keyIndex}] TO USE`;
                banner.style.display = 'block';
                banner.classList.remove('ss-anim-enter');
                void banner.offsetWidth;
                banner.classList.add('ss-anim-enter');
                if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
                this.bannerTimeout = setTimeout(() => {
                    banner.style.display = 'none';
                }, 3000);
            }
        },
        
        activate(slotIndex) {
            const PS = window.TacticalShooter.PlayerState;
            if (PS.isControllingDrone || PS.isDead || PS.isSpectating) return;
            
            // --- BLOCK IF ALREADY HOLDING A STREAK ---
            const currentWeapon = window.TacticalShooter.WeaponManager.currentWeapon;
            if (currentWeapon && currentWeapon.type === 'special') return;

            const slot = this.slots[slotIndex];
            if (slot && slot.earned) {
                if (slot.def.onActivate) {
                    if (PS.modules.ammo) {
                        const targetWepId = (slot.id === 'FPV_DRONE') ? 'DRONE_REMOTE' : 
                                           (slot.id === 'AMMO_BOX' ? 'AMMO_BOX_DEPLOY' : 
                                           (slot.id === 'AIRSTRIKE' ? 'LASER_DESIGNATOR' : null));
                        if (targetWepId) {
                            PS.modules.ammo.weaponMagCache[targetWepId] = undefined; 
                        }
                    }
                    slot.def.onActivate(PS);
                }
                slot.earned = false;
                const banner = document.getElementById('scorestreak-banner');
                if (banner) banner.style.display = 'none';
            }
        },
        
        // --- GENERIC TRIGGER ---
        triggerAirstrike(ownerId, targetPos, teamId) {
            const NEH = window.TacticalShooter.NetworkEventHandler;
            if (NEH) NEH.broadcastAirstrike(ownerId, targetPos, teamId);
            
            const def = window.TacticalShooter.GameData.Scorestreaks['AIRSTRIKE'];
            if (def && def.logic && def.logic.createInstance) {
                const instance = def.logic.createInstance(ownerId, targetPos, teamId);
                this.activeStreaks.push({
                    defId: 'AIRSTRIKE',
                    instance: instance
                });
            }
        },
        
        handleAirstrikeEvent(ownerId, targetPos, teamId) {
            // Network hook calls the same creation logic
             const def = window.TacticalShooter.GameData.Scorestreaks['AIRSTRIKE'];
             if (def && def.logic && def.logic.createInstance) {
                 const instance = def.logic.createInstance(ownerId, targetPos, teamId);
                 this.activeStreaks.push({
                     defId: 'AIRSTRIKE',
                     instance: instance
                 });
             }
        },
        
        update(inputManager, dt = 0.016) {
            if (inputManager) {
                if (inputManager.wasActionJustPressed('Scorestreak1')) this.activate(0);
                if (inputManager.wasActionJustPressed('Scorestreak2')) this.activate(1);
                if (inputManager.wasActionJustPressed('Scorestreak3')) this.activate(2);
            }
            
            if (this.activeStreaks.length === 0) {
                 // Clear UI if needed
                 const def = window.TacticalShooter.GameData.Scorestreaks['AIRSTRIKE'];
                 if (def && def.logic && def.logic.clearUI) def.logic.clearUI();
                 return;
            }

            // Update all active streaks
            for (let i = this.activeStreaks.length - 1; i >= 0; i--) {
                const item = this.activeStreaks[i];
                const def = window.TacticalShooter.GameData.Scorestreaks[item.defId];
                
                if (def && def.logic && def.logic.update) {
                    const keep = def.logic.update(item.instance, dt);
                    if (!keep) {
                        this.activeStreaks.splice(i, 1);
                    }
                } else {
                    this.activeStreaks.splice(i, 1); // Cleanup invalid
                }
            }
            
            // Allow Airstrike to Manage its UI (Single global UI for multiple strikes)
            const airstrikeDef = window.TacticalShooter.GameData.Scorestreaks['AIRSTRIKE'];
            if (airstrikeDef && airstrikeDef.logic && airstrikeDef.logic.updateGlobalUI) {
                const airstrikeInstances = this.activeStreaks
                    .filter(s => s.defId === 'AIRSTRIKE')
                    .map(s => s.instance);
                airstrikeDef.logic.updateGlobalUI(airstrikeInstances);
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ScorestreakManager = ScorestreakManager;
})();
