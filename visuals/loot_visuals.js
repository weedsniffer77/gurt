
// js/visuals/loot_visuals.js
(function() {
    const LootVisuals = {
        
        createBox(colorHex, typeId) {
            if (!window.THREE) return null;
            const THREE = window.THREE;
            const group = new THREE.Group();
            
            // GRENADE MESH LOADER
            // If color is -1 (from LootSystem broadcast), load the Throwable mesh
            if (colorHex === -1 && typeId) {
                 const GD = window.TacticalShooter.GameData;
                 const def = GD.Throwables[typeId];
                 
                 if (def && def.buildMesh) {
                     const built = def.buildMesh();
                     const mesh = built.mesh;
                     
                     // Cleanup rig/hands
                     const parts = built.parts;
                     if (parts.handLeft) parts.handLeft.removeFromParent();
                     if (parts.handRight) parts.handRight.removeFromParent();
                     if (parts.pin) parts.pin.removeFromParent(); // Spawn without pin? Or with? Let's say dropped = unpinned? No, unthrown means pinned. Keep pin.
                     // Actually, if they died holding it, it might be live...
                     // For loot pickup, assume it's a fresh grenade item.
                     
                     mesh.scale.set(2.0, 2.0, 2.0); // Make it visible on floor
                     
                     // Enable physics/shadows
                     mesh.traverse(c => {
                         if (c.isMesh) {
                             c.castShadow = true;
                             c.receiveShadow = true;
                         }
                     });
                     
                     group.add(mesh);
                     return group;
                 }
            }

            // STANDARD BOX
            const w = 0.3; const h = 0.15; const d = 0.15;
            const geometry = new THREE.BoxGeometry(w, h, d);
            // Revert -1 to gray if fallback needed
            const finalColor = (colorHex === -1) ? 0x555555 : colorHex;
            
            const material = new THREE.MeshStandardMaterial({ color: finalColor, roughness: 0.9, metalness: 0.1 });
            
            if (finalColor === 0x111111) {
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
                const bandGeo = new THREE.BoxGeometry(w + 0.005, h * 0.3, d + 0.005);
                const bandMat = new THREE.MeshBasicMaterial({ color: 0xcccccc }); 
                const band = new THREE.Mesh(bandGeo, bandMat);
                group.add(band);
            } else {
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
                const strapGeo = new THREE.BoxGeometry(0.05, h + 0.01, d + 0.01);
                const strapMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
                const strap = new THREE.Mesh(strapGeo, strapMat);
                group.add(strap);
            }
            
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0x000000 } ) );
            group.add(line);

            return group;
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.LootVisuals = LootVisuals;
})();
