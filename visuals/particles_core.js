
// js/visuals/particles_core.js
(function() {
    const ParticlesCore = {
        initSparks(scope) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            scope.attrAlpha = new THREE.InstancedBufferAttribute(new Float32Array(scope.maxSparks), 1);
            scope.attrAlpha.setUsage(THREE.DynamicDrawUsage);
            geometry.setAttribute('aAlpha', scope.attrAlpha);
            
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, depthWrite: false, blending: THREE.AdditiveBlending });
            this.injectAlphaShader(material);
            
            scope.sparkMesh = new THREE.InstancedMesh(geometry, material, scope.maxSparks);
            scope.sparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            scope.sparkMesh.frustumCulled = false; 
            scope.scene.add(scope.sparkMesh);
            
            scope.sparkData = this.createParticleData(scope.maxSparks);
            this.resetMesh(scope.sparkMesh, scope.attrAlpha, scope.maxSparks, scope.dummyObj);
        },
        
        initDebris(scope) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            scope.attrAlphaDebris = new THREE.InstancedBufferAttribute(new Float32Array(scope.maxDebris), 1);
            scope.attrAlphaDebris.setUsage(THREE.DynamicDrawUsage);
            geometry.setAttribute('aAlpha', scope.attrAlphaDebris);
            
            const material = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, depthWrite: true, blending: THREE.NormalBlending, shininess: 30, emissive: 0x111111 });
            this.injectAlphaShader(material);
            
            scope.debrisMesh = new THREE.InstancedMesh(geometry, material, scope.maxDebris);
            scope.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            scope.debrisMesh.frustumCulled = false; 
            scope.scene.add(scope.debrisMesh);
            
            scope.debrisData = this.createParticleData(scope.maxDebris);
            this.resetMesh(scope.debrisMesh, scope.attrAlphaDebris, scope.maxDebris, scope.dummyObj);
        },
        
        initSmoke(scope) {
            const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)'); grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)'); grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
            
            scope.smokeTexture = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({ map: scope.smokeTexture, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.NormalBlending });
            
            for(let i=0; i<scope.smokePoolSize; i++) {
                const s = new THREE.Sprite(mat.clone()); s.visible = false; s.scale.set(1,1,1); scope.scene.add(s);
                scope.smokePool.push({ sprite: s, active: false, life: 0, maxLife: 1, velocity: new THREE.Vector3(), expandRate: 0, startScale: 1 });
            }
        },
        
        initHeavySmoke(scope) {
            // Dense, slightly noisy texture for smoke screen
            const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Base puff
            const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
            grad.addColorStop(0, 'rgba(230, 230, 230, 0.9)'); 
            grad.addColorStop(0.4, 'rgba(200, 200, 200, 0.5)'); 
            grad.addColorStop(1, 'rgba(150, 150, 150, 0)');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
            
            scope.heavySmokeTexture = new THREE.CanvasTexture(canvas);
            
            // Use depthWrite:false but depthTest:true to look volumetric but handle intersections properly-ish
            const mat = new THREE.SpriteMaterial({ 
                map: scope.heavySmokeTexture, 
                color: 0xdddddd, 
                transparent: true, 
                opacity: 0, 
                depthWrite: false, 
                depthTest: true,
                blending: THREE.NormalBlending 
            });
            
            scope.heavySmokePool = [];
            for(let i=0; i<scope.heavySmokeSize; i++) {
                const s = new THREE.Sprite(mat.clone()); 
                s.visible = false; 
                s.renderOrder = 1; // Render after normal geometry
                scope.scene.add(s);
                scope.heavySmokePool.push({ sprite: s, active: false, life: 0, maxLife: 1, velocity: new THREE.Vector3(), rotVel: 0, startScale: 1 });
            }
        },
        
        initShells(scope) {
            scope.shotgunShellGeoBody = new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8); scope.shotgunShellGeoBody.rotateZ(Math.PI / 2); scope.shotgunShellGeoBody.translate(0.01, 0, 0);
            scope.shotgunShellGeoHead = new THREE.CylinderGeometry(0.0125, 0.0125, 0.015, 8); scope.shotgunShellGeoHead.rotateZ(Math.PI / 2); scope.shotgunShellGeoHead.translate(-0.022, 0, 0);
            
            scope.matShellRed = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.8, metalness: 0.1 });
            scope.matShellBrass = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.9, emissive: 0xffaa00, emissiveIntensity: 0.5 });
            scope.matShellGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 1.0, emissive: 0xff4400, emissiveIntensity: 2.0 });
            
            const rifleGroupTemplate = new THREE.Group();
            const rBody = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 8).rotateZ(Math.PI/2), scope.matShellBrass);
            const rNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.01, 8).rotateZ(Math.PI/2), scope.matShellBrass); rNeck.position.x = 0.025;
            const rRim = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.002, 8).rotateZ(Math.PI/2), scope.matShellBrass); rRim.position.x = -0.021;
            rifleGroupTemplate.add(rBody); rifleGroupTemplate.add(rNeck); rifleGroupTemplate.add(rRim);

            scope.shellPool = [];
            for (let i = 0; i < scope.shellPoolSize; i++) {
                const wrapper = new THREE.Group();
                const pGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.02, 8);
                const pMesh = new THREE.Mesh(pGeo, scope.matShellGold); 
                pMesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI); pMesh.castShadow = true; pMesh.name = "PISTOL"; 
                wrapper.add(pMesh);
                
                const sGroup = new THREE.Group();
                const body = new THREE.Mesh(scope.shotgunShellGeoBody, scope.matShellRed); body.castShadow = true; sGroup.add(body);
                const head = new THREE.Mesh(scope.shotgunShellGeoHead, scope.matShellBrass); head.castShadow = true; sGroup.add(head);
                sGroup.rotateY(Math.PI); sGroup.name = "SHOTGUN"; sGroup.visible = false; 
                wrapper.add(sGroup);
                
                const rGroup = rifleGroupTemplate.clone(); rGroup.name = "RIFLE"; rGroup.visible = false; rGroup.children.forEach(c => c.castShadow = true);
                wrapper.add(rGroup);

                wrapper.visible = false; wrapper.position.set(0, -500, 0); scope.scene.add(wrapper);
                scope.shellPool.push({ mesh: wrapper, pistolMesh: pMesh, shotgunMesh: sGroup, rifleMesh: rGroup, velocity: new THREE.Vector3(), rotVel: new THREE.Vector3(), life: 0, active: false, isSleeping: false, mode: 'simple', body: null });
            }
        },
        
        injectAlphaShader(material) {
            material.onBeforeCompile = (shader) => {
                shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;');
                shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vAlpha = aAlpha;');
                shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlpha;');
                shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.a *= vAlpha;');
            };
        },
        
        createParticleData(count) {
            const arr = []; for(let i=0; i<count; i++) arr.push({ active: false, pos: new THREE.Vector3(), velocity: new THREE.Vector3(), life: 0, maxLife: 1, gravity: 0, sizeDecay: 1, currentSize: 0.1, color: new THREE.Color(1,1,1) }); return arr;
        },
        
        resetMesh(mesh, attr, count, dummy) {
            if (!mesh) return;
            for(let i=0; i<count; i++) { dummy.position.set(0, -1000, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); attr.setX(i, 0); }
            mesh.instanceMatrix.needsUpdate = true; attr.needsUpdate = true;
        },
        
        updateInstance(mesh, index, p, dummy) {
            dummy.position.copy(p.pos);
            // Simulate random rotation based on index to avoid uniform look without extra attributes
            dummy.rotation.set(index + p.pos.x, index*2 + p.pos.y, index*3); 
            dummy.scale.set(p.currentSize, p.currentSize, p.currentSize);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ParticlesCore = ParticlesCore;
})();
