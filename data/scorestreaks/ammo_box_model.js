
// js/data/scorestreaks/ammo_box_model.js
(function() {
    // Helper to attach to existing definition
    // Since this file might load before or after the main ammo_box.js, 
    // we need to attach it to GameData structure carefully or export a builder.
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.AmmoBoxModel = {
        buildMesh: function() {
            if (!window.THREE) return null;
            const THREE = window.THREE;
            const group = new THREE.Group();
            
            const matDrab = new THREE.MeshStandardMaterial({ color: 0x4b5320, roughness: 0.8, metalness: 0.1 }); // Olive
            const matSteel = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.7 });
            const matYellow = new THREE.MeshBasicMaterial({ color: 0xffcc00 }); // Simple yellow for text
            
            // 1. Main Crate Body
            const w = 0.4; // 40cm wide
            const h = 0.25; // 25cm tall
            const d = 0.2; // 20cm deep
            
            const boxGeo = new THREE.BoxGeometry(w, h, d);
            const box = new THREE.Mesh(boxGeo, matDrab);
            box.castShadow = true;
            box.receiveShadow = true;
            box.position.y = h/2; // Sit on floor
            group.add(box);
            
            // 2. Lid (Slightly larger top)
            const lidH = 0.03;
            const lid = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, lidH, d + 0.01), matDrab);
            lid.position.y = h + lidH/2;
            lid.castShadow = true;
            group.add(lid);
            
            // 3. Handles (Steel Loops on sides)
            const handleGeo = new THREE.TorusGeometry(0.04, 0.005, 8, 16, Math.PI);
            
            const leftHandle = new THREE.Mesh(handleGeo, matSteel);
            leftHandle.position.set(-w/2 - 0.005, h * 0.7, 0);
            leftHandle.rotation.y = Math.PI / 2;
            group.add(leftHandle);
            
            const rightHandle = new THREE.Mesh(handleGeo, matSteel);
            rightHandle.position.set(w/2 + 0.005, h * 0.7, 0);
            rightHandle.rotation.y = -Math.PI / 2;
            group.add(rightHandle);
            
            // 4. Latches (Front)
            const latchGeo = new THREE.BoxGeometry(0.02, 0.06, 0.01);
            const l1 = new THREE.Mesh(latchGeo, matSteel);
            l1.position.set(-0.1, h - 0.02, d/2 + 0.005);
            group.add(l1);
            
            const l2 = new THREE.Mesh(latchGeo, matSteel);
            l2.position.set(0.1, h - 0.02, d/2 + 0.005);
            group.add(l2);
            
            // 5. "AMMO" Text Simulation (Yellow Rectangles on Lid)
            // A crude approximation since we avoid complex textures for now
            const textStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.08), matYellow);
            textStrip.rotation.x = -Math.PI / 2;
            textStrip.position.set(0, h + lidH + 0.001, 0);
            group.add(textStrip);
            
            // 6. Collision Box (Invisible, userData tag)
            const col = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({visible:false}));
            col.position.y = h/2;
            col.userData.collidable = true;
            col.userData.isProp = true; // Can be shot
            group.add(col);

            return group;
        }
    };
})();
