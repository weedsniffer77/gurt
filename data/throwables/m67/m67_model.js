
// js/data/throwables/m67/m67_model.js
(function() {
    const throwableDef = window.TacticalShooter.GameData.Throwables["FRAG"];
    if (!throwableDef) return;

    // Helper to generate text texture
    function createM67Texture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Base Olive Drab
        ctx.fillStyle = '#4b5320';
        ctx.fillRect(0, 0, size, size);
        
        // Noise
        for(let i=0; i<10000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
            ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
        }
        
        // Yellow Text Block
        ctx.fillStyle = '#eebb33'; // Muted yellow
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        
        const cx = size/2;
        const cy = size/2;
        
        ctx.fillText("GRENADE, HAND", cx, cy - 20);
        ctx.fillText("FRAG, DELAY, M67", cx, cy + 10);
        ctx.font = '18px Arial';
        ctx.fillText("LS-56-641", cx, cy + 40);
        
        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    }

    throwableDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        const group = new THREE.Group();
        group.userData.bulletTransparent = true;
        
        // Materials
        const tex = createM67Texture();
        const matBody = new THREE.MeshStandardMaterial({ 
            map: tex,
            roughness: 0.8, 
            metalness: 0.1,
            color: 0xffffff 
        });
        
        const matFuse = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.8 }); 
        const matLever = new THREE.MeshStandardMaterial({ color: 0x3a402e, roughness: 0.7, metalness: 0.2 }); 
        const matRing = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.9 }); 
        
        // --- BODY ---
        const r = 0.032; 
        const bodyGeo = new THREE.SphereGeometry(r, 24, 24);
        const body = new THREE.Mesh(bodyGeo, matBody);
        body.rotation.y = -Math.PI / 2;
        body.castShadow = true;
        group.add(body);
        
        // --- FUSE NECK ---
        const fuseBaseGeo = new THREE.CylinderGeometry(0.01, 0.012, 0.015, 16);
        const fuseBase = new THREE.Mesh(fuseBaseGeo, matFuse);
        fuseBase.position.y = r + 0.005;
        group.add(fuseBase);
        
        const fuseTopGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 16);
        const fuseTop = new THREE.Mesh(fuseTopGeo, matFuse);
        fuseTop.position.y = r + 0.015;
        group.add(fuseTop);
        
        // --- CURVED SPOON ---
        const curvePath = new THREE.CurvePath();
        const startY = r + 0.02;
        
        const line1 = new THREE.LineCurve3(
            new THREE.Vector3(0, startY, 0),
            new THREE.Vector3(0.02, startY + 0.002, 0) 
        );
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.02, startY + 0.002, 0),
            new THREE.Vector3(0.055, 0, 0), 
            new THREE.Vector3(0.02, -r * 0.8, 0)
        );
        curvePath.add(line1);
        curvePath.add(curve);
        
        const spoonShape = new THREE.Shape();
        const sw = 0.008; 
        spoonShape.moveTo(-sw, 0);
        spoonShape.lineTo(sw, 0);
        spoonShape.lineTo(sw, 0.0015);
        spoonShape.lineTo(-sw, 0.0015);
        spoonShape.lineTo(-sw, 0);
        
        const spoonGeo = new THREE.ExtrudeGeometry(spoonShape, {
            extrudePath: curvePath,
            steps: 24,
            bevelEnabled: false
        });
        
        const spoon = new THREE.Mesh(spoonGeo, matLever);
        spoon.castShadow = true;
        group.add(spoon);
        
        // --- PIN GROUP (New) ---
        const pinGroup = new THREE.Group();
        pinGroup.name = "PIN_GROUP"; // Tag for removal on throw
        pinGroup.position.set(0, r + 0.012, 0);
        group.add(pinGroup);

        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.035, 8), matRing);
        pin.rotation.z = Math.PI / 2;
        pinGroup.add(pin);
        
        const ringGeo = new THREE.TorusGeometry(0.012, 0.0015, 8, 24);
        const ring = new THREE.Mesh(ringGeo, matRing);
        ring.position.set(-0.025, -0.007, 0); // Local to group
        ring.rotation.y = Math.PI / 2;
        ring.rotation.x = 0.2; 
        pinGroup.add(ring);

        // --- RIGGING ---
        const muzzlePoint = new THREE.Object3D(); muzzlePoint.position.set(0, 0, -0.5); group.add(muzzlePoint);
        const handR = new THREE.Object3D(); handR.position.set(0, -0.05, 0.05); group.add(handR);
        const handL = new THREE.Object3D(); handL.position.set(-0.05, 0.08, 0); group.add(handL);

        // --- ANIMATION UPDATE ---
        group.userData.updateAnimation = (dt, chargeTime) => {
            if (chargeTime > 0) {
                // Pull Pin Out animation
                const p = Math.min(1.0, chargeTime / 0.3); // 0.3s to pull pin
                // Move Left
                pinGroup.position.x = -0.05 * p;
                // Rotate to simulate finger pull
                pinGroup.rotation.y = 0.5 * p; 
                pinGroup.rotation.z = -0.5 * p;
            } else {
                // Reset
                pinGroup.position.x = 0;
                pinGroup.rotation.set(0,0,0);
            }
        };

        return {
            mesh: group,
            parts: {
                muzzle: muzzlePoint,
                handRight: handR,
                handLeft: handL,
                pin: pinGroup // Return pin for reference if needed
            }
        };
    };
})();
