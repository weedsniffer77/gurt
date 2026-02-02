
// js/core/loadout_manager.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    
    const LoadoutManager = {
        // Active "In-Match" Loadout
        activeLoadout: {
            primary: { id: "SHOTGUN", attachments: [] }, 
            secondary: { id: "PISTOL", attachments: [] }, 
            melee: { id: "KNIFE", attachments: [] },
            equipment1: { id: "FRAG", attachments: [] },
            equipment2: { id: "FLASH", attachments: [] },
            scorestreaks: ["AMMO_BOX", null, null],
            perks: ["LAST_STAND", "ADRENALINE", "QUICK_HEAL"]
        },
        
        // Active "In-Match" Slot Key
        activeSlot: "primary", 
        slots: ["primary", "secondary", "melee", "equipment1", "equipment2"],
        
        // --- STORAGE SYSTEM ---
        savedLoadouts: [], // Array of 5
        currentLoadoutIndex: 0,
        mainLoadoutIndex: 0, 
        
        // Defaults for fallback
        defaultPerks: ["LAST_STAND", "ADRENALINE", "QUICK_HEAL"],

        init() {
            console.log('LoadoutManager: Initializing...');
            this.loadFromStorage();
            if (this.savedLoadouts.length === 0) this.savedLoadouts[0] = this.createDefaultLoadout();
            while(this.savedLoadouts.length < 5) this.savedLoadouts.push(this.createDefaultLoadout());
            if (this.savedLoadouts.length > 5) this.savedLoadouts = this.savedLoadouts.slice(0, 5);
            this.activeSlot = "primary";
            this.equipLoadout(this.mainLoadoutIndex); 
        },
        
        loadFromStorage() {
            try {
                const data = localStorage.getItem('ts_loadouts');
                if (data) this.savedLoadouts = JSON.parse(data);
                const mainIdx = localStorage.getItem('ts_main_loadout');
                if (mainIdx !== null) this.mainLoadoutIndex = parseInt(mainIdx);
            } catch(e) { console.error("Loadout load error", e); }
        },
        
        saveToStorage() {
            try {
                localStorage.setItem('ts_loadouts', JSON.stringify(this.savedLoadouts));
                localStorage.setItem('ts_main_loadout', this.mainLoadoutIndex.toString());
            } catch(e) { console.error("Loadout save error", e); }
        },
        
        createDefaultLoadout() {
            return {
                name: "ASSAULT",
                primary: { id: "SHOTGUN", attachments: [] },
                secondary: { id: "PISTOL", attachments: [] },
                melee: { id: "KNIFE", attachments: [] },
                equipment1: { id: "FRAG", attachments: [] },
                equipment2: { id: "FLASH", attachments: [] },
                scorestreaks: ["AMMO_BOX", null, null],
                perks: [...this.defaultPerks]
            };
        },

        getLoadout(index) {
            const l = this.savedLoadouts[index] || this.createDefaultLoadout();
            if (!l.equipment1) l.equipment1 = { id: "FRAG", attachments: [] };
            if (!l.equipment2) l.equipment2 = { id: "FLASH", attachments: [] };
            if (!l.scorestreaks) l.scorestreaks = ["AMMO_BOX", null, null];
            
            if (!l.perks) l.perks = [...this.defaultPerks];
            
            // Validate Perks immediately (Sanitization)
            this.validateLoadoutPerks(l);
            
            return l;
        },
        
        validateLoadoutPerks(loadout) {
            const PerkData = window.TacticalShooter.GameData.Perks;
            if (!PerkData) return;

            const isSecondaryLocked = this.isSlotLocked('secondary', loadout);

            for (let i = 0; i < 3; i++) {
                const pid = loadout.perks[i];
                if (!pid || !PerkData[pid]) {
                    loadout.perks[i] = this.defaultPerks[i];
                    continue;
                }
                
                const def = PerkData[pid];
                
                // Requirement Check
                if (def.requirements) {
                    const reqId = def.requirements.weaponId;
                    let hasWeapon = false;
                    let targetAtts = [];
                    
                    // Check Primary
                    if (loadout.primary.id === reqId) {
                        hasWeapon = true;
                        targetAtts = loadout.primary.attachments;
                    }
                    // Check Secondary (Only if not locked)
                    else if (loadout.secondary.id === reqId && !isSecondaryLocked) {
                        hasWeapon = true;
                        targetAtts = loadout.secondary.attachments;
                    }
                    
                    if (!hasWeapon) {
                        console.warn(`LoadoutManager: Auto-replacing invalid perk ${pid} (Missing Weapon)`);
                        loadout.perks[i] = this.defaultPerks[i];
                        continue;
                    }
                    
                    // Check Attachments
                    if (def.requirements.excludeAttachments) {
                        const conflict = def.requirements.excludeAttachments.some(ex => targetAtts.includes(ex));
                        if (conflict) {
                             console.warn(`LoadoutManager: Auto-replacing invalid perk ${pid} (Attachment Conflict)`);
                             loadout.perks[i] = this.defaultPerks[i];
                             continue;
                        }
                    }
                    
                    if (def.requirements.requireAttachments) {
                        const missing = def.requirements.requireAttachments.some(req => !targetAtts.includes(req));
                        if (missing) {
                             console.warn(`LoadoutManager: Auto-replacing invalid perk ${pid} (Missing Attachment)`);
                             loadout.perks[i] = this.defaultPerks[i];
                             continue;
                        }
                    }
                }
            }
        },
        
        isSlotLocked(slotName, loadoutData) {
            const loadout = loadoutData || this.activeLoadout;
            if (!loadout || !loadout.primary || !loadout.primary.id) return false;
            const primId = loadout.primary.id;
            const def = window.TacticalShooter.GameData.Weapons[primId];
            const isHeavy = (def && def.type === 'heavy');
            if (isHeavy) {
                if (slotName === 'secondary' || slotName === 'equipment2') return true;
            }
            return false;
        },
        
        equipLoadout(index) {
            if (index < 0 || index >= 5) return;
            this.currentLoadoutIndex = index;
            const L = this.getLoadout(index); // This runs validation
            
            this.activeLoadout = {
                primary: { ...L.primary, attachments: [...(L.primary.attachments || [])] },
                secondary: { ...L.secondary, attachments: [...(L.secondary.attachments || [])] },
                melee: { ...L.melee, attachments: [...(L.melee.attachments || [])] },
                equipment1: { ...L.equipment1 },
                equipment2: { ...L.equipment2 },
                scorestreaks: [...(L.scorestreaks || ["AMMO_BOX", null, null])],
                perks: [...(L.perks || this.defaultPerks)]
            };
            
            // Double check lock logic for active loadout
            if (this.isSlotLocked('secondary', this.activeLoadout)) {
                // Ensure secondary is empty/dummy in logic
                // We keep the data but logic ignores it
            }
            
            this.activeSlot = "primary";
            
            if (window.TacticalShooter.PlayerState) {
                const PS = window.TacticalShooter.PlayerState;
                let maxHp = 100;
                if (window.TacticalShooter.PerkSystem) {
                    maxHp = window.TacticalShooter.PerkSystem.modifyMaxHealth(maxHp);
                }
                
                if (PS.modules.health) {
                    PS.modules.health.maxHp = maxHp;
                    if (!PS.isDead) PS.modules.health.hp = Math.min(PS.modules.health.hp, maxHp);
                    PS.modules.health.updateUI();
                }
            }
            
            if (window.TacticalShooter.MenuRenderer && window.TacticalShooter.MenuRenderer.active) {
                const def = this.getActiveWeaponDef();
                if (def) window.TacticalShooter.MenuRenderer.spawnWeapon(def);
            }
            if (window.TacticalShooter.InventoryController) window.TacticalShooter.InventoryController.initInventoryFromLoadout();
            if (window.TacticalShooter.ScorestreakManager) window.TacticalShooter.ScorestreakManager.reset();
            
            console.log(`LoadoutManager: Equipped Loadout ${index+1}`);
        },
        
        setMainLoadout(index) {
            if (index < 0 || index >= 5) return;
            this.mainLoadoutIndex = index;
            this.saveToStorage();
            this.equipLoadout(index); 
        },
        
        getActiveWeaponDef() {
            const slotKey = this.activeSlot;
            if (this.isSlotLocked(slotKey, this.activeLoadout)) return null;
            const slotData = this.activeLoadout[slotKey];
            if (!slotData || !slotData.id) return null;
            
            let baseDef = window.TacticalShooter.GameData.Weapons[slotData.id];
            if (!baseDef) baseDef = window.TacticalShooter.GameData.Throwables[slotData.id];
            if (!baseDef) return null;

            return this.generateModifiedDef(slotData.id, slotData.attachments);
        },
        
        generateModifiedDef(weaponId, attachments) {
            let baseDef = window.TacticalShooter.GameData.Weapons[weaponId];
            if (!baseDef) baseDef = window.TacticalShooter.GameData.Throwables[weaponId];
            if (!baseDef) return null;
            
            // Deep Clone Data Properties
            const newDef = JSON.parse(JSON.stringify(baseDef));
            
            // CRITICAL FIX: Re-attach functions lost during stringify
            if (baseDef.buildMesh) newDef.buildMesh = baseDef.buildMesh;
            if (baseDef.animationLogic) newDef.animationLogic = baseDef.animationLogic;
            if (baseDef.attackAction) newDef.attackAction = baseDef.attackAction; 
            
            newDef.attachments = attachments || [];
            
            // 1. Apply Attachments
            const AttRegistry = window.TacticalShooter.GameData.Attachments || {};
            newDef.attachments.forEach(attId => {
                const mod = AttRegistry[attId];
                if (mod && mod.apply) mod.apply(newDef);
            });
            
            // 2. Apply Perks
            if (window.TacticalShooter.PerkSystem) {
                window.TacticalShooter.PerkSystem.applyWeaponModifications(newDef);
                
                if (newDef.reloadTime) {
                    newDef.reloadTime = window.TacticalShooter.PerkSystem.modifyReloadSpeed(newDef.reloadTime, weaponId);
                }
                if (newDef.pumpCycleTime) {
                    newDef.pumpCycleTime = window.TacticalShooter.PerkSystem.modifyPumpTime(newDef.pumpCycleTime, weaponId);
                }
            }

            this.calculateReserves(weaponId, newDef, newDef.attachments);
            return newDef;
        },
        
        calculateReserves(weaponId, def, atts) {
            const isAuto = atts.includes('pistol_auto') || def.automatic; 
            const isExt = atts.includes('pistol_mag_ext') || atts.includes('smg_mag_ext');
            const isAkimbo = atts.includes('pistol_akimbo');
            const isPDW = atts.includes('smg_conversion_pdw');
            
            if (weaponId === "PISTOL") {
                if (isAkimbo) def.reserveAmmo = isExt ? 240 : 180;
                else if (isAuto) def.reserveAmmo = isExt ? 150 : 120;
                else def.reserveAmmo = isExt ? 120 : 75;
            } 
            else if (weaponId === "SMG") {
                if (isPDW) def.reserveAmmo = isExt ? 180 : 120;
                else def.reserveAmmo = isExt ? 225 : 180;
            }
            else if (weaponId === "SHOTGUN") def.reserveAmmo = 24; // Fixed: Was 42
            else if (weaponId === "TYPE92") def.reserveAmmo = 75;
            
            if (window.TacticalShooter.PerkSystem) {
                def.reserveAmmo = window.TacticalShooter.PerkSystem.modifyReserveAmmo(def.reserveAmmo);
            }
            
            if (def.ammoType === '12gauge' && def.reserveAmmo > 120) def.reserveAmmo = 120;
            if (def.ammoType === '9mm' && def.reserveAmmo > 600) def.reserveAmmo = 600;
        },
        
        switchWeapon(slotName) {
            if (!this.slots.includes(slotName)) return null;
            if (this.isSlotLocked(slotName, this.activeLoadout)) return null;
            const slotData = this.activeLoadout[slotName];
            if (!slotData) return null;
            if (this.activeSlot !== slotName || slotName.startsWith('equipment')) {
                this.activeSlot = slotName;
                return this.getActiveWeaponDef();
            }
            return null; 
        },
        
        commitWeaponChanges(slotIndex, type, weaponId, attachments) {
            if (this.savedLoadouts[slotIndex]) {
                
                // --- SCORESTREAK DUPLICATE CHECK ---
                if (type.startsWith('streak')) {
                    const idx = parseInt(type.replace('streak',''));
                    const streaks = this.savedLoadouts[slotIndex].scorestreaks || [null, null, null];
                    
                    // If trying to set a streak that exists in another slot, clear the other slot
                    if (weaponId) {
                        for(let i=0; i<3; i++) {
                            if (i !== idx && streaks[i] === weaponId) {
                                streaks[i] = null;
                            }
                        }
                    }
                    streaks[idx] = weaponId;
                    this.savedLoadouts[slotIndex].scorestreaks = streaks;
                } else {
                    this.savedLoadouts[slotIndex][type] = { id: weaponId, attachments: [...attachments] };
                }
                
                this.saveToStorage();
                if (this.currentLoadoutIndex === slotIndex) this.equipLoadout(slotIndex);
            }
        },
        
        commitPerkChange(slotIndex, perkIndex, perkId) {
             if (this.savedLoadouts[slotIndex]) {
                if (!this.savedLoadouts[slotIndex].perks) this.savedLoadouts[slotIndex].perks = [...this.defaultPerks];
                this.savedLoadouts[slotIndex].perks[perkIndex] = perkId;
                this.saveToStorage();
                if (this.currentLoadoutIndex === slotIndex) this.equipLoadout(slotIndex);
            }
        }
    };
    
    window.TacticalShooter.LoadoutManager = LoadoutManager;
})();
