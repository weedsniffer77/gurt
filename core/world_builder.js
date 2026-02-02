
// js/core/world_builder.js
(function() {
    const WorldBuilder = {
        scene: null,
        currentMap: null,
        staticCollider: null,
        
        init() {
            console.log("WorldBuilder: Initialized");
        },
        
        // Full Map Load Sequence (Replaces GameManager logic)
        async loadMapFull(mapId, scene, materialLibrary) {
            this.scene = scene;
            
            // 1. Cleanup Old
            if (this.currentMap) {
                this.currentMap.cleanup(this.scene);
                if (window.TacticalShooter.SkyRenderer) window.TacticalShooter.SkyRenderer.dispose();
                this.currentMap = null;
            }
            this.staticCollider = null;
            
            // 2. Pre-load Assets
            if (window.TacticalShooter.AssetLoader) {
                const baseId = mapId.includes('WAREHOUSE') ? 'WAREHOUSE' : mapId;
                await window.TacticalShooter.AssetLoader.loadMap(baseId);
            }
            
            // 3. Instantiate Map
            let mapObj = null; 
            if (window.TacticalShooter.MapRegistry) {
                mapObj = window.TacticalShooter.MapRegistry.get(mapId);
                if (!mapObj && mapId.includes('WAREHOUSE')) {
                    mapObj = window.TacticalShooter.MapRegistry.get('WAREHOUSE');
                }
            }
            if (!mapObj && window.TacticalShooter.WarehouseMap) mapObj = window.TacticalShooter.WarehouseMap;
            
            if (mapObj) {
                this.currentMap = mapObj;
                this.currentMap.init(this.scene, materialLibrary);
                
                // 4. Optimize
                this.optimizeMapVisuals(200); 
                this.generateStaticCollider();
                
                // 5. Setup Ragdolls
                if (window.TacticalShooter.RagdollManager) {
                    window.TacticalShooter.RagdollManager.resetStaticGeometry();
                    if (this.currentMap.mapGroup) {
                        window.TacticalShooter.RagdollManager.scanStaticGeometry(this.currentMap.mapGroup);
                    }
                }
                
                return {
                    map: this.currentMap,
                    collider: this.staticCollider
                };
            }
            return null;
        },
        
        optimizeMapVisuals(chunkSize = 200) { 
            if (window.TacticalShooter.MapOptimizer && this.currentMap) {
                window.TacticalShooter.MapOptimizer.optimize(this.currentMap.mapGroup, chunkSize);
            }
        },

        generateStaticCollider() {
            if (this.staticCollider) {
                if (this.staticCollider.geometry.boundsTree) this.staticCollider.geometry.disposeBoundsTree();
                this.staticCollider.geometry.dispose();
                this.staticCollider = null;
            }
            if (!this.currentMap || !this.currentMap.mapGroup) return;
            
            if (window.TacticalShooter.MapOptimizer) {
                // Generates BVH (visual raycast) AND Rapier RigidBody (physics)
                this.staticCollider = window.TacticalShooter.MapOptimizer.generateStaticCollider(this.currentMap.mapGroup);
            }
        },

        updateMapVisuals(isTacView) {
            const mapGroup = this.currentMap ? this.currentMap.mapGroup : null;
            if (!mapGroup) return;
            
            if (this.currentMap && this.currentMap.updateVisuals) {
                const MS = window.TacticalShooter.MatchState ? window.TacticalShooter.MatchState.state : null;
                const isTDM = MS ? (MS.gamemode !== 'FFA') : true;
                const count = MS ? MS.teamCount : 2;
                this.currentMap.updateVisuals(isTacView, isTDM, count);
            }

            mapGroup.traverse((obj) => {
                if (!obj.isMesh) return; 
                let isSpawnZone = obj.userData.isSpawnZone;
                let isProp = obj.userData.isProp;

                // Check parents for flags if batched
                let curr = obj.parent;
                while (curr && curr !== mapGroup && curr !== null) {
                    if (curr.userData.isSpawnZone) isSpawnZone = true;
                    if (curr.userData.isProp) isProp = true;
                    curr = curr.parent;
                }

                if (isSpawnZone) return;
                if (isTacView) {
                    // Hide props in tac view for clarity
                    obj.visible = !isProp; 
                } else {
                    obj.visible = true;
                }
            });
        },

        getActiveGameConfig() {
            if (this.currentMap && this.currentMap.id === "CONTAINERS") return window.CONTAINERS_GAME_CONFIG;
            if (this.currentMap && this.currentMap.id === "DEPOT") return window.DEPOT_GAME_CONFIG;
            if (this.currentMap && this.currentMap.id === "WAREHOUSE") {
                const MS = window.TacticalShooter.MatchState;
                if (MS && MS.state.nightMode) return window.WAREHOUSE_NIGHT_GAME_CONFIG;
                return window.WAREHOUSE_GAME_CONFIG;
            }
            return window.WAREHOUSE_GAME_CONFIG; // Fallback
        },
        
        getActiveLighting(requestedMapId) {
            let mapId = requestedMapId;
            if (!mapId && this.currentMap) mapId = this.currentMap.id;
            
            const MS = window.TacticalShooter.MatchState;
            const useNight = (MS && MS.state.nightMode) || (mapId && mapId.includes('NIGHT'));
            
            if (mapId && mapId.includes("CONTAINERS")) return window.CONTAINERS_LIGHTING;
            if (mapId && mapId.includes("DEPOT")) return window.DEPOT_LIGHTING;
            if (mapId && mapId.includes("WAREHOUSE")) {
                if (useNight && window.WAREHOUSE_NIGHT_LIGHTING) return window.WAREHOUSE_NIGHT_LIGHTING;
                return window.WAREHOUSE_LIGHTING;
            }
            return window.WAREHOUSE_LIGHTING;
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.WorldBuilder = WorldBuilder;
})();
