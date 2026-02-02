
// js/data/maps/warehouse/map.js
(function() {
    const WarehouseMap = {
        id: "WAREHOUSE",
        name: "MAP 1", 
        mapGroup: null, 
        geometry: [],
        
        perimeter: [ { x: -26, z: -51 }, { x: -26, z: 51 }, { x: 26, z: 51 }, { x: 26, z: -51 } ],
        
        spawnZoneGroups: {
            blue: null,
            red: null
        },
        
        init(scene, materialLibrary) {
            console.log('WarehouseMap: Building Warehouse (Deterministic)...');
            this.geometry = [];
            this.mapGroup = new THREE.Group();
            scene.add(this.mapGroup);
            
            const MapAssets = window.TacticalShooter.MapAssets;
            
            let seed = 67890; 
            const seededRandom = () => { 
                seed = (seed * 9301 + 49297) % 233280; 
                return seed / 233280; 
            };
            if (MapAssets && MapAssets.setRNG) MapAssets.setRNG(seededRandom);

            const matFloor = materialLibrary.getMaterial('floor');
            const matWall = materialLibrary.getMaterial('trainingWall'); 
            const matUpper = matWall.clone(); matUpper.color.offsetHSL(0, 0, 0.1); matUpper.name = "warehouseUpperWall";
            const matRoof = materialLibrary.getMaterial('containerGrey'); 
            const matSteel = materialLibrary.getMaterial('steel');
            
            const matWhite = new THREE.MeshStandardMaterial({ color: 0xeae8e3, roughness: 0.9 }); 
            const matPaintBlue = new THREE.MeshStandardMaterial({ color: 0x507090, roughness: 0.8, metalness: 0.1 }); 
            const matPaintRed = new THREE.MeshStandardMaterial({ color: 0x905050, roughness: 0.8, metalness: 0.1 }); 
            const matPlywood = materialLibrary.getMaterial('plywood');
            
            if (this.perimeter && this.perimeter.length > 0) {
                this.createBorder(this.mapGroup, materialLibrary, this.perimeter, 'lobbyBorder', 0.6);
            }
            this.createSpawnZones(this.mapGroup, materialLibrary);

            // 1. FLOOR - PHYSICS FIX
            // use skipMerge=true so MapOptimizer keeps it as a separate mesh.
            // MapOptimizer.generateStaticCollider sees BoxGeometry and makes a solid Cuboid.
            // Do NOT use dynamic=true, as that excludes it from static physics entirely.
            const floorMesh = this.createBlock(this.mapGroup, matFloor, 0, -1, 0, 50, 2, 100);
            floorMesh.userData.skipMerge = true; 
            
            // 2. WALLS
            const pHeight = 3.0; const pThick = 0.5; const halfW = 25; const halfL = 50; 
            this.createBlock(this.mapGroup, matWall, -halfW, pHeight/2, 0, pThick, pHeight, 100); 
            this.createBlock(this.mapGroup, matWall, halfW, pHeight/2, 0, pThick, pHeight, 100);  
            this.createBlock(this.mapGroup, matWall, 0, pHeight/2, -halfL, 50, pHeight, pThick); 
            this.createBlock(this.mapGroup, matWall, 0, pHeight/2, halfL, 50, pHeight, pThick);  

            const uHeight = 10.0; const uCenterY = pHeight + (uHeight / 2);
            this.createBlock(this.mapGroup, matUpper, -halfW, uCenterY, 0, pThick, uHeight, 100);
            this.createBlock(this.mapGroup, matUpper, halfW, uCenterY, 0, pThick, uHeight, 100);
            this.createBlock(this.mapGroup, matUpper, 0, uCenterY, -halfL, 50, uHeight, pThick);
            this.createBlock(this.mapGroup, matUpper, 0, uCenterY, halfL, 50, uHeight, pThick);

            // ROOF
            const roofBaseY = pHeight + uHeight; 
            this.createGable(this.mapGroup, matUpper, 0, roofBaseY, -halfL, 50, 7, pThick);
            this.createGable(this.mapGroup, matUpper, 0, roofBaseY, halfL, 50, 7, pThick);
            
            const slopeLength = Math.sqrt(25*25 + 7*7); const slopeAngle = Math.atan2(7, 25);
            
            // BEAMS
            const beamGeo = new THREE.BoxGeometry(0.3, 0.3, 100);
            for(let i=0; i<3; i++) {
                const ratio = (i + 0.5) / 3; const dist = ratio * slopeLength;
                const dx = dist * Math.cos(slopeAngle); const dy = dist * Math.sin(slopeAngle);
                const bL = new THREE.Mesh(beamGeo, matSteel); bL.position.set(-25 + dx, roofBaseY + dy - 0.2, 0); bL.rotation.z = slopeAngle; bL.userData.isProp = true; this.mapGroup.add(bL);
                const bR = new THREE.Mesh(beamGeo, matSteel); bR.position.set(25 - dx, roofBaseY + dy - 0.2, 0); bR.rotation.z = -slopeAngle; bR.userData.isProp = true; this.mapGroup.add(bR);
            }
            
            // RAFTERS
            const rafterCount = 10; const rafterGeo = new THREE.BoxGeometry(slopeLength, 0.2, 0.2);
            for(let i=0; i<=rafterCount; i++) {
                const z = -50 + (i * (100/rafterCount));
                const rL = new THREE.Mesh(rafterGeo, matSteel); rL.position.set(-12.5, 16.5, z); rL.rotation.z = slopeAngle; rL.userData.isProp = true; this.mapGroup.add(rL);
                const rR = new THREE.Mesh(rafterGeo, matSteel); rR.position.set(12.5, 16.5, z); rR.rotation.z = -slopeAngle; rR.userData.isProp = true; this.mapGroup.add(rR);
            }

            // ROOF PANELS
            const rows = 20; const cols = 8; const rowLen = 100 / rows; const colLen = slopeLength / cols; 
            const roofGeo = new THREE.BoxGeometry(colLen, 0.15, rowLen - 0.2); 
            if (MapAssets.scaleUVs) MapAssets.scaleUVs(roofGeo, colLen, 0.15, rowLen);

            for (let r = 0; r < rows; r++) {
                const zPos = -halfL + (rowLen * r) + (rowLen/2);
                for(let c = 0; c < cols; c++) {
                    if (seededRandom() > 0.20) {
                        const dist = (c * colLen) + (colLen/2);
                        const dx = dist * Math.cos(slopeAngle); const dy = dist * Math.sin(slopeAngle);
                        const mesh = new THREE.Mesh(roofGeo, matRoof); mesh.position.set(-25 + dx, roofBaseY + dy, zPos); mesh.rotation.z = slopeAngle; mesh.castShadow = true; mesh.userData.isProp = true; mesh.userData.collidable = true; this.mapGroup.add(mesh); this.geometry.push(mesh);
                    }
                }
                for(let c = 0; c < cols; c++) {
                    if (seededRandom() > 0.20) {
                        const dist = (c * colLen) + (colLen/2);
                        const dx = dist * Math.cos(slopeAngle); const dy = dist * Math.sin(slopeAngle);
                        const mesh = new THREE.Mesh(roofGeo, matRoof); mesh.position.set(25 - dx, roofBaseY + dy, zPos); mesh.rotation.z = -slopeAngle; mesh.castShadow = true; mesh.userData.isProp = true; mesh.userData.collidable = true; this.mapGroup.add(mesh); this.geometry.push(mesh);
                    }
                }
            }

            // KILLHOUSE
            const wall = (x, z, w, d, h=H) => { this.createBlock(this.mapGroup, matWall, x, h/2, z, w, h, d); };
            const barrierL = (cx, cz, flipX, flipZ, skipZ=false) => {
                MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, cx + (1.5 * flipX), 0, cz, Math.PI/2, this.geometry);
                MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, cx + (4.5 * flipX), 0, cz, Math.PI/2, this.geometry);
                if (!skipZ) {
                    MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, cx, 0, cz + (2.0 * flipZ), 0, this.geometry);
                    MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, cx, 0, cz + (5.0 * flipZ), 0, this.geometry);
                }
            };
            const createPaintedWall = (x, z, width, teamColorMat) => {
                const grp = new THREE.Group(); grp.position.set(x, 0, z);
                const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.75, T), matWall); base.position.y = 0.75/2; base.castShadow = true; base.receiveShadow = true; base.userData.collidable = true; grp.add(base); this.geometry.push(base);
                const stripe = new THREE.Mesh(new THREE.BoxGeometry(width, 0.5, T), teamColorMat); stripe.position.y = 1.0; stripe.castShadow = true; stripe.receiveShadow = true; stripe.userData.collidable = true; grp.add(stripe); this.geometry.push(stripe);
                const top = new THREE.Mesh(new THREE.BoxGeometry(width, 1.75, T), matWhite); top.position.y = 2.125; top.castShadow = true; top.receiveShadow = true; top.userData.collidable = true; grp.add(top); this.geometry.push(top);
                this.mapGroup.add(grp);
            };
            const buildPerforatedWallPainted = (zPos, colorMat) => { createPaintedWall(-20, zPos, 10, colorMat); createPaintedWall(-8, zPos, 8, colorMat); createPaintedWall(15.5, zPos, 19, colorMat); };
            
            buildPerforatedWallPainted(-40, matPaintBlue); 
            buildPerforatedWallPainted(40, matPaintRed);

            wall(-16, -30, 18, T); wall(0, -30, 10, T, 1.0); wall(16, -30, 18, T);
            wall(-16, 30, 18, T); wall(0, 30, 10, T, 1.0); wall(16, 30, 18, T);

            const cY = 0; const cY2 = 2.59;
            MapAssets.createContainer(this.mapGroup, materialLibrary, -1.3, cY, 0, 'containerRed', Math.PI, this.geometry, { left: -1.5, right: 1.2 });
            MapAssets.createContainer(this.mapGroup, materialLibrary, 1.3, cY, 0, 'containerRed', 0, this.geometry, { left: -0.8, right: 1.5 });
            MapAssets.createContainer(this.mapGroup, materialLibrary, -1.3, cY2, 0, 'containerRed', 0, this.geometry);
            
            MapAssets.createContainer(this.mapGroup, materialLibrary, -20, 0, -26, 'containerBlue', 0.2, this.geometry, { left: 0, right: 0.5 });
            MapAssets.createContainer(this.mapGroup, materialLibrary, 20, 0, 26, 'containerBlue', Math.PI - 0.2, this.geometry, { left: 0.5, right: 0 });

            const createComplexWoodenRoom = (x, z, w, l, rotY, floors = 1, hasStairs = false) => {
                const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rotY;
                const h = 2.5; const totalH = h * floors;
                MapAssets.createKillhouseWall(grp, materialLibrary, -w/2, 0, -l/4, Math.PI/2, true, this.geometry); 
                MapAssets.createKillhouseWall(grp, materialLibrary, -w/2, 0, l/4, Math.PI/2, false, this.geometry);
                if (floors > 1) { MapAssets.createKillhouseWall(grp, materialLibrary, -w/2, h, -l/4, Math.PI/2, true, this.geometry); MapAssets.createKillhouseWall(grp, materialLibrary, -w/2, h, l/4, Math.PI/2, false, this.geometry); }
                MapAssets.createKillhouseWall(grp, materialLibrary, w/2, 0, 0, Math.PI/2, false, this.geometry);
                if (floors > 1) MapAssets.createKillhouseWall(grp, materialLibrary, w/2, h, 0, Math.PI/2, true, this.geometry);
                MapAssets.createKillhouseWall(grp, materialLibrary, 0, 0, l/2, 0, true, this.geometry);
                if (floors > 1) MapAssets.createKillhouseWall(grp, materialLibrary, 0, h, l/2, 0, false, this.geometry);
                MapAssets.createKillhouseWall(grp, materialLibrary, 0, 0, -l/2, 0, false, this.geometry);
                if (floors > 1) MapAssets.createKillhouseWall(grp, materialLibrary, 0, h, -l/2, 0, false, this.geometry);
                
                if (floors > 1) {
                    if (!hasStairs) {
                        const f2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, l), matPlywood);
                        f2.position.set(0, h, 0); f2.userData.collidable = true; f2.castShadow = true; f2.receiveShadow = true;
                        grp.add(f2); this.geometry.push(f2);
                    } else {
                        // FIXED STAIRS: Rotation 180 degrees (Math.PI)
                        // Floor Logic: L=12. Floor Part is l * 0.4 = 4.8 long.
                        // Positioned at -l * 0.3 = -3.6.
                        // Floor spans from -6.0 to -1.2.
                        // Gap is from -1.2 to +6.0.
                        const f2a = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, l * 0.4), matPlywood);
                        f2a.position.set(0, h, -l * 0.3); 
                        f2a.userData.collidable = true; f2a.castShadow = true; f2a.receiveShadow = true;
                        grp.add(f2a); this.geometry.push(f2a);
                        
                        // Stairs placement: Top needs to meet floor edge at Z = -1.2.
                        // Stairs go UP in their Local +Z if unrotated, or -Z if rotated 180?
                        // createStairs builds steps from (0,0,0) to (0,h,L).
                        // If rotated Math.PI, it goes from (0,0,0) to (0,h,-L).
                        // Top is at (0,h,-3.5).
                        // We want top at -1.2. So Base needs to be at -1.2 - (-3.5) = +2.3.
                        MapAssets.createStairs(grp, materialLibrary, 0, 0, 2.3, 1.2, h, 3.5, Math.PI, this.geometry);
                    }
                }
                const planks = Math.floor(l / 1.0);
                for(let i=0; i<planks; i++) {
                    if (hasStairs && i > planks/2) continue;
                    if (seededRandom() > 0.5) continue;
                    const p = new THREE.Mesh(new THREE.BoxGeometry(w+0.2, 0.1, 0.4), matPlywood);
                    p.position.set(0, totalH + 0.05, -l/2 + (l/planks)*i + (l/planks)/2); p.rotation.y = (seededRandom()-0.5)*0.1; p.castShadow = true; p.receiveShadow = true; grp.add(p);
                }
                this.mapGroup.add(grp);
            };

            createComplexWoodenRoom(-15, 0, 6.0, 12.0, 0, 2, true);
            createComplexWoodenRoom(-18, 10, 5.0, 8.0, -0.2, 1);
            createComplexWoodenRoom(-18, -10, 5.0, 8.0, 0.2, 1);
            
            const createWoodenRoom = (x, z, w, l, rotY, enclosedRoof = false) => {
                const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rotY;
                const h = 2.5; const thick = 0.1;
                const lWall = new THREE.Mesh(new THREE.BoxGeometry(thick, h, l), matPlywood); lWall.position.set(-w/2, h/2, 0); lWall.castShadow = true; lWall.receiveShadow = true; lWall.userData.collidable = true; grp.add(lWall); this.geometry.push(lWall);
                const rWall = new THREE.Mesh(new THREE.BoxGeometry(thick, h, l), matPlywood); rWall.position.set(w/2, h/2, 0); rWall.castShadow = true; rWall.receiveShadow = true; rWall.userData.collidable = true; grp.add(rWall); this.geometry.push(rWall);
                if (enclosedRoof) { const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.2, 0.1, l+0.2), matPlywood); roof.position.set(0, h + 0.05, 0); roof.castShadow = true; roof.receiveShadow = true; roof.userData.collidable = true; grp.add(roof); this.geometry.push(roof); }
                this.mapGroup.add(grp);
            };
            createWoodenRoom(18, 10, 4.0, 12.0, 0, true);
            createWoodenRoom(16, 22, 4.0, 10.0, -0.2, false);

            const spawnBaseDecor = (zPos, facingDir) => {
                const zOff = (facingDir > 0) ? -1 : 1; 
                const rx = (seededRandom() - 0.5) * 4.0;
                MapAssets.createContainer(this.mapGroup, materialLibrary, -18, 0, zPos + (4 * zOff), 'containerRed', Math.PI/2 + 0.2, this.geometry);
                MapAssets.createContainer(this.mapGroup, materialLibrary, 18, 0, zPos + (4 * zOff), 'containerRed', Math.PI/2 - 0.2, this.geometry);
                MapAssets.createTallPalletStack(this.mapGroup, materialLibrary, -5 + rx, 0, zPos + (7 * zOff), this.geometry);
                const bX = 5 + rx; const bZ = zPos + (6 * zOff);
                MapAssets.createBarrel(this.mapGroup, materialLibrary, bX, 0, bZ, this.geometry);
                MapAssets.createBarrel(this.mapGroup, materialLibrary, bX+1.0, 0, bZ+0.5, this.geometry);
            };

            spawnBaseDecor(-40, 1); 
            spawnBaseDecor(40, -1); 

            for(let i=0; i<6; i++) {
                const mx = (seededRandom()-0.5) * 20; const mz = (seededRandom()-0.5) * 30;
                if (Math.abs(mx) < 3 && Math.abs(mz) < 4) continue;
                if (seededRandom() > 0.5) MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, mx, 0, mz, seededRandom()*Math.PI, this.geometry);
                else MapAssets.createTallPalletStack(this.mapGroup, materialLibrary, mx, 0, mz, this.geometry);
            }
            
            const scatterProp = (x, z, type) => {
                const rot = seededRandom() * Math.PI;
                if (type === 'barrier') MapAssets.createConcreteBarrier(this.mapGroup, materialLibrary, x, 0, z, rot, this.geometry);
                else if (type === 'barrel') MapAssets.createBarrel(this.mapGroup, materialLibrary, x, 0, z, this.geometry);
            };
            
            scatterProp(-12, -5, 'barrier'); scatterProp(-18, 2, 'barrel');
            scatterProp(12, 5, 'barrier'); scatterProp(18, -2, 'barrel');
            
            MapAssets.createPalletStack(this.mapGroup, materialLibrary, 22, 0, -32, 2, 1.2, this.geometry);
            MapAssets.createPlankStack(this.mapGroup, materialLibrary, -22, 0, 32, 0.5, this.geometry);

            barrierL(-7, -15, -1, -1); 
            barrierL(7, -15, 1, -1, true); 
            wall(10, 15, 6, T);
            wall(7, 18, T, 6);
            
            // Catwalks
            const cwY = 6.0;
            this.createBlock(this.mapGroup, matSteel, 45, cwY, 0, 8, 0.3, 80); 
            this.createBlock(this.mapGroup, matSteel, 41, cwY+0.5, 0, 0.2, 1, 80);
            
            // Access to catwalk (Standard stairs)
            // Shifted to +/- 46 to align with ends of catwalk
            MapAssets.createStairs(this.mapGroup, materialLibrary, 45, 0, -46, 3, cwY, 6, 0, this.geometry); 
            MapAssets.createStairs(this.mapGroup, materialLibrary, 45, 0, 46, 3, cwY, 6, Math.PI, this.geometry); 

            if (MapAssets.setRNG) MapAssets.setRNG(Math.random);

            this.mapGroup.updateMatrixWorld(true);
            console.log('WarehouseMap: ✓ Warehouse geometry ready');
        },
        
        setVisible(visible) { if (this.mapGroup) this.mapGroup.visible = visible; },
        updateVisuals(isTacView, isTDM, teamCount) {
            Object.values(this.spawnZoneGroups).forEach(g => { if(g) g.visible = false; });
            if (!isTacView || !isTDM) return;
            if (this.spawnZoneGroups.blue) this.spawnZoneGroups.blue.visible = true;
            if (this.spawnZoneGroups.red) this.spawnZoneGroups.red.visible = true;
        },
        createBorder(parent, library, points, materialName, thicknessOverride = null) {
            const material = library.getMaterial(materialName); const borderGroup = new THREE.Group(); borderGroup.userData.isBorder = true; const thickness = thicknessOverride || 0.6; const height = 12.0; const yPos = 3.0; const cornerGeo = new THREE.BoxGeometry(thickness, height, thickness);
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i]; const p2 = points[(i + 1) % points.length];
                const corner = new THREE.Mesh(cornerGeo, material); corner.position.set(p1.x, yPos, p1.z); corner.userData.isBorder = true; borderGroup.add(corner);
                const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2)); const midX = (p1.x + p2.x) / 2; const midZ = (p1.z + p2.z) / 2; const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z); const wallLength = Math.max(0.01, dist - thickness);
                const wallGeo = new THREE.BoxGeometry(thickness, height, wallLength); const wall = new THREE.Mesh(wallGeo, material); wall.position.set(midX, yPos, midZ); wall.rotation.y = angle; wall.userData.isBorder = true; borderGroup.add(wall);
            }
            parent.add(borderGroup); return borderGroup;
        },
        createGable(parent, material, x, y, z, width, height, thickness) { /* ... */ },
        createSpawnZones(parent, library) {
            const createZoneGroup = (pts, matName) => { const g = this.createBorder(parent, library, pts, matName, 0.15); g.userData.isSpawnZone = true; g.visible = false; return g; };
            this.spawnZoneGroups.blue = createZoneGroup([ {x:-25, z:-50}, {x:-25, z:-35}, {x:25, z:-35}, {x:25, z:-50} ], 'zoneBlue');
            this.spawnZoneGroups.red = createZoneGroup([ {x:25, z:50}, {x:25, z:35}, {x:-25, z:35}, {x:-25, z:50} ], 'zoneRed');
        },
        createBlock(parent, material, x, y, z, w, h, d) { const geo = new THREE.BoxGeometry(w, h, d); if (material.map) window.TacticalShooter.MapAssets.scaleUVs(geo, w, h, d); const mesh = new THREE.Mesh(geo, material); mesh.position.set(x, y, z); if (material.visible) { mesh.castShadow = true; mesh.receiveShadow = true; } mesh.userData.collidable = true; parent.add(mesh); this.geometry.push(mesh); return mesh; },
        cleanup(scene) { if (this.mapGroup) { scene.remove(this.mapGroup); } this.geometry = []; }
    };
    const H = 3.0; const T = 0.3;
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.WarehouseMap = WarehouseMap;
    if (window.TacticalShooter.MapRegistry) { window.TacticalShooter.MapRegistry.register(WarehouseMap.id, WarehouseMap); }
})();
