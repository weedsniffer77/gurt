
// js/data/common_parts.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    
    const CommonParts = {
        
        // Materials Helper
        getMaterials: function() {
            if (!window.THREE) return null;
            const THREE = window.THREE;
            
            return {
                body: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.8 }),
                glass: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }),
                frame: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.3 }),
                lens: new THREE.MeshBasicMaterial({ color: 0xeeffff }),
                laser: new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
                polymer: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 }),
                matte: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9, metalness: 0.1 })
            };
        },
        
        createReticleMat: function(color, style) {
            const THREE = window.THREE;
            const shader = (style === 1) ? window.TacticalShooter.Shaders.HoloShader : window.TacticalShooter.Shaders.RedDotShader;
            if (shader) {
                const mat = new THREE.ShaderMaterial({
                    uniforms: THREE.UniformsUtils.clone(shader.uniforms),
                    vertexShader: shader.vertexShader,
                    fragmentShader: shader.fragmentShader,
                    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
                });
                mat.uniforms.reticleColor.value = new THREE.Color(color);
                return mat;
            }
            return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        },

        // Build Red Dot Sight Mesh
        buildRedDot: function() {
            const THREE = window.THREE;
            const group = new THREE.Group();
            const mats = this.getMaterials();
            
            // Base Mount
            const base = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.006, 0.04), mats.body);
            base.position.y = 0.003;
            group.add(base);
            
            // Frame
            const fThick = 0.003;
            const fW = 0.03; const fH = 0.025;
            const fZ = -0.015; 
            const fY = 0.006 + fH/2; 
            
            const fl = new THREE.Mesh(new THREE.BoxGeometry(fThick, fH, 0.005), mats.body); fl.position.set(-fW/2, fY, fZ); group.add(fl);
            const fr = new THREE.Mesh(new THREE.BoxGeometry(fThick, fH, 0.005), mats.body); fr.position.set(fW/2, fY, fZ); group.add(fr);
            const ft = new THREE.Mesh(new THREE.BoxGeometry(fW, fThick, 0.005), mats.body); ft.position.set(0, fY+fH/2, fZ); group.add(ft);
            const fb = new THREE.Mesh(new THREE.BoxGeometry(fW, fThick, 0.005), mats.body); fb.position.set(0, fY-fH/2, fZ); group.add(fb);
            
            // Lens
            const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.018), this.createReticleMat(0xff0000, 0));
            lens.position.set(0, fY, fZ + 0.003); 
            lens.rotation.y = Math.PI;
            group.add(lens);
            
            return { mesh: group, aimY: fY };
        },
        
        // Build Holographic Sight Mesh
        buildHolo: function() {
            const THREE = window.THREE;
            const group = new THREE.Group();
            const mats = this.getMaterials();
            
            const w = 0.036; const h = 0.035; const l = 0.05; const t = 0.003;
            
            // Base
            const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, l), mats.body);
            base.position.y = 0.004;
            group.add(base);
            
            // Hood
            const hoodH = 0.035;
            const hoodY = 0.008 + hoodH/2;
            
            const lw = new THREE.Mesh(new THREE.BoxGeometry(t, hoodH, l), mats.body); lw.position.set(-w/2+t/2, hoodY, 0); group.add(lw);
            const rw = new THREE.Mesh(new THREE.BoxGeometry(t, hoodH, l), mats.body); rw.position.set(w/2-t/2, hoodY, 0); group.add(rw);
            const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, l), mats.body); top.position.set(0, hoodY+hoodH/2, 0); group.add(top);
            
            // Lens
            const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.025), this.createReticleMat(0xffffff, 1));
            lens.position.set(0, hoodY, 0); 
            lens.rotation.y = Math.PI;
            group.add(lens);
            
            return { mesh: group, aimY: hoodY };
        },

        // Build Flashlight
        buildFlashlight: function() {
            const THREE = window.THREE;
            const group = new THREE.Group();
            const mats = this.getMaterials();
            
            // Mount (connects to rail)
            const mount = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.04), mats.body);
            mount.position.set(-0.01, 0, 0); // Offset to side
            group.add(mount);
            
            // Main Body
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 16), mats.body);
            body.rotation.x = Math.PI / 2; // Cylinder defaults Y-up, now Z-aligned
            group.add(body);
            
            // Head (Wider)
            const head = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.025, 16), mats.body);
            head.rotation.x = Math.PI / 2;
            head.position.z = -0.0525; // Forward
            group.add(head);
            
            // Lens (Disk)
            const lens = new THREE.Mesh(new THREE.CircleGeometry(0.013, 16), mats.lens);
            lens.rotation.y = Math.PI; 
            lens.position.z = -0.066; // Slightly in front of head
            
            // Name it so GunRenderer can find it to attach the SpotLight
            lens.name = "ATTACHMENT_FLASHLIGHT_LENS";
            group.add(lens);
            
            return { mesh: group, type: 'flashlight' };
        },

        // Build Green Laser
        buildGreenLaser: function() {
            const THREE = window.THREE;
            const group = new THREE.Group();
            const mats = this.getMaterials();
            
            // Box Body
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.018, 0.06), mats.polymer);
            group.add(box);
            
            // Mount
            const mount = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.015, 0.04), mats.body);
            mount.position.set(0.016, 0, 0); 
            group.add(mount);
            
            // Emitter Nodule
            const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.01, 12), mats.body);
            emitter.rotation.x = Math.PI / 2;
            emitter.position.z = -0.035;
            group.add(emitter);
            
            // Dot (Visual only)
            const dot = new THREE.Mesh(new THREE.CircleGeometry(0.002, 8), mats.laser);
            dot.rotation.y = Math.PI; // Face Forward (-Z)
            dot.position.z = -0.041;
            
            // Name it so GunRenderer can find it
            dot.name = "ATTACHMENT_LASER_EMITTER";
            group.add(dot);
            
            return { mesh: group, type: 'laser' };
        },
        
        // Build Birdcage Flash Hider
        buildFlashHider: function() {
            const THREE = window.THREE;
            const group = new THREE.Group();
            const mats = this.getMaterials();
            
            // Base Ring
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.01, 12), mats.matte);
            base.rotation.x = Math.PI / 2;
            group.add(base);
            
            // Cage
            const cageLen = 0.04;
            const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.01, cageLen, 12), mats.matte);
            cage.rotation.x = Math.PI / 2;
            cage.position.z = -0.025;
            group.add(cage);
            
            // Slit visuals (Black boxes intersecting)
            const slitGeo = new THREE.BoxGeometry(0.024, 0.002, 0.025);
            const slitMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            
            for(let i=0; i<3; i++) {
                 const s = new THREE.Mesh(slitGeo, slitMat);
                 s.rotation.z = (Math.PI / 3) * i;
                 s.position.z = -0.025;
                 group.add(s);
            }
            
            return { mesh: group, type: 'flashhider' };
        }
    };
    
    window.TacticalShooter.CommonParts = CommonParts;
})();
