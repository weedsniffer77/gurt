
// js/data/throwables/m83/m83_model.js
(function() {
    const throwableDef = window.TacticalShooter.GameData.Throwables["SMOKE"];
    if (!throwableDef) return;

    function createM83Texture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Forest Green Body
        ctx.fillStyle = '#3a4a3a';
        ctx.fillRect(0, 0, size, size);
        
        // Light noise
        for(let i=0; i<5000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)';
            ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
        }
        
        // White Text
        ctx.fillStyle = '#eeeeee';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        
        const cx = size/2;
        const cy = size/2;
        
        ctx.fillText("M83", cx, cy - 40);
        ctx.fillText("SMOKE", cx, cy);
        ctx.fillText("TA", cx, cy + 40);
        
        ctx.font = '18px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText("PB-08D501-016", cx, cy + 100);
        
        // Stripe
        ctx.fillStyle = '#88aaaa'; // Light blue-ish stripe
        ctx.fillRect(0, cy + 60, size, 10);

        return new THREE.CanvasTexture(canvas);
    }

    throwableDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        const group = new THREE.Group();
        group.userData.bulletTransparent = true;
        
        const tex = createM83Texture();
        const matBody = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.1 });
        const matMetal = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.6 });
        const matRing = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 });
        
        // --- ROTATION FIX ---
        // Container for geometry, rotated so cylinder points UP (Y) relative to hand
        const verticalGroup = new THREE.Group();
        // Previous rotation might have been wrong. 
        // Standard grip orientation: +Y is Up.
        // Cylinder default: Y-Aligned. 
        // We simply add it to verticalGroup.
        
        const r = 0.03;
        const h = 0.12;
        
        // --- BODY (Cylinder) ---
        const bodyGeo = new THREE.CylinderGeometry(r, r, h, 24);
        const body = new THREE.Mesh(bodyGeo, matBody);
        body.castShadow = true;
        verticalGroup.add(body);
        
        // Top cap
        const capGeo = new THREE.CylinderGeometry(r*0.9, r, 0.01, 24);
        const cap = new THREE.Mesh(capGeo, matMetal);
        cap.position.y = h/2 + 0.005; 
        verticalGroup.add(cap);
        
        // Fuse Assembly
        const fuseGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.02, 12);
        const fuse = new THREE.Mesh(fuseGeo, matMetal);
        fuse.position.y = h/2 + 0.015;
        verticalGroup.add(fuse);
        
        // Spoon
        const spoonShape = new THREE.Shape();
        spoonShape.moveTo(-0.008, 0);
        spoonShape.lineTo(0.008, 0);
        spoonShape.lineTo(0.008, -0.11);
        spoonShape.lineTo(-0.008, -0.11);
        
        const spoonGeo = new THREE.ExtrudeGeometry(spoonShape, { depth: 0.002, bevelEnabled: false });
        const spoon = new THREE.Mesh(spoonGeo, matMetal);
        spoon.position.set(0, h/2 + 0.015, r + 0.002);
        // Curve slighty? Flat for M83 usually. Rotate slightly to lay flat.
        spoon.rotation.x = 0.05; 
        verticalGroup.add(spoon);
        
        // --- PIN GROUP (For Animation) ---
        const pinGroup = new THREE.Group();
        pinGroup.name = "PIN_GROUP";
        pinGroup.position.set(0, h/2 + 0.015, 0); 
        verticalGroup.add(pinGroup);
        
        const pinGeo = new THREE.CylinderGeometry(0.001, 0.001, 0.04, 8);
        const pin = new THREE.Mesh(pinGeo, matRing);
        pin.rotation.z = Math.PI / 2;
        pinGroup.add(pin);
        
        const ringGeo = new THREE.TorusGeometry(0.012, 0.0015, 8, 16);
        const ring = new THREE.Mesh(ringGeo, matRing);
        ring.position.x = -0.02;
        ring.rotation.y = Math.PI/2;
        pinGroup.add(ring);
        
        group.add(verticalGroup);

        // --- RIGGING ---
        const muzzlePoint = new THREE.Object3D(); muzzlePoint.position.set(0, 0, -0.5); group.add(muzzlePoint);
        const handR = new THREE.Object3D(); handR.position.set(0, -0.05, 0.05); group.add(handR);
        const handL = new THREE.Object3D(); handL.position.set(-0.05, 0.08, 0); group.add(handL);

        // Animation Logic for Pin
        group.userData.updateAnimation = (dt, chargeTime) => {
            if (chargeTime > 0) {
                // Pull out
                const p = Math.min(1.0, chargeTime / 0.3);
                pinGroup.position.x = -0.05 * p;
                pinGroup.rotation.y = 0.5 * p;
                pinGroup.rotation.z = -0.5 * p;
            } else {
                // Reset
                pinGroup.position.x = 0;
                pinGroup.rotation.set(0,0,0);
            }
        };

        return { mesh: group, parts: { pin: pinGroup, handRight: handR, handLeft: handL } };
    };
})();
