
// js/data/scorestreaks/fpv_drone_model.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.DroneModel = {
        buildMesh: function() {
            if (!window.THREE) return null;
            const THREE = window.THREE;
            const group = new THREE.Group();
            
            const matDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.4 });
            const matCarbon = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.2 });
            const matProp = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.1 });
            const matTape = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0, metalness: 0.0 });
            const matLens = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1, metalness: 0.9 });
            const matCamBody = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7, metalness: 0.5 });
            
            // Warhead Mats
            const matWarheadGreen = new THREE.MeshStandardMaterial({ color: 0x3d4435, roughness: 0.7, metalness: 0.2 });
            const matAlum = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });
            
            // --- SCALED FRAME (2x) ---
            const S = 2.0;

            // 1. Sleek Central Body
            const plateGeo = new THREE.BoxGeometry(0.12 * S, 0.015 * S, 0.22 * S);
            const plate = new THREE.Mesh(plateGeo, matCarbon);
            plate.castShadow = true;
            group.add(plate);
            
            // Electronics stack
            const stackGeo = new THREE.BoxGeometry(0.08 * S, 0.04 * S, 0.12 * S);
            const stack = new THREE.Mesh(stackGeo, matDark);
            stack.position.y = 0.0275 * S;
            stack.castShadow = true;
            group.add(stack);
            
            // Battery block (Rear top)
            const battGeo = new THREE.BoxGeometry(0.06 * S, 0.03 * S, 0.10 * S);
            const batt = new THREE.Mesh(battGeo, new THREE.MeshStandardMaterial({color:0x3366cc}));
            batt.position.set(0, 0.0625 * S, 0.02 * S);
            batt.castShadow = true;
            group.add(batt);
            
            // Strap for battery
            const strap = new THREE.Mesh(new THREE.BoxGeometry(0.065 * S, 0.035 * S, 0.02 * S), matTape);
            strap.position.set(0, 0.0625 * S, 0.02 * S);
            group.add(strap);
            
            // 2. Arms (Thin Carbon Tubes)
            const armLen = 0.35 * S;
            const armThick = 0.012 * S;
            const armGeo = new THREE.BoxGeometry(armLen, 0.005 * S, armThick);
            
            const arm1 = new THREE.Mesh(armGeo, matCarbon);
            arm1.rotation.y = Math.PI / 4;
            group.add(arm1);
            
            const arm2 = new THREE.Mesh(armGeo, matCarbon);
            arm2.rotation.y = -Math.PI / 4;
            group.add(arm2);
            
            // 3. Motors & Props
            const props = [];
            // Positions adjusted for scale
            const offset = 0.12 * S;
            const propPositions = [
                { x: offset, z: -offset },
                { x: -offset, z: -offset },
                { x: offset, z: offset },
                { x: -offset, z: offset }
            ];
            
            propPositions.forEach((pos, i) => {
                // Motor
                const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * S, 0.015 * S, 0.02 * S, 12), matDark);
                motor.position.set(pos.x, 0.015 * S, pos.z);
                group.add(motor);
                
                // 3-Blade Prop
                const propGroup = new THREE.Group();
                propGroup.position.set(pos.x, 0.025 * S, pos.z);
                
                const bladeGeo = new THREE.BoxGeometry(0.012 * S, 0.002 * S, 0.12 * S);
                // Translate so pivot is at end
                bladeGeo.translate(0, 0, 0.06 * S); 
                
                for(let b=0; b<3; b++) {
                    const blade = new THREE.Mesh(bladeGeo, matProp);
                    blade.rotation.y = (Math.PI * 2 / 3) * b;
                    // Tilt for pitch
                    blade.rotation.x = 0.1; 
                    propGroup.add(blade);
                }
                
                // Nut
                const nut = new THREE.Mesh(new THREE.ConeGeometry(0.005 * S, 0.01 * S, 8), matAlum);
                nut.position.y = 0.005 * S;
                propGroup.add(nut);
                
                group.add(propGroup);
                props.push(propGroup);
            });
            
            // 4. Payload: PG-7V Rocket (Underneath)
            // NO SCALE applied to rocket, kept realistic size
            const rocketGroup = new THREE.Group();
            // Attach lower
            rocketGroup.position.set(0, -0.05 * S, 0.05); 
            group.add(rocketGroup);
            
            const mm = 0.001;
            
            // --- PG-7V GEOMETRY (Standard Size) ---
            const noseLen = 0.10;
            const noseRad = 0.015;
            const nose = new THREE.Mesh(new THREE.CylinderGeometry(6*mm, noseRad, noseLen, 16).rotateX(-Math.PI/2), matWarheadGreen);
            nose.position.z = -0.30; 
            rocketGroup.add(nose);
            
            const fuse = new THREE.Mesh(new THREE.CylinderGeometry(4*mm, 4*mm, 0.02).rotateX(-Math.PI/2), matAlum);
            fuse.position.z = -0.36; 
            rocketGroup.add(fuse);
            
            const bulbLen = 0.15; 
            const bulbRad = 0.052; 
            const b1 = new THREE.Mesh(new THREE.CylinderGeometry(noseRad, bulbRad, bulbLen, 16).rotateX(-Math.PI/2), matWarheadGreen);
            b1.position.z = -0.175; 
            rocketGroup.add(b1);
            
            const b2Len = 0.08;
            const b2 = new THREE.Mesh(new THREE.CylinderGeometry(bulbRad, 18*mm, b2Len, 16).rotateX(-Math.PI/2), matWarheadGreen);
            b2.position.z = -0.06; 
            rocketGroup.add(b2);
            
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(18*mm, 18*mm, 0.2, 12).rotateX(-Math.PI/2), matWarheadGreen);
            stem.position.z = 0.03; 
            rocketGroup.add(stem);
            
            // 5. Tape Straps
            const tapeGeo = new THREE.CylinderGeometry(20*mm, 20*mm, 0.03, 16).rotateX(Math.PI/2);
            const t1 = new THREE.Mesh(tapeGeo, matTape);
            t1.position.set(0, 0.01, -0.05); 
            t1.scale.set(1, 1.2 * S, 1); // Stretch vertically to wrap plate
            rocketGroup.add(t1);
            
            const t2 = new THREE.Mesh(tapeGeo, matTape);
            t2.position.set(0, 0.01, 0.08); 
            t2.scale.set(1, 1.2 * S, 1);
            rocketGroup.add(t2);

            // 6. Camera (Front) - Scaled with Drone
            const camGroup = new THREE.Group();
            // Move forward based on scaled plate length (0.22*S length -> +/- 0.11*S)
            // Lens should be at front edge
            const camZ = -0.11 * S;
            camGroup.position.set(0, 0.01 * S, camZ);
            camGroup.rotation.x = Math.PI / 8; 
            group.add(camGroup);
            
            const camBoxGeo = new THREE.BoxGeometry(0.04 * S, 0.03 * S, 0.03 * S);
            const camBox = new THREE.Mesh(camBoxGeo, matCamBody);
            camGroup.add(camBox);
            
            const lensGeo = new THREE.CylinderGeometry(0.012 * S, 0.012 * S, 0.01 * S, 16);
            lensGeo.rotateX(Math.PI/2);
            const lensMesh = new THREE.Mesh(lensGeo, matLens);
            lensMesh.position.z = -0.016 * S; // Local front of camera box
            camGroup.add(lensMesh);
            
            // Metadata for Controller: Lens World Offset Local Z
            // CamGroup Z = camZ. Lens local Z = -0.016*S.
            // Total Z = camZ + (-0.016*S) = -0.11*S - 0.016*S.
            group.userData.lensZ = camZ - (0.016 * S); 
            group.userData.lensY = 0.01 * S;
            
            // Antenna
            const antGeo = new THREE.CylinderGeometry(0.002 * S, 0.002 * S, 0.08 * S);
            const ant = new THREE.Mesh(antGeo, matDark);
            ant.position.set(0.03 * S, 0.06 * S, 0.08 * S);
            group.add(ant);

            group.userData.props = props;
            
            return group;
        }
    };
    console.log("DroneModel loaded (Scaled Frame).");
})();
