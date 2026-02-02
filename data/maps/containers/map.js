
// js/data/maps/containers/map.js
(function() {
    const ContainersMap = {
        id: "CONTAINERS",
        name: "RECTANGLES", 
        mapGroup: null, 
        geometry: [],
        
        // 60x90, bounds -45 to 15 X, -45 to 45 Z
        perimeter: [ { x: -45, z: -45 }, { x: -45, z: 45 }, { x: 15, z: 45 }, { x: 15, z: -45 } ],
        
        spawnZoneGroups: {
            blue: null,
            red: null
        },
        
        // Static Batching Arrays (Complex High-Poly)
        batches: {
            containerRed: [],
            containerBlue: [],
            containerGreen: [],
            containerGrey: [],
            containerYellow: [],
            containerOrange: []
        },

        // Simple Batching Arrays (Low-Poly Box)
        simpleBatches: {
            containerRed: [],
            containerBlue: [],
            containerGreen: [],
            containerGrey: [],
            containerYellow: [],
            containerOrange: []
        },
        
        containerBatchGeometry: null,
        simpleBatchGeometry: null, // Optimization
        
        // Track container tops for prop placement: { x, y, z, rot }
        propSpots: [],
        // Track occupied grid for collision avoidance during random batching
        // Key: "x_z" (rounded) -> { x, y, z, rot, isProtected, height }
        containerGrid: {},

        init(scene, materialLibrary) {
            console.log('ContainersMap: Building with Static Batching (High Performance Mode)...');
            if (!window.THREE) return;
            const THREE = window.THREE;
            
            this.geometry = [];
            this.propSpots = [];
            this.containerGrid = {};
            this.mapGroup = new THREE.Group();
            scene.add(this.mapGroup);
            
            // Clear Batches
            for (const key in this.batches) {
                this.batches[key] = [];
                this.simpleBatches[key] = [];
            }
            
            const MapAssets = window.TacticalShooter.MapAssets;
            let seed = 777; 
            const seededRandom = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
            if (MapAssets.setRNG) MapAssets.setRNG(seededRandom);

            // --- MATERIALS ---
            const matBaseFloor = new THREE.MeshStandardMaterial({ color: 0x6e6860, roughness: 0.9, metalness: 0.1, name: 'cont_floor' });
            const matDustyPatch = new THREE.MeshStandardMaterial({ color: 0x5a544c, roughness: 1.0, metalness: 0.0, name: 'cont_dust' });
            const matSidewalk = new THREE.MeshStandardMaterial({ color: 0x8c857b, roughness: 0.8, metalness: 0.1, name: 'cont_sidewalk' });
            const matPerimeterRoad = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.8, metalness: 0.1, name: 'cont_perim_road' });
            
            const matHutWall = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9, name: 'hut_wall' });
            const matHutRoof = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, name: 'hut_roof' });

            const matWall = materialLibrary.getMaterial('trainingWall'); 
            const matInvisible = new THREE.MeshBasicMaterial({ visible: false });
            
            // --- COLOR REPLACEMENT LOGIC ---
            const groupColors = ['containerBlue', 'containerRed', 'containerRed', 'containerBlue', 'containerGrey', 'containerGreen', 'containerGreen'];
            
            const resolveColor = (c) => {
                if (c === 'containerYellow' || c === 'containerOrange') return 'containerGreen';
                return c;
            };
            
            const batchContainerInternal = (x, y, z, colorKey, rotY) => {
                 if (x > 15) return;
                 // Protect Spawn Areas (X=0 and X=-42.5)
                 if (Math.abs(x) < 3.0) return;
                 if (Math.abs(x - (-42.5)) < 3.0) return;

                 // AGGRESSIVE OPTIMIZATION: 80% chance to use simple box model
                 // This dramatically reduces vertex count
                 const useSimple = (seededRandom() > 0.2);

                 this.batchContainer(x, y, z, resolveColor(colorKey), rotY, useSimple);
                 
                 // Register in grid
                 const k = `${Math.round(x)}_${Math.round(z)}`;
                 // Only store highest
                 if (!this.containerGrid[k] || this.containerGrid[k].y < y) {
                     this.containerGrid[k] = { x, y, z, rot: rotY, isProtected: false };
                 }
            };

            // --- HUT HELPER ---
            const createConcreteHut = (x, z, rotY) => {
                if (x > 15) return; 
                const grp = new THREE.Group();
                const h = 2.5; 
                grp.position.set(x, 1.25, z); 
                grp.rotation.y = rotY;
                const w = 4.0; const d = 4.0; const thick = 0.2; const roofThick = 0.4;
                const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.4, roofThick, d+0.4), matHutRoof);
                roof.position.y = h/2 + (roofThick/2); 
                roof.castShadow = true; roof.receiveShadow = true; roof.userData.collidable = true;
                grp.add(roof); this.geometry.push(roof);
                
                // --- WALLS WITH WINDOWS ---
                const addWindowWall = (px, pz, rw, rh, isRotated) => {
                    const wallGrp = new THREE.Group();
                    wallGrp.position.set(px, 0, pz);
                    if(isRotated) wallGrp.rotation.y = Math.PI/2;
                    
                    const winH = 1.0; 
                    const winW = 1.0; 
                    const winY = -h/2 + 1.2 + (winH/2); 
                    
                    // Bottom
                    const bH = 1.2;
                    const bot = new THREE.Mesh(new THREE.BoxGeometry(rw, bH, thick), matHutWall);
                    bot.position.y = -h/2 + bH/2;
                    bot.castShadow = true; bot.receiveShadow = true; bot.userData.collidable = true;
                    wallGrp.add(bot); this.geometry.push(bot);
                    
                    // Top
                    const tH = h - bH - winH;
                    const top = new THREE.Mesh(new THREE.BoxGeometry(rw, tH, thick), matHutWall);
                    top.position.y = h/2 - tH/2;
                    top.castShadow = true; top.receiveShadow = true; top.userData.collidable = true;
                    wallGrp.add(top); this.geometry.push(top);
                    
                    // Sides
                    const sW = (rw - winW) / 2;
                    const sL = new THREE.Mesh(new THREE.BoxGeometry(sW, winH, thick), matHutWall);
                    sL.position.set(-rw/2 + sW/2, winY, 0);
                    sL.castShadow = true; sL.receiveShadow = true; sL.userData.collidable = true;
                    wallGrp.add(sL); this.geometry.push(sL);
                    
                    const sR = new THREE.Mesh(new THREE.BoxGeometry(sW, winH, thick), matHutWall);
                    sR.position.set(rw/2 - sW/2, winY, 0);
                    sR.castShadow = true; sR.receiveShadow = true; sR.userData.collidable = true;
                    wallGrp.add(sR); this.geometry.push(sR);
                    
                    grp.add(wallGrp);
                };
                
                const addSolidWall = (px, pz, rw, rh, isRotated) => {
                     const mesh = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, thick), matHutWall);
                     mesh.position.set(px, 0, pz); if(isRotated) mesh.rotation.y = Math.PI/2;
                     mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = true;
                     grp.add(mesh); this.geometry.push(mesh);
                };

                addWindowWall(0, d/2-thick/2, w, h, false); 
                addWindowWall(0, -d/2+thick/2, w, h, false); 
                addSolidWall(w/2-thick/2, 0, d, h, true);
                
                // Left: Door
                const sW = 1.4; const sH = 2.5;
                const doorMeshL = new THREE.Mesh(new THREE.BoxGeometry(sW, sH, thick), matHutWall);
                doorMeshL.position.set(-w/2+thick/2, 0, -1.0); doorMeshL.rotation.y = Math.PI/2;
                doorMeshL.castShadow = true; doorMeshL.userData.collidable = true; grp.add(doorMeshL); this.geometry.push(doorMeshL);
                const doorMeshR = new THREE.Mesh(new THREE.BoxGeometry(sW, sH, thick), matHutWall);
                doorMeshR.position.set(-w/2+thick/2, 0, 1.0); doorMeshR.rotation.y = Math.PI/2;
                doorMeshR.castShadow = true; doorMeshR.userData.collidable = true; grp.add(doorMeshR); this.geometry.push(doorMeshR);
                const doorTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, thick), matHutWall);
                doorTop.position.set(-w/2+thick/2, 1.0, 0); doorTop.rotation.y = Math.PI/2;
                doorTop.castShadow = true; doorTop.userData.collidable = true; grp.add(doorTop); this.geometry.push(doorTop);
                
                this.mapGroup.add(grp);
            };

            // --- PREPARE GEOMETRY ---
            this.prepareBatchGeometry(materialLibrary);

            // --- SPAWN ZONES ---
            this.createSpawnZones(this.mapGroup, materialLibrary);

            // --- 1. FLOOR (Trimmed) ---
            const floorH = 2.0;
            const floorY = -0.8; 
            this.createBlock(this.mapGroup, matBaseFloor, -15, floorY, 0, 64, floorH, 92);
            
            // Dusty Patches (REDUCED FOR PERFORMANCE: 15 big patches only)
            const spawnPatch = () => {
                const w = 8 + seededRandom()*6;
                const d = 8 + seededRandom()*6;
                const x = (seededRandom() - 0.5) * 60 - 15; 
                const z = (seededRandom() - 0.5) * 80;
                if (x > 15) return;
                const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matDustyPatch);
                patch.rotation.x = -Math.PI / 2; patch.rotation.z = seededRandom() * Math.PI; 
                patch.position.set(x, 0.205, z); patch.receiveShadow = true; 
                this.mapGroup.add(patch);
            };
            for (let i = 0; i < 15; i++) spawnPatch(); 

            // --- 2. SIDEWALK (CONSOLIDATED) ---
            const mainSidewalk = new THREE.Mesh(new THREE.PlaneGeometry(20, 122), matSidewalk);
            mainSidewalk.rotation.x = -Math.PI / 2; 
            mainSidewalk.position.set(0, 0.22, 0); 
            mainSidewalk.receiveShadow = true;
            this.mapGroup.add(mainSidewalk);
            
            // West Road
            const perimRoadGeo = new THREE.PlaneGeometry(6.0, 100);
            const pRoadW = new THREE.Mesh(perimRoadGeo, matPerimeterRoad); 
            pRoadW.rotation.x = -Math.PI/2; 
            pRoadW.position.set(-42.5, 0.21, 0); 
            pRoadW.receiveShadow = true; 
            this.mapGroup.add(pRoadW);
            
            // --- 2.5: CONCRETE HUTS ---
            createConcreteHut(-7, -15, 0);
            createConcreteHut(7, 32, Math.PI);
            
            // --- CRITICAL STRUCTURES (Pre-placed to reserve space) ---
            const registerBlock = (x, z, r=4) => {
                const k = `${Math.round(x)}_${Math.round(z)}`;
                this.containerGrid[k] = { x, y: 10, z, isProtected: true }; 
                for(let dx=-r; dx<=r; dx+=2) {
                    for(let dz=-r; dz<=r; dz+=2) {
                         const nk = `${Math.round(x+dx)}_${Math.round(z+dz)}`;
                         this.containerGrid[nk] = { x: x+dx, y: 10, z: z+dz, isProtected: true };
                    }
                }
            };
            
            // Register Bridges
            const upperY = 2.59;
            const bridgeDoors = { left: Math.PI/2, right: -Math.PI/2, backLeft: Math.PI/2, backRight: -Math.PI/2 }; 
            
            // Bridges at -26, +/-8
            registerBlock(-26, -8, 6);
            registerBlock(-26, 8, 6);
            if (MapAssets.createContainer40) MapAssets.createContainer40(this.mapGroup, materialLibrary, -26, upperY, -8, 'containerGreen', 2.1, this.geometry, bridgeDoors); 
            if (MapAssets.createContainer40) MapAssets.createContainer40(this.mapGroup, materialLibrary, -26, upperY, 8, 'containerGreen', -2.1, this.geometry, bridgeDoors); 
            
            // Bridge at -17, -22
            registerBlock(-17, -22, 6);
            if (MapAssets.createContainer40) MapAssets.createContainer40(this.mapGroup, materialLibrary, -17, upperY, -22, 'containerBlue', 2.5, this.geometry, bridgeDoors);
            
            // Ramps
            const createRamp = (x, z, rotY, color) => {
                if(x > 15) return;
                registerBlock(x, z, 4); // Protect Ramp Area
                const ramp = MapAssets.createContainer(this.mapGroup, materialLibrary, 0, 0, 0, resolveColor(color), 0, this.geometry, { left: 2.0, right: 2.0, backLeft: 2.0, backRight: 2.0 }); 
                ramp.rotation.order = 'YXZ'; ramp.rotation.y = rotY; ramp.rotation.x = -0.55; ramp.position.set(x, 1.65, z);
            };
            createRamp(-12, -40, 0, 'containerBlue');
            createRamp(-12, 40, Math.PI, 'containerRed');
            
            // --- 3. CENTER LANDMARK ---
            const centerZ = 0; const westX = -7.5; 
            if (MapAssets.createContainer40) { MapAssets.createContainer40(this.mapGroup, materialLibrary, westX, 0, centerZ, 'containerBlue', 0, this.geometry); }
            MapAssets.createTallPalletStack(this.mapGroup, materialLibrary, -4.5, 0.2, centerZ - 4.5, this.geometry);
            const arrowX = 3.5;
            // Stack the red containers in center
            MapAssets.createContainer(this.mapGroup, materialLibrary, arrowX, 0, centerZ - 5, 'containerRed', 0.6, this.geometry); 
            MapAssets.createContainer(this.mapGroup, materialLibrary, arrowX, 2.59, centerZ - 5, 'containerGrey', 0.6, this.geometry); // STACK
            
            MapAssets.createContainer(this.mapGroup, materialLibrary, arrowX, 0, centerZ + 5, 'containerRed', -0.6, this.geometry); 
            MapAssets.createContainer(this.mapGroup, materialLibrary, -2.0, 0, 10.5, 'containerGreen', Math.PI/2, this.geometry);
            const rampGroup = MapAssets.createContainer(this.mapGroup, materialLibrary, 0, 0, 0, 'containerGrey', 0, this.geometry, { left: 2.0, right: 2.0, backLeft: 2.0, backRight: 2.0 }); 
            rampGroup.rotation.order = 'YXZ'; rampGroup.rotation.y = Math.PI / 2 + 0.05; rampGroup.rotation.x = -0.55; 
            rampGroup.position.set(westX - 2.9, 1.65, centerZ); 
            
            // --- 4. END BLOCKADES ---
            const nEnd = -45;
            batchContainerInternal(0, 0, nEnd, 'containerGreen', Math.PI/2 + 0.08);
            batchContainerInternal(0, 2.59, nEnd, 'containerGrey', Math.PI/2 - 0.05);

            const sEnd = 45;
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -3.0, 0, sEnd, Math.PI/2 - 0.15, this.geometry);
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, 0.0, 0, sEnd + 1.2, Math.PI/2 + 0.1, this.geometry);
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, 3.5, 0, sEnd - 0.5, Math.PI/2 - 0.05, this.geometry);
            
            // --- HELPER: STACKER ---
            const stackContainer = (x, z, rot, colors) => {
                 for(let i=0; i<colors.length; i++) {
                     batchContainerInternal(x, i*2.59, z, colors[i], rot);
                 }
            };
            
            const batchGroup = (xStart, zStart, wCount, lCount, rotY = 0, maxHeight = 1) => {
                if (xStart > 15) return;
                const cw = 2.44; const cl = 6.06; const gap = -0.05; // UPDATED: Negative gap for tight fit
                const totalW = (wCount * cw) + ((wCount-1) * gap); const totalL = (lCount * cl) + ((lCount-1) * gap);
                const originX = -totalW/2 + cw/2; const originZ = -totalL/2 + cl/2;
                const cos = Math.cos(rotY); const sin = Math.sin(rotY);

                for(let i=0; i<wCount; i++) {
                    for(let j=0; j<lCount; j++) {
                        const rawX = (i * (cw + gap)) + originX; const rawZ = (j * (cl + gap)) + originZ;
                        const rx = (rawX * cos) - (rawZ * sin); const rz = (rawX * sin) + (rawZ * cos);
                        
                        const finalX = xStart + rx;
                        const finalZ = zStart + rz;
                        
                        const k = `${Math.round(finalX)}_${Math.round(finalZ)}`;
                        let allowedH = maxHeight;
                        if (this.containerGrid[k] && this.containerGrid[k].isProtected) {
                            allowedH = 1;
                        }
                        
                        let h = 1;
                        if (allowedH > 1 && seededRandom() > 0.4) h = Math.min(allowedH, Math.floor(seededRandom() * allowedH) + 1);
                        
                        const cols = [];
                        for(let k=0; k<h; k++) cols.push(groupColors[Math.floor(seededRandom() * groupColors.length)]);
                        
                        stackContainer(finalX, finalZ, rotY, cols);
                    }
                }
            };
            
            const createWithDoors = (x, z, rot, color, doorCfg) => { 
                if(x > 15) return;
                MapAssets.createContainer(this.mapGroup, materialLibrary, x, 0, z, resolveColor(color), rot, this.geometry, doorCfg); 
            };
            const createBarrelCluster = (x, z) => {
                if(x > 15) return;
                MapAssets.createBarrel(this.mapGroup, materialLibrary, x, 0, z, this.geometry);
                MapAssets.createBarrel(this.mapGroup, materialLibrary, x + 0.5, 0, z + 0.9, this.geometry);
                MapAssets.createBarrel(this.mapGroup, materialLibrary, x - 0.5, 0, z + 0.9, this.geometry);
            };

            // ==========================================================
            // === 5. UPDATED CLUSTERS (VERTICALITY ADDED) ===
            // ==========================================================
            
            // North Road Block (MANUALLY PLACED TO FIX RAMP SUPPORT)
            // Ramp at -12, -40 needs support at -34.5
            batchContainerInternal(-12, 0, -34.5, 'containerGrey', 0); // SUPPORT BASE
            batchContainerInternal(-12, 2.59, -34.5, 'containerGrey', 0); // SUPPORT TOP
            
            // Extenders behind
            batchContainerInternal(-12, 0, -28.4, 'containerBlue', 0);
            batchContainerInternal(-12, 2.59, -28.4, 'containerRed', 0);
            
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -13, 2.59, -32, 0, this.geometry);
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -11, 2.59, -28, 0.2, this.geometry);

            // South Road Block (Reduced width for performance)
            batchGroup(-12, 30, 1, 3, 0, 2); 
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -13, 2.59, 32, 0, this.geometry);
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -11, 2.59, 28, -0.2, this.geometry);

            // The Slab (Height 3) - Standard
            batchGroup(-32, 0, 4, 5, 0, 3); 
            
            // Connectors (Standard 2)
            batchGroup(-22, -15, 2, 2, 0.2, 1); 
            batchGroup(-22, 15, 2, 2, -0.2, 2); 
            
            // North Outpost (Height 3 + one 4)
            batchGroup(-35, -32, 3, 3, 0, 3); 
            // The 4-stack (Manual)
            stackContainer(-35, -28, 0, ['containerRed', 'containerGrey', 'containerBlue', 'containerGreen']);
            
            MapAssets.createContainer(this.mapGroup, materialLibrary, -35, 2.59, -32, 'containerGreen', 0, this.geometry, {left:Math.PI/2});
            MapAssets.createContainer(this.mapGroup, materialLibrary, -35, 2.59, -26, 'containerRed', 0.1, this.geometry, {right:Math.PI/2});
            MapAssets.createTallPalletStack(this.mapGroup, materialLibrary, -28, 0, -32, this.geometry);

            // South Outpost (Height 3)
            batchGroup(-35, 32, 3, 3, 0, 3); 
            MapAssets.createContainer(this.mapGroup, materialLibrary, -38, 2.59, 29, 'containerBlue', 0, this.geometry, {right:Math.PI/2});
            MapAssets.createContainer(this.mapGroup, materialLibrary, -38, 2.59, 35, 'containerRed', 0, this.geometry, {left:Math.PI/2});
            MapAssets.createContainer(this.mapGroup, materialLibrary, -32, 2.59, 32, 'containerGreen', Math.PI/2, this.geometry, {left:0, right:0});
            MapAssets.createContainer(this.mapGroup, materialLibrary, -32, 2.59, 38, 'containerGreen', 0, this.geometry, {left:Math.PI/2});
            MapAssets.createTallPalletStack(this.mapGroup, materialLibrary, -28, 0, 32, this.geometry);

            // ==========================================================
            // === 6. WEST SIDE SINGLES & FILLERS ===
            // ==========================================================
            createWithDoors(-20, 0, Math.PI/4, 'containerGreen', {left:0});
            
            const openTunnel = { left: Math.PI/2, right: -Math.PI/2, backLeft: Math.PI/2, backRight: -Math.PI/2 };
            if (MapAssets.createContainer40) MapAssets.createContainer40(this.mapGroup, materialLibrary, -24, 0, -28, 'containerRed', 0.1, this.geometry, openTunnel);
            if (MapAssets.createContainer40) MapAssets.createContainer40(this.mapGroup, materialLibrary, -24, 0, 35, 'containerGreen', -0.35, this.geometry, openTunnel);
            
            // Stacks of 2
            stackContainer(-42, 0, 0, ['containerGrey', 'containerBlue']);
            createWithDoors(-42, 8, 0.1, 'containerBlue', {left:0, right:0});
            
            // REDUCED BARREL COUNT FOR PERFORMANCE
            createBarrelCluster(-25, -10);
            createBarrelCluster(-31, 10); 
            
            batchGroup(-17, -21, 1, 1, 0, 1); 
            batchGroup(-17, 21, 1, 1, 0, 2);  
            
            createWithDoors(-41, -25, 0.2, 'containerGrey', {left:0});
            createWithDoors(-42, -38, -0.2, 'containerBlue', {right:0});
            createWithDoors(-41, 25, -0.2, 'containerRed', {left:0});
            createWithDoors(-42, 38, 0.2, 'containerGreen', {right:0});
            
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -38, 0, 0, Math.PI/2, this.geometry);
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -35, 0, -10, 0.5, this.geometry);
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -35, 0, 10, -0.5, this.geometry);
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -28, 0, 24, 0, this.geometry);
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -28, 0, -20, 0, this.geometry);
            
            // --- 8. ROAD BARRIERS ---
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, 0, 0, -20, Math.PI/2, this.geometry); 
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, 1.5, 0, -35, Math.PI/2, this.geometry); 
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, -1.5, 0, 20, Math.PI/2, this.geometry);
            MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, 1.5, 0, 20, Math.PI/2, this.geometry);
            
            // --- 9. EXTENSION WALLS ---
            const extH = 6.0;
            this.createBlock(this.mapGroup, matWall, -4.5, extH/2, -53, 1, extH, 16); 
            this.createBlock(this.mapGroup, matWall, 4.5, extH/2, -53, 1, extH, 16);  
            this.createBlock(this.mapGroup, matWall, -4.5, extH/2, 53, 1, extH, 16);
            this.createBlock(this.mapGroup, matWall, 4.5, extH/2, 53, 1, extH, 16);

            const turnFloorN = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), matSidewalk);
            turnFloorN.rotation.x = -Math.PI/2; turnFloorN.position.set(-6, 0.01, -65); 
            this.mapGroup.add(turnFloorN);
            this.createBlock(this.mapGroup, matWall, 0, extH/2, -65, 20, extH, 1);
            
            const turnFloorS = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), matSidewalk);
            turnFloorS.rotation.x = -Math.PI/2; turnFloorS.position.set(6, 0.01, 65);
            this.mapGroup.add(turnFloorS);
            this.createBlock(this.mapGroup, matWall, 0, extH/2, 65, 20, extH, 1);
            
            // --- 10. INVISIBLE BARRIERS ---
            const barrierH = 4.0;
            const barrierGeo = new THREE.BoxGeometry(8, barrierH, 1);
            const bNorth = new THREE.Mesh(barrierGeo, matInvisible); bNorth.position.set(0, barrierH/2, -45); bNorth.userData.collidable = true; this.mapGroup.add(bNorth); this.geometry.push(bNorth);
            const bSouth = new THREE.Mesh(barrierGeo, matInvisible); bSouth.position.set(0, barrierH/2, 45); bSouth.userData.collidable = true; this.mapGroup.add(bSouth); this.geometry.push(bSouth);

            // --- 11. EXTENDED PERIMETER (Modified for new East) ---
            const skyBarrH = 30.0;
            const skyBarrGeoSide = new THREE.BoxGeometry(1, skyBarrH, 100);
            const skyBarrGeoEnd = new THREE.BoxGeometry(70, skyBarrH, 1); 
            
            const skyBarrW = new THREE.Mesh(skyBarrGeoSide, matInvisible); skyBarrW.position.set(-45.5, skyBarrH/2, 0); skyBarrW.userData.collidable = true; this.mapGroup.add(skyBarrW); this.geometry.push(skyBarrW);
            
            // EAST WALL at X=15.5
            const skyBarrE = new THREE.Mesh(skyBarrGeoSide, matInvisible); skyBarrE.position.set(15.5, skyBarrH/2, 0); skyBarrE.userData.collidable = true; this.mapGroup.add(skyBarrE); this.geometry.push(skyBarrE);
            
            const skyBarrN = new THREE.Mesh(skyBarrGeoEnd, matInvisible); skyBarrN.position.set(-15, skyBarrH/2, -45.5); skyBarrN.userData.collidable = true; this.mapGroup.add(skyBarrN); this.geometry.push(skyBarrN);
            const skyBarrS = new THREE.Mesh(skyBarrGeoEnd, matInvisible); skyBarrS.position.set(-15, skyBarrH/2, 45.5); skyBarrS.userData.collidable = true; this.mapGroup.add(skyBarrS); this.geometry.push(skyBarrS);

            // --- 12. PERIMETER WALLS VISUALS ---
            const wallH = 6.75; const wallThick = 1.0; const wallOffset = 45.5; const eastOffset = 15.5;
            
            this.createBlock(this.mapGroup, matWall, -24.5, wallH/2, -wallOffset, 41, wallH, wallThick);
            this.createBlock(this.mapGroup, matWall, -15, wallH/2, -wallOffset, 62, wallH, wallThick); 
            
            this.createBlock(this.mapGroup, matWall, -24.5, wallH/2, wallOffset, 41, wallH, wallThick);
            this.createBlock(this.mapGroup, matWall, -15, wallH/2, wallOffset, 62, wallH, wallThick); 

            this.createBlock(this.mapGroup, matWall, -wallOffset, wallH/2, 0, wallThick, wallH, 90);
            this.createBlock(this.mapGroup, matWall, eastOffset, wallH/2, 0, wallThick, wallH, 90);
            
            // --- 13. PROP PLACEMENT ---
            this.populateProps(materialLibrary);

            this.finalizeBatches(materialLibrary);
            this.mapGroup.updateMatrixWorld(true);
            console.log('ContainersMap: ✓ Geometry Built (Detail Pass)');
        },
        
        prepareBatchGeometry(library) {
            const W = 2.44; const H = 2.59; const L = 6.06;
            const frameSize = 0.15; const panelThick = 0.05; 
            const geos = [];
            const add = (w, h, d, x, y, z, rx=0, ry=0) => {
                const g = new THREE.BoxGeometry(w, h, d);
                g.rotateX(rx); g.rotateY(ry);
                g.translate(x, y, z);
                geos.push(g);
            };
            
            add(frameSize, H, frameSize, -W/2+frameSize/2, H/2, -L/2+frameSize/2);
            add(frameSize, H, frameSize, W/2-frameSize/2, H/2, -L/2+frameSize/2);
            add(frameSize, H, frameSize, -W/2+frameSize/2, H/2, L/2-frameSize/2);
            add(frameSize, H, frameSize, W/2-frameSize/2, H/2, L/2-frameSize/2);
            add(frameSize, frameSize, L-2*frameSize, -W/2+frameSize/2, frameSize/2, 0);
            add(frameSize, frameSize, L-2*frameSize, W/2-frameSize/2, frameSize/2, 0);
            add(frameSize, frameSize, L-2*frameSize, -W/2+frameSize/2, H-frameSize/2, 0);
            add(frameSize, frameSize, L-2*frameSize, W/2-frameSize/2, H-frameSize/2, 0);
            add(W-2*frameSize, frameSize, frameSize, 0, frameSize/2, -L/2+frameSize/2);
            add(W-2*frameSize, frameSize, frameSize, 0, frameSize/2, L/2-frameSize/2);
            add(W-2*frameSize, frameSize, frameSize, 0, H-frameSize/2, -L/2+frameSize/2);
            add(W-2*frameSize, frameSize, frameSize, 0, H-frameSize/2, L/2-frameSize/2);

            const MapAssets = window.TacticalShooter.MapAssets;
            if (MapAssets.createCorrugatedPlane) {
                 const sGeo = MapAssets.createCorrugatedPlane(L-2*frameSize, H-2*frameSize, panelThick);
                 const s1 = sGeo.clone(); s1.rotateY(Math.PI/2); s1.translate(-W/2+frameSize/2, H/2, 0); geos.push(s1);
                 const s2 = sGeo.clone(); s2.rotateY(Math.PI/2); s2.translate(W/2-frameSize/2, H/2, 0); geos.push(s2);
                 const roof = MapAssets.createCorrugatedPlane(W-2*frameSize, L-2*frameSize, panelThick);
                 roof.rotateX(-Math.PI/2); roof.translate(0, H-frameSize/2, 0); geos.push(roof);
                 const back = MapAssets.createCorrugatedPlane(W-2*frameSize, H-2*frameSize, panelThick);
                 back.translate(0, H/2, -L/2+frameSize/2); geos.push(back);
                 const front = MapAssets.createCorrugatedPlane(W-2*frameSize, H-2*frameSize, panelThick);
                 front.translate(0, H/2, L/2-frameSize/2); geos.push(front);
                 
                 add(W-2*frameSize, panelThick, L-2*frameSize, 0, frameSize/2, 0);
            }

            this.containerBatchGeometry = window.BufferGeometryUtils.mergeGeometries(geos);
            
            // Optimized Simple Box Geometry (Performance)
            // Just a box with scaled UVs
            const simpleGeo = new THREE.BoxGeometry(W, H, L);
            // Must translate up by H/2 because the complex one is pivoted at bottom?
            // The batchContainer call applies Matrix4.setPosition(x,y,z).
            // Complex Geometry uses add(..., H/2, ...), so its pivot is (0,0,0) at bottom.
            // BoxGeometry is centered at (0,0,0). So we must translate it up H/2.
            simpleGeo.translate(0, H/2, 0);
            
            // Also need UV scaling to look decent
            if (MapAssets.scaleUVs) {
                MapAssets.scaleUVs(simpleGeo, W, H, L);
            }
            
            this.simpleBatchGeometry = simpleGeo;
        },
        
        batchContainer(x, y, z, colorKey, rotY, useSimple = false) {
            if (!this.containerBatchGeometry || !this.simpleBatchGeometry) return;
            
            const targetBatches = useSimple ? this.simpleBatches : this.batches;
            if (!targetBatches[colorKey]) return;
            
            const m = new THREE.Matrix4();
            m.makeRotationY(rotY);
            m.setPosition(x, y, z);
            
            const sourceGeo = useSimple ? this.simpleBatchGeometry : this.containerBatchGeometry;
            
            const g = sourceGeo.clone();
            g.applyMatrix4(m);
            targetBatches[colorKey].push(g);
            
            // Collision Logic (Always needed)
            const W = 2.44; const H = 2.59; const L = 6.06;
            const boxGeo = new THREE.BoxGeometry(W, H, L);
            const boxMat = new THREE.MeshBasicMaterial({ visible: false });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(x, y + H/2, z);
            box.rotation.y = rotY;
            box.userData.collidable = true;
            this.geometry.push(box); 
            this.mapGroup.add(box); 
            
            // Store top
            this.propSpots.push({ x, y: y+H, z, rot: rotY });
        },
        
        populateProps(library) {
             const MapAssets = window.TacticalShooter.MapAssets;
             const grid = this.containerGrid;
             
             // First Pass: Roof Props (Reduced Probability)
             for (const key in grid) {
                 const c = grid[key];
                 if (c.isProtected) continue;
                 
                 const roofY = c.y + 2.59;
                 const isHeight1 = (Math.abs(c.y) < 0.1); 

                 if (isHeight1) {
                     // Exclusive logic to prevent clipping
                     const r = Math.random();
                     if (r < 0.20) { // Reduced from 0.25
                         // Tall Pallet
                         MapAssets.createTallPalletStack(this.mapGroup, library, c.x, roofY, c.z, this.geometry);
                     } else if (r < 0.35) { // Reduced from 0.5
                         // Barrier
                         MapAssets.createConcreteBarrier(this.mapGroup, library, c.x, roofY, c.z, c.rot, this.geometry);
                     }
                 } else {
                     // Higher roofs get barrels or smaller items
                     if (Math.random() < 0.15) { // Reduced from 0.3
                         MapAssets.createBarrel(this.mapGroup, library, c.x, roofY, c.z, this.geometry);
                     }
                 }
             }

             // Second Pass: Ground Steps
             // Look for containers at Y=0. Check adjacent spots. If empty, place step.
             for (const key in grid) {
                 const c = grid[key];
                 // Only care about base containers
                 if (Math.abs(c.y) > 0.1) continue;
                 
                 const cx = Math.round(c.x);
                 const cz = Math.round(c.z);
                 
                 // Offsets to check: +/- 2.5 in X or Z (approx grid size)
                 // We want to jump UP. Pallet stack is ~1.5m high. Container is 2.6m.
                 const checks = [
                     {x:2.5, z:0}, {x:-2.5, z:0}, {x:0, z:2.5}, {x:0, z:-2.5}
                 ];
                 
                 for(let off of checks) {
                     const tx = cx + off.x;
                     const tz = cz + off.z;
                     const k = `${Math.round(tx)}_${Math.round(tz)}`;
                     
                     // If spot is empty AND valid (not road/spawn)
                     if (!grid[k]) {
                         // Re-check spawn protection manually
                         if (Math.abs(tx) < 3.0) continue; 
                         if (Math.abs(tx - (-42.5)) < 3.0) continue;
                         
                         // Chance to spawn step (Reduced from 0.15)
                         if (Math.random() < 0.10) {
                             MapAssets.createTallPalletStack(this.mapGroup, library, tx, 0, tz, this.geometry);
                             // Mark used so we don't spam
                             grid[k] = { x: tx, y: 0, z: tz, isProtected: true };
                         }
                     }
                 }
             }
        },
        
        finalizeBatches(library) {
            // Process Complex Batches
            for (const key in this.batches) {
                const list = this.batches[key];
                if (list.length > 0) {
                    const merged = window.BufferGeometryUtils.mergeGeometries(list);
                    const mat = library.getMaterial(key);
                    const mesh = new THREE.Mesh(merged, mat);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData.collidable = false;
                    this.mapGroup.add(mesh);
                }
            }

            // Process Simple Batches
            for (const key in this.simpleBatches) {
                const list = this.simpleBatches[key];
                if (list.length > 0) {
                    const merged = window.BufferGeometryUtils.mergeGeometries(list);
                    const mat = library.getMaterial(key); // Re-use same material
                    const mesh = new THREE.Mesh(merged, mat);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData.collidable = false;
                    this.mapGroup.add(mesh);
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
        createSpawnZones(parent, library) {
            // New Centers around X=-15
            const createZoneGroup = (pts, matName) => {
                const g = this.createBorder(parent, library, pts, matName, 0.2);
                g.userData.isSpawnZone = true; g.visible = false; return g;
            };
            this.spawnZoneGroups.blue = createZoneGroup([ {x:-30, z:-42}, {x:-30, z:-34}, {x:0, z:-34}, {x:0, z:-42} ], 'zoneBlue');
            this.spawnZoneGroups.blue.position.y = 0.2; 
            this.spawnZoneGroups.red = createZoneGroup([ {x:0, z:42}, {x:0, z:34}, {x:-30, z:34}, {x:-30, z:42} ], 'zoneRed');
            this.spawnZoneGroups.red.position.y = 0.2;
        },
        createBlock(parent, material, x, y, z, w, h, d) { 
            const geo = new THREE.BoxGeometry(w, h, d); 
            if (material.map && window.TacticalShooter.MapAssets.scaleUVs) {
                 window.TacticalShooter.MapAssets.scaleUVs(geo, w, h, d); 
            }
            const mesh = new THREE.Mesh(geo, material); 
            mesh.position.set(x, y, z); 
            mesh.castShadow = true; 
            mesh.receiveShadow = true; 
            mesh.userData.collidable = true; 
            parent.add(mesh); 
            this.geometry.push(mesh); 
            return mesh; 
        },
        cleanup(scene) { 
            if (this.mapGroup) { scene.remove(this.mapGroup); } 
            this.geometry = []; 
            this.batches = {}; 
            this.simpleBatches = {};
            this.propSpots = [];
            this.containerGrid = {};
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.MapRegistry.register(ContainersMap.id, ContainersMap);
})();
