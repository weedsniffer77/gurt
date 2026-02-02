
// js/data/assets/prop_assets.js
(function() {
    const MA = window.TacticalShooter.MapAssets;
    if (!MA) return;
    
    MA.createBarrel = function(scene, library, x, y, z, geometryList) {
        const mat = library.getMaterial('barrelRed');
        const h = 1.45; const r = 0.4;
        const geo = new THREE.CylinderGeometry(r, r, h, 16);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y + h/2 - 0.02, z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData.collidable = true; mesh.userData.isProp = true; 
        mesh.rotation.y = this.rng() * Math.PI; 
        scene.add(mesh);
        if (geometryList) geometryList.push(mesh);
        return mesh;
    };
    
    MA.createIBCTote = function(scene, library, x, y, z, geometryList) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = this.rng() * Math.PI;
        const matTank = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 1.0, metalness: 0.0, transparent: true, opacity: 0.9, side: THREE.FrontSide });
        const matMetal = library.getMaterial('steel');
        const size = 1.25; const tankH = 1.0; const baseH = 0.15;
        const base = new THREE.Mesh(new THREE.BoxGeometry(size, baseH, size), matMetal); base.position.y = baseH/2; group.add(base);
        const tank = new THREE.Mesh(new THREE.BoxGeometry(size*0.95, tankH, size*0.95), matTank); tank.position.y = baseH+tankH/2; group.add(tank);
        const col = new THREE.Mesh(new THREE.BoxGeometry(size, tankH+baseH, size), new THREE.MeshBasicMaterial({visible:false})); col.position.y = (tankH+baseH)/2; col.userData.collidable = true; col.userData.isProp = true; group.add(col); if(geometryList) geometryList.push(col);
        scene.add(group);
        return group;
    };
    
    MA.createPalletStack = function(scene, library, x, y, z, count, scale = 1.2, geometryList) {
        const mat = library.getMaterial('palletWood');
        const w = scale; const d = scale * 0.8; const hPerPallet = 0.15; const totalH = count * hPerPallet;
        const geo = new THREE.BoxGeometry(w, totalH, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y + totalH/2 - 0.02, z);
        mesh.rotation.y = this.rng() * 0.5; 
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = true; mesh.userData.isProp = true; 
        scene.add(mesh);
        if (geometryList) geometryList.push(mesh);
        return mesh;
    };
    
    MA.createLargePalletCube = function(scene, library, x, y, z, geometryList) {
        const mat = library.getMaterial('palletWood');
        const dim = 1.4;
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = this.rng() * Math.PI;
        const geo = new THREE.BoxGeometry(dim, dim, dim);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = dim/2;
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = true; mesh.userData.isProp = true;
        group.add(mesh);
        if (geometryList) geometryList.push(mesh);
        scene.add(group);
        return group;
    };

    MA.createTallPalletStack = function(scene, library, x, y, z, geometryList) {
        const mat = library.getMaterial('palletWood');
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = this.rng() * Math.PI;
        
        const H = 1.5;
        const pL = 2.0; 
        const pW = 0.4; 
        const pH = 0.12; 
        const layerCount = Math.floor(H / pH);
        const plankGeo = new THREE.BoxGeometry(pW, pH, pL); 
        
        // Detailed Plank Construction (Restored)
        for(let i = 0; i < layerCount; i++) {
            const yPos = (i * pH) + (pH/2);
            const isRotated = (i % 2 !== 0);
            const offsets = [-0.8, 0, 0.8];
            offsets.forEach(offset => {
                const mesh = new THREE.Mesh(plankGeo, mat);
                const rX = (this.rng() - 0.5) * 0.1;
                const rZ = (this.rng() - 0.5) * 0.1;
                const rRot = (this.rng() - 0.5) * 0.15;
                if (isRotated) {
                    mesh.rotation.y = (Math.PI / 2) + rRot;
                    mesh.position.set(rX, yPos, offset + rZ); 
                } else {
                    mesh.rotation.y = rRot;
                    mesh.position.set(offset + rX, yPos, rZ);
                }
                mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = false;
                group.add(mesh);
            });
        }
        
        const colGeo = new THREE.BoxGeometry(2.0, H, 2.0);
        const colMesh = new THREE.Mesh(colGeo, new THREE.MeshBasicMaterial({ visible: false }));
        colMesh.position.y = H / 2; colMesh.userData.collidable = true; colMesh.userData.isProp = true;
        group.add(colMesh); if(geometryList) geometryList.push(colMesh);
        
        scene.add(group);
        return group;
    };
    
    MA.createPalletLong = function(scene, library, x, y, z, rot, geometryList) {
         const mat = library.getMaterial('palletWood');
         const w = 2.4; const d = 1.0; const h = 0.45; 
         const geo = new THREE.BoxGeometry(w, h, d);
         const mesh = new THREE.Mesh(geo, mat);
         mesh.position.set(x, y + h/2 - 0.02, z);
         mesh.rotation.y = rot;
         mesh.castShadow = true; mesh.receiveShadow = true;
         mesh.userData.collidable = true; mesh.userData.isProp = true; 
         scene.add(mesh); if (geometryList) geometryList.push(mesh); return mesh;
    };
    
    MA.createPlankStack = function(scene, library, x, y, z, rotation, geometryList) {
        const mat = library.getMaterial('palletWood');
        const pL = 3.2; const pW = 0.4; const pH = 0.12; 
        const colGeo = new THREE.BoxGeometry(pW*3, pH*3, pL);
        const col = new THREE.Mesh(colGeo, new THREE.MeshBasicMaterial({visible:false}));
        col.position.set(x, pH*1.5, z); col.rotation.y = rotation; col.userData.collidable = true;
        scene.add(col); if(geometryList) geometryList.push(col);
        // Visual
        const vis = new THREE.Mesh(colGeo, mat); vis.position.set(x, pH*1.5, z); vis.rotation.y = rotation; scene.add(vis);
    };
    
    MA.createPalletPyramid = function(scene, library, x, y, z, isLarge, geometryList) {
        const pW = 1.2; const pD = 1.0; const pH = 0.15;
        let totalW = pW * 2; let totalH = pH * 4;
        const col = new THREE.Mesh(new THREE.BoxGeometry(totalW * 0.8, totalH * 0.8, pD), new THREE.MeshBasicMaterial({visible:false}));
        col.position.set(x, totalH * 0.4, z); col.rotation.y = this.rng() * Math.PI; col.userData.collidable = true;
        scene.add(col); if(geometryList) geometryList.push(col);
        // Visual
        const vis = new THREE.Mesh(new THREE.BoxGeometry(totalW * 0.8, totalH * 0.8, pD), library.getMaterial('palletWood'));
        vis.position.copy(col.position); vis.rotation.copy(col.rotation); scene.add(vis);
    };
})();
