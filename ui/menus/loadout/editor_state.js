
// js/ui/menus/loadout/editor_state.js
(function() {
    const EditorState = {
        activeSlotIndex: 0,
        activeSlotType: 'primary',
        activeCategoryTab: 'ASSAULT',
        
        currentWeaponId: "SMG",
        currentAttachments: [],
        
        init() {
            const LM = window.TacticalShooter.LoadoutManager;
            if (LM) {
                this.activeSlotIndex = LM.currentLoadoutIndex;
            }
            this.resetSelection();
        },
        
        setActiveLoadout(index) {
            this.activeSlotIndex = index;
            this.activeSlotType = 'primary';
            this.resetSelection();
        },
        
        resetSelection() {
            const LM = window.TacticalShooter.LoadoutManager;
            if (!LM) return;
            
            const L = LM.getLoadout(this.activeSlotIndex);
            
            if (!this.activeSlotType) this.activeSlotType = 'primary';
            
            if (this.activeSlotType.startsWith('streak')) {
                const idx = parseInt(this.activeSlotType.replace('streak',''));
                const sId = (L.scorestreaks && L.scorestreaks[idx]) ? L.scorestreaks[idx] : null;
                this.currentWeaponId = sId || "AMMO_BOX"; 
                this.currentAttachments = [];
                this.activeCategoryTab = 'STREAK';
            } else {
                const slotData = L[this.activeSlotType];
                if (slotData) {
                    this.currentWeaponId = slotData.id;
                    this.currentAttachments = [...(slotData.attachments || [])];
                } else {
                    this.currentWeaponId = "SMG"; 
                    this.currentAttachments = [];
                }
                this.determineCategory();
            }
        },
        
        determineCategory() {
            const wid = this.currentWeaponId;
            const GD = window.TacticalShooter.GameData;
            
            if (this.activeSlotType.startsWith('streak')) {
                this.activeCategoryTab = 'STREAK';
                return;
            }

            if (GD.Scorestreaks[wid]) { this.activeCategoryTab = 'STREAK'; return; }
            
            const tDef = GD.Throwables[wid];
            if (tDef) {
                 if (tDef.slotType === 'rocket') this.activeCategoryTab = 'ROCKET';
                 else if (tDef.slotType === 'tactical') this.activeCategoryTab = 'TACTICAL';
                 else this.activeCategoryTab = 'LETHAL';
                 return;
            }
            
            const wDef = GD.Weapons[wid];
            if (wDef) {
                if (wDef.type === 'secondary') this.activeCategoryTab = 'PISTOL';
                else if (wDef.type === 'melee') this.activeCategoryTab = 'MELEE';
                else if (wDef.type === 'heavy') this.activeCategoryTab = 'HEAVY';
                else if (wid === 'SMG' || wid.includes('SMG')) this.activeCategoryTab = 'SMG';
                else if (wid === 'M24' || wid.includes('SNIPER')) this.activeCategoryTab = 'SNIPER';
                else if (wid.includes('SHOTGUN')) this.activeCategoryTab = 'SHOTGUN';
                else this.activeCategoryTab = 'ASSAULT';
                return;
            }
            
            this.activeCategoryTab = 'ASSAULT';
        },
        
        setSlot(type) {
            this.activeSlotType = type;
            this.resetSelection();
        },
        
        setWeapon(id) {
            this.currentWeaponId = id;
            
            const LM = window.TacticalShooter.LoadoutManager;
            const L = LM.getLoadout(this.activeSlotIndex);
            
            if (this.activeSlotType.startsWith('streak')) {
                this.currentAttachments = [];
            } else {
                const saved = L[this.activeSlotType];
                if (saved && saved.id === id) {
                    this.currentAttachments = [...(saved.attachments || [])];
                } else {
                    this.currentAttachments = [];
                }
            }
        },
        
        hasChanges() {
            const LM = window.TacticalShooter.LoadoutManager;
            const L = LM.getLoadout(this.activeSlotIndex);
            
            let savedId = null;
            let savedAtts = [];

            if (this.activeSlotType.startsWith('streak')) {
                const idx = parseInt(this.activeSlotType.replace('streak',''));
                savedId = (L.scorestreaks && L.scorestreaks[idx]) ? L.scorestreaks[idx] : null;
                if (!savedId && this.currentWeaponId !== "AMMO_BOX") return true; 
                if (savedId && this.currentWeaponId !== savedId) return true;
                return false;
            } else {
                const savedData = L[this.activeSlotType];
                if (!savedData) return false;
                savedId = savedData.id;
                savedAtts = savedData.attachments || [];
            }
            
            if (this.currentWeaponId !== savedId) return true;
            if (this.currentAttachments.length !== savedAtts.length) return true;
            
            const sortedCurrent = [...this.currentAttachments].sort();
            const sortedSaved = [...savedAtts].sort();
            return JSON.stringify(sortedCurrent) !== JSON.stringify(sortedSaved);
        },
        
        getCurrentDefinition() {
            const GD = window.TacticalShooter.GameData;
            const LM = window.TacticalShooter.LoadoutManager;
            
            if (GD.Weapons[this.currentWeaponId]) {
                return LM.generateModifiedDef(this.currentWeaponId, this.currentAttachments);
            }
            if (GD.Throwables[this.currentWeaponId]) return GD.Throwables[this.currentWeaponId];
            if (GD.Scorestreaks[this.currentWeaponId]) return GD.Scorestreaks[this.currentWeaponId];
            
            return null;
        },
        
        getSavedDefinition() {
            const LM = window.TacticalShooter.LoadoutManager;
            const L = LM.getLoadout(this.activeSlotIndex);
            const GD = window.TacticalShooter.GameData;
            
            let id = null;
            let atts = [];
            
            if (this.activeSlotType.startsWith('streak')) {
                const idx = parseInt(this.activeSlotType.replace('streak',''));
                id = (L.scorestreaks && L.scorestreaks[idx]) ? L.scorestreaks[idx] : null;
            } else {
                const saved = L[this.activeSlotType];
                if (saved) {
                    id = saved.id;
                    atts = saved.attachments || [];
                }
            }
            
            if (!id) return null;
            
            if (GD.Weapons[id]) return LM.generateModifiedDef(id, atts);
            if (GD.Throwables[id]) return GD.Throwables[id];
            if (GD.Scorestreaks[id]) return GD.Scorestreaks[id];
            
            return null;
        },

        // --- DELEGATED TO STAT SYSTEM ---
        getAvailableAttachments(slotType) {
            if (window.TacticalShooter.StatSystem) {
                return window.TacticalShooter.StatSystem.getCompatibleAttachments(this.currentWeaponId, slotType, this.currentAttachments);
            }
            return [];
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.EditorState = EditorState;
})();
