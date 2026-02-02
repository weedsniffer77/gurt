
// js/render/material_library.js
(function() {
    const MaterialLibrary = {
        materials: {},
        gridTexture: null,
        noiseTexture: null,
        plywoodTexture: null,
        
        categories: {
            structural: [],
            metal: [],
            organic: [],
            painted: []
        },
        
        init() {
            console.log('MaterialLibrary: Building simple materials...');
            
            // Create base textures
            this.gridTexture = this.createGridTexture();
            this.noiseTexture = this.createNoiseTexture('#665544', '#443322'); 
            this.plywoodTexture = this.createPlywoodTexture();

            // Color palette
            const colors = {
                wood: 0x8f6a4e,
                containerBlue: 0x3a506b,
                containerRed: 0x7a3e3e, 
                containerGreen: 0x4a5d4a,
                containerGrey: 0x555555,
                containerYellow: 0xffc800, 
                containerOrange: 0xcc6633, 
                concreteBase: 0x555555,
                floorBase: 0x777777,
                wallBase: 0xcccccc 
            };
            
            // ===== STRUCTURAL =====
            this.materials.floor = new THREE.MeshStandardMaterial({
                name: 'floor',
                color: colors.floorBase,
                map: this.gridTexture,
                roughness: 0.9, metalness: 0.0
            });
            this.categories.structural.push(this.materials.floor);

            // Reverted to simple grey
            this.materials.trainingFloor = new THREE.MeshStandardMaterial({
                name: 'trainingFloor',
                color: 0x999999,
                map: this.gridTexture, // Reusing grid for clean look
                roughness: 0.9, 
                metalness: 0.0
            });
            this.categories.structural.push(this.materials.trainingFloor);

            this.materials.trainingWall = new THREE.MeshStandardMaterial({
                name: 'trainingWall',
                color: 0x8a857b, 
                roughness: 0.95,
                metalness: 0.0
            });
            this.categories.structural.push(this.materials.trainingWall);

            this.materials.warehouseFloor = new THREE.MeshStandardMaterial({
                name: 'warehouseFloor',
                color: 0x888877,
                map: this.noiseTexture,
                roughness: 0.8, metalness: 0.1
            });
            this.categories.structural.push(this.materials.warehouseFloor);
            
            this.materials.wall = new THREE.MeshStandardMaterial({
                name: 'wall',
                color: colors.wallBase,
                map: this.gridTexture,
                roughness: 1.0, metalness: 0.0
            });
            this.categories.structural.push(this.materials.wall);
            
            this.materials.platform = new THREE.MeshStandardMaterial({
                name: 'platform',
                color: 0xaaaaaa, map: this.gridTexture,
                roughness: 1.0, metalness: 0.0
            });
            this.categories.structural.push(this.materials.platform);
            
            this.materials.cover = new THREE.MeshStandardMaterial({
                name: 'cover',
                color: 0x557799, map: this.gridTexture,
                roughness: 0.6, metalness: 0.3
            });
            this.categories.structural.push(this.materials.cover);
            
            this.materials.concrete = new THREE.MeshStandardMaterial({
                name: 'concrete',
                color: colors.concreteBase,
                roughness: 0.95, metalness: 0.0
            });
            this.categories.structural.push(this.materials.concrete);
            
            // ===== METAL =====
            this.materials.barrelRed = new THREE.MeshStandardMaterial({
                name: 'barrelRed',
                color: 0xaa2222, roughness: 0.7, metalness: 0.2
            });
            this.categories.metal.push(this.materials.barrelRed);
            
            this.materials.steel = new THREE.MeshStandardMaterial({
                name: 'steel',
                color: 0x888888, roughness: 0.4, metalness: 0.8
            });
            this.categories.metal.push(this.materials.steel);

            // Reverted Rust to simple color
            this.materials.rust = new THREE.MeshStandardMaterial({
                name: 'rust',
                color: 0x8b4513, 
                roughness: 1.0,
                metalness: 0.1
            });
            this.categories.metal.push(this.materials.rust);

            // Updated Corrugated Rust: Redder and Darker
            this.materials.corrugatedRust = new THREE.MeshStandardMaterial({
                name: 'corrugatedRust',
                color: 0x9e4b35, // Darker/Redder Rust
                roughness: 0.8,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            this.categories.metal.push(this.materials.corrugatedRust);
            
            // ===== CONTAINERS =====
            const containerTypes = [
                { id: 'containerBlue', color: colors.containerBlue },
                { id: 'containerRed', color: colors.containerRed },
                { id: 'containerGreen', color: colors.containerGreen },
                { id: 'containerGrey', color: colors.containerGrey },
                { id: 'containerYellow', color: colors.containerYellow }, 
                { id: 'containerOrange', color: colors.containerOrange }  
            ];

            containerTypes.forEach(type => {
                this.materials[type.id] = new THREE.MeshStandardMaterial({
                    name: type.id,
                    color: type.color,
                    roughness: 0.7,
                    metalness: 0.15,
                    side: THREE.DoubleSide
                });
                this.categories.painted.push(this.materials[type.id]);

                this.materials[`${type.id}Flat`] = new THREE.MeshStandardMaterial({
                    name: `${type.id}Flat`,
                    color: type.color,
                    roughness: 0.7,
                    metalness: 0.15
                });
            });
            
            // ===== ORGANIC =====
            this.materials.palletWood = new THREE.MeshStandardMaterial({
                name: 'palletWood',
                color: colors.wood,
                roughness: 0.9, metalness: 0.0
            });
            this.categories.organic.push(this.materials.palletWood);

            this.materials.plywood = new THREE.MeshStandardMaterial({
                name: 'plywood',
                color: 0xeebb99,
                map: this.plywoodTexture,
                roughness: 0.8, metalness: 0.0
            });
            this.categories.organic.push(this.materials.plywood);

            this.materials.rubber = new THREE.MeshStandardMaterial({
                name: 'rubber',
                color: 0x1a1a1a,
                roughness: 0.9, metalness: 0.0
            });
            
            // ===== LOBBY =====
            this.materials.lobbyFloor = new THREE.MeshStandardMaterial({ color: 0x05090e, roughness: 0.8, metalness: 0.1 });
            this.materials.lobbyBuilding = new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.7, metalness: 0.0 });
            this.materials.lobbyContainer = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.6, metalness: 0.2 });
            this.materials.lobbyBorder = new THREE.MeshBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
            
            this.materials.zoneBlue = new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            this.materials.zoneRed = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            this.materials.zoneYellow = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            this.materials.zoneGreen = new THREE.MeshBasicMaterial({ color: 0x00ccaa, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

            // ===== GAMEPLAY OBJECTS (UPDATED FOR NIGHT MODE) =====
            // These were previously Basic (unlit). Changed to Standard to react to lighting.
            
            // Blue Paint Stripe
            this.materials.paintBlue = new THREE.MeshStandardMaterial({ 
                name: 'paintBlue',
                color: 0x507090, 
                roughness: 0.9,
                metalness: 0.0
            });
            this.categories.painted.push(this.materials.paintBlue);

            // Red Paint Stripe
            this.materials.paintRed = new THREE.MeshStandardMaterial({ 
                name: 'paintRed',
                color: 0x905050, 
                roughness: 0.9,
                metalness: 0.0
            });
            this.categories.painted.push(this.materials.paintRed);

            Object.values(this.materials).forEach(mat => {
                if (mat.isMaterial) {
                    mat.shadowSide = THREE.FrontSide;
                    mat.needsUpdate = true;
                }
            });
            
            console.log('MaterialLibrary: ✓ Simple materials ready');
        },
        
        dispose() {
            // ... (Dispose logic same as before) ...
            console.log('MaterialLibrary: Disposing resources...');
            [this.gridTexture, this.noiseTexture, this.plywoodTexture].forEach(t => { if(t) t.dispose(); });
            Object.values(this.materials).forEach(mat => { if(mat.dispose) mat.dispose(); });
            this.materials = {};
            this.categories = { structural: [], metal: [], organic: [], painted: [] };
        },
        
        createGridTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#999999'; ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = '#777777'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, 512, 512);
            ctx.fillStyle = '#aaaaaa'; ctx.fillRect(4, 4, 504, 504);
            const t = new THREE.CanvasTexture(canvas);
            t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 16;
            return t;
        },

        createNoiseTexture(colorA, colorB, size = 256) {
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = colorA; ctx.fillRect(0,0,size,size);
            const idata = ctx.getImageData(0,0,size,size);
            const buffer = idata.data;
            const c2 = new THREE.Color(colorB);
            const r2 = c2.r*255, g2=c2.g*255, b2=c2.b*255;
            for(let i=0; i<buffer.length; i+=4) {
                if (Math.random() > 0.6) {
                    buffer[i] = r2 + (Math.random()-0.5)*30;
                    buffer[i+1] = g2 + (Math.random()-0.5)*30;
                    buffer[i+2] = b2 + (Math.random()-0.5)*30;
                }
            }
            ctx.putImageData(idata, 0, 0);
            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(4, 4);
            return tex;
        },

        createPlywoodTexture() {
            const size = 256;
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            // Darker base for wood to look better at night
            ctx.fillStyle = '#cc9977'; ctx.fillRect(0,0,size,size);
            ctx.fillStyle = '#bb8866';
            for(let i=0; i<200; i++) {
                const w = Math.random()*50 + 20;
                const h = 2;
                const x = Math.random()*size;
                const y = Math.random()*size;
                ctx.fillRect(x,y,w,h);
            }
            const tex = new THREE.CanvasTexture(canvas);
            return tex;
        },
        
        getMaterial(name) {
            return this.materials[name] || this.materials.floor;
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.MaterialLibrary = MaterialLibrary;
})();
