
// js/data/maps/depot/map.js

// REMOVED FROM THE GAME, DO NOT ADD BACK INTO MAP SELECTOR

(function() {
    const DepotMap = {
        id: "DEPOT",
        name: "LARGE WAREHOUSE", 
        mapGroup: null, 
        geometry: [],
        
        perimeter: [ 
            { x: -52, z: -100 }, 
            { x: -52, z: 100 }, 
            { x: 52, z: 100 }, 
            { x: 52, z: -100 } 
        ],
        
        spawnZoneGroups: {
            blue: null,
            red: null
        },
        
        init(scene, materialLibrary) {
            console.log('DepotMap: Building Large Warehouse (Overhaul)...');
            this.geometry = [];
            this.mapGroup = new THREE.Group();
            scene.add(this.mapGroup);
            
            // ... (Rest of existing Depot Logic preserved below but unused) ...
            const MapAssets = window.TacticalShooter.MapAssets;

            // --- SEEDED RNG ---
            let seed = 424242;
            const seededRandom = () => { 
                seed = (seed * 9301 + 49297) % 233280; 
                return seed / 233280; 
            };
            if (MapAssets && MapAssets.setRNG) MapAssets.setRNG(seededRandom);
            
            // Materials
            const matFloor = materialLibrary.getMaterial('concrete');
            const matWall = materialLibrary.getMaterial('trainingWall'); 
            const matRoof = materialLibrary.getMaterial('containerGrey');
            const matStructure = materialLibrary.getMaterial('steel');
            const matPaintBlue = materialLibrary.getMaterial('paintBlue');
            const matPaintRed = materialLibrary.getMaterial('paintRed');
            
            // --- SPAWN ZONES ---
            this.createSpawnZones(this.mapGroup, materialLibrary);
            
            // --- 1. FLOOR (100m Width, 195m Length) ---
            this.createBlock(this.mapGroup, matFloor, 0, -1, 0, 102, 2, 197);
            
            // --- 2. PERIMETER WALLS ---
            const H = 18.0; 
            const T = 1.0;
            const halfW = 50;   
            const halfL = 97.5; 
            
            this.createBlock(this.mapGroup, matWall, -halfW, H/2, 0, T, H, 195); // Left
            this.createBlock(this.mapGroup, matWall, halfW, H/2, 0, T, H, 195);  // Right
            this.createBlock(this.mapGroup, matWall, 0, H/2, -halfL, 100, H, T); // North
            this.createBlock(this.mapGroup, matWall, 0, H/2, halfL, 100, H, T);  // South
            
            // --- 3. ROOF SYSTEMS ---
            this.buildGableRoof(-25, 0, 50, 195, 18, matRoof, matStructure, seededRandom);
            this.buildFlatRoof(25, 0, 50, 195, 18, matRoof, matStructure, seededRandom);
            
            // --- 4. CENTRAL PILLARS (Prevent Clipping) ---
            // Pillars at X=0, Z = -90 to 90, interval 30
            const pillarGeo = new THREE.BoxGeometry(1.5, H, 1.5);
            for(let z = -90; z <= 90; z += 30) {
                const mesh = new THREE.Mesh(pillarGeo, matStructure);
                mesh.position.set(0, H/2, z);
                mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = true;
                this.mapGroup.add(mesh); this.geometry.push(mesh);
            }

            // ==================================================================================
            // === 5. PROP POPULATION (CLUSTERS) ===
            // ==================================================================================
            
            const createContainer = (x, y, z, color, rot, doors) => {
                const group = MapAssets.createContainer(this.mapGroup, materialLibrary, x, y, z, color, rot, this.geometry, doors);
            };
            
            // Helper: Stairs for clusters
            const addSteps = (x, z, h, dirX, dirZ) => {
                // Base
                MapAssets.createPalletStack(this.mapGroup, materialLibrary, x + (2*dirX), 0, z + (2*dirZ), 4, 1.2, this.geometry);
                // Mid
                MapAssets.createPalletStack(this.mapGroup, materialLibrary, x + (1*dirX), 0.6, z + (1*dirZ), 8, 1.2, this.geometry);
                // High (Barrel)
                MapAssets.createBarrel(this.mapGroup, materialLibrary, x, 1.2, z, this.geometry);
            };
            
            // --- CLUSTER 1: NORTH-WEST "THE MAZE" (-25, -60) ---
            // 4 High stack with tunnel through bottom
            const nwX = -25; const nwZ = -60;
            // Base Tunnel (East-West alignment)
            createContainer(nwX - 2.5, 0, nwZ, 'containerBlue', 0, {left:Math.PI/2, right:Math.PI/2}); // Tunnel segment
            createContainer(nwX + 2.5, 0, nwZ, 'containerBlue', 0, {left:Math.PI/2, right:Math.PI/2}); // Tunnel segment
            
            // Layer 2
            createContainer(nwX - 2.5, 2.59, nwZ, 'containerGrey', 0);
            createContainer(nwX + 2.5, 2.59, nwZ, 'containerRed', 0);
            
            // Layer 3 (Bridge)
            createContainer(nwX, 5.18, nwZ, 'containerYellow', Math.PI/2);
            
            // Layer 4 (Tower)
            createContainer(nwX, 7.77, nwZ, 'containerGreen', Math.PI/2);
            
            // Steps
            addSteps(nwX + 5, nwZ + 3, 0, 1, 1);
            
            // --- CLUSTER 2: NORTH-EAST "FORTRESS" (25, -60) ---
            // Defensive setup
            const neX = 25; const neZ = -60;
            // Walls
            stackContainers(neX - 4, neZ - 4, 0, ['containerRed', 'containerGrey', 'containerRed'], 3);
            stackContainers(neX + 4, neZ - 4, 0, ['containerBlue', 'containerYellow', 'containerBlue'], 3);
            stackContainers(neX - 4, neZ + 4, 0, ['containerGreen', 'containerRed', 'containerGreen'], 3);
            stackContainers(neX + 4, neZ + 4, 0, ['containerYellow', 'containerGrey', 'containerYellow'], 3);
            
            // Center Platform
            this.createBlock(this.mapGroup, matStructure, neX, 2.59, neZ, 6, 0.2, 6);
            
            // Ramp to platform (Standard width)
            const rampNE = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 8), matStructure);
            rampNE.position.set(neX, 1.3, neZ + 8);
            rampNE.rotation.x = 0.35;
            rampNE.castShadow = true; rampNE.userData.collidable = true;
            this.mapGroup.add(rampNE); this.geometry.push(rampNE);
            
            // --- CLUSTER 3: CENTER-WEST "THE SPINE" (-20, 0) ---
            // Offset from X=0 to avoid pillars
            const cwX = -20; const cwZ = 0;
            // Long stack N-S
            createContainer(cwX, 0, cwZ - 6.5, 'containerOrange', Math.PI/2, {left:0, right:Math.PI/2}); // End open
            createContainer(cwX, 0, cwZ, 'containerGrey', Math.PI/2, {left:Math.PI/2, right:Math.PI/2}); // Through
            createContainer(cwX, 0, cwZ + 6.5, 'containerOrange', Math.PI/2, {left:Math.PI/2, right:0}); // End open
            
            // Top spine
            createContainer(cwX, 2.59, cwZ - 3, 'containerBlue', Math.PI/2);
            createContainer(cwX, 2.59, cwZ + 3, 'containerRed', Math.PI/2);
            createContainer(cwX, 5.18, cwZ, 'containerGreen', Math.PI/2);
            
            // Steps
            addSteps(cwX + 3, cwZ, 0, 1, 0);

            // --- CLUSTER 4: SOUTH-EAST "THE STACKS" (25, 60) ---
            const seX = 25; const seZ = 60;
            // Random chaotic stack
            createContainer(seX, 0, seZ, 'containerRed', 0.2);
            createContainer(seX - 3, 0, seZ + 3, 'containerBlue', -0.1);
            createContainer(seX + 3, 0, seZ - 2, 'containerGreen', 0.1);
            
            createContainer(seX, 2.59, seZ, 'containerYellow', 0.1);
            createContainer(seX - 2, 2.59, seZ + 2, 'containerGrey', -0.05);
            
            createContainer(seX - 1, 5.18, seZ + 1, 'containerRed', 0);
            
            // Pallet mess
            MapAssets.createPalletStack(this.mapGroup, materialLibrary, seX+5, 0, seZ+5, 6, 1.2, this.geometry);
            
            // --- CLUSTER 5: SOUTH-WEST "HANGAR" (-25, 60) ---
            // Enclosed space
            const swX = -25; const swZ = 60;
            // Create a U shape
            createContainer(swX - 4, 0, swZ, 'containerBlue', 0);
            createContainer(swX + 4, 0, swZ, 'containerBlue', 0);
            createContainer(swX, 0, swZ - 4, 'containerBlue', Math.PI/2);
            
            // Roof over U
            this.createBlock(this.mapGroup, matStructure, swX, 2.59, swZ, 10, 0.2, 10);
            
            // Stairs up (Standard size, removed "Plus Sized")
            MapAssets.createStairs(this.mapGroup, materialLibrary, swX, 0, swZ + 6, 2, 2.59, 4, 0, this.geometry);

            // ==================================================================================
            // === 6. INDUSTRIAL ROOMS & WALLS ===
            // ==================================================================================
            
            // Helper: Painted Industrial Wall
            const createIndWall = (x, z, w, h, rot, colorMat) => {
                const grp = new THREE.Group();
                grp.position.set(x, h/2, z);
                grp.rotation.y = rot;
                
                const baseH = h * 0.3;
                const topH = h * 0.7;
                
                // Concrete Base
                const base = new THREE.Mesh(new THREE.BoxGeometry(w, baseH, 0.5), matWall);
                base.position.y = -h/2 + baseH/2;
                base.castShadow = true; base.receiveShadow = true; base.userData.collidable = true;
                grp.add(base); this.geometry.push(base);
                
                // Painted Top
                const top = new THREE.Mesh(new THREE.BoxGeometry(w, topH, 0.5), colorMat);
                top.position.y = -h/2 + baseH + topH/2;
                top.castShadow = true; base.userData.collidable = true;
                grp.add(top); this.geometry.push(top);
                
                this.mapGroup.add(grp);
            };
            
            // North Rooms (Blue Side)
            createIndWall(0, -30, 20, 4, 0, matPaintBlue); // Choke wall
            createIndWall(-40, -30, 15, 6, 0, matPaintBlue); // Flank wall
            
            // South Rooms (Red Side)
            createIndWall(0, 30, 20, 4, 0, matPaintRed); // Choke wall
            createIndWall(40, 30, 15, 6, 0, matPaintRed); // Flank wall
            
            // Catwalks along East Wall
            const cwY = 6.0;
            this.createBlock(this.mapGroup, matStructure, 45, cwY, 0, 8, 0.3, 80); // Long catwalk
            // Rails
            this.createBlock(this.mapGroup, matStructure, 41, cwY+0.5, 0, 0.2, 1, 80);
            
            // Access to catwalk (Standard stairs)
            MapAssets.createStairs(this.mapGroup, materialLibrary, 45, 0, -40, 3, cwY, 6, Math.PI, this.geometry);
            MapAssets.createStairs(this.mapGroup, materialLibrary, 45, 0, 40, 3, cwY, 6, 0, this.geometry);

            // ==================================================================================
            // === 7. SCATTERED COVER (Barrels/Pallets) ===
            // ==================================================================================
            for(let i=0; i<30; i++) {
                const x = (seededRandom() - 0.5) * 90;
                const z = (seededRandom() - 0.5) * 180;
                
                // Avoid spawn centers
                if (Math.abs(z) > 80 && Math.abs(x) < 10) continue;
                // Avoid main clusters (approx check)
                if (Math.abs(x) > 20 && Math.abs(z) > 55) continue;
                
                if (seededRandom() > 0.5) {
                    MapAssets.createBarrel(this.mapGroup, materialLibrary, x, 0, z, this.geometry);
                    if (seededRandom() > 0.5) MapAssets.createBarrel(this.mapGroup, materialLibrary, x + 0.8, 0, z + 0.5, this.geometry);
                } else {
                    MapAssets.createPalletStack(this.mapGroup, materialLibrary, x, 0, z, Math.floor(seededRandom()*4)+1, 1.2, this.geometry);
                }
            }

            this.mapGroup.updateMatrixWorld(true);
            console.log('DepotMap: ✓ Full Warehouse Geometry Built');
            
            // Helper func for stacker
            function stackContainers(bx, bz, rot, colors, height) {
                for(let i=0; i<height; i++) {
                    createContainer(bx, (i * 2.59), bz, colors[i % colors.length], rot);
                }
            }
        },
        
        // ... (Roof helpers same as previous, included for completeness) ...
        buildGableRoof(centerX, centerZ, width, length, wallHeight, matRoof, matSteel, rng) {
            const halfW = width / 2; 
            const rise = 9.0; 
            const roofBaseY = wallHeight;
            const slopeLength = Math.sqrt(halfW*halfW + rise*rise);
            const slopeAngle = Math.atan2(rise, halfW);
            
            // Beams
            const beamGeo = new THREE.BoxGeometry(0.5, 0.5, length);
            const bL = new THREE.Mesh(beamGeo, matSteel); bL.position.set(centerX - halfW/2, roofBaseY + rise/2, centerZ); bL.rotation.z = slopeAngle; this.mapGroup.add(bL);
            const bR = new THREE.Mesh(beamGeo, matSteel); bR.position.set(centerX + halfW/2, roofBaseY + rise/2, centerZ); bR.rotation.z = -slopeAngle; this.mapGroup.add(bR);

            // Panels
            const rows = 40; const cols = 8; const rowLen = length / rows; const colLen = slopeLength / cols; 
            const roofGeo = new THREE.BoxGeometry(colLen, 0.15, rowLen - 0.2);
            if (window.TacticalShooter.MapAssets.scaleUVs) window.TacticalShooter.MapAssets.scaleUVs(roofGeo, colLen, 0.15, rowLen);

            for (let r = 0; r < rows; r++) {
                const zPos = (centerZ - length/2) + (rowLen * r) + (rowLen/2);
                for(let c = 0; c < cols; c++) {
                    if (rng() > 0.15) {
                        const dist = (c * colLen) + (colLen/2);
                        const dx = dist * Math.cos(slopeAngle); const dy = dist * Math.sin(slopeAngle);
                        const m1 = new THREE.Mesh(roofGeo, matRoof); m1.position.set(centerX - halfW + dx, roofBaseY + dy, zPos); m1.rotation.z = slopeAngle; 
                        m1.castShadow = true; m1.userData.isProp = true; this.mapGroup.add(m1); this.geometry.push(m1);
                        
                        const m2 = new THREE.Mesh(roofGeo, matRoof); m2.position.set(centerX + halfW - dx, roofBaseY + dy, zPos); m2.rotation.z = -slopeAngle;
                        m2.castShadow = true; m2.userData.isProp = true; this.mapGroup.add(m2); this.geometry.push(m2);
                    }
                }
            }
        },
        
        buildFlatRoof(centerX, centerZ, width, length, height, matRoof, matSteel, rng) {
            const rows = 40; const cols = 10; const tileW = width / cols; const tileL = length / rows;
            const tileGeo = new THREE.BoxGeometry(tileW - 0.1, 0.1, tileL - 0.1);
            if (window.TacticalShooter.MapAssets.scaleUVs) window.TacticalShooter.MapAssets.scaleUVs(tileGeo, tileW, 0.1, tileL);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (rng() > 0.2) {
                        const x = (centerX - width/2) + (c * tileW) + (tileW/2);
                        const z = (centerZ - length/2) + (r * tileL) + (tileL/2);
                        const mesh = new THREE.Mesh(tileGeo, matRoof);
                        mesh.position.set(x, height, z); mesh.castShadow = true; mesh.userData.isProp = true;
                        this.mapGroup.add(mesh); this.geometry.push(mesh);
                    }
                }
            }
        },
        
        setVisible(visible) { if (this.mapGroup) this.mapGroup.visible = visible; },
        
        updateVisuals(isTacView, isTDM, teamCount) {
            Object.values(this.spawnZoneGroups).forEach(g => { if(g) g.visible = false; });
            if (!isTacView || !isTDM) return;
            if (this.spawnZoneGroups.blue) this.spawnZoneGroups.blue.visible = true;
            if (this.spawnZoneGroups.red) this.spawnZoneGroups.red.visible = true;
        },

        createBorder(parent, library, points, materialName, thicknessOverride = null) {
            const material = library.getMaterial(materialName);
            const borderGroup = new THREE.Group();
            borderGroup.userData.isBorder = true; 
            const thickness = thicknessOverride || 0.6; 
            const height = 12.0; const yPos = 3.0; 
            const cornerGeo = new THREE.BoxGeometry(thickness, height, thickness);
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i]; const p2 = points[(i + 1) % points.length];
                const corner = new THREE.Mesh(cornerGeo, material);
                corner.position.set(p1.x, yPos, p1.z);
                corner.userData.isBorder = true;
                borderGroup.add(corner);
                const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
                const midX = (p1.x + p2.x) / 2; const midZ = (p1.z + p2.z) / 2;
                const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z); 
                const wallLength = Math.max(0.01, dist - thickness);
                const wallGeo = new THREE.BoxGeometry(thickness, height, wallLength);
                const wall = new THREE.Mesh(wallGeo, material);
                wall.position.set(midX, yPos, midZ); wall.rotation.y = angle; wall.userData.isBorder = true;
                borderGroup.add(wall);
            }
            parent.add(borderGroup);
            return borderGroup;
        },
        
        createGable(parent, material, x, y, z, width, height, thickness) { /* ... (Standard Gable) ... */ },
        
        createSpawnZones(parent, library) {
            const createZoneGroup = (pts, matName) => {
                const g = this.createBorder(parent, library, pts, matName, 0.2);
                g.userData.isSpawnZone = true; g.visible = false; return g;
            };
            this.spawnZoneGroups.blue = createZoneGroup([ {x:-40, z:-95}, {x:-40, z:-75}, {x:40, z:-75}, {x:40, z:-95} ], 'zoneBlue');
            this.spawnZoneGroups.red = createZoneGroup([ {x:40, z:95}, {x:40, z:75}, {x:-40, z:75}, {x:-40, z:95} ], 'zoneRed');
        },
        
        createBlock(parent, material, x, y, z, w, h, d) { 
            const geo = new THREE.BoxGeometry(w, h, d); 
            if (material.map) window.TacticalShooter.MapAssets.scaleUVs(geo, w, h, d); 
            const mesh = new THREE.Mesh(geo, material); 
            mesh.position.set(x, y, z); 
            mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = true; 
            parent.add(mesh); this.geometry.push(mesh); 
            return mesh; 
        },
        
        cleanup(scene) { if (this.mapGroup) { scene.remove(this.mapGroup); } this.geometry = []; }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.MapRegistry.register(DepotMap.id, DepotMap);
})();
