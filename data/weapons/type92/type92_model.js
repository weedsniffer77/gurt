
// js/data/weapons/type92/type92_model.js
(function() {
    const weaponDef = window.TacticalShooter.GameData.Weapons["TYPE92"];
    if (!weaponDef) return;

    weaponDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        const group = new THREE.Group();
        group.userData.bulletTransparent = true;
        
        const CommonParts = window.TacticalShooter.CommonParts;
        const atts = this.attachments || [];
        const hasSuppressor = atts.includes('type92_suppressor');
        const hasFlashHider = atts.includes('att_flashhider') && !hasSuppressor;
        
        // --- MATERIALS ---
        const matSteel = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.4, metalness: 0.7 });
        const matPolymer = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.8, metalness: 0.1 });
        const matGrip = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0.0, bumpScale: 0.02 });
        const matBarrel = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.9 });
        const matGlow = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 3.0 });
        const matChamber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
        const matSafety = new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.5 });
        const matChrome = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2, metalness: 1.0 });
        const matRed = new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.4, metalness: 0.6 });
        const matMatte = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9, metalness: 0.1 });
        
        const matSteelDouble = matSteel.clone();
        matSteelDouble.side = THREE.DoubleSide;

        const addMesh = (mesh, parent = group) => {
            mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.bulletTransparent = true;
            parent.add(mesh);
        };

        // --- FRAME (Shortened Back) ---
        const frameW = 0.029;
        const frameH = 0.022;
        // Reduced length to stop peeking out back of grip
        const frameL = 0.17; 
        
        // Main Frame Block
        const frameGeo = new THREE.BoxGeometry(frameW, frameH, frameL);
        const frame = new THREE.Mesh(frameGeo, matPolymer);
        // Position shifted to keep front alignment but pull back in
        frame.position.set(0, -0.011, -0.035); 
        addMesh(frame);
        
        // Dust Cover (Tapered front)
        const dustGeo = new THREE.BoxGeometry(frameW * 0.9, frameH * 0.8, 0.04);
        const dust = new THREE.Mesh(dustGeo, matPolymer);
        dust.position.set(0, 0, -frameL/2 - 0.02);
        frame.add(dust);

        // --- TRIGGER GUARD (Updated: Less tall, longer forward) ---
        const guardShape = new THREE.Shape();
        
        const gLen = 0.075; // Increased length (was 0.065)
        const gHeight = 0.032; // Reduced height (was 0.04)
        const gThick = 0.005; 
        
        // Outer Rectangle
        guardShape.moveTo(0, 0); 
        guardShape.lineTo(0, -gHeight);
        guardShape.lineTo(gLen, -gHeight);
        guardShape.lineTo(gLen, -0.01); 
        guardShape.lineTo(gLen - gThick, -0.01);
        
        // Inner Cutout
        guardShape.lineTo(gLen - gThick, -gHeight + gThick);
        guardShape.lineTo(gThick, -gHeight + gThick);
        guardShape.lineTo(gThick, 0);
        guardShape.lineTo(0, 0);
        
        const guardExtrude = new THREE.ExtrudeGeometry(guardShape, {
            depth: 0.014, 
            bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1
        });
        
        // Center Extrusion
        guardExtrude.translate(0, 0, -0.007);
        
        const guard = new THREE.Mesh(guardExtrude, matPolymer);
        guard.rotation.y = -Math.PI / 2; 
        // Position: Start at front of trigger area, extend back to grip
        guard.position.set(0, -0.022, -0.045); 
        addMesh(guard);

        // --- GRIP & THUMB GUARD ---
        const gripGroup = new THREE.Group();
        gripGroup.position.set(0, -0.025, 0.035); 
        gripGroup.rotation.x = -0.10; 
        addMesh(gripGroup);
        
        const gripShapeDef = new THREE.Shape();
        gripShapeDef.moveTo(-0.02, 0);       
        gripShapeDef.lineTo(-0.02, -0.10);   
        gripShapeDef.lineTo(0.035, -0.10);   
        gripShapeDef.quadraticCurveTo(0.045, -0.05, 0.035, 0); 
        gripShapeDef.quadraticCurveTo(0.055, 0.02, 0.06, 0.03); 
        gripShapeDef.lineTo(-0.02, 0.03);    
        
        const gripExtrude = new THREE.ExtrudeGeometry(gripShapeDef, {
            depth: 0.032, 
            bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 3
        });
        gripExtrude.center(); 
        
        const gripMesh = new THREE.Mesh(gripExtrude, matGrip);
        gripMesh.rotation.y = -Math.PI / 2;
        gripMesh.position.set(0, -0.04, 0.01);
        addMesh(gripMesh, gripGroup);
        
        // Grip Button (Mag Release / Rivet)
        // Increased length (0.045) to fix Z-fighting, radius 0.008, 12 segments for roundness
        const starGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12);
        starGeo.rotateZ(Math.PI/2);
        const star = new THREE.Mesh(starGeo, matPolymer);
        // Moved forward (-0.012) and up (-0.028) to sit behind trigger guard bar
        star.position.set(0, -0.028, -0.012);
        addMesh(star, gripGroup);

        // Hammer
        const hammerGeo = new THREE.BoxGeometry(0.008, 0.015, 0.01);
        const hammerRing = new THREE.CylinderGeometry(0.008, 0.008, 0.008, 12);
        hammerRing.rotateZ(Math.PI/2);
        
        const hammer = new THREE.Group();
        const hamHead = new THREE.Mesh(hammerGeo, matSteel);
        hamHead.position.set(0, 0.01, 0.005);
        const hamBase = new THREE.Mesh(hammerRing, matSteel);
        hammer.add(hamHead);
        hammer.add(hamBase);
        
        hammer.position.set(0, 0.005, 0.08); 
        hammer.rotation.x = -0.6; 
        addMesh(hammer);

        // --- MAGAZINE (Moved Forward) ---
        const magGroup = new THREE.Group();
        // Shifted Z from 0.01 to -0.008 to fix jutting out back
        magGroup.position.set(0, -0.05, -0.008); 
        gripGroup.add(magGroup);
        
        const magGeo = new THREE.BoxGeometry(0.022, 0.12, 0.038);
        const magVis = new THREE.Mesh(magGeo, matSteel);
        addMesh(magVis, magGroup);
        const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.029, 0.008, 0.045), matPolymer);
        basePlate.position.y = -0.065;
        addMesh(basePlate, magGroup);

        // --- SLIDE ---
        const slideGroup = new THREE.Group();
        slideGroup.position.set(0, -0.001, -0.03); 
        
        const slideW = 0.028;
        const slideTopW = 0.022; 
        const slideH = 0.032; 
        const wingH = 0.006;     
        
        const slideShape = new THREE.Shape();
        slideShape.moveTo(-slideW/2, 0);
        slideShape.lineTo(-slideW/2, wingH);      
        slideShape.lineTo(-slideW/2 + 0.003, wingH + 0.003); 
        slideShape.lineTo(-slideTopW/2, slideH);  
        slideShape.lineTo(slideTopW/2, slideH);   
        slideShape.lineTo(slideW/2 - 0.003, wingH + 0.003); 
        slideShape.lineTo(slideW/2, wingH);       
        slideShape.lineTo(slideW/2, 0);           
        slideShape.lineTo(-slideW/2, 0);          
        
        const slideLen = 0.23;
        const slideGeo = new THREE.ExtrudeGeometry(slideShape, { depth: slideLen, bevelEnabled: false });
        slideGeo.translate(0, 0, -slideLen/2 - 0.025);
        
        const slideMesh = new THREE.Mesh(slideGeo, matSteel);
        addMesh(slideMesh, slideGroup);
        
        // Rear Slope (End Cap)
        const slopeLen = 0.02;
        const slopeGeo = new THREE.BufferGeometry();
        const w2 = slideW/2;
        const h2 = slideH;
        const vertices = new Float32Array([
            -w2, 0, 0,   -w2, h2, 0,   -w2, 0, slopeLen,
            w2, 0, 0,    w2, 0, slopeLen,  w2, h2, 0,
            -w2, h2, 0,  w2, h2, 0,    -w2, 0, slopeLen,
            w2, h2, 0,   w2, 0, slopeLen,  -w2, 0, slopeLen,
            -w2, 0, 0,   w2, 0, 0,     -w2, 0, slopeLen,
            w2, 0, 0,    w2, 0, slopeLen,  -w2, 0, slopeLen,
            -w2, 0, 0,   -w2, h2, 0,   w2, h2, 0,
            -w2, 0, 0,   w2, h2, 0,    w2, 0, 0
        ]);
        slopeGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        slopeGeo.computeVertexNormals();
        
        const endCap = new THREE.Mesh(slopeGeo, matSteelDouble);
        endCap.position.z = (slideLen/2) - 0.025; 
        addMesh(endCap, slideGroup);

        // Ejection Port
        const portGeo = new THREE.BoxGeometry(0.015, 0.01, 0.035);
        const portHole = new THREE.Mesh(portGeo, matChamber);
        portHole.position.set(0.01, 0.025, 0.0); 
        addMesh(portHole, slideGroup);
        
        // Safety Lever
        const safeGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.034, 8).rotateZ(Math.PI/2);
        const safety = new THREE.Mesh(safeGeo, matSteel);
        safety.position.set(0, 0.01, 0.07); 
        addMesh(safety, slideGroup);
        const safeDot = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, 0.002), matSafety);
        safeDot.position.set(-0.016, 0.015, 0.075);
        addMesh(safeDot, slideGroup);

        // Front Sight
        const fs = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.012), matSteel);
        fs.position.set(0, slideH, -slideLen/2 - 0.015);
        addMesh(fs, slideGroup);
        
        // Rear Sight
        const rs = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, 0.012), matSteel);
        rs.position.set(0, slideH, slideLen/2 - 0.04);
        addMesh(rs, slideGroup);
        
        // Glow Dots
        if (!atts.some(a => a.startsWith('optic_'))) {
            const dotMat = matGlow;
            const d1 = new THREE.Mesh(new THREE.PlaneGeometry(0.002, 0.002), dotMat); d1.position.set(-0.004, slideH+0.002, slideLen/2 - 0.034); addMesh(d1, slideGroup);
            const d2 = new THREE.Mesh(new THREE.PlaneGeometry(0.002, 0.002), dotMat); d2.position.set(0.004, slideH+0.002, slideLen/2 - 0.034); addMesh(d2, slideGroup);
            const d3 = new THREE.Mesh(new THREE.PlaneGeometry(0.002, 0.002), dotMat); d3.position.set(0, slideH+0.002, -slideLen/2 - 0.015); d3.rotation.y = Math.PI; addMesh(d3, slideGroup);
        }

        if (atts.includes('optic_reddot')) {
            const mount = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.05), matSteel);
            mount.position.set(0, slideH, 0.04);
            addMesh(mount, slideGroup);
            const sight = CommonParts.buildRedDot();
            sight.mesh.position.set(0, slideH + 0.002, 0.04);
            addMesh(sight.mesh, slideGroup);
        }

        addMesh(slideGroup, group);

        // --- BARREL (Extended to peek out) ---
        const bLen = 0.24; 
        const barrelY = 0.020; 
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, bLen, 12).rotateX(Math.PI/2), matBarrel);
        // Position Z moved forward (more negative)
        barrel.position.set(0, barrelY, -0.06); 
        addMesh(barrel);
        
        let muzzleZ = -0.18; // Peeks out
        const bore = new THREE.Mesh(new THREE.CircleGeometry(0.0065, 12), new THREE.MeshBasicMaterial({color: 0x000000}));
        bore.position.set(0, barrelY, muzzleZ);
        bore.rotation.y = Math.PI;
        addMesh(bore);
        
        // --- SUPPRESSOR (Scaled Up + Gap Fixed) ---
        if (hasSuppressor) {
            const supLen = 0.24; // Increased length by 20%
            const supRad = 0.0216; // Increased thickness by 20%
            
            // Outer tube
            const supGeo = new THREE.CylinderGeometry(supRad, supRad, supLen, 16);
            supGeo.rotateX(Math.PI/2);
            const suppressor = new THREE.Mesh(supGeo, matMatte);
            
            // Position: muzzleZ is tip of barrel. Center of suppressor is at Z.
            // Back of suppressor is at Z + supLen/2.
            // We want back of suppressor to slightly overlap barrel tip.
            // Barrel tip is at muzzleZ.
            // Back of suppressor = muzzleZ + 0.005.
            // Center = Back - supLen/2 = muzzleZ + 0.005 - supLen/2.
            
            const overlap = 0.005;
            const supZ = muzzleZ - (supLen/2) + overlap;
            suppressor.position.set(0, barrelY, supZ);
            addMesh(suppressor, group);
            
            // Black hole at front
            const holeGeo = new THREE.CircleGeometry(0.008, 12);
            const hole = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({color: 0x000000}));
            hole.position.set(0, barrelY, supZ - (supLen/2) - 0.001);
            hole.rotation.y = Math.PI;
            addMesh(hole, group);
            
            // Update Muzzle Z for flash
            muzzleZ = supZ - (supLen/2);
        }
        else if (hasFlashHider && CommonParts) {
            const fh = CommonParts.buildFlashHider().mesh;
            fh.position.set(0, barrelY, muzzleZ + 0.005);
            fh.scale.set(0.8, 0.8, 0.8);
            addMesh(fh);
        }

        // --- TRIGGER (Revamped with Holes support) ---
        const triggerPivot = new THREE.Group();
        triggerPivot.position.set(0, -0.01, -0.01); 
        group.add(triggerPivot);
        
        const isMatch = atts.includes('type92_trigger_match');
        const trigMat = isMatch ? matRed : matChrome;
        
        // Use Shape Extrusion for clean curved trigger with potential holes
        const trigShape = new THREE.Shape();
        trigShape.moveTo(0,0);
        trigShape.bezierCurveTo(0, -0.01, -0.005, -0.02, -0.002, -0.03); // Front curve
        trigShape.lineTo(0.004, -0.03); // Bottom
        trigShape.bezierCurveTo(0.002, -0.02, 0.006, -0.01, 0.006, 0); // Back curve
        trigShape.lineTo(0,0);

        if (isMatch) {
            const hole1 = new THREE.Path();
            hole1.absarc(0.002, -0.01, 0.0015, 0, Math.PI*2);
            trigShape.holes.push(hole1);
            
            const hole2 = new THREE.Path();
            hole2.absarc(0.003, -0.022, 0.0015, 0, Math.PI*2);
            trigShape.holes.push(hole2);
        }
        
        const trigGeo = new THREE.ExtrudeGeometry(trigShape, {
            depth: 0.006,
            bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2
        });
        trigGeo.translate(0, 0, -0.003); // Center on Z (width)
        
        const trigger = new THREE.Mesh(trigGeo, trigMat);
        trigger.rotation.y = Math.PI / 2; 
        
        // Pivot adjustment
        trigger.rotation.z = 0.3; 
        
        addMesh(trigger, triggerPivot);

        // --- RIGGING ---
        const muzzlePoint = new THREE.Object3D();
        const finalMuzzleZ = hasSuppressor ? muzzleZ : (hasFlashHider ? muzzleZ - 0.04 : muzzleZ);
        muzzlePoint.position.set(0, barrelY, finalMuzzleZ);
        group.add(muzzlePoint);
        
        const ejectionPoint = new THREE.Object3D();
        ejectionPoint.position.set(0.02, 0.03, 0);
        ejectionPoint.rotation.set(0, 0.5, 0);
        group.add(ejectionPoint);
        
        const handR = new THREE.Object3D();
        handR.position.set(0, -0.07, 0.09); 
        handR.rotation.x = -0.15;
        group.add(handR);
        
        const handL = new THREE.Object3D();
        handL.position.set(0, -0.06, 0.08); 
        handL.rotation.x = -0.15;
        handL.userData.restPos = handL.position.clone();
        group.add(handL);

        // Underbarrel Rail
        const ubPos = { x: 0, y: -0.025, z: -0.07 };
        let ubAtt = null;
        if (atts.includes('pistol_flash')) ubAtt = CommonParts.buildFlashlight().mesh;
        else if (atts.includes('pistol_laser')) ubAtt = CommonParts.buildGreenLaser().mesh;
        
        if (ubAtt) {
            const railAdpt = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.005, 0.04), matPolymer);
            railAdpt.position.set(ubPos.x, ubPos.y + 0.002, ubPos.z);
            addMesh(railAdpt, frame);
            
            ubAtt.position.set(ubPos.x, ubPos.y - 0.01, ubPos.z);
            if (atts.includes('pistol_flash')) {
                 const lens = ubAtt.children.find(c => c.name === "ATTACHMENT_FLASHLIGHT_LENS");
                 if (!lens) ubAtt.children.forEach(c => { if(c.geometry && c.geometry.type === 'CircleGeometry') c.name = "ATTACHMENT_FLASHLIGHT_LENS"; });
            } else {
                 const emit = ubAtt.children.find(c => c.name === "ATTACHMENT_LASER_EMITTER");
                 if (!emit) ubAtt.children.forEach(c => { if(c.geometry && c.geometry.type === 'CircleGeometry') c.name = "ATTACHMENT_LASER_EMITTER"; });
            }
            group.add(ubAtt);
        }

        return {
            mesh: group,
            parts: {
                muzzle: muzzlePoint,
                ejection: ejectionPoint,
                handRight: handR,
                handLeft: handL,
                slide: slideGroup,
                trigger: triggerPivot,
                magazine: magGroup
            }
        };
    };
})();
