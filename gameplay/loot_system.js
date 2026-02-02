
// js/gameplay/loot_system.js
(function() {
    const LootSystem = {
        
        config: {
            caps: {
                '12gauge': 12,    
                '9mm': 60,        
                '762mm': 45,      
                'rocket_heat': 3,
                'rocket_frag': 3,
                '9mm_sub': 30     
            },
            colors: {
                '12gauge': 0x8b3a3a,    
                '9mm': 0xcc7a00,        
                '762mm': 0x5a6e7f,      
                'rocket_heat': 0x2f3a2f, 
                'rocket_frag': 0x2f3a2f,
                '9mm_sub': 0x111111,    
                'default': 0x555555
            }
        },

        init() {
            console.log("LootSystem: Initialized (Scavenger/Subsonic Ready).");
        },
        
        dropLoot(position, weaponDef, ammoModule) {
            if (!position || !weaponDef || !ammoModule) return;

            // --- GRENADE DROP LOGIC ---
            // If died holding a grenade (and not thrown), drop 1x grenade ammo
            if (weaponDef.type === 'throwable') {
                const typeId = weaponDef.id; // e.g. "FRAG"
                
                // Drop a box representing the grenade
                if (window.TacticalShooter.EntityManager) {
                     const spawnPos = position.clone().add(new THREE.Vector3(0.2, 0.5, 0.2));
                     
                     // Use specific entity type 'loot_v2_nade' to trigger model spawn in EntityManager if customized
                     // For now, standard system uses 'loot_v2' which makes boxes. 
                     // We need to inject the Throwable Model logic here.
                     
                     // But EntityManager.spawnLootBox creates a box.
                     // Let's spawn a "prop" grenade instead using EntityManager.spawnEntity with a special type.
                     // Since EntityManager doesn't support generic model spawning easily without type logic,
                     // We will hack it: Spawn 'loot_v2' but pass a special flag in the ID or color to tell Visuals to swap mesh?
                     
                     // Better: Update EntityManager.spawnEntity to handle 'dropped_nade'.
                     // For now, let's just drop a green box as fallback, but the prompt asks for the "grenade type they were holding".
                     // Let's try to spawn the throwable projectile itself but inert?
                     // ThrowableManager spawns projectiles.
                     
                     // Let's use ThrowableManager to spawn a "dud" that acts as loot.
                     // But we need it to be pickable.
                     
                     // Strategy: Spawn a loot entity, but ask LootVisuals to render the grenade mesh instead of a box.
                     // Pass a special color code 0xFF00FF (Magic Pink) to signal custom mesh? No, let's use the ID.
                     // 'loot_v2|FRAG|1|0x44cc44'
                     
                     // If we pass a color of -1, we can signal LootVisuals to look up the ID.
                     const entId = window.TacticalShooter.EntityManager.spawnLootBox(spawnPos, -1, typeId, 1);
                     
                     if (window.TacticalShooter.NetworkEventHandler && entId) {
                         const packet = `loot_v2|${typeId}|1|-1`; // -1 color signals mesh load
                         window.TacticalShooter.NetworkEventHandler.broadcastSpawnEntity(packet, spawnPos, new THREE.Quaternion(), new THREE.Vector3(0,2,0), entId);
                     }
                }
                return;
            }

            const ammoType = weaponDef.ammoType;
            if (!ammoType || ammoType === 'none') return;

            let heldAmount = (ammoModule.currentAmmo || 0);
            if (ammoModule.ammoPools && ammoModule.ammoPools[ammoType] !== undefined) {
                heldAmount += ammoModule.ammoPools[ammoType];
            }
            if (heldAmount <= 0) return;

            const cap = this.config.caps[ammoType] || 60;
            const dropAmount = Math.min(heldAmount, cap);
            const spawnPos = position.clone().add(new THREE.Vector3(0, 0.5, 0));
            const color = this.config.colors[ammoType] || this.config.colors['default'];
            
            if (window.TacticalShooter.EntityManager) {
                const entityId = window.TacticalShooter.EntityManager.spawnLootBox(spawnPos, color, ammoType, dropAmount);
                if (window.TacticalShooter.NetworkEventHandler && entityId) {
                    const packetType = `loot_v2|${ammoType}|${dropAmount}|${color}`;
                    const velocity = new THREE.Vector3((Math.random()-0.5)*2, 3.0, (Math.random()-0.5)*2);
                    window.TacticalShooter.NetworkEventHandler.broadcastSpawnEntity(packetType, spawnPos, new THREE.Quaternion(), velocity, entityId);
                }
            }
        },
        
        handlePickup(entity, playerState) {
            if (!entity.data || !playerState) return false;
            if (playerState.isDead || playerState.isSpectating) return false;
            
            const dropType = entity.data.type;
            const dropAmount = entity.data.amount;
            const PA = playerState.modules.ammo;
            const PerkSys = window.TacticalShooter.PerkSystem;
            const hasScavenger = PerkSys && PerkSys.hasPerk('SCAVENGER');

            // --- GRENADE PICKUP ---
            // If drop type matches a grenade ID in our inventory
            if (['FRAG', 'FLASH', 'SMOKE'].includes(dropType)) {
                if (window.TacticalShooter.InventoryController) {
                    const inv = window.TacticalShooter.InventoryController.grenadeInventory;
                    // Check if we have this grenade type in any slot
                    const slot = inv.find(s => s && s.id === dropType);
                    if (slot) {
                        slot.count++;
                        if (window.TacticalShooter.AmmoFeedUI) window.TacticalShooter.AmmoFeedUI.show(1, dropType);
                        if (playerState.updateHUD) playerState.updateHUD();
                        return true;
                    }
                }
                return false; 
            }

            // --- AMMO PICKUP ---
            const currentWeapon = window.TacticalShooter.WeaponManager.currentWeapon;
            const currentAmmoType = currentWeapon ? currentWeapon.ammoType : null;
            
            // Check Compatibility
            const isMatch = (currentAmmoType === dropType);
            const isSubsonicDrop = (dropType === '9mm_sub');
            const playerUsesSubsonic = (currentAmmoType === '9mm_sub');

            // SUBSONIC RULE: Cannot pick up normal 9mm if using subsonic, and vice versa
            if (playerUsesSubsonic && dropType === '9mm') return false; 
            if (currentAmmoType === '9mm' && isSubsonicDrop) return false;
            
            if (isMatch) {
                let finalAmount = dropAmount;
                if (hasScavenger) finalAmount = Math.floor(dropAmount * 1.5);
                
                if (PA.ammoPools[dropType] !== undefined) {
                    PA.ammoPools[dropType] += finalAmount;
                    if (window.TacticalShooter.AmmoFeedUI) window.TacticalShooter.AmmoFeedUI.show(finalAmount, dropType.replace('_', ' ').toUpperCase());
                    if (playerState.updateHUD) playerState.updateHUD();
                    return true;
                }
            } 
            else if (hasScavenger) {
                const amountSmall = Math.max(1, Math.floor(dropAmount * 0.2)); 
                let pickedUp = false;
                
                if (currentAmmoType && PA.ammoPools[currentAmmoType] !== undefined) {
                    PA.ammoPools[currentAmmoType] += amountSmall;
                    pickedUp = true;
                }
                
                for (let type in PA.ammoPools) {
                    if (type !== currentAmmoType) {
                        PA.ammoPools[type] += amountSmall;
                        pickedUp = true;
                    }
                }
                
                if (pickedUp) {
                    if (window.TacticalShooter.AmmoFeedUI) window.TacticalShooter.AmmoFeedUI.show(amountSmall, "SCAVENGED");
                    if (playerState.updateHUD) playerState.updateHUD();
                    return true;
                }
            }
            
            return false;
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.LootSystem = LootSystem;
})();
