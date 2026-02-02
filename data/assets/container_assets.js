
// js/data/assets/container_assets.js
(function() {
    const MA = window.TacticalShooter.MapAssets;
    if (!MA) return;

    // Helper for parts
    const addPart = (grp, geo, mat, px, py, pz, rotX=0, rotY=0, rotZ=0) => {
        const mesh = new THREE.Mesh(geo, mat); 
        mesh.position.set(px, py, pz);
        if (rotX) mesh.rotation.x = rotX; if (rotY) mesh.rotation.y = rotY; if (rotZ) mesh.rotation.z = rotZ;
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.collidable = false; 
        grp.add(mesh);
    };

    MA.createContainer = function(scene, library, x, y, z, matName, rotationY, geometryList, doorConfig = null) {
        const matCorrugated = library.getMaterial(matName);
        const matFrame = library.getMaterial(`${matName}Flat`) || matCorrugated; 
        
        const containerGroup = new THREE.Group();
        containerGroup.position.set(x, y, z);
        containerGroup.rotation.y = rotationY;
        
        const W = 2.44; const H = 2.59; const L = 6.06;
        const frameSize = 0.15; const panelThick = 0.05; 
        
        const postGeo = new THREE.BoxGeometry(frameSize, H, frameSize);
        addPart(containerGroup, postGeo, matFrame, -W/2 + frameSize/2, H/2, -L/2 + frameSize/2);
        addPart(containerGroup, postGeo, matFrame, W/2 - frameSize/2, H/2, -L/2 + frameSize/2);
        addPart(containerGroup, postGeo, matFrame, -W/2 + frameSize/2, H/2, L/2 - frameSize/2);
        addPart(containerGroup, postGeo, matFrame, W/2 - frameSize/2, H/2, L/2 - frameSize/2);
        
        const longRailGeo = new THREE.BoxGeometry(frameSize, frameSize, L - 2*frameSize);
        addPart(containerGroup, longRailGeo, matFrame, -W/2 + frameSize/2, frameSize/2, 0); 
        addPart(containerGroup, longRailGeo, matFrame, W/2 - frameSize/2, frameSize/2, 0); 
        addPart(containerGroup, longRailGeo, matFrame, -W/2 + frameSize/2, H - frameSize/2, 0); 
        addPart(containerGroup, longRailGeo, matFrame, W/2 - frameSize/2, H - frameSize/2, 0); 
        
        const shortRailGeo = new THREE.BoxGeometry(W - 2*frameSize, frameSize, frameSize);
        addPart(containerGroup, shortRailGeo, matFrame, 0, frameSize/2, -L/2 + frameSize/2); 
        addPart(containerGroup, shortRailGeo, matFrame, 0, frameSize/2, L/2 - frameSize/2); 
        addPart(containerGroup, shortRailGeo, matFrame, 0, H - frameSize/2, -L/2 + frameSize/2); 
        addPart(containerGroup, shortRailGeo, matFrame, 0, H - frameSize/2, L/2 - frameSize/2); 
        
        const sidePanelGeo = MA.createCorrugatedPlane(L - 2*frameSize, H - 2*frameSize, panelThick);
        addPart(containerGroup, sidePanelGeo, matCorrugated, -W/2 + frameSize/2, H/2, 0, 0, Math.PI/2, 0);
        addPart(containerGroup, sidePanelGeo, matCorrugated, W/2 - frameSize/2, H/2, 0, 0, Math.PI/2, 0);
        
        const roofGeo = MA.createCorrugatedPlane(W - 2*frameSize, L - 2*frameSize, panelThick);
        addPart(containerGroup, roofGeo, matCorrugated, 0, H - frameSize/2, 0, -Math.PI/2, 0, 0);
        
        const floorGeo = new THREE.BoxGeometry(W - 2*frameSize, panelThick, L - 2*frameSize);
        addPart(containerGroup, floorGeo, matFrame, 0, frameSize/2, 0);
        
        const hasBackDoors = doorConfig && (doorConfig.backLeft !== undefined || doorConfig.backRight !== undefined);
        if (!hasBackDoors) {
            const backGeo = MA.createCorrugatedPlane(W - 2*frameSize, H - 2*frameSize, panelThick);
            addPart(containerGroup, backGeo, matCorrugated, 0, H/2, -L/2 + frameSize/2);
        }
        
        // Colliders
        const matCollider = new THREE.MeshBasicMaterial({ visible: false });
        const colThick = 0.8; 
        const floorCol = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, L), matCollider); floorCol.position.set(0, 0.05, 0); floorCol.userData.collidable = true; containerGroup.add(floorCol); if(geometryList) geometryList.push(floorCol);
        const roofCol = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, L), matCollider); roofCol.position.set(0, H - 0.05, 0); roofCol.userData.collidable = true; containerGroup.add(roofCol); if(geometryList) geometryList.push(roofCol);
        const lCol = new THREE.Mesh(new THREE.BoxGeometry(colThick, H, L), matCollider); lCol.position.set(-W/2, H/2, 0); lCol.userData.collidable = true; containerGroup.add(lCol); if(geometryList) geometryList.push(lCol);
        const rCol = new THREE.Mesh(new THREE.BoxGeometry(colThick, H, L), matCollider); rCol.position.set(W/2, H/2, 0); rCol.userData.collidable = true; containerGroup.add(rCol); if(geometryList) geometryList.push(rCol);
        if (!hasBackDoors) { const bCol = new THREE.Mesh(new THREE.BoxGeometry(W, H, colThick), matCollider); bCol.position.set(0, H/2, -L/2); bCol.userData.collidable = true; containerGroup.add(bCol); if(geometryList) geometryList.push(bCol); }

        const doorW = (W / 2) - 0.05; const doorH = H - 0.2; const doorThick = 0.08; const doorGeo = new THREE.BoxGeometry(doorW, doorH, doorThick);
        const createDoor = (isLeft, angle, zPos, rotBaseY) => {
            const pivotGroup = new THREE.Group();
            let pivotX = isLeft ? (-W/2 + frameSize) : (W/2 - frameSize);
            if (rotBaseY !== 0) { pivotX = isLeft ? (W/2 - frameSize) : (-W/2 + frameSize); }
            pivotGroup.position.set(pivotX, H/2, zPos);
            pivotGroup.rotation.y = rotBaseY + angle;
            const doorMesh = new THREE.Mesh(doorGeo, matCorrugated);
            let visualOffset = isLeft ? (doorW/2) : (-doorW/2);
            if (rotBaseY !== 0) { visualOffset = isLeft ? (-doorW/2) : (doorW/2); }
            doorMesh.position.set(visualOffset, 0, 0);
            doorMesh.castShadow = true; doorMesh.receiveShadow = true; doorMesh.userData.collidable = false; 
            pivotGroup.add(doorMesh);
            const dCol = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.6), matCollider);
            dCol.position.set(visualOffset, 0, 0); dCol.userData.collidable = true; pivotGroup.add(dCol); if(geometryList) geometryList.push(dCol);
            containerGroup.add(pivotGroup);
        };
        createDoor(true, doorConfig ? (doorConfig.left || 0) : 0, L/2, 0);
        createDoor(false, doorConfig ? (doorConfig.right || 0) : 0, L/2, 0);
        if (hasBackDoors) { createDoor(true, doorConfig.backLeft || 0, -L/2, Math.PI); createDoor(false, doorConfig.backRight || 0, -L/2, Math.PI); }
        
        scene.add(containerGroup);
        return containerGroup;
    };

    MA.createContainer40 = function(scene, library, x, y, z, matName, rotationY, geometryList, doorConfig = null) {
        // ... (Same structure as createContainer but L = 12.19)
        const matCorrugated = library.getMaterial(matName);
        const matFrame = library.getMaterial(`${matName}Flat`) || matCorrugated; 
        const containerGroup = new THREE.Group();
        containerGroup.position.set(x, y, z);
        containerGroup.rotation.y = rotationY;
        const W = 2.44; const H = 2.59; const L = 12.19; 
        const frameSize = 0.15; const panelThick = 0.05; 
        
        const postGeo = new THREE.BoxGeometry(frameSize, H, frameSize);
        addPart(containerGroup, postGeo, matFrame, -W/2 + frameSize/2, H/2, -L/2 + frameSize/2);
        addPart(containerGroup, postGeo, matFrame, W/2 - frameSize/2, H/2, -L/2 + frameSize/2);
        addPart(containerGroup, postGeo, matFrame, -W/2 + frameSize/2, H/2, L/2 - frameSize/2);
        addPart(containerGroup, postGeo, matFrame, W/2 - frameSize/2, H/2, L/2 - frameSize/2);
        const longRailGeo = new THREE.BoxGeometry(frameSize, frameSize, L - 2*frameSize);
        addPart(containerGroup, longRailGeo, matFrame, -W/2 + frameSize/2, frameSize/2, 0); 
        addPart(containerGroup, longRailGeo, matFrame, W/2 - frameSize/2, frameSize/2, 0); 
        addPart(containerGroup, longRailGeo, matFrame, -W/2 + frameSize/2, H - frameSize/2, 0); 
        addPart(containerGroup, longRailGeo, matFrame, W/2 - frameSize/2, H - frameSize/2, 0); 
        const shortRailGeo = new THREE.BoxGeometry(W - 2*frameSize, frameSize, frameSize);
        addPart(containerGroup, shortRailGeo, matFrame, 0, frameSize/2, -L/2 + frameSize/2); 
        addPart(containerGroup, shortRailGeo, matFrame, 0, frameSize/2, L/2 - frameSize/2); 
        addPart(containerGroup, shortRailGeo, matFrame, 0, H - frameSize/2, -L/2 + frameSize/2); 
        addPart(containerGroup, shortRailGeo, matFrame, 0, H - frameSize/2, L/2 - frameSize/2); 
        const sidePanelGeo = MA.createCorrugatedPlane(L - 2*frameSize, H - 2*frameSize, panelThick);
        addPart(containerGroup, sidePanelGeo, matCorrugated, -W/2 + frameSize/2, H/2, 0, 0, Math.PI/2, 0);
        addPart(containerGroup, sidePanelGeo, matCorrugated, W/2 - frameSize/2, H/2, 0, 0, Math.PI/2, 0);
        const roofGeo = MA.createCorrugatedPlane(W - 2*frameSize, L - 2*frameSize, panelThick);
        addPart(containerGroup, roofGeo, matCorrugated, 0, H - frameSize/2, 0, -Math.PI/2, 0, 0);
        const floorGeo = new THREE.BoxGeometry(W - 2*frameSize, panelThick, L - 2*frameSize);
        addPart(containerGroup, floorGeo, matFrame, 0, frameSize/2, 0);
        
        const hasBackDoors = doorConfig && (doorConfig.backLeft !== undefined || doorConfig.backRight !== undefined);
        if (!hasBackDoors) {
            const backGeo = MA.createCorrugatedPlane(W - 2*frameSize, H - 2*frameSize, panelThick);
            addPart(containerGroup, backGeo, matCorrugated, 0, H/2, -L/2 + frameSize/2);
        }
        
        const matCollider = new THREE.MeshBasicMaterial({ visible: false });
        const colThick = 0.8; 
        const floorCol = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, L), matCollider); floorCol.position.set(0, 0.05, 0); floorCol.userData.collidable = true; containerGroup.add(floorCol); if(geometryList) geometryList.push(floorCol);
        const roofCol = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, L), matCollider); roofCol.position.set(0, H - 0.05, 0); roofCol.userData.collidable = true; containerGroup.add(roofCol); if(geometryList) geometryList.push(roofCol);
        const lCol = new THREE.Mesh(new THREE.BoxGeometry(colThick, H, L), matCollider); lCol.position.set(-W/2, H/2, 0); lCol.userData.collidable = true; containerGroup.add(lCol); if(geometryList) geometryList.push(lCol);
        const rCol = new THREE.Mesh(new THREE.BoxGeometry(colThick, H, L), matCollider); rCol.position.set(W/2, H/2, 0); rCol.userData.collidable = true; containerGroup.add(rCol); if(geometryList) geometryList.push(rCol);
        if (!hasBackDoors) { const bCol = new THREE.Mesh(new THREE.BoxGeometry(W, H, colThick), matCollider); bCol.position.set(0, H/2, -L/2); bCol.userData.collidable = true; containerGroup.add(bCol); if(geometryList) geometryList.push(bCol); }

        const doorW = (W / 2) - 0.05; const doorH = H - 0.2; const doorThick = 0.08; const doorGeo = new THREE.BoxGeometry(doorW, doorH, doorThick);
        const createDoor = (isLeft, angle, zPos, rotBaseY) => {
            const pivotGroup = new THREE.Group();
            let pivotX = isLeft ? (-W/2 + frameSize) : (W/2 - frameSize);
            if (rotBaseY !== 0) { pivotX = isLeft ? (W/2 - frameSize) : (-W/2 + frameSize); }
            pivotGroup.position.set(pivotX, H/2, zPos);
            pivotGroup.rotation.y = rotBaseY + angle;
            const doorMesh = new THREE.Mesh(doorGeo, matCorrugated);
            let visualOffset = isLeft ? (doorW/2) : (-doorW/2);
            if (rotBaseY !== 0) { visualOffset = isLeft ? (-doorW/2) : (doorW/2); }
            doorMesh.position.set(visualOffset, 0, 0);
            doorMesh.castShadow = true; doorMesh.receiveShadow = true; doorMesh.userData.collidable = false; 
            pivotGroup.add(doorMesh);
            const dCol = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.6), matCollider);
            dCol.position.set(visualOffset, 0, 0); dCol.userData.collidable = true; pivotGroup.add(dCol); if(geometryList) geometryList.push(dCol);
            containerGroup.add(pivotGroup);
        };
        createDoor(true, doorConfig ? (doorConfig.left || 0) : 0, L/2, 0);
        createDoor(false, doorConfig ? (doorConfig.right || 0) : 0, L/2, 0);
        if (hasBackDoors) { createDoor(true, doorConfig.backLeft || 0, -L/2, Math.PI); createDoor(false, doorConfig.backRight || 0, -L/2, Math.PI); }
        
        scene.add(containerGroup);
        return containerGroup;
    };
    
    // --- NEW BATCHED CONTAINERS (PLACEHOLDER FOR OPTIMIZATION) ---
    MA.createBatchedContainer20 = function() { console.log("Creating Batched 20ft (Stub)"); return new THREE.Group(); };
    MA.createBatchedContainer40 = function() { console.log("Creating Batched 40ft (Stub)"); return new THREE.Group(); };
})();
