// js/data/weapons/knife/knife_model.js
(function() {
    const weaponDef = window.TacticalShooter.GameData.Weapons["KNIFE"];
    if (!weaponDef) return;

    weaponDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        const group = new THREE.Group();
        
        const S = 0.8;

        const matCarbon = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.1 });
        const matBlade = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.9, side: THREE.DoubleSide });
        const matMatte = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9, metalness: 0.0 });
        const matChrome = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.1, metalness: 1.0 });

        // --- HANDLE ---
        const handleGroup = new THREE.Group();
        const gripShape = new THREE.Shape();
        const gLen = 0.13 * S; 
        const gHeight = 0.035 * S; 
        
        gripShape.moveTo(0, 0);
        gripShape.lineTo(0, -gHeight); 
        const grooveW = gLen / 4;
        const grooveD = 0.005 * S;
        gripShape.bezierCurveTo(grooveW*0.2, -gHeight-grooveD, grooveW*0.8, -gHeight-grooveD, grooveW, -gHeight);
        gripShape.bezierCurveTo(grooveW*1.2, -gHeight-grooveD, grooveW*1.8, -gHeight-grooveD, grooveW*2, -gHeight);
        gripShape.bezierCurveTo(grooveW*2.2, -gHeight-grooveD, grooveW*2.8, -gHeight-grooveD, grooveW*3, -gHeight);
        gripShape.bezierCurveTo(grooveW*3.2, -gHeight-grooveD, grooveW*3.8, -gHeight-grooveD, grooveW*4, -gHeight+0.005*S);
        gripShape.lineTo(gLen, 0); 
        gripShape.bezierCurveTo(gLen*0.6, 0.005*S, gLen*0.3, 0.005*S, 0, 0);
        
        const extrudeSettings = { steps: 1, depth: 0.022 * S, bevelEnabled: true, bevelThickness: 0.003 * S, bevelSize: 0.003 * S, bevelSegments: 2 };
        const gripGeom = new THREE.ExtrudeGeometry(gripShape, extrudeSettings);
        gripGeom.translate(0, 0, -0.011 * S); 
        
        const grip = new THREE.Mesh(gripGeom, matCarbon);
        
        // FIXED ROTATION: Rotate -90 Y so +X (length) points towards +Z (back of knife)
        grip.rotation.y = -Math.PI / 2;
        
        // FIXED POSITION: Start just behind the guard (Z > 0)
        const gripStartZ = 0.015 * S; 
        grip.position.set(0, 0.01 * S, gripStartZ); 
        grip.castShadow = true;
        handleGroup.add(grip);
        
        // FIXED SCREWS: Align with new handle rotation
        const screwGeo = new THREE.CylinderGeometry(0.004*S, 0.004*S, 0.026*S, 8);
        screwGeo.rotateZ(Math.PI / 2);
        
        const screwOffsets = [0.03 * S, 0.07 * S, 0.11 * S];
        for(let offset of screwOffsets) {
            const screw = new THREE.Mesh(screwGeo, matMatte);
            screw.position.set(0, -0.01*S, gripStartZ + offset);
            handleGroup.add(screw);
        }
        group.add(handleGroup);

        // --- GUARD ---
        const guardGeo = new THREE.BoxGeometry(0.02*S, 0.07*S, 0.015*S);
        const guard = new THREE.Mesh(guardGeo, matMatte);
        guard.position.set(0, 0, 0.005 * S); 
        guard.castShadow = true;
        group.add(guard);

        // --- BLADE ---
        // Extends Negative Z (Forward)
        const bLen = 0.24 * S;
        const bH = 0.045 * S; 
        const bT = 0.008 * S; 
        
        const bladeGeo = new THREE.BufferGeometry();
        const verts = [];
        const segs = 10;
        
        const makeCrossSection = (z, h, th) => [ { x: 0, y: h/2, z: z }, { x: th/2, y: 0, z: z }, { x: 0, y: -h/2, z: z }, { x: -th/2, y: 0, z: z } ];

        for (let i = 0; i < segs; i++) {
            const t = i / segs;
            const tNext = (i + 1) / segs;
            const z1 = -t * bLen; 
            const z2 = -tNext * bLen;
            let h1 = bH, h2 = bH, th1 = bT, th2 = bT;
            if (t > 0.6) h1 = bH * (1.0 - (t - 0.6) / 0.4 * 0.8);
            if (tNext > 0.6) h2 = bH * (1.0 - (tNext - 0.6) / 0.4 * 0.8);
            if (t > 0.7) th1 = bT * (1.0 - (t - 0.7) / 0.3);
            if (tNext > 0.7) th2 = bT * (1.0 - (tNext - 0.7) / 0.3);
            
            const cs1 = makeCrossSection(z1, h1, th1);
            const cs2 = makeCrossSection(z2, h2, th2);
            
            if (i === segs - 1) cs2.forEach(v => { v.x = 0; v.y = 0; v.z = z2; });
            
            const addQuad = (v1, v2, v3, v4) => {
                verts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
                verts.push(v1.x, v1.y, v1.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z);
            };
            
            addQuad(cs1[0], cs2[0], cs2[1], cs1[1]);
            addQuad(cs1[1], cs2[1], cs2[2], cs1[2]);
            addQuad(cs1[2], cs2[2], cs2[3], cs1[3]);
            addQuad(cs1[3], cs2[3], cs2[0], cs1[0]);
            
            if (i === 0) {
                verts.push(cs1[0].x, cs1[0].y, cs1[0].z, cs1[3].x, cs1[3].y, cs1[3].z, cs1[1].x, cs1[1].y, cs1[1].z);
                verts.push(cs1[1].x, cs1[1].y, cs1[1].z, cs1[3].x, cs1[3].y, cs1[3].z, cs1[2].x, cs1[2].y, cs1[2].z);
            }
        }
        
        bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        bladeGeo.computeVertexNormals();
        const blade = new THREE.Mesh(bladeGeo, matBlade);
        blade.castShadow = true;
        group.add(blade);
        
        // --- RING (Moved Forward & Connected) ---
        const ringPivot = new THREE.Group();
        // Move closer to handle end: gripStart (0.015) + gLen (0.13) = 0.145.
        // Was 0.19 * S (0.152), now 0.165 * S (0.132) to sit flush.
        ringPivot.position.set(0, 0, 0.165 * S); 
        handleGroup.add(ringPivot);
        
        // Add connector cylinder to prevent floating
        // Length 0.04 to bridge gap safely
        const connector = new THREE.Mesh(new THREE.CylinderGeometry(0.004*S, 0.004*S, 0.04*S), matMatte);
        connector.rotation.x = Math.PI/2;
        connector.position.z = -0.015*S; // Extend back into handle
        ringPivot.add(connector);

        const ringGeo = new THREE.TorusGeometry(0.015 * S, 0.002 * S, 8, 16);
        const ring = new THREE.Mesh(ringGeo, matChrome);
        ring.rotation.x = Math.PI / 2; 
        ring.position.y = -0.015 * S; 
        ringPivot.add(ring);

        // --- RIGGING ---
        const muzzlePoint = new THREE.Object3D();
        muzzlePoint.position.set(0, 0, -bLen); 
        group.add(muzzlePoint);
        
        const handR = new THREE.Object3D();
        handR.position.set(0, -0.04 * S, 0.08 * S); // Adjusted for new handle center
        group.add(handR);

        const handL = new THREE.Object3D();
        // Force hide FPS hand by moving it very far away/behind camera
        handL.position.set(0, -50, 0); 
        group.add(handL);

        return {
            mesh: group,
            parts: {
                muzzle: muzzlePoint,
                ejection: null,
                handRight: handR,
                handLeft: handL,
                dangler: ringPivot
            }
        };
    };
    console.log('Weapon Loaded: KNIFE (Model v10 - Hand Fixed)');
})();