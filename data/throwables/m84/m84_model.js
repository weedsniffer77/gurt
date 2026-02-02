
// js/data/throwables/m84/m84_model.js
(function() {
    const throwableDef = window.TacticalShooter.GameData.Throwables["FLASH"];
    if (!throwableDef) return;

    throwableDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        const group = new THREE.Group();
        group.userData.bulletTransparent = true;
        
        // --- MATERIALS ---
        // Inner: Shiny Brass/Gold
        const matInner = new THREE.MeshStandardMaterial({ 
            color: 0xffeeaa, // Pale brass
            roughness: 0.3, 
            metalness: 0.9,
            emissive: 0x443300,
            emissiveIntensity: 0.2
        });
        
        const matDrab = new THREE.MeshStandardMaterial({ 
            color: 0x4b5320, // Olive Drab
            roughness: 0.7, 
            metalness: 0.1, 
            side: THREE.DoubleSide 
        });
        
        const matBand = new THREE.MeshStandardMaterial({ 
            color: 0x88ccff, // Pastel Blue
            roughness: 0.5, 
            metalness: 0.0 
        });
        
        // Fuse Assembly: Black Metal
        const matFuse = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.5, 
            metalness: 0.5 
        });
        
        const matRing = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.9 });
        
        // --- DIMENSIONS ---
        const h = 0.13;
        const capR = 0.024; 
        const bodyR = 0.020; 
        const innerR = 0.018; 
        const capH = 0.02; // Taller caps
        
        // 1. INNER CORE (Brass)
        const coreGeo = new THREE.CylinderGeometry(innerR, innerR, h - 0.01, 16);
        const core = new THREE.Mesh(coreGeo, matInner);
        group.add(core);
        
        // 2. OUTER CASING (Perforated)
        // Texture Generation for circular holes (4:1 Aspect)
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // Visible
        ctx.fillRect(0,0,256,64);
        ctx.fillStyle = '#000000'; // Hole
        
        // Draw circles
        const cols = 6;
        const rows = 2; 
        const cellW = 256 / cols;
        const cellH = 64 / rows;
        
        for(let i=0; i<cols; i++) {
            const x = i * cellW + (cellW/2);
            for(let j=0; j<rows; j++) {
                const y = j * cellH + (cellH/2);
                ctx.beginPath(); 
                ctx.arc(x, y, 11, 0, Math.PI*2); 
                ctx.fill();
            }
        }
        
        const alphaTex = new THREE.CanvasTexture(canvas);
        alphaTex.wrapS = THREE.RepeatWrapping;
        alphaTex.wrapT = THREE.RepeatWrapping;
        
        const matHoles = new THREE.MeshStandardMaterial({ 
            color: 0x4b5320,
            roughness: 0.7, 
            metalness: 0.1,
            alphaMap: alphaTex,
            alphaTest: 0.5,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // Band (Middle)
        const bandH = 0.02;
        // Make band same radius as body to look painted on or flush
        const bandR = bodyR + 0.0001; 
        const band = new THREE.Mesh(new THREE.CylinderGeometry(bandR, bandR, bandH, 24), matBand);
        band.position.y = 0;
        group.add(band);

        // Sections
        const sectionH = (h/2) - (capH) - (bandH/2);
        const topCenterY = (bandH/2) + (sectionH/2);
        const botCenterY = -(bandH/2) - (sectionH/2);
        
        const topPerf = new THREE.Mesh(new THREE.CylinderGeometry(bodyR, bodyR, sectionH, 24), matHoles);
        topPerf.position.y = topCenterY;
        group.add(topPerf);
        
        const botPerf = new THREE.Mesh(new THREE.CylinderGeometry(bodyR, bodyR, sectionH, 24), matHoles);
        botPerf.position.y = botCenterY;
        group.add(botPerf);

        // 3. HEXAGONAL CAPS (Green)
        const capGeo = new THREE.CylinderGeometry(capR, capR, capH, 6); // Hexagon
        
        const topCap = new THREE.Mesh(capGeo, matDrab);
        topCap.position.y = (h/2) - (capH/2);
        topCap.rotation.y = Math.PI/6; // Align flat face
        group.add(topCap);
        
        const botCap = new THREE.Mesh(capGeo, matDrab);
        botCap.position.y = -(h/2) + (capH/2);
        botCap.rotation.y = Math.PI/6;
        group.add(botCap);
        
        // 4. BOTTOM NUT (Small protrusion)
        const nutGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.005, 6);
        const nut = new THREE.Mesh(nutGeo, matDrab);
        nut.position.y = -h/2 - 0.0025;
        group.add(nut);

        // 5. TOP FUSE ASSEMBLY
        const fuseY = h/2;
        // Neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12), matFuse);
        neck.position.y = fuseY + 0.01;
        group.add(neck);
        
        // Platform
        const platGeo = new THREE.BoxGeometry(0.028, 0.008, 0.028);
        const plat = new THREE.Mesh(platGeo, matFuse);
        plat.position.y = fuseY + 0.02;
        group.add(plat);
        
        // Spoon (Black, straight back, curved top)
        const spoonShape = new THREE.Shape();
        spoonShape.moveTo(0, 0);
        spoonShape.lineTo(0, -0.09); // Down along body
        spoonShape.lineTo(0.01, -0.10); // Flare out slightly
        spoonShape.lineTo(0.015, 0.01); // Up to top
        spoonShape.lineTo(0, 0);
        
        const spoonGeo = new THREE.ExtrudeGeometry(spoonShape, { depth: 0.012, bevelEnabled: false });
        spoonGeo.translate(0, 0, -0.006);
        const spoon = new THREE.Mesh(spoonGeo, matFuse);
        spoon.position.set(0.01, fuseY + 0.015, 0);
        spoon.rotation.z = 0.1; // Tilted slightly out
        group.add(spoon);
        
        // Pin & Ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0015, 8, 16), matRing);
        ring.position.set(-0.02, fuseY + 0.015, 0);
        ring.rotation.y = Math.PI / 2;
        group.add(ring);

        // --- RIGGING ---
        const muzzlePoint = new THREE.Object3D();
        muzzlePoint.position.set(0, 0, -0.5);
        group.add(muzzlePoint);
        
        const handR = new THREE.Object3D();
        handR.position.set(0, -0.05, 0.05);
        group.add(handR);
        
        const handL = new THREE.Object3D();
        handL.position.set(-0.05, 0.08, 0);
        group.add(handL);

        return {
            mesh: group,
            parts: {
                muzzle: muzzlePoint,
                handRight: handR,
                handLeft: handL,
                slide: null,
                trigger: null
            }
        };
    };
})();
