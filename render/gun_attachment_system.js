
// js/render/gun_attachment_system.js
(function() {
    const GunAttachmentSystem = {
        lights: [],
        lasers: [],
        lensMeshes: [],
        emitterMeshes: [],
        
        _laserDotTexture: null,
        barrelRaycaster: null,
        laserCheckFrame: 0,
        _tempScale: null, // Cache vector

        init() {
            if (!window.THREE) return;
            this.barrelRaycaster = new THREE.Raycaster();
            this._tempScale = new THREE.Vector3();
            this._initLaserTexture();
        },

        _initLaserTexture() {
            const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); grad.addColorStop(0.3, 'rgba(0, 255, 0, 1)'); grad.addColorStop(1, 'rgba(0, 255, 0, 0)');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);
            this._laserDotTexture = new THREE.CanvasTexture(canvas);
        },

        reset() {
            this.lights = [];
            this.lasers = [];
            this.lensMeshes = [];
            this.emitterMeshes = [];
        },

        setup(gunMeshGroup) {
            this.reset();
            if (!gunMeshGroup) return;

            const THREE = window.THREE;
            const CommonParts = window.TacticalShooter.CommonParts;

            gunMeshGroup.traverse(c => {
                // FLASHLIGHT LOGIC
                if (c.name === "ATTACHMENT_FLASHLIGHT_LENS" && c.parent) {
                    const spot = new THREE.SpotLight(0xffffee, 25.0, 150, Math.PI / 6, 0.2, 2.0);
                    c.parent.add(spot);
                    spot.position.copy(c.position);
                    spot.target.position.set(0, 0, -50.0);
                    c.parent.add(spot.target);
                    spot.visible = false;
                    spot.castShadow = true; 
                    spot.shadow.mapSize.width = 512; spot.shadow.mapSize.height = 512;
                    spot.shadow.bias = -0.00005; spot.shadow.normalBias = 0.02;
                    this.lights.push(spot);
                    if (c.material) { c.material = c.material.clone(); this.lensMeshes.push(c); }
                }
                
                // LASER LOGIC
                if (c.name === "ATTACHMENT_LASER_EMITTER") {
                    const beamGeo = new THREE.CylinderGeometry(0.0005, 0.0005, 1, 4);
                    beamGeo.rotateX(Math.PI / 2); beamGeo.translate(0, 0, 0.5); 
                    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
                    const beam = new THREE.Mesh(beamGeo, beamMat);
                    c.add(beam);
                    
                    const dotMat = new THREE.SpriteMaterial({ map: this._laserDotTexture, color: 0x88ff88, blending: THREE.AdditiveBlending, depthTest: false });
                    const dot = new THREE.Sprite(dotMat);
                    dot.scale.set(0.05, 0.05, 1);
                    c.add(dot);
                    
                    beam.visible = false; dot.visible = false;
                    this.lasers.push({ beam, dot, parent: c, mat: beamMat, _cachedDist: 200, _cachedVis: false });
                    if (c.material) { c.material = c.material.clone(); this.emitterMeshes.push(c); }
                }
            });
        },

        update(isOn) {
            this.lights.forEach(l => l.visible = isOn);
            this.lasers.forEach(l => { l.beam.visible = isOn; if (!isOn) l.dot.visible = false; });
            
            if (isOn) {
                 this.lensMeshes.forEach(m => { m.material.color.setHex(0xeeffff); m.material.emissiveIntensity = 1.0; });
                 this.emitterMeshes.forEach(m => { m.material.color.setHex(0x00ff00); m.material.emissiveIntensity = 1.0; });
                 this.updateRaycasts();
            } else {
                 this.lensMeshes.forEach(m => { m.material.color.setHex(0x111111); m.material.emissiveIntensity = 0; });
                 this.emitterMeshes.forEach(m => { m.material.color.setHex(0x001100); m.material.emissiveIntensity = 0; });
            }
        },

        updateRaycasts() {
            if (this.lasers.length === 0) return;
            
            // Throttling: Run raycast check every frame for local player (responsive)
            // or every few frames if performance is an issue. Keeping 1 for local responsiveness.
            this.laserCheckFrame++;
            const doRaycast = true;
            
            // CRITICAL FIX: Assign camera to raycaster to prevent crash when hitting Sprites
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.camera) {
                this.barrelRaycaster.camera = window.TacticalShooter.GameManager.camera;
            }
            
            let collidables = [];
            if (doRaycast) {
                // 1. Static Geometry
                if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.staticCollider) {
                    collidables.push(window.TacticalShooter.GameManager.staticCollider);
                } else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) {
                    collidables = window.TacticalShooter.GameManager.currentMap.geometry;
                }
                
                // 2. Remote Players (Dynamic)
                if (window.TacticalShooter.RemotePlayerManager) {
                    collidables = collidables.concat(window.TacticalShooter.RemotePlayerManager.getHitboxes());
                }
            }
            
            const THREE = window.THREE;

            this.lasers.forEach(laserData => {
                if (!laserData.beam.visible) return;
                
                if (doRaycast) {
                    const emitter = laserData.parent;
                    const origin = new THREE.Vector3(); 
                    const direction = new THREE.Vector3(0, 0, 1);
                    emitter.getWorldPosition(origin);
                    const q = new THREE.Quaternion(); 
                    emitter.getWorldQuaternion(q); 
                    direction.applyQuaternion(q);
                    
                    const backtrackDist = 0.5;
                    const safeOrigin = origin.clone().sub(direction.clone().multiplyScalar(backtrackDist));
                    this.barrelRaycaster.set(safeOrigin, direction);
                    this.barrelRaycaster.far = 200 + backtrackDist;
                    
                    // Recursive true to hit player limbs
                    let hits = this.barrelRaycaster.intersectObjects(collidables, true);
                    
                    // Filter out Sprites (Nametags) and Transparent Hitboxes (unless explicitly solid)
                    // Note: Limbs have bulletTransparent=false, but collisionBox has bulletTransparent=true
                    hits = hits.filter(h => !h.object.isSprite && (!h.object.userData.bulletTransparent || h.object.userData.collidable === true));
                    
                    const validHit = hits.length > 0 ? hits[0] : null;
                    
                    if (validHit) {
                        laserData._cachedDist = Math.max(0, validHit.distance - backtrackDist);
                        laserData._cachedVis = true;
                    } else {
                        laserData._cachedDist = 200;
                        laserData._cachedVis = false;
                    }
                }
                
                // Handle Parent Scaling (World vs Local Distance)
                if (!this._tempScale) this._tempScale = new THREE.Vector3();
                laserData.parent.getWorldScale(this._tempScale);
                const worldScaleZ = this._tempScale.z;
                
                let localDist = laserData._cachedDist;
                if (worldScaleZ > 0.001) localDist = laserData._cachedDist / worldScaleZ;

                // Update Visuals
                laserData.dot.visible = laserData._cachedVis;
                if (laserData.dot.visible) {
                    // Position at localDist (minus epsilon to prevent Z-fight)
                    laserData.dot.position.set(0, 0, localDist - 0.05);
                }
                
                // Beam scaling
                laserData.beam.scale.set(1, 1, localDist);
                
                // Fade logic
                let opacity = 0.25;
                if (laserData._cachedDist > 150) { 
                    const fade = 1.0 - ((laserData._cachedDist - 150) / 50.0); 
                    opacity *= Math.max(0, fade); 
                }
                laserData.mat.opacity = opacity;
            });
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GunAttachmentSystem = GunAttachmentSystem;
})();
