
// js/data/assets/structure_assets.js
(function() {
    const MA = window.TacticalShooter.MapAssets;
    if (!MA) return;

    MA.createStairs = function(scene, library, x, y, z, width, height, length, rotationY, geometryList) {
        const mat = library.getMaterial('concrete');
        const group = new THREE.Group();
        // Pivot is at (x,y,z). Stair rises from 0,0,0 to 0,h,l in local space.
        // If rotationY is passed, it rotates around (x,y,z).
        group.position.set(x, y, z);
        group.rotation.y = rotationY;

        const steps = 10;
        const stepRise = height / steps;
        const stepRun = length / steps;

        for(let i=0; i<steps; i++) {
            const geo = new THREE.BoxGeometry(width, stepRise, stepRun);
            const mesh = new THREE.Mesh(geo, mat);
            // Positioned so bottom step is at ground level + half height
            mesh.position.set(0, (i * stepRise) + stepRise/2, (i * stepRun) + stepRun/2);
            mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.isProp = true; mesh.userData.collidable = false; 
            group.add(mesh);
        }

        const w = width / 2; const l = length; const h = height;
        const vertices = new Float32Array([
            -w, 0, 0,   w, 0, 0,   -w, 0, l,   w, 0, 0,    w, 0, l,   -w, 0, l,
            -w, 0, l,   w, 0, l,   -w, h, l,   w, 0, l,    w, h, l,   -w, h, l,
            -w, 0, 0,   -w, h, l,  w, 0, 0,    w, 0, 0,    -w, h, l,  w, h, l,
            -w, 0, 0,   -w, 0, l,  -w, h, l,   w, 0, 0,    w, h, l,   w, 0, l
        ]);
        const wedgeGeo = new THREE.BufferGeometry();
        wedgeGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        wedgeGeo.computeVertexNormals();
        const wedgeMat = new THREE.MeshBasicMaterial({ visible: false });
        const wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
        wedge.userData.collidable = true;
        group.add(wedge); if(geometryList) geometryList.push(wedge);

        scene.add(group);
        return group;
    };

    MA.createKillhouseWall = function(scene, library, x, y, z, rotY, hasWindow, geometryList) {
        const mat = library.getMaterial('plywood');
        const matFrame = library.getMaterial('wood'); 
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotY;
        
        const W = 2.5; const H = 2.5; const T = 0.1;

        if (hasWindow) {
            const wW = 1.0; const wH = 1.0; const sideW = (W - wW) / 2; const botH = (H - wH) / 2; const topH = (H - wH) / 2;
            const bGeo = new THREE.BoxGeometry(W, botH, T); const bMesh = new THREE.Mesh(bGeo, mat); bMesh.position.set(0, botH/2, 0); bMesh.castShadow = true; bMesh.receiveShadow = true; bMesh.userData.collidable = false; group.add(bMesh);
            const tMesh = new THREE.Mesh(bGeo, mat); tMesh.position.set(0, H - botH/2, 0); tMesh.castShadow = true; tMesh.receiveShadow = true; tMesh.userData.collidable = false; group.add(tMesh);
            const sGeo = new THREE.BoxGeometry(sideW, wH, T); const lMesh = new THREE.Mesh(sGeo, mat); lMesh.position.set(-W/2 + sideW/2, H/2, 0); lMesh.castShadow = true; lMesh.receiveShadow = true; lMesh.userData.collidable = false; group.add(lMesh);
            const rMesh = new THREE.Mesh(sGeo, mat); rMesh.position.set(W/2 - sideW/2, H/2, 0); rMesh.castShadow = true; rMesh.receiveShadow = true; rMesh.userData.collidable = false; group.add(rMesh);
            const sillGeo = new THREE.BoxGeometry(wW, 0.05, 0.15); const sill = new THREE.Mesh(sillGeo, matFrame); sill.position.set(0, botH, 0); group.add(sill);

            const colThick = 0.6; const matCol = new THREE.MeshBasicMaterial({visible:false});
            const colBot = new THREE.Mesh(new THREE.BoxGeometry(W, botH, colThick), matCol); colBot.position.set(0, botH/2, 0); colBot.userData.collidable = true; group.add(colBot); if(geometryList) geometryList.push(colBot);
            const colTop = new THREE.Mesh(new THREE.BoxGeometry(W, topH, colThick), matCol); colTop.position.set(0, H - topH/2, 0); colTop.userData.collidable = true; group.add(colTop); if(geometryList) geometryList.push(colTop);
            const colLeft = new THREE.Mesh(new THREE.BoxGeometry(sideW, wH, colThick), matCol); colLeft.position.set(-W/2 + sideW/2, H/2, 0); colLeft.userData.collidable = true; group.add(colLeft); if(geometryList) geometryList.push(colLeft);
            const colRight = new THREE.Mesh(new THREE.BoxGeometry(sideW, wH, colThick), matCol); colRight.position.set(W/2 - sideW/2, H/2, 0); colRight.userData.collidable = true; group.add(colRight); if(geometryList) geometryList.push(colRight);
        } else {
            const geo = new THREE.BoxGeometry(W, H, T); const mesh = new THREE.Mesh(geo, mat); mesh.position.set(0, H/2, 0); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = false; group.add(mesh);
            const col = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.6), new THREE.MeshBasicMaterial({visible:false})); col.position.set(0, H/2, 0); col.userData.collidable = true; col.userData.isProp = true; group.add(col); if(geometryList) geometryList.push(col);
        }
        scene.add(group);
        return group;
    };
    
    MA.createConcreteBarrier = function(scene, library, x, y, z, rotation, geometryList) {
        const mat = library.getMaterial('concrete');
        const shape = new THREE.Shape();
        shape.moveTo(0.3, 0);
        shape.lineTo(0.15, 0.30);
        shape.lineTo(0.1, 1.47); 
        shape.lineTo(-0.1, 1.47); 
        shape.lineTo(-0.15, 0.30);
        shape.lineTo(-0.3, 0);
        shape.lineTo(0.3, 0);
        const extrudeSettings = { steps: 1, depth: 3.0, bevelEnabled: false };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.translate(0, 0, -1.5);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y - 0.02, z);
        mesh.rotation.y = rotation;
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData.collidable = true;
        scene.add(mesh);
        if (geometryList) geometryList.push(mesh);
        return mesh;
    };
})();
