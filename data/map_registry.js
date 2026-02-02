
// js/data/map_registry.js
(function() {
    const MapRegistry = {
        maps: {}, // The central container for Map objects
        
        // Manifest of scripts to load
        manifest: [
            // Warehouse
            "data/maps/warehouse/lighting.js",
            "data/maps/warehouse/lighting_night.js",
            "data/maps/warehouse/game_config.js",
            "data/maps/warehouse/map.js",
            
            // Depot
            "data/maps/depot/lighting.js",
            "data/maps/depot/game_config.js",
            "data/maps/depot/map.js",

            // Containers (NEW)
            "data/maps/containers/lighting.js",
            "data/maps/containers/game_config.js",
            "data/maps/containers/map.js"
        ],

        init() {
            console.log("MapRegistry: Initializing and loading maps...");
            this.loadNext(0);
        },

        register(mapId, mapDefinition) {
            this.maps[mapId] = mapDefinition;
            console.log(`MapRegistry: Registered ${mapId}`);
        },

        get(mapId) {
            return this.maps[mapId];
        },

        loadNext(index) {
            if (index >= this.manifest.length) {
                console.log("MapRegistry: All map assets loaded.");
                return;
            }
            const s = document.createElement('script');
            s.src = this.manifest[index];
            s.onload = () => this.loadNext(index + 1);
            s.onerror = () => {
                console.error("MapRegistry: Failed to load script:", this.manifest[index]);
                this.loadNext(index + 1);
            };
            document.head.appendChild(s);
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.MapRegistry = MapRegistry;
    
    // Start loading immediately
    MapRegistry.init();
})();
