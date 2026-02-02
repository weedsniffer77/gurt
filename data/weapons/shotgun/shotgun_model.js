
// js/data/weapons/shotgun/shotgun_model.js
(function() {
    const weaponDef = window.TacticalShooter.GameData.Weapons["SHOTGUN"];
    if (!weaponDef) return;

    weaponDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        
        const CommonParts = window.TacticalShooter.CommonParts;
        
        const group = new THREE.Group();
        group.userData.bulletTransparent = true;
        
        const atts = this.attachments || [];
        const hasOptic = atts.some(a => a.startsWith('optic_'));
        const isStockless = atts.includes('shotgun_stock_none');
        const hasFlashHider = atts.includes('att_flashhider');

        // --- MATERIALS ---
        const matParkerized = new THREE.MeshStandardMaterial({ 
            color: 0x222222, roughness: 0.6, metalness: 0.6, name: 'Parkerized'
        });
        const matPolymer = new THREE.MeshStandardMaterial({ 
            color: 0x151515, roughness: 0.6, metalness: 0.1, name: 'Polymer' 
        });
        const matPolymerStock = new THREE.MeshStandardMaterial({ 
            color: 0x111111, roughness: 0.7, metalness: 0.1, name: 'StockPolymer' 
        });
        const matBolt = new THREE.MeshStandardMaterial({ 
            color: 0xaaaaaa, roughness: 0.2, metalness: 1.0, name: 'BoltChrome' 
        });
        const matPortHole = new THREE.MeshStandardMaterial({ 
            color: 0x020202, roughness: 1.0, metalness: 0.0, name: 'PortHole' 
        });
        const matRubber = new THREE.MeshStandardMaterial({
            color: 0x050505, roughness: 0.9, metalness: 0.0, name: 'Rubber'
        });
        const matGold = new THREE.MeshStandardMaterial({
            color: 0xd4af37, roughness: 0.3, metalness: 1.0
        });
        const matGreenSight = new THREE.MeshStandardMaterial({
            color: 0x00ff00, roughness: 0.2, metalness: 0.0, emissive: 0x004400
        });
        const matShellRed = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.8, metalness: 0.1 });
        const matShellBrass = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.9 });

        const addMesh = (mesh, parent) => {
            mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.bulletTransparent = true;
            parent.add(mesh); return mesh;
        };

        const mm = 0.001;
        
        // --- 1. RECEIVER ---
        const recLen = 203 * mm;
        const recBodyH = 27 * mm; 
        const recHalfW = (35.6 * mm) / 2;
        const bevelSize = 6 * mm; 
        const slantOffset = 25.0 * mm; 
        const transitionX = recLen;
        const transitionY = 12 * mm; 
        const bY = 14 * mm; // Barrel Height (Reference)

        const recGroup = new THREE.Group();
        group.add(recGroup);

        const recShape = new THREE.Shape();
        recShape.moveTo(0, recBodyH);
        const curveStart = recLen - 85*mm; 
        recShape.lineTo(curveStart, recBodyH); 
        recShape.quadraticCurveTo(recLen - 10*mm, recBodyH, transitionX, transitionY);
        recShape.lineTo(recLen - slantOffset, -32*mm); 
        recShape.lineTo(0, -32*mm);
        recShape.lineTo(0, recBodyH);
        const recGeom = new THREE.ExtrudeGeometry(recShape, { steps: 1, depth: recHalfW * 2, bevelEnabled: true, bevelThickness: bevelSize, bevelSize: bevelSize, bevelSegments: 8 });
        recGeom.translate(0, 0, -recHalfW); 
        const receiver = new THREE.Mesh(recGeom, matParkerized);
        receiver.rotation.y = -Math.PI / 2; receiver.position.set(0, 0, 0); 
        addMesh(receiver, recGroup);

        // --- LOADING PORT (UNDERSIDE) ---
        const gateLen = 80 * mm; const gateW = 24 * mm;
        const loadingGate = new THREE.Mesh(new THREE.PlaneGeometry(gateLen, gateW), matPortHole);
        loadingGate.rotation.x = Math.PI / 2; loadingGate.position.set(60*mm, -32*mm, 0); addMesh(loadingGate, receiver);
        const lifter = new THREE.Mesh(new THREE.PlaneGeometry(gateLen * 0.8, gateW * 0.8), new THREE.MeshStandardMaterial({color: 0x333333}));
        lifter.rotation.x = Math.PI / 2; lifter.rotation.y = 0.05; lifter.position.set(60*mm, -32.5*mm, 0); addMesh(lifter, receiver);

        // --- TOP RAIL SYSTEM OR SIGHT RIDGE ---
        const topSurfY = recBodyH + bevelSize; 
        if (!hasOptic) {
            const sightLen = 150 * mm; const sightCenterX = (sightLen / 2); 
            const sightGeo = new THREE.BoxGeometry(sightLen, 1.0*mm, 2*mm); 
            const sight = new THREE.Mesh(sightGeo, matParkerized);
            sight.position.set(sightCenterX, topSurfY + 0.5*mm, 0); addMesh(sight, receiver);
        } else {
            const railLen = 130 * mm; const railW = 21 * mm; const railH = 8 * mm; const railCenterX = (railLen / 2);
            const baseGeo = new THREE.BoxGeometry(railLen, railH, railW);
            const base = new THREE.Mesh(baseGeo, matParkerized);
            base.position.set(railCenterX, topSurfY + railH/2, 0); addMesh(base, receiver);
            const ridgeCount = 12; const ridgeW = 5 * mm; const ridgeGap = 5 * mm;
            const startRidgeX = railCenterX - ((ridgeCount * ridgeW) + ((ridgeCount-1) * ridgeGap))/2 + (ridgeW/2);
            const ridgeGeo = new THREE.BoxGeometry(ridgeW, 2*mm, railW);
            for(let i=0; i<ridgeCount; i++) {
                const r = new THREE.Mesh(ridgeGeo, matParkerized);
                const xPos = startRidgeX + (i * (ridgeW + ridgeGap));
                r.position.set(xPos, topSurfY + railH + 1*mm, 0); addMesh(r, receiver);
            }
            let opticObj = null;
            if (atts.includes('optic_reddot')) opticObj = CommonParts.buildRedDot().mesh;
            else if (atts.includes('optic_holo')) opticObj = CommonParts.buildHolo().mesh;
            if (opticObj) {
                const mountY = topSurfY + railH + 2*mm; const opticX = railCenterX + 20*mm; 
                opticObj.position.set(opticX, mountY, 0); opticObj.rotation.y = Math.PI / 2; addMesh(opticObj, receiver);
            }
        }

        // --- EJECTION PORT & BOLT ---
        const portLen = 70*mm; const portH = 18*mm;
        const port = new THREE.Mesh(new THREE.PlaneGeometry(portLen, portH), matPortHole);
        port.rotation.y = Math.PI; 
        const portRecX = 70*mm; const portZ = -recHalfW - bevelSize - 1.0*mm; 
        port.position.set(portRecX, bY - 2*mm, portZ); addMesh(port, receiver);
        const bolt = new THREE.Mesh(new THREE.BoxGeometry(portLen, portH, 2*mm), matBolt);
        bolt.position.copy(port.position); bolt.position.z -= 1.5*mm; 
        bolt.userData.restX = portRecX; bolt.userData.restScaleX = 1.0; addMesh(bolt, receiver);

        // --- 2. GRIP ---
        const gripWristX = recLen + 75*mm; const gripTopY = -35*mm; const gripBotY = -95*mm; const gripDepth = recHalfW * 1.4; 
        const gripShape = new THREE.Shape(); const gripStartX = transitionX - 4*mm; const gripStartY = transitionY + 1*mm; 
        gripShape.moveTo(gripStartX, gripStartY); gripShape.quadraticCurveTo(recLen + 30*mm, -18 * mm, gripWristX, gripTopY);
        gripShape.bezierCurveTo(gripWristX + 25*mm, (gripTopY + gripBotY) * 0.4, gripWristX + 10*mm, gripBotY + 10*mm, gripWristX, gripBotY);
        gripShape.bezierCurveTo(recLen + 50*mm, gripBotY, recLen + 50*mm, -60*mm, recLen - slantOffset, -32*mm);
        gripShape.lineTo(gripStartX, gripStartY);
        const gripGeom = new THREE.ExtrudeGeometry(gripShape, { steps: 4, depth: gripDepth, bevelEnabled: true, bevelThickness: 4*mm, bevelSize: 4*mm, bevelSegments: 6 });
        const tempGrip = new THREE.ExtrudeGeometry(gripShape, {depth: gripDepth, bevelEnabled:true, bevelThickness:4*mm, bevelSize:4*mm});
        tempGrip.computeBoundingBox();
        const gripWidthCenter = (tempGrip.boundingBox.max.z + tempGrip.boundingBox.min.z) / 2;
        gripGeom.translate(0, 0, -gripWidthCenter);
        const gripMesh = new THREE.Mesh(gripGeom, matPolymer);
        gripMesh.rotation.y = -Math.PI / 2; addMesh(gripMesh, group);

        // --- 3. STOCK ---
        if (!isStockless) {
            const stockWristX = recLen + 55*mm; const stockWristY = -10*mm; const stockBotY = -70*mm; const heelX = 480*mm; const heelY = -40*mm;
            const stockShape = new THREE.Shape();
            stockShape.moveTo(stockWristX, stockWristY - 15*mm); stockShape.quadraticCurveTo(stockWristX, stockWristY, stockWristX + 35*mm, stockWristY);
            stockShape.lineTo(heelX, heelY); 
            const combDx = heelX - stockWristX; const combDy = heelY - stockWristY; const len = Math.sqrt(combDx*combDx + combDy*combDy);
            const perpX = combDy / len; const perpY = -combDx / len; const buttPlateLen = 130*mm;
            const toeX = heelX + (perpX * buttPlateLen); const toeY = heelY + (perpY * buttPlateLen);
            stockShape.lineTo(toeX, toeY); stockShape.lineTo(stockWristX, stockBotY); stockShape.lineTo(stockWristX, stockWristY - 15*mm); 
            const stockGeom = new THREE.ExtrudeGeometry(stockShape, { steps: 2, depth: gripDepth, bevelEnabled: true, bevelThickness: 3*mm, bevelSize: 3*mm, bevelSegments: 4 });
            stockGeom.translate(0, 0, -gripWidthCenter); 
            const stockMesh = new THREE.Mesh(stockGeom, matPolymerStock);
            stockMesh.rotation.y = -Math.PI / 2; addMesh(stockMesh, group);
            const padShape = new THREE.Shape();
            padShape.moveTo(heelX, heelY); padShape.lineTo(heelX + 10*mm, heelY - 2*mm); padShape.lineTo(toeX + 10*mm, toeY - 2*mm); padShape.lineTo(toeX, toeY); padShape.lineTo(heelX, heelY);
            const padGeom = new THREE.ExtrudeGeometry(padShape, { depth: 36*mm, bevelEnabled: false });
            padGeom.translate(0,0,-18*mm); 
            const pad = new THREE.Mesh(padGeom, matRubber); pad.rotation.y = -Math.PI / 2; addMesh(pad, group);
        } 

        // --- 4. BARREL & TUBE ---
        const bLen = 470 * mm; const bRad = 11 * mm; 
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(bRad, 12.5*mm, bLen, 16).rotateX(Math.PI/2), matParkerized);
        barrel.position.set(0, bY, -bLen/2); addMesh(barrel, group);
        const tLen = 360 * mm; const tRad = 12.5 * mm; const tY = -14 * mm; const ringZ = -340 * mm; 
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(tRad, tRad, tLen, 16).rotateX(Math.PI/2), matParkerized);
        tube.position.set(0, tY, -tLen/2 + 20*mm); addMesh(tube, group);
        
        // --- CLAMP ---
        const clampGroup = new THREE.Group(); clampGroup.position.set(0, 0, ringZ); group.add(clampGroup);
        const cWidth = 18*mm; const cThick = 2.5*mm; 
        const brGeo = new THREE.CylinderGeometry(bRad + cThick, bRad + cThick, cWidth, 16); brGeo.rotateX(Math.PI / 2); 
        const bRing = new THREE.Mesh(brGeo, matParkerized); bRing.position.set(0, bY, 0); addMesh(bRing, clampGroup);
        const trGeo = new THREE.CylinderGeometry(tRad + cThick, tRad + cThick, cWidth, 16); trGeo.rotateX(Math.PI / 2);
        const tRing = new THREE.Mesh(trGeo, matParkerized); tRing.position.set(0, tY, 0); addMesh(tRing, clampGroup);
        const blkH = (bY - tY);
        const blkGeo = new THREE.BoxGeometry(12*mm, blkH, cWidth - 4*mm); 
        const block = new THREE.Mesh(blkGeo, matParkerized); block.position.set(0, (bY+tY)/2, 0); addMesh(block, clampGroup);
        
        // --- UNDERBARREL RAIL ---
        const ubRailLen = 45 * mm; const ubRailW = 21 * mm; const ubRailH = 6 * mm; 
        const railCenterY = tY - tRad - cThick - (ubRailH/2);
        const railBottomFaceY = railCenterY - (ubRailH/2);
        const ubBase = new THREE.Mesh(new THREE.BoxGeometry(ubRailW, ubRailH, ubRailLen), matParkerized);
        ubBase.position.set(0, railCenterY, 0); addMesh(ubBase, clampGroup);
        const ubRidgeCount = 5; const ubRidgeGap = 5 * mm; const ubRidgeW = 5 * mm;
        const ubTotalSpan = (ubRidgeCount * ubRidgeW) + ((ubRidgeCount-1)*ubRidgeGap);
        const ubStartZ = -(ubTotalSpan/2) + (ubRidgeW/2);
        const ubRidgeGeo = new THREE.BoxGeometry(ubRailW, 2*mm, ubRidgeW);
        for(let i=0; i<ubRidgeCount; i++) {
            const r = new THREE.Mesh(ubRidgeGeo, matParkerized);
            r.position.set(0, railCenterY - (ubRailH/2) - 1*mm, ubStartZ + (i*(ubRidgeW+ubRidgeGap)));
            addMesh(r, clampGroup);
        }
        
        // ATTACHMENT
        let ubAtt = null; let attachType = null;
        if (atts.includes('shotgun_flash')) { ubAtt = CommonParts.buildFlashlight().mesh; attachType = 'flash'; }
        else if (atts.includes('shotgun_laser')) { ubAtt = CommonParts.buildGreenLaser().mesh; attachType = 'laser'; }
        
        if (ubAtt) {
            let finalMountY = 0;
            if (attachType === 'flash') {
                finalMountY = railBottomFaceY - 17.5*mm; ubAtt.rotation.z = -Math.PI / 2;
                const lens = ubAtt.children.find(c => c.name === "ATTACHMENT_FLASHLIGHT_LENS");
                if (!lens) ubAtt.children.forEach(c => { if(c.geometry && c.geometry.type === 'CircleGeometry') c.name = "ATTACHMENT_FLASHLIGHT_LENS"; });
            } else if (attachType === 'laser') {
                finalMountY = railBottomFaceY - 21*mm; ubAtt.rotation.z = Math.PI / 2;
                const emit = ubAtt.children.find(c => c.name === "ATTACHMENT_LASER_EMITTER");
                if (!emit) ubAtt.children.forEach(c => { if(c.geometry && c.geometry.type === 'CircleGeometry') c.name = "ATTACHMENT_LASER_EMITTER"; });
            }
            ubAtt.position.set(0, finalMountY, 0); addMesh(ubAtt, clampGroup);
        }

        const magCap = new THREE.Mesh(new THREE.CylinderGeometry(13*mm, 13*mm, 15*mm, 16).rotateX(Math.PI/2), matBolt);
        magCap.position.set(0, tY, ringZ - 12*mm); addMesh(magCap, group);

        // --- 5. FOREND / PUMP ---
        const pumpGroup = new THREE.Group();
        pumpGroup.position.set(0, 0, -0.15); 
        group.add(pumpGroup);
        const pLen = 210 * mm; const pRad = 25 * mm; const tubeCenterY = -14 * mm;
        const topRectW = 19 * mm; const topRectY = 2 * mm; const cutY = -2 * mm;     
        const dx = Math.sqrt(pRad*pRad - (cutY - tubeCenterY)*(cutY - tubeCenterY));
        const startAng = Math.atan2(cutY - tubeCenterY, dx); 
        const pShape = new THREE.Shape();
        pShape.moveTo(topRectW, topRectY); pShape.lineTo(-topRectW, topRectY); pShape.lineTo(-topRectW, cutY); pShape.lineTo(-dx, cutY);
        pShape.absarc(0, tubeCenterY, pRad, Math.PI - startAng, 2*Math.PI + startAng, false);
        pShape.lineTo(topRectW, cutY); pShape.lineTo(topRectW, topRectY);
        const pumpGeom = new THREE.ExtrudeGeometry(pShape, { steps: 1, depth: pLen, bevelEnabled: true, bevelSize: 1*mm, bevelThickness: 1*mm });
        pumpGeom.translate(0, 0, -pLen/2);
        const pump = new THREE.Mesh(pumpGeom, matPolymer); addMesh(pump, pumpGroup);
        
        const wingThick = 5 * mm; const wingH = 8 * mm; const wingLen = pLen;
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, wingH); wingShape.lineTo(wingLen * 0.66, wingH); wingShape.lineTo(wingLen, 0); wingShape.lineTo(0, 0); wingShape.lineTo(0, wingH);
        const wingGeom = new THREE.ExtrudeGeometry(wingShape, { steps: 1, depth: wingThick, bevelEnabled: true, bevelSize: 0.5*mm, bevelThickness: 0.5*mm });
        wingGeom.rotateY(-Math.PI / 2); wingGeom.translate(0, topRectY, -wingLen/2); 
        const wR = new THREE.Mesh(wingGeom, matPolymer); wR.position.set(topRectW, 0, 0); addMesh(wR, pumpGroup);
        const wL = wR.clone(); wL.scale.set(-1, 1, 1); wL.position.set(-topRectW, 0, 0); addMesh(wL, pumpGroup);

        const ribTube = 2 * mm; const ribRad = pRad + ribTube; const ribArc = Math.PI + 2 * startAng; 
        const ribGeo = new THREE.TorusGeometry(ribRad, ribTube, 6, 20, ribArc);
        for(let i=0; i<10; i++) {
            const r = new THREE.Mesh(ribGeo, matPolymer); r.rotation.z = (1.5 * Math.PI) - (ribArc / 2); r.position.set(0, tubeCenterY, -pLen/2 + (i * 18*mm) + 20*mm); addMesh(r, pumpGroup);
        }
        const barGeo = new THREE.BoxGeometry(4*mm, 8*mm, 200*mm);
        const barL = new THREE.Mesh(barGeo, matBolt); barL.position.set(-16*mm, -5*mm, 80*mm); pumpGroup.add(barL);
        const barR = new THREE.Mesh(barGeo, matBolt); barR.position.set(16*mm, -5*mm, 80*mm); pumpGroup.add(barR);

        // --- 6. TRIGGER GROUP ---
        const tgGroup = new THREE.Group();
        const tgLocalX = recLen - 45*mm; const tgLocalY = -32*mm; 
        tgGroup.position.set(tgLocalX, tgLocalY, 0); receiver.add(tgGroup);
        const plateGeo = new THREE.BoxGeometry(75*mm, 6*mm, 22*mm);
        const plate = new THREE.Mesh(plateGeo, matPolymer); plate.position.y = -3*mm; addMesh(plate, tgGroup);
        const guardShape = new THREE.Shape();
        guardShape.moveTo(15*mm, 0); guardShape.bezierCurveTo(22*mm, -5*mm, 25*mm, -10*mm, 25*mm, -15*mm);
        guardShape.lineTo(10*mm, -28*mm); guardShape.lineTo(-15*mm, -28*mm);
        guardShape.bezierCurveTo(-25*mm, -20*mm, -28*mm, -10*mm, -30*mm, 0); guardShape.lineTo(15*mm, 0); 
        const holePath = new THREE.Path();
        holePath.moveTo(12*mm, -5*mm); holePath.quadraticCurveTo(18*mm, -15*mm, 10*mm, -22*mm); holePath.lineTo(-15*mm, -22*mm); holePath.quadraticCurveTo(-22*mm, -15*mm, -20*mm, -5*mm); holePath.lineTo(12*mm, -5*mm);
        guardShape.holes.push(holePath);
        const guardGeo = new THREE.ExtrudeGeometry(guardShape, { depth: 16*mm, bevelEnabled: true, bevelThickness: 1*mm, bevelSize: 1*mm, bevelSegments: 3 });
        guardGeo.translate(0, 0, -8*mm); const guardMesh = new THREE.Mesh(guardGeo, matPolymer); guardMesh.position.y = -3*mm; addMesh(guardMesh, tgGroup);
        const trigShape = new THREE.Shape(); trigShape.moveTo(0, 0); trigShape.bezierCurveTo(5*mm, -5*mm, 2*mm, -15*mm, -5*mm, -15*mm); trigShape.lineTo(-8*mm, -15*mm); trigShape.bezierCurveTo(-2*mm, -10*mm, 0*mm, -5*mm, -3*mm, 0); trigShape.lineTo(0,0);
        const trigGeo = new THREE.ExtrudeGeometry(trigShape, { depth: 6*mm, bevelEnabled: false }); trigGeo.translate(0,0,-3*mm); const trigMesh = new THREE.Mesh(trigGeo, matBolt); trigMesh.position.set(-2*mm, -10*mm, 0); addMesh(trigMesh, tgGroup);
        const safeGeo = new THREE.CylinderGeometry(4*mm, 4*mm, 24*mm, 16); safeGeo.rotateX(Math.PI/2); const safety = new THREE.Mesh(safeGeo, matBolt); safety.position.set(18*mm, -10*mm, 0); addMesh(safety, tgGroup);

        // --- 7. FRONT SIGHT ---
        if (!hasOptic) {
            const fsGroup = new THREE.Group();
            fsGroup.position.set(0, bY + bRad, -bLen + 15*mm); group.add(fsGroup);
            const fsBase = new THREE.Mesh(new THREE.BoxGeometry(6*mm, 3*mm, 12*mm), matParkerized); fsBase.position.y = 1.5*mm; addMesh(fsBase, fsGroup);
            const bead = new THREE.Mesh(new THREE.SphereGeometry(1.5*mm), matGreenSight); bead.position.y = 3.0*mm; addMesh(bead, fsGroup);
        } else {
            const bead = new THREE.Mesh(new THREE.SphereGeometry(2*mm), matGold); bead.position.set(0, bY + bRad, -bLen + 10*mm); group.add(bead);
        }

        // --- FLASH HIDER ---
        let muzzleZ = -bLen - 0.02;
        if (hasFlashHider && CommonParts) {
            const fh = CommonParts.buildFlashHider().mesh;
            // Pos: Moved closer to +Z.
            fh.position.set(0, bY, muzzleZ + 0.015); 
            fh.scale.set(1.5, 1.5, 1.5); 
            addMesh(fh, group);
            muzzleZ -= 0.04;
        }

        // --- 8. RIGGING & HAND SHELL ---
        const muzzlePoint = new THREE.Object3D(); muzzlePoint.position.set(0, bY, muzzleZ); group.add(muzzlePoint);
        const ejectionPoint = new THREE.Object3D(); 
        ejectionPoint.position.set(0.04, 0.01, 0.02); 
        ejectionPoint.rotation.set(0, 0.5, 0); 
        group.add(ejectionPoint);
        
        const handR = new THREE.Object3D(); handR.position.set(0, -0.06, 0.22); handR.rotation.x = -0.3; group.add(handR);
        const handL = new THREE.Object3D(); handL.position.set(0, -30*mm, 0); pumpGroup.add(handL);

        // --- PHYSICAL SHELL FOR RELOAD ---
        const shellGroup = new THREE.Group();
        shellGroup.visible = false; 
        shellGroup.name = "RELOAD_SHELL"; 
        
        const shBody = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.055, 8).rotateX(Math.PI/2), matShellRed);
        shBody.castShadow = true; shellGroup.add(shBody);
        
        const shHead = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.015, 8).rotateX(Math.PI/2), matShellBrass);
        shHead.position.z = 0.035; shBody.position.z = 0; 
        shHead.castShadow = true; shellGroup.add(shHead);
        
        shellGroup.rotation.y = Math.PI / 2; 
        shellGroup.position.set(0, 0.02, 0); 
        
        handL.add(shellGroup);

        group.position.z = -0.20;

        return {
            mesh: group,
            parts: {
                muzzle: muzzlePoint,
                ejection: ejectionPoint,
                handRight: handR,
                handLeft: handL,
                slide: pumpGroup,
                magazine: null,
                bolt: bolt,
                shell: shellGroup
            }
        };
    };
})();
