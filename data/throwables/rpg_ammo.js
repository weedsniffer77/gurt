
// js/data/throwables/rpg_ammo.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Throwables: {} };
    
    const THREE = window.THREE;
    const mm = 0.001;

    // --- SHARED MODEL BUILDER FOR ROCKETS PREVIEW ---
    const buildRocketMesh = (isOGV) => {
        if (!window.THREE) return null;
        const group = new THREE.Group();
        group.userData.bulletTransparent = true;
        
        const matGreen = new THREE.MeshStandardMaterial({ color: 0x3d4435, roughness: 0.7, metalness: 0.2 });
        const matGrey = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.3 });
        const matAlum = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });
        const matFin = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide });

        const rocket = new THREE.Group();
        // Angle for preview
        rocket.rotation.y = Math.PI / 4; 
        rocket.rotation.z = Math.PI / 4; 
        group.add(rocket);
        
        if (isOGV) {
            // OGV-7 (Frag)
            const bodyLen = 0.35;
            const body = new THREE.Mesh(new THREE.CylinderGeometry(19.5*mm, 19.5*mm, bodyLen, 16).rotateX(-Math.PI/2), matGrey);
            rocket.add(body);
            
            const cap = new THREE.Mesh(new THREE.SphereGeometry(19.5*mm, 16, 16, 0, Math.PI*2, 0, Math.PI/2), matGrey);
            cap.rotation.x = -Math.PI/2;
            cap.position.z = -bodyLen/2; // Top
            rocket.add(cap);
            
            const fuse = new THREE.Mesh(new THREE.CylinderGeometry(5*mm, 5*mm, 0.04, 8).rotateX(-Math.PI/2), matAlum);
            fuse.position.z = -bodyLen/2 - 0.02;
            rocket.add(fuse);
        } else {
            // PG-7V (HEAT) - Updated to match rpg7_model.js shifted positions
            const noseLen = 0.10;
            const noseRad = 0.015;
            const nose = new THREE.Mesh(new THREE.CylinderGeometry(6*mm, noseRad, noseLen, 16).rotateX(-Math.PI/2), matGreen);
            nose.position.z = -0.30; 
            rocket.add(nose);
            
            const fuse = new THREE.Mesh(new THREE.CylinderGeometry(4*mm, 4*mm, 0.02).rotateX(-Math.PI/2), matAlum);
            fuse.position.z = -0.36;
            rocket.add(fuse);
            
            const bulbLen = 0.15;
            const bulbRad = 0.052;
            const b1 = new THREE.Mesh(new THREE.CylinderGeometry(noseRad, bulbRad, bulbLen, 16).rotateX(-Math.PI/2), matGreen);
            b1.position.z = -0.175;
            rocket.add(b1);
            
            const b2Len = 0.08;
            const b2 = new THREE.Mesh(new THREE.CylinderGeometry(bulbRad, 18*mm, b2Len, 16).rotateX(-Math.PI/2), matGreen);
            b2.position.z = -0.06;
            rocket.add(b2);
            
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(18*mm, 18*mm, 0.2, 12).rotateX(-Math.PI/2), matGreen);
            stem.position.z = 0.03;
            rocket.add(stem);
        }
        
        // Fins
        const finGeo = new THREE.BoxGeometry(0.002, 0.08, 0.04);
        for(let i=0; i<4; i++) {
            const f = new THREE.Mesh(finGeo, matFin);
            f.position.z = 0.18; 
            f.rotation.z = i * (Math.PI/2);
            f.position.add(new THREE.Vector3(0, 0.03, 0).applyAxisAngle(new THREE.Vector3(0,0,1), f.rotation.z));
            rocket.add(f);
        }

        // Rigging (Hide Hands)
        const handR = new THREE.Object3D(); handR.position.set(0, -100, 0); group.add(handR);
        const handL = new THREE.Object3D(); handL.position.set(0, -100, 0); group.add(handL);
        const muzzle = new THREE.Object3D(); group.add(muzzle);

        return { mesh: group, parts: { muzzle: muzzle, handRight: handR, handLeft: handL, slide: null } };
    };

    // --- DEFINITIONS ---
    
    window.TacticalShooter.GameData.Throwables["AMMO_PG7V"] = {
        id: "AMMO_PG7V",
        name: "PG-7V (HEAT)",
        type: "ammo", 
        slotType: "rocket", 
        count: 4, // 4 Reserve (Total 5 with 1 loaded in gun if equipped)
        ammoPoolType: 'rocket_heat',
        visuals: { hipPosition: { x: 0, y: 0, z: 0 }, remoteIK: { rightElbow: null, leftElbow: null } },
        buildMesh: function() { return buildRocketMesh(false); }
    };

    window.TacticalShooter.GameData.Throwables["AMMO_OGV7"] = {
        id: "AMMO_OGV7",
        name: "OG-7V (FRAG)",
        type: "ammo", 
        slotType: "rocket", 
        count: 4, // 4 Reserve
        ammoPoolType: 'rocket_frag',
        visuals: { hipPosition: { x: 0, y: 0, z: 0 }, remoteIK: { rightElbow: null, leftElbow: null } },
        buildMesh: function() { return buildRocketMesh(true); }
    };
    
    console.log('RPG Ammo Items Loaded (Updated Models)');
})();
