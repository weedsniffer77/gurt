
// js/data/weapons/m24/m24_model.js
(function() {
    const weaponDef = window.TacticalShooter.GameData.Weapons["M24"];
    if (!weaponDef) return;

    weaponDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        const group = new THREE.Group();
        group.userData.bulletTransparent = true;
        
        // --- MATERIALS ---
        const matStock = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            roughness: 0.9, 
            metalness: 0.1,
            name: 'M24_Stock' 
        });
        const matSteel = new THREE.MeshStandardMaterial({ 
            color: 0x333333, 
            roughness: 0.5, 
            metalness: 0.6,
            name: 'M24_Steel' 
        });
        const matPort = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const matRubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.0 });

        const addMesh = (mesh, parent = group) => {
            mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.bulletTransparent = true;
            parent.add(mesh); return mesh;
        };

        // --- 1. CHASSIS ---
        const chassisGroup = new THREE.Group();
        group.add(chassisGroup);

        // A. FOREND
        const forendLen = 0.45;
        const feWidth = 0.055;
        const feHeight = 0.045; 
        const feTopY = 0.008; 
        
        const feShape = new THREE.Shape();
        feShape.moveTo(-feWidth/2, feTopY); 
        feShape.lineTo(-feWidth/2, -0.01); 
        feShape.quadraticCurveTo(-feWidth/2, -feHeight, 0, -feHeight); 
        feShape.quadraticCurveTo(feWidth/2, -feHeight, feWidth/2, -0.01); 
        feShape.lineTo(feWidth/2, feTopY); 
        // Inner cut
        feShape.lineTo(0.02, feTopY);
        feShape.quadraticCurveTo(0, -0.025, -0.02, feTopY);
        feShape.lineTo(-feWidth/2, feTopY);
        
        const feGeo = new THREE.ExtrudeGeometry(feShape, { 
            depth: forendLen, 
            bevelEnabled: true, 
            bevelThickness: 0.002, 
            bevelSize: 0.002, 
            bevelSegments: 2 
        });
        feGeo.translate(0, 0, -forendLen);
        
        const pos = feGeo.attributes.position;
        for(let i=0; i<pos.count; i++) {
            const z = pos.getZ(i);
            if (z < -0.3) {
                const ratio = 1.0 - ((z + 0.3) / -0.15) * 0.3; 
                pos.setX(i, pos.getX(i) * ratio);
                if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) * ratio);
            }
        }
        feGeo.computeVertexNormals();
        
        const forend = new THREE.Mesh(feGeo, matStock);
        forend.position.set(0, 0.005, 0.15); 
        addMesh(forend, chassisGroup);

        // B. GRIP (Bent Tube Design - Skeletonized)
        const gripGroup = new THREE.Group();
        gripGroup.position.set(0, 0.0, 0.15); 
        chassisGroup.add(gripGroup);

        // Calculate alignment Y
        // Forend bottom is at roughly -0.04 (relative to chassisGroup)
        // Tube Radius is 0.024
        // To align bottom of tube with bottom of forend: Center Y = -0.04 + 0.024 = -0.016
        const tubeY = -0.016;

        // Path: Extends straight back, then bends down into grip
        // Modified: Shorter horizontal section (0.12 vs 0.15), Longer vertical handle (-0.10 vs -0.08)
        const curvePoints = [
            new THREE.Vector3(0, tubeY, 0),       // Start (At back of receiver)
            new THREE.Vector3(0, tubeY, 0.12),    // Wrist (Shortened horizontal)
            new THREE.Vector3(0, -0.10, 0.20)     // Handle Tip (Extended vertical)
        ];
        
        const gripCurve = new THREE.CatmullRomCurve3(curvePoints);
        gripCurve.curveType = 'catmullrom';
        gripCurve.tension = 0.2; // Tighter curve

        // Radius ~2.4cm
        const tubeGeo = new THREE.TubeGeometry(gripCurve, 12, 0.024, 12, false); 
        const gripMesh = new THREE.Mesh(tubeGeo, matStock);
        addMesh(gripMesh, gripGroup);
        
        // NOTE: Buttstock and End Cap removed per request

        // --- 2. BARREL & RECEIVER ---
        const bLen = 0.65; 
        const bRad = 0.013; 
        const bY = 0.015; 
        
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, bRad, bLen, 16).rotateX(-Math.PI/2), matSteel);
        barrel.position.set(0, bY, -0.30); 
        addMesh(barrel, group);
        
        const recLen = 0.20;
        const recRad = 0.016;
        const receiver = new THREE.Mesh(new THREE.CylinderGeometry(recRad, recRad, recLen, 16).rotateX(-Math.PI/2), matSteel);
        receiver.position.set(0, bY, 0.05);
        addMesh(receiver, group);
        
        const port = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.015, 0.08), matPort);
        port.position.set(0.013, bY, 0.05);
        port.rotation.z = 0.5; 
        addMesh(port, group);

        // --- 6. RIGGING ---
        const muzzlePoint = new THREE.Object3D();
        muzzlePoint.position.set(0, bY, -0.62); 
        group.add(muzzlePoint);
        
        const ejectionPoint = new THREE.Object3D();
        ejectionPoint.position.set(0.03, bY, 0.05);
        ejectionPoint.rotation.y = 1.0; 
        group.add(ejectionPoint);
        
        const handR = new THREE.Object3D();
        // Adjusted for new grip dimensions (Moved slightly forward and down)
        handR.position.set(0, -0.07, 0.31); 
        handR.rotation.x = -0.35; 
        group.add(handR);
        
        const handL = new THREE.Object3D();
        handL.position.set(0, -0.02, -0.25); 
        group.add(handL);
        
        // Reload Shell
        const shellGroup = new THREE.Group();
        shellGroup.visible = false;
        shellGroup.name = "RELOAD_SHELL";
        const sCase = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.051, 8).rotateX(-Math.PI/2), new THREE.MeshStandardMaterial({color:0xd4af37}));
        shellGroup.add(sCase);
        shellGroup.rotation.y = Math.PI/2;
        handL.add(shellGroup);

        group.scale.set(1.1, 1.1, 1.1); 
        group.position.z = -0.15;

        return {
            mesh: group,
            parts: {
                muzzle: muzzlePoint,
                ejection: ejectionPoint,
                handRight: handR,
                handLeft: handL,
                slide: null, 
                handle: null, 
                magazine: null,
                shell: shellGroup
            }
        };
    };
})();
