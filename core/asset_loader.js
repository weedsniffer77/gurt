
// js/core/asset_loader.js
(function() {
    const AssetLoader = {
        // Bridge Mode: actively waits for scripts loaded by index.html/registries to initialize their objects.
        
        async loadCommon() {
            // Common assets are usually ready by the time we call this, 
            // but we can add checks here if needed for things like GameData.
            return new Promise(resolve => {
                const check = () => {
                    if (window.TacticalShooter.GameData && window.TacticalShooter.GameData.Weapons) {
                        resolve();
                    } else {
                        setTimeout(check, 50);
                    }
                };
                check();
            });
        },

        async loadMap(mapId) {
            return new Promise(resolve => {
                console.log(`AssetLoader: Waiting for map ${mapId}...`);
                const check = () => {
                    let target = null;
                    if (window.TacticalShooter.MapRegistry) {
                        target = window.TacticalShooter.MapRegistry.get(mapId);
                    }
                    
                    // Fallback check
                    if (!target && mapId === "WAREHOUSE" && window.TacticalShooter.WarehouseMap) {
                        target = window.TacticalShooter.WarehouseMap;
                    }
                    
                    if (target) {
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        },

        async loadWeapon(weaponId) {
            // Weapons are loaded by weapon_registry.js usually before init, 
            // but this ensures the specific definition exists.
            return new Promise(resolve => {
                const check = () => {
                    let def = window.TacticalShooter.GameData.Weapons[weaponId];
                    if (!def) def = window.TacticalShooter.GameData.Throwables[weaponId];
                    
                    if (def) resolve();
                    else setTimeout(check, 100);
                };
                check();
            });
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.AssetLoader = AssetLoader;
    console.log('AssetLoader: ✓ Ready (Bridge Mode)');
})();
