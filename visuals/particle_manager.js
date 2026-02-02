
// js/visual/particle_manager.js
(function() {
    const ParticleManager = {
        scene: null,
        maxSparks: 500, sparkMesh: null, sparkData: [], sparkIndex: 0,
        maxDebris: 300, debrisMesh: null, debrisData: [], debrisIndex: 0,
        smokePool: [], smokePoolSize: 100, smokeIndex: 0, smokeTexture: null,
        
        // HEAVY SMOKE (For Screens)
        heavySmokePool: [], heavySmokeSize: 50, heavySmokeIndex: 0, heavySmokeTexture: null,
        
        shellPool: [], shellPoolSize: 120, shellIndex: 0, droppedMags: [], // Reverted to 120
        casingsEnabled: true, lightingEnabled: true, impactParticleCount: 12, physicsStep: 1, shellShadows: true, useCannonShells: false, 
        dummyObj: null, attrAlpha: null, attrAlphaDebris: null, raycaster: null, frameId: 0,
        shotgunShellGeoBody: null, shotgunShellGeoHead: null, rifleShellGroup: null, matShellRed: null, matShellBrass: null, matShellGold: null,
        
        // Light Pool
        explosionLights: [],
        
        // For Nametag Occlusion
        activeSmokeCenters: [], 
        
        // Smoke Collision Raycaster
        smokeRaycaster: null,
        
        init(scene) {
            console.log('ParticleManager: Initializing System...');
            this.scene = scene;
            this.raycaster = new THREE.Raycaster();
            this.smokeRaycaster = new THREE.Raycaster();
            this.dummyObj = new THREE.Object3D();
            
            // Light Pool
            for(let i=0; i<5; i++) {
                const light = new THREE.PointLight(0xffaa00, 0, 15);
                light.visible = false;
                this.scene.add(light);
                this.explosionLights.push({ light: light, life: 0 });
            }
            
            const Core = window.TacticalShooter.ParticlesCore;
            if (Core) {
                Core.initSparks(this); 
                Core.initDebris(this); 
                Core.initShells(this); 
                Core.initSmoke(this);
                Core.initHeavySmoke(this);
            }
            
            console.log('ParticleManager: ✓ Ready');
        },
        
        spawnExplosionLight(pos, color, intensity, range, duration) {
            if (!this.lightingEnabled) return;
            const item = this.explosionLights.find(l => l.life <= 0);
            if (item) {
                item.light.position.copy(pos);
                item.light.color.setHex(color);
                item.light.distance = range;
                item.light.intensity = intensity; // Start Intensity
                item.light.visible = true;
                item.life = duration;
                item.maxLife = duration;
                item.peakIntensity = intensity;
            }
        },
        
        setLightingEnabled(enabled) { this.lightingEnabled = enabled; },
        setConfig(config) { 
            if (config.impactCount !== undefined) this.impactParticleCount = config.impactCount; 
            if (config.physicsStep !== undefined) this.physicsStep = config.physicsStep; 
            if (config.shellShadows !== undefined) { 
                this.shellShadows = config.shellShadows; 
                this.shellPool.forEach(s => { 
                    if(s.pistolMesh) s.pistolMesh.castShadow = this.shellShadows; 
                    if(s.shotgunMesh) s.shotgunMesh.children.forEach(c => c.castShadow = this.shellShadows);
                    if(s.rifleMesh) s.rifleMesh.children.forEach(c => c.castShadow = this.shellShadows); 
                }); 
            } 
            if (config.useCannonShells !== undefined) {
                this.useCannonShells = config.useCannonShells;
            }
        },
        
        clear() { 
            this.droppedMags.forEach(m => { this.scene.remove(m.mesh); if (m.mesh.geometry) m.mesh.geometry.dispose(); if (m.mesh.material) m.mesh.material.dispose(); }); 
            this.droppedMags = []; 
            this.shellPool.forEach(s => { 
                s.active = false; s.life = 0; s.isSleeping = false; s.mesh.visible = false; s.mesh.position.set(0, -500, 0); 
                if (s.body && window.TacticalShooter.PhysicsEngine && window.TacticalShooter.PhysicsEngine.world) {
                     window.TacticalShooter.PhysicsEngine.world.removeRigidBody(s.body);
                     s.body = null;
                }
            }); 
            this.smokePool.forEach(s => { s.active = false; s.sprite.visible = false; }); 
            this.heavySmokePool.forEach(s => { s.active = false; s.sprite.visible = false; }); 
            this.explosionLights.forEach(l => { l.life = 0; l.light.visible = false; });
            this.activeSmokeCenters = [];
            
            const Core = window.TacticalShooter.ParticlesCore;
            if (Core) {
                Core.resetMesh(this.sparkMesh, this.attrAlpha, this.maxSparks, this.dummyObj); 
                Core.resetMesh(this.debrisMesh, this.attrAlphaDebris, this.maxDebris, this.dummyObj); 
            }
        },
        
        update(dt) {
            // Update Lights
            this.explosionLights.forEach(l => {
                if (l.life > 0) {
                    l.life -= dt;
                    if (l.life <= 0) l.light.visible = false;
                    else {
                        const p = l.life / l.maxLife;
                        l.light.intensity = l.peakIntensity * p * p; // Quadratic fade
                    }
                }
            });

            const Core = window.TacticalShooter.ParticlesCore;
            if (!Core) return;

            let updateSparks = false;
            for(let i=0; i<this.maxSparks; i++) {
                const p = this.sparkData[i];
                if(p.active) {
                    p.life -= dt;
                    if(p.life <= 0) { p.active = false; p.currentSize = 0; this.attrAlpha.setX(i, 0); } 
                    else { p.velocity.y += p.gravity * dt; p.pos.addScaledVector(p.velocity, dt); p.currentSize *= Math.pow(p.sizeDecay, dt * 60); this.attrAlpha.setX(i, p.life/p.maxLife); }
                    Core.updateInstance(this.sparkMesh, i, p, this.dummyObj); updateSparks = true;
                }
            }
            if(updateSparks) { this.sparkMesh.instanceMatrix.needsUpdate = true; this.attrAlpha.needsUpdate = true; }

            let updateDebris = false;
            for(let i=0; i<this.maxDebris; i++) {
                const p = this.debrisData[i];
                if(p.active) {
                    p.life -= dt;
                    if(p.life <= 0) { p.active = false; p.currentSize = 0; this.attrAlphaDebris.setX(i, 0); } 
                    else { 
                        p.velocity.y += p.gravity * dt; p.pos.addScaledVector(p.velocity, dt); p.currentSize *= Math.pow(p.sizeDecay, dt * 60);
                        if(p.pos.y < 0) { p.pos.y = 0; p.velocity.y *= -0.5; p.velocity.x *= 0.8; p.velocity.z *= 0.8; }
                        this.attrAlphaDebris.setX(i, p.life/p.maxLife);
                    }
                    Core.updateInstance(this.debrisMesh, i, p, this.dummyObj); updateDebris = true;
                }
            }
            if(updateDebris) { this.debrisMesh.instanceMatrix.needsUpdate = true; this.attrAlphaDebris.needsUpdate = true; }

            // LIGHT SMOKE
            this.smokePool.forEach(s => {
                if(s.active) {
                    s.life -= dt;
                    if(s.life <= 0) { s.active = false; s.sprite.visible = false; } 
                    else {
                        s.sprite.position.addScaledVector(s.velocity, dt);
                        const progress = 1.0 - (s.life / s.maxLife); const scale = s.startScale + (s.endScale - s.startScale) * progress; s.sprite.scale.set(scale, scale, 1);
                        let opacity = 0; if(progress < 0.2) opacity = (progress / 0.2) * s.opacityPeak; else opacity = (s.life / (s.maxLife * 0.8)) * s.opacityPeak; s.sprite.material.opacity = Math.max(0, opacity);
                        if (s.sprite.material.blending === THREE.AdditiveBlending) s.sprite.material.opacity *= 2.0; 
                    }
                }
            });
            
            // HEAVY SMOKE (SCREEN)
            let collidables = [];
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.staticCollider) {
                collidables.push(window.TacticalShooter.GameManager.staticCollider);
            }
            else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) {
                collidables = window.TacticalShooter.GameManager.currentMap.geometry;
            }
            
            this.heavySmokePool.forEach(s => {
                if(s.active) {
                    s.life -= dt;
                    if(s.life <= 0) { s.active = false; s.sprite.visible = false; }
                    else {
                        // Apply gravity
                        if (s.sprite.position.y > 0.5) s.velocity.y -= 0.5 * dt; 
                        else s.velocity.y *= 0.9; 
                        
                        // --- PHYSICS: Check floor/container collision ---
                        if (collidables.length > 0 && s.velocity.y < 0) {
                            this.smokeRaycaster.set(s.sprite.position, new THREE.Vector3(0, -1, 0));
                            this.smokeRaycaster.far = 0.5; 
                            const hits = this.smokeRaycaster.intersectObjects(collidables, true);
                            
                            if (hits.length > 0) {
                                s.velocity.y = 0; 
                                s.velocity.x *= 0.9; 
                                s.velocity.z *= 0.9; 
                                s.sprite.position.y = hits[0].point.y + 0.3; 
                            }
                        }

                        s.sprite.position.addScaledVector(s.velocity, dt);
                        if (s.sprite.position.y < 0.2) s.sprite.position.y = 0.2; 
                        
                        const progress = 1.0 - (s.life / s.maxLife);
                        const scale = s.startScale + (s.endScale - s.startScale) * (1.0 - Math.pow(1-progress, 3)); 
                        s.sprite.scale.set(scale, scale, 1);
                        
                        let opacity = s.opacityPeak;
                        if (progress < 0.1) opacity = (progress / 0.1) * s.opacityPeak;
                        else if (progress > 0.9) opacity = ((1.0 - progress) / 0.1) * s.opacityPeak;
                        s.sprite.material.opacity = Math.max(0, opacity);
                        s.sprite.material.rotation += s.rotVel * dt;
                    }
                }
            });

            this.shellPool.forEach(s => {
                if (!s.active) return;
                s.life -= dt;
                
                if (s.body) {
                    if (s.life <= 0) {
                        s.active = false; s.mesh.visible = false; s.mesh.position.set(0,-500,0);
                        if(window.TacticalShooter.PhysicsEngine && window.TacticalShooter.PhysicsEngine.world) {
                             window.TacticalShooter.PhysicsEngine.world.removeRigidBody(s.body);
                        }
                        s.body = null;
                        return;
                    }
                    const t = s.body.translation();
                    const r = s.body.rotation();
                    s.mesh.position.set(t.x, t.y, t.z);
                    s.mesh.quaternion.set(r.x, r.y, r.z, r.w);
                    return;
                }
                
                if (s.life <= 0) { s.active = false; s.mesh.visible = false; s.mesh.position.set(0, -500, 0); return; }
                if (s.life < 1.0) { const scale = Math.max(0.01, s.life); s.mesh.scale.set(scale, scale, scale); }
                if (!s.isSleeping) {
                    s.velocity.y -= 9.8 * dt; s.mesh.position.addScaledVector(s.velocity, dt);
                    s.mesh.rotation.x += s.rotVel.x * dt; s.mesh.rotation.y += s.rotVel.y * dt; s.mesh.rotation.z += s.rotVel.z * dt;
                    
                    if(s.mesh.position.y < 0.01) { 
                        s.mesh.position.y = 0.01; 
                        s.velocity.y *= -0.4; // Dampened bounce
                        s.velocity.x *= 0.5; // High Friction
                        s.velocity.z *= 0.5; // High Friction
                        s.rotVel.multiplyScalar(0.4); // Dampen Rotation 
                        if(s.velocity.lengthSq() < 0.01) s.isSleeping = true; 
                    }
                }
            });

            for(let i=this.droppedMags.length-1; i>=0; i--) {
                const m = this.droppedMags[i]; m.life -= dt;
                if(m.life <= 0) { this.scene.remove(m.mesh); if(m.mesh.geometry) m.mesh.geometry.dispose(); if(m.mesh.material) m.mesh.material.dispose(); this.droppedMags.splice(i, 1); } 
                else { m.velocity.y -= 9.8 * dt; m.mesh.position.addScaledVector(m.velocity, dt); m.mesh.rotation.x += m.rotVel.x * dt; m.mesh.rotation.y += m.rotVel.y * dt; if(m.mesh.position.y < 0.05) { m.mesh.position.y = 0.05; m.velocity.set(0,0,0); m.rotVel.set(0,0,0); } }
            }
        },
        
        createSmokeCloud(pos, dt) {
            if (Math.random() < 5.0 * dt) { 
                const s = this.heavySmokePool[this.heavySmokeIndex];
                this.heavySmokeIndex = (this.heavySmokeIndex + 1) % this.heavySmokeSize;
                
                s.active = true; s.life = 50.0; s.maxLife = 50.0; s.sprite.visible = true;
                const offset = new THREE.Vector3((Math.random()-0.5)*1.5, 0.5 + Math.random()*0.5, (Math.random()-0.5)*1.5);
                s.sprite.position.copy(pos).add(offset);
                s.startScale = 2.0; s.endScale = 8.0; s.opacityPeak = 0.9; s.rotVel = (Math.random()-0.5) * 0.1;
                s.velocity.set((Math.random()-0.5)*0.5, 0.2, (Math.random()-0.5)*0.5);
            }
        },
        
        createAirstrikeSmoke(pos) {
             const count = 30; // Dense cloud
             for(let i=0; i<count; i++) {
                 const s = this.heavySmokePool[this.heavySmokeIndex];
                 this.heavySmokeIndex = (this.heavySmokeIndex + 1) % this.heavySmokeSize;
                 
                 s.active = true; 
                 s.life = 4.0 + Math.random() * 2.0;
                 s.maxLife = s.life; 
                 s.sprite.visible = true;
                 
                 // Spawn: Larger Spread
                 const spread = 8.0; // Increased from 4.0
                 s.sprite.position.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread, 1.0 + Math.random()*2.0, (Math.random()-0.5)*spread));
                 
                 s.startScale = 4.0; 
                 s.endScale = 15.0; // Huge expansion
                 s.opacityPeak = 0.7; // Slightly less opacity for wider spread
                 s.rotVel = (Math.random()-0.5) * 0.2;
                 
                 // Rise + Drift
                 s.velocity.set((Math.random()-0.5)*1.5, 2.0 + Math.random(), (Math.random()-0.5)*1.5);
                 
                 // LIGHTER COLOR: 0x666666 instead of 0x333333
                 s.sprite.material.color.setHex(0x666666); 
             }
        },
        
        // FIX: Revert to using 'this' or safe reference, ignore passed scope
        createShellCasing(position, direction, type, unusedScope) {
             const ctx = this; // Use 'this'
             if (!ctx.casingsEnabled || !ctx.shellPool) return;
             
             // RING BUFFER: Automatically recycles oldest
             const shell = ctx.shellPool[ctx.shellIndex]; 
             
             // --- RECYCLING CLEANUP ---
             // If shell was active (or has physics), clear it before reuse
             if (shell.active || shell.body) {
                  if (shell.body && window.TacticalShooter.PhysicsEngine && window.TacticalShooter.PhysicsEngine.world) {
                      window.TacticalShooter.PhysicsEngine.world.removeRigidBody(shell.body);
                  }
                  shell.body = null;
                  shell.active = false;
                  shell.mesh.visible = false;
             }
             
             ctx.shellIndex = (ctx.shellIndex + 1) % ctx.shellPoolSize;
             
             shell.active = true; shell.life = 5.0; shell.isSleeping = false; shell.mode = 'simple';
             shell.mesh.position.copy(position); shell.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI); shell.mesh.visible = true;
             
             // --- HIGH QUALITY PHYSICS ---
             if (ctx.useCannonShells && window.RAPIER && window.TacticalShooter.PhysicsEngine) {
                 const RAPIER = window.RAPIER;
                 const PE = window.TacticalShooter.PhysicsEngine;
                 
                 const speed = 4.0 + Math.random() * 2.0;
                 const vel = direction.clone().multiplyScalar(speed);
                 vel.x += (Math.random() - 0.5); vel.y += (Math.random() * 0.5); vel.z += (Math.random() - 0.5);
                 
                 const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                     .setTranslation(position.x, position.y, position.z)
                     .setLinvel(vel.x, vel.y, vel.z)
                     .setAngvel({x: Math.random()*20, y: Math.random()*20, z: Math.random()*20})
                     .setLinearDamping(1.0)  // Increased Damping
                     .setAngularDamping(4.0) // Stop Rolling
                     .setCcdEnabled(true); 
                 
                 const body = PE.world.createRigidBody(bodyDesc);
                 
                 const colDesc = RAPIER.ColliderDesc.cylinder(0.01, 0.02)
                     .setRestitution(0.3) // Less Bouncy
                     .setFriction(1.5);   // High Friction
                 
                 PE.world.createCollider(colDesc, body);
                 shell.body = body;
             } else {
                 const speed = 2.0 + Math.random() * 1.5; shell.velocity.copy(direction).multiplyScalar(speed);
                 shell.velocity.x += (Math.random() - 0.5) * 0.5; shell.velocity.y += (Math.random() * 0.5); shell.velocity.z += (Math.random() - 0.5) * 0.5;
                 shell.rotVel.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
                 shell.body = null;
             }
             
             if (shell.pistolMesh) shell.pistolMesh.visible = (type === 'pistol');
             if (shell.shotgunMesh) shell.shotgunMesh.visible = (type === 'shotgun');
             if (shell.rifleMesh) shell.rifleMesh.visible = (type === 'rifle' || type === 'sniper');
        },

        // Proxy Methods
        createImpactSparks(pos, normal, config) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createImpactSparks(pos, normal, config, this); },
        createBloodSparks(pos, normal) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createBloodSparks(pos, normal, this); },
        createGrenadeExplosion(pos, normal, materialType, scale) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createGrenadeExplosion(pos, normal, materialType, this, scale); },
        createFlashbangEffect(pos) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createFlashbangEffect(pos, this); },
        createMuzzleSmoke(pos, dir) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createMuzzleSmoke(pos, dir, this); },
        createBarrelWisp(pos, dir, intensity) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createBarrelWisp(pos, dir, intensity, this); },
        createLingeringSmoke(pos, dir) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createLingeringSmoke(pos, dir, this); },
        createImpactDust(pos, normal, config) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createImpactDust(pos, normal, config, this); },
        createWallPenetration(pos, normal) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createWallPenetration(pos, normal, this); },
        createRocketFlame(pos, dir) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createRocketFlame(pos, dir, this); },
        createBackblast(pos, dir) { if(window.TacticalShooter.ParticlesVFX) window.TacticalShooter.ParticlesVFX.createBackblast(pos, dir, this); },
        createDroppingMag(position, quaternion, type, isExtended) {
            if (!this.casingsEnabled) return; if (type === 'none') return;
            const mat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7, metalness: 0.3 });
            let w = 0.022; let d = 0.04; let h = isExtended ? 0.28 : 0.105;
            const geo = new THREE.BoxGeometry(w, h, d); const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position); mesh.quaternion.copy(quaternion); mesh.castShadow = this.shellShadows; mesh.receiveShadow = true; this.scene.add(mesh);
            const down = new THREE.Vector3(0, -1, 0).applyQuaternion(quaternion).normalize(); const vel = down.multiplyScalar(1.5); 
            this.droppedMags.push({ mesh: mesh, velocity: vel, rotVel: new THREE.Vector3(Math.random(), Math.random(), Math.random()), life: 5.0 });
        }
    };
    window.TacticalShooter = window.TacticalShooter || {}; window.TacticalShooter.ParticleManager = ParticleManager;
})();
