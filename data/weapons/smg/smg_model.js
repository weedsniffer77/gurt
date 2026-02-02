
// js/data/weapons/smg/smg_model.js
(function() {
    const weaponDef = window.TacticalShooter.GameData.Weapons["SMG"];
    if (!weaponDef) return;

    weaponDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        const group = new THREE.Group();
        group.userData.bulletTransparent = true;
        
        const CommonParts = window.TacticalShooter.CommonParts;
        
        const atts = this.attachments || [];
        const hasLightStock = atts.includes('smg_stock_light');
        const hasFixedStock = atts.includes('smg_stock_fixed');
        const hasTriRail = atts.includes('smg_hg_rail');
        const isPDW = atts.includes('smg_conversion_pdw');
        const hasFlashHider = atts.includes('att_flashhider');
        
        // Helper to add mesh and set transparent
        const addMesh = (mesh, parent = group) => {
            mesh.userData.bulletTransparent = true;
            if (mesh.castShadow === undefined) mesh.castShadow = true;
            parent.add(mesh);
            return mesh;
        };

        // --- MATERIALS ---
        const matMetalDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.6 });
        const matPolymer = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 });
        const matGrip = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9, metalness: 0.0 });
        const matSteel = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 });
        const matMag = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.5 });
        const matSight = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.3 });

        // --- RECEIVER (COMMON) ---
        const upperRad = 0.015; 
        const upperY = 0.045;
        const upperTop = upperY + upperRad; 
        const upperLen = 0.22; 
        
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(upperRad, upperRad, upperLen, 16).rotateX(Math.PI/2), matMetalDark);
        upper.position.set(0, upperY, -0.02); 
        addMesh(upper);
        
        const port = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.012), new THREE.MeshBasicMaterial({color:0x000000}));
        port.position.set(0.014, upperY, -0.02); port.rotation.y = Math.PI/2;
        addMesh(port);

        const wellW = 0.026; 
        const wellGeo = new THREE.BoxGeometry(wellW, 0.05, 0.045);
        const well = new THREE.Mesh(wellGeo, matMetalDark);
        well.position.set(0, 0.015, -0.08); 
        addMesh(well);

        const lowerH = 0.055; 
        const lowerY = 0.015 - (0.055 - 0.04)/2; 
        const lowerGeo = new THREE.BoxGeometry(wellW - 0.002, lowerH, 0.11);
        const lower = new THREE.Mesh(lowerGeo, matPolymer);
        lower.position.set(0, lowerY, -0.005); 
        addMesh(lower);
        
        const gripGeo = new THREE.BoxGeometry(0.028, 0.13, 0.045); 
        const grip = new THREE.Mesh(gripGeo, matGrip);
        grip.rotation.x = -0.25; 
        grip.position.set(0, -0.06, 0.05); 
        addMesh(grip);
        
        const blendShape = new THREE.Shape();
        blendShape.moveTo(0.05, 0.015); 
        blendShape.lineTo(0.08, 0.015); 
        blendShape.quadraticCurveTo(0.062, -0.005, 0.06, -0.04);
        blendShape.lineTo(0.05, -0.02);
        blendShape.lineTo(0.05, 0.015); 
        
        const blendThick = 0.026;
        const blendGeo = new THREE.ExtrudeGeometry(blendShape, { steps: 2, depth: blendThick, bevelEnabled: false });
        blendGeo.translate(0, 0, -blendThick/2); 
        const blend = new THREE.Mesh(blendGeo, matPolymer);
        blend.rotation.y = -Math.PI/2; 
        blend.position.set(0, 0, 0); 
        addMesh(blend);

        const filler = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.02, 0.04), matPolymer);
        filler.position.set(0, 0.025, 0.06); 
        addMesh(filler);

        // Trigger & Guard
        const pathPoints = [ new THREE.Vector3(0, -0.02, -0.055), new THREE.Vector3(0, -0.055, -0.04), new THREE.Vector3(0, -0.055, 0.0), new THREE.Vector3(0, -0.03, 0.035) ];
        const curvePath = new THREE.CatmullRomCurve3(pathPoints);
        const guardGeo = new THREE.TubeGeometry(curvePath, 12, 0.0025, 4, false);
        const guardMesh = new THREE.Mesh(guardGeo, matPolymer);
        guardMesh.scale.set(1.0, 1.0, 1.0);
        addMesh(guardMesh);

        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.025, 0.008), matSteel);
        trigger.position.set(0, -0.028, -0.01); trigger.rotation.x = 0.4; addMesh(trigger);

        const sel = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.035, 8).rotateZ(Math.PI/2), matPolymer);
        sel.position.set(0, 0.01, 0.03); addMesh(sel);
        const selLever = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.008, 0.02), matPolymer);
        selLever.position.set(-0.02, 0.01, 0.025); selLever.rotation.x = 0.3; addMesh(selLever);

        // --- FRONT END CONFIGURATION ---
        
        let barrelLen = 0.27; 
        let hgLen = 0.18;      
        let hgZ = -0.20;       
        let fsZ = -0.29;       
        
        if (isPDW) {
            barrelLen = 0.125; 
            hgLen = 0.12;
            hgZ = -0.16;       
            fsZ = -0.22;       
        }

        // Cocking Tube
        const tubeStart = -0.02;
        const ctLen = Math.abs(fsZ - tubeStart);
        const ctZ = (tubeStart + fsZ) / 2;
        
        const cockingRad = 0.010;
        const cockingY = upperTop - cockingRad; 
        
        const cockingTube = new THREE.Mesh(new THREE.CylinderGeometry(cockingRad, cockingRad, ctLen, 12).rotateX(Math.PI/2), matMetalDark);
        cockingTube.position.set(0, cockingY, ctZ); 
        addMesh(cockingTube);
        
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(cockingRad, cockingRad, 0.005, 12).rotateX(Math.PI/2), matMetalDark);
        cap.position.set(0, cockingY, fsZ - 0.0025);
        addMesh(cap);
        
        const trunnion = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.03, 0.04), matMetalDark);
        trunnion.position.set(0, 0.04, -0.11); 
        addMesh(trunnion);

        // Barrel Tip
        const barrelY = 0.016; 
        const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.05).rotateX(Math.PI/2), matSteel);
        barrelTip.position.set(0, barrelY, fsZ - 0.04); 
        addMesh(barrelTip);
        
        // --- FLASH HIDER ---
        if (hasFlashHider && CommonParts) {
            const fh = CommonParts.buildFlashHider().mesh;
            fh.position.set(0, barrelY, fsZ - 0.065); 
            // Default size works well for SMG (approx 20mm diam)
            addMesh(fh);
        }
        
        // --- CHARGING HANDLE LOGIC ---
        const slotZ = hgZ;
        const slotLen = 0.05; 
        const handleRestZ = slotZ - (slotLen / 2) + 0.005;

        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, slotLen), new THREE.MeshBasicMaterial({color:0x000000}));
        slot.position.set(-0.009, cockingY, slotZ); 
        addMesh(slot);
        
        const handlePivot = new THREE.Group();
        handlePivot.position.set(0, cockingY, handleRestZ); 
        handlePivot.userData.baseZ = handleRestZ; 
        addMesh(handlePivot);
        
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.025).rotateZ(Math.PI/2), matPolymer);
        knob.position.set(-0.015, 0.0, 0); 
        knob.rotation.z = -0.2; 
        addMesh(knob, handlePivot);

        // --- HANDGUARD SYSTEM ---
        
        if (isPDW) {
            const hgRadius = 0.019; 
            const hgY = 0.024;      
            
            const pdwGeo = new THREE.CylinderGeometry(hgRadius, hgRadius, hgLen, 12);
            pdwGeo.rotateX(Math.PI/2);
            const pdwHg = new THREE.Mesh(pdwGeo, matPolymer);
            pdwHg.position.set(0, hgY, hgZ); 
            addMesh(pdwHg);
            
            const bridgeHeight = (cockingY - hgY);
            const bridgeGeo = new THREE.BoxGeometry(0.018, bridgeHeight, hgLen - 0.01);
            const bridge = new THREE.Mesh(bridgeGeo, matPolymer);
            bridge.position.set(0, hgY + (bridgeHeight/2), hgZ);
            addMesh(bridge);
            
            const lipLen = 0.035;
            const lipGeo = new THREE.CylinderGeometry(hgRadius, hgRadius, lipLen, 12, 1, false, 0, Math.PI);
            lipGeo.rotateX(Math.PI/2);
            const lip = new THREE.Mesh(lipGeo, matPolymer);
            lip.position.set(0, hgY, fsZ); 
            addMesh(lip);
            
            const knobH = 0.025;
            const knobW = 0.012;
            const knobD = 0.015;
            const knobGeo = new THREE.BoxGeometry(knobW, knobH, knobD);
            const handstop = new THREE.Mesh(knobGeo, matPolymer);
            handstop.position.set(0, hgY - hgRadius - knobH/2 + 0.003, fsZ - 0.005); 
            addMesh(handstop);
        }
        else if (hasTriRail) {
            const railBaseW = 0.032; 
            const railBaseH = 0.038; 
            
            const railBaseGeo = new THREE.BoxGeometry(railBaseW, railBaseH, hgLen);
            const railBase = new THREE.Mesh(railBaseGeo, matMetalDark);
            railBase.position.set(0, 0.016, hgZ);
            addMesh(railBase);
            
            const ventGeo = new THREE.BoxGeometry(railBaseW + 0.001, 0.008, 0.005);
            for(let i=0; i<3; i++) {
                const v = new THREE.Mesh(ventGeo, matSteel);
                v.position.set(0, 0.01, -hgLen/2 + (hgLen/3)*i + 0.02);
                addMesh(v, railBase);
            }
            
            const railGeoSide = new THREE.BoxGeometry(0.004, 0.012, hgLen - 0.02);
            const railGeoBot = new THREE.BoxGeometry(0.012, 0.004, hgLen - 0.02);
            
            const rOffset = (railBaseW / 2) + 0.002;
            const bOffset = -(railBaseH / 2) - 0.002;
            
            const rLeft = new THREE.Mesh(railGeoSide, matMetalDark); rLeft.position.set(-rOffset, 0, 0); addMesh(rLeft, railBase);
            const rRight = new THREE.Mesh(railGeoSide, matMetalDark); rRight.position.set(rOffset, 0, 0); addMesh(rRight, railBase);
            const rBot = new THREE.Mesh(railGeoBot, matMetalDark); rBot.position.set(0, bOffset, 0); addMesh(rBot, railBase);
            
            const mountAtt = (type, side, parentRail) => {
                let obj = null;
                let isLaser = false;
                if (type.includes('flash')) { obj = CommonParts.buildFlashlight().mesh; }
                else if (type.includes('laser')) { obj = CommonParts.buildGreenLaser().mesh; isLaser = true; }
                
                if (obj) {
                    obj.userData.bulletTransparent = true;
                    obj.traverse(c => { c.userData.bulletTransparent = true; });
                    const mountOffsetSide = 0.020; 
                    const mountOffsetBot = 0.023;
                    
                    if (side === 'left') {
                        obj.position.set(-mountOffsetSide, 0, 0); 
                        if (isLaser) obj.rotation.z = 0; else obj.rotation.z = Math.PI;
                    } else if (side === 'right') {
                        obj.position.set(mountOffsetSide, 0, 0);
                        if (isLaser) obj.rotation.z = Math.PI; else obj.rotation.z = 0;
                    } else if (side === 'bottom') {
                        obj.position.set(0, -mountOffsetBot, 0);
                        if (isLaser) obj.rotation.z = Math.PI / 2; else obj.rotation.z = -Math.PI / 2;
                    }
                    
                    if (type.includes('flash')) obj.children.find(c => c.name === "ATTACHMENT_FLASHLIGHT_LENS").name = "ATTACHMENT_FLASHLIGHT_LENS";
                    if (type.includes('laser')) obj.children.find(c => c.name === "ATTACHMENT_LASER_EMITTER").name = "ATTACHMENT_LASER_EMITTER";
                    parentRail.add(obj);
                }
            };

            if (atts.includes('att_flash_l')) mountAtt('flash', 'left', rLeft);
            if (atts.includes('att_laser_l')) mountAtt('laser', 'left', rLeft);
            if (atts.includes('att_flash_r')) mountAtt('flash', 'right', rRight);
            if (atts.includes('att_laser_r')) mountAtt('laser', 'right', rRight);
            if (atts.includes('att_flash_b')) mountAtt('flash', 'bottom', rBot);
            if (atts.includes('att_laser_b')) mountAtt('laser', 'bottom', rBot);
        }
        else {
            const hgRadius = 0.026; 
            const hgGeo = new THREE.CylinderGeometry(hgRadius, hgRadius, hgLen, 12);
            hgGeo.rotateX(Math.PI/2);
            
            const pos = hgGeo.attributes.position;
            const topY = 0.044; 
            const backBotY = -0.028; 
            const frontBotY = 0.002; 
            
            for(let i=0; i<pos.count; i++){
                const y = pos.getY(i);
                const z = pos.getZ(i);
                const alpha = 1.0 - ((z + hgLen/2) / hgLen);
                const currentBotY = backBotY + (frontBotY - backBotY) * alpha;
                const ny = (y + hgRadius) / (hgRadius * 2); 
                const finalY = currentBotY + (topY - currentBotY) * ny;
                pos.setY(i, finalY);
            }
            hgGeo.computeVertexNormals();
            
            const hg = new THREE.Mesh(hgGeo, matPolymer);
            hg.position.set(0, 0, hgZ); 
            addMesh(hg);
        }
        
        // --- IRON SIGHTS ---
        const rsGroup = new THREE.Group();
        rsGroup.position.set(0, 0.060, 0.04);
        addMesh(rsGroup);
        const rsBase = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.024), matMetalDark);
        addMesh(rsBase, rsGroup);
        const rsRing = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.002, 8, 16), matSight);
        rsRing.position.set(0, 0.015, 0);
        addMesh(rsRing, rsGroup);
        
        const fsGroup = new THREE.Group();
        fsGroup.position.set(0, 0.045, fsZ); 
        addMesh(fsGroup);
        
        const fsBlockGroup = new THREE.Group();
        addMesh(fsBlockGroup, fsGroup);
        
        const fsUpper = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.02, 0.02), matMetalDark);
        fsUpper.position.y = 0.01;
        addMesh(fsUpper, fsBlockGroup);
        
        const fsRing = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.02, 16).rotateX(Math.PI/2), matMetalDark);
        fsRing.position.y = -0.029; 
        addMesh(fsRing, fsBlockGroup);
        
        const fsConn = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.018), matMetalDark);
        fsConn.position.y = -0.015; 
        addMesh(fsConn, fsBlockGroup);

        const hoodGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.01, 16, 1, true);
        hoodGeo.rotateX(Math.PI/2); 
        const hood = new THREE.Mesh(hoodGeo, matSight);
        hood.material.side = THREE.DoubleSide; 
        hood.position.y = 0.035; 
        addMesh(hood, fsGroup);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.014, 0.002), matSight);
        post.position.y = 0.029; 
        addMesh(post, fsGroup);

        // --- MAGAZINE ---
        const magGroup = new THREE.Group();
        magGroup.position.set(0, 0.01, -0.08); 
        addMesh(magGroup);
        
        const isExtended = atts.includes('smg_mag_ext');
        const magShape = new THREE.Shape();
        const magW = 0.022;
        const magD = 0.038;
        magShape.moveTo(-magW/2, -magD/2);
        magShape.lineTo(magW/2, -magD/2);
        magShape.lineTo(magW/2, magD/2);
        magShape.lineTo(-magW/2, magD/2);
        
        const magLen = isExtended ? 0.25 : 0.18;
        const forwardAmt = 0.05; 
        
        const magPath = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, -magLen * 0.5, 0), 
            new THREE.Vector3(0, -magLen, -forwardAmt) 
        );
        
        const magGeoExt = new THREE.ExtrudeGeometry(magShape, {
            extrudePath: magPath,
            steps: 8,
            bevelEnabled: false
        });
        const magMesh = new THREE.Mesh(magGeoExt, matMag);
        addMesh(magMesh, magGroup);

        // --- STOCK OPTIONS ---
        const stockGroup = new THREE.Group();
        stockGroup.position.set(0, 0.0375, 0.09); 
        addMesh(stockGroup);
        
        const endCap = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.045, 0.02), matMetalDark);
        addMesh(endCap, stockGroup);
        
        if (hasLightStock) {
            const railLen = 0.15; 
            const railGeo = new THREE.CylinderGeometry(0.004, 0.004, railLen).rotateX(Math.PI/2);
            const rL = new THREE.Mesh(railGeo, matMetalDark); rL.position.set(-0.015, 0, railLen/2 + 0.01); addMesh(rL, stockGroup);
            const rR = new THREE.Mesh(railGeo, matMetalDark); rR.position.set(0.015, 0, railLen/2 + 0.01); addMesh(rR, stockGroup);
            const butt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.02), matPolymer);
            butt.position.set(0, -0.02, railLen + 0.02);
            addMesh(butt, stockGroup);
        } 
        else if (hasFixedStock) {
            const sLen = 0.19; 
            const shape = new THREE.Shape();
            shape.moveTo(0, 0.0225); 
            shape.lineTo(sLen * 0.4, 0.005); 
            shape.lineTo(sLen, 0.005); 
            shape.lineTo(sLen, -0.09); 
            shape.lineTo(0, -0.0225); 
            shape.lineTo(0, 0.0225); 
            
            const stockThick = 0.03; 
            const sGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: stockThick, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002 });
            sGeo.translate(0, 0, -stockThick/2); 
            const stockMesh = new THREE.Mesh(sGeo, matPolymer);
            stockMesh.rotation.y = -Math.PI / 2;
            stockMesh.position.set(0, 0, 0); 
            addMesh(stockMesh, stockGroup);
            
            const pad = new THREE.Mesh(new THREE.BoxGeometry(stockThick+0.002, 0.10, 0.02), matGrip);
            pad.position.set(0, -0.04, sLen);
            addMesh(pad, stockGroup);
        } 
        else {
            const loop = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.002, 8, 16), matSteel);
            loop.position.set(0, 0, 0.015);
            addMesh(loop, stockGroup);
        }

        // --- OPTICS ---
        if (atts.includes('optic_reddot') || atts.includes('optic_holo')) {
            const railBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.008, 0.12), matMetalDark);
            railBase.position.set(0, 0.065, -0.05); 
            addMesh(railBase);
            
            const clawGeo = new THREE.BoxGeometry(0.026, 0.015, 0.02);
            const c1 = new THREE.Mesh(clawGeo, matMetalDark); c1.position.set(0, 0.055, -0.02); addMesh(c1);
            const c2 = new THREE.Mesh(clawGeo, matMetalDark); c2.position.set(0, 0.055, -0.08); addMesh(c2);
            
            const sightZ = -0.05;
            let sight = null;
            if (atts.includes('optic_reddot')) sight = CommonParts.buildRedDot();
            else sight = CommonParts.buildHolo();
            
            if(sight) {
                sight.mesh.position.set(0, 0.069, sightZ); 
                sight.mesh.userData.bulletTransparent = true; // Ensure sight is transparent
                sight.mesh.traverse(c => c.userData.bulletTransparent = true);
                addMesh(sight.mesh);
            }
        }

        // --- RIGGING ---
        const muzzlePoint = new THREE.Object3D();
        let muzzleZ = fsZ - 0.06;
        if (hasFlashHider) muzzleZ -= 0.04; // Move emission point to end of flash hider

        muzzlePoint.position.set(0, barrelY, muzzleZ); 
        group.add(muzzlePoint);
        const ejectionPoint = new THREE.Object3D();
        ejectionPoint.position.set(0.02, 0.045, -0.02); 
        group.add(ejectionPoint);
        const handR = new THREE.Object3D();
        handR.position.set(0, -0.08, 0.05); 
        group.add(handR);
        const handL = new THREE.Object3D();
        
        let handX = 0.04; 
        let handY = 0; 
        let handZ = -0.32; 
        
        if (isPDW) {
            handY = -0.06;
            handZ = -0.18; 
        } else {
            handZ = -0.25; 
        }
        
        handL.position.set(handX, handY, handZ);
        handL.userData.restPos = handL.position.clone();
        
        group.add(handL);

        group.scale.set(1.2, 1.2, 1.2);
        
        // Final traversal to ensure EVERYTHING is transparent to bullets
        group.traverse(child => { child.userData.bulletTransparent = true; });

        return {
            mesh: group,
            parts: {
                muzzle: muzzlePoint,
                ejection: ejectionPoint,
                handRight: handR,
                handLeft: handL,
                magazine: magGroup,
                slide: handlePivot 
            }
        };
    };
})();
