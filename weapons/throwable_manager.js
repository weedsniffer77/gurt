
// js/weapons/throwable_manager.js
(function() {
    const ThrowableManager = {
        scene: null,
        projectiles: [],
        activeSmokes: [],
        
        // Trajectory Visualization
        trajMesh: null,
        impactSphere: null,
        raycaster: null,
        
        init(scene) {
            console.log('ThrowableManager: Initializing (Rapier Enabled)...');
            this.scene = scene;
            this.projectiles = [];
            this.activeSmokes = [];
            
            // Continuous Tube Mesh
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.2, 
                depthWrite: false,
                side: THREE.DoubleSide
            });
            this.trajMesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
            this.trajMesh.visible = false;
            this.trajMesh.frustumCulled = false;
            scene.add(this.trajMesh);
            
            // Impact Marker
            const sphereGeo = new THREE.SphereGeometry(0.15, 16, 16);
            const sphereMat = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.5,
                depthWrite: false
            });
            this.impactSphere = new THREE.Mesh(sphereGeo, sphereMat);
            this.impactSphere.visible = false;
            scene.add(this.impactSphere);
            
            this.raycaster = new THREE.Raycaster();
        },
        
        previewTrajectory(origin, direction, power, itemId) {
             const settings = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings : {};
            if (!settings.showTrajectory) {
                this.hideTrajectory();
                return;
            }

            const def = window.TacticalShooter.GameData.Throwables[itemId];
            if (!def) return;

            const speed = (def.physics.throwSpeed || 15) * power;
            const velocity = direction.clone().multiplyScalar(speed);
            const pos = origin.clone();
            const gravity = new THREE.Vector3(0, -9.8, 0);
            const linearDamping = 0.8; 
            
            let collidables = []; 
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.staticCollider) {
                collidables = [window.TacticalShooter.GameManager.staticCollider];
            } else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) {
                collidables = window.TacticalShooter.GameManager.currentMap.geometry;
            }

            const dt = 0.033; 
            const maxSteps = 120; // 120 Frames (4 seconds)
            
            const points = [pos.clone()];
            let stopped = false;
            let endPos = null;

            for (let i = 0; i < maxSteps; i++) {
                if (stopped) break;

                const dampFactor = 1.0 / (1.0 + linearDamping * dt);
                velocity.add(gravity.clone().multiplyScalar(dt));
                velocity.multiplyScalar(dampFactor);
                
                const nextPos = pos.clone().add(velocity.clone().multiplyScalar(dt));
                
                // Raycast check segment
                const dir = nextPos.clone().sub(pos);
                const dist = dir.length();
                dir.normalize();
                
                this.raycaster.set(pos, dir);
                this.raycaster.far = dist;
                
                const hits = this.raycaster.intersectObjects(collidables, true);
                
                if (hits.length > 0) {
                    endPos = hits[0].point;
                    points.push(endPos);
                    stopped = true;
                    
                    // Show impact sphere
                    this.impactSphere.position.copy(endPos);
                    this.impactSphere.visible = true;
                } else {
                    pos.copy(nextPos);
                    points.push(pos.clone());
                }
            }
            
            if (points.length > 1) {
                // Generate Tube
                if (this.trajMesh.geometry) this.trajMesh.geometry.dispose();
                
                const curve = new THREE.CatmullRomCurve3(points);
                // Radius 0.02 (Thick pipe), 8 radial segments, closed false
                const geo = new THREE.TubeGeometry(curve, points.length, 0.02, 8, false);
                this.trajMesh.geometry = geo;
                this.trajMesh.visible = true;
            } else {
                this.trajMesh.visible = false;
            }
            
            if (!stopped) this.impactSphere.visible = false;
        },
        
        hideTrajectory() {
            if (this.trajMesh) this.trajMesh.visible = false;
            if (this.impactSphere) this.impactSphere.visible = false;
        },

        throwItem(origin, direction, itemId, power, ownerId) {
            this.hideTrajectory();
            const def = window.TacticalShooter.GameData.Throwables[itemId];
            if (!def) return new THREE.Vector3();

            const speed = (def.physics.throwSpeed || 15) * power;
            const velocity = direction.clone().multiplyScalar(speed);
            
            this._spawnProjectile(origin, velocity, def, ownerId);
            
            return velocity;
        },
        
        spawnRemote(origin, velocityVec3Like, itemId, ownerId) {
            const def = window.TacticalShooter.GameData.Throwables[itemId];
            if (!def) return;
            const velocity = new THREE.Vector3(velocityVec3Like.x, velocityVec3Like.y, velocityVec3Like.z);
            const startPos = new THREE.Vector3(origin.x, origin.y, origin.z);
            this._spawnProjectile(startPos, velocity, def, ownerId);
        },
        
        _spawnProjectile(origin, velocity, def, ownerId) {
            const PE = window.TacticalShooter.PhysicsEngine;
            if (!PE || !window.RAPIER) return;
            const RAPIER = window.RAPIER;

            let mesh = null;
            if (def.buildMesh) {
                const built = def.buildMesh();
                mesh = built.mesh;
                const pin = mesh.getObjectByName("PIN_GROUP");
                if (pin) pin.removeFromParent();
                mesh.scale.set(1,1,1);
            } else {
                mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color:0xff0000}));
            }
            
            mesh.position.copy(origin);
            mesh.userData.isGrenade = true;
            mesh.userData.ownerId = ownerId;
            this.scene.add(mesh);

            let body = null;
            try {
                const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                    .setTranslation(origin.x, origin.y, origin.z)
                    .setLinvel(velocity.x, velocity.y, velocity.z)
                    .setLinearDamping(0.8) 
                    .setAngularDamping(0.8) 
                    .setCcdEnabled(true);

                body = PE.world.createRigidBody(bodyDesc);
                
                body.setAngvel({x: Math.random()*10, y: Math.random()*10, z: Math.random()*10}, true);
                
                const radius = 0.08; 
                const colDesc = RAPIER.ColliderDesc.ball(radius)
                    .setMass(def.physics.mass || 0.5)
                    .setRestitution(0.1) 
                    .setFriction(2.0);   
                    
                PE.world.createCollider(colDesc, body);
            } catch(e) {
                console.error("ThrowableManager: Failed to create physics body", e);
                // Cleanup visual if physics failed
                this.scene.remove(mesh);
                return;
            }

            this.projectiles.push({
                mesh: mesh,
                body: body,
                velocity: velocity.clone(), 
                def: def,
                timer: def.fuseTime || 3.0,
                ownerId: ownerId,
                active: true,
                isEmitting: false
            });
        },
        
        getMeshes() {
            return this.projectiles.map(p => p.mesh).filter(m => m);
        },
        
        detonateByMesh(mesh) {
            const idx = this.projectiles.findIndex(p => p.mesh === mesh);
            if (idx !== -1) {
                this.explode(this.projectiles[idx]);
            }
        },
        
        explode(p) {
            if (!p.active) return;
            
            const def = p.def;
            
            if (def.explosion && def.explosion.type === 'smoke') {
                p.isEmitting = true;
                p.timer = def.explosion.duration || 5.0;
                
                const PM = window.TacticalShooter.PlayroomManager;
                const myId = PM && PM.myPlayer ? PM.myPlayer.id : "SELF";
                
                if (p.ownerId === myId || p.ownerId === "SELF") {
                    if (window.Playroom) {
                        const smokeData = {
                            id: Math.random().toString(36).substr(2, 9),
                            x: p.mesh.position.x,
                            y: p.mesh.position.y,
                            z: p.mesh.position.z,
                            endTime: Date.now() + (p.timer * 1000)
                        };
                        const existingSmokes = window.Playroom.getState("activeSmokes") || [];
                        const cleanSmokes = existingSmokes.filter(s => s.endTime > Date.now());
                        cleanSmokes.push(smokeData);
                        window.Playroom.setState("activeSmokes", cleanSmokes);
                    }
                }
                return;
            }
            
            p.active = false;
            const pos = p.mesh.position.clone();
            
            if (def.explosion) {
                if (window.TacticalShooter.ParticleManager) {
                    if (def.explosion.type === 'flash') {
                        window.TacticalShooter.ParticleManager.createFlashbangEffect(pos);
                    } else {
                        window.TacticalShooter.ParticleManager.createGrenadeExplosion(pos, new THREE.Vector3(0,1,0), 'concrete', 1.0);
                    }
                }
                const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                if (p.ownerId === myId || p.ownerId === "SELF") {
                    const impulseBase = def.explosion.impulse || 10.0;
                    this.dealAreaDamage(pos, def.explosion.radius, def.explosion.maxDamage, impulseBase * 3.0, 0, true, def.explosion.type);
                }
                if (def.explosion.type === 'flash') {
                    this.applyFlashEffect(pos);
                }
            }
            this.removeProjectile(p);
        },
        
        applyFlashEffect(pos) {
            if (window.TacticalShooter.PlayerCamera) {
                window.TacticalShooter.PlayerCamera.applyFlashShock(pos);
            }
        },

        update(dt) {
            if (window.TacticalShooter.ParticleManager) {
                window.TacticalShooter.ParticleManager.activeSmokeCenters = this.activeSmokes.map(s => s.mesh.position);
            }
            
            if (window.Playroom) {
                const netSmokes = window.Playroom.getState("activeSmokes") || [];
                const now = Date.now();
                netSmokes.forEach(ns => {
                    if (ns.endTime > now) {
                        const exists = this.activeSmokes.some(s => {
                            return s.mesh.position.distanceToSquared(new THREE.Vector3(ns.x, ns.y, ns.z)) < 1.0;
                        });
                        
                        if (!exists) {
                            const dummyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1), new THREE.MeshBasicMaterial({visible:false}));
                            dummyMesh.position.set(ns.x, ns.y, ns.z);
                            this.scene.add(dummyMesh);
                            
                            const timeLeft = (ns.endTime - now) / 1000;
                            const smokeObj = {
                                mesh: dummyMesh,
                                timer: timeLeft,
                                isEmitting: true,
                                active: true,
                                def: { explosion: { type: 'smoke' } }, 
                                ownerId: 'NET'
                            };
                            this.activeSmokes.push(smokeObj);
                            this.projectiles.push(smokeObj); 
                        }
                    }
                });
            }

            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const p = this.projectiles[i];
                
                if (p.body && p.mesh) {
                    const t = p.body.translation();
                    const r = p.body.rotation();
                    p.mesh.position.set(t.x, t.y, t.z);
                    p.mesh.quaternion.set(r.x, r.y, r.z, r.w);
                    
                    // --- IMPACT CHECK ---
                    if (window.TacticalShooter.RemotePlayerManager && !p.hasImpactedPlayer) {
                         const players = window.TacticalShooter.RemotePlayerManager.remotePlayers;
                         const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                         
                         if (p.ownerId === myId || p.ownerId === "SELF") {
                             for (const pid in players) {
                                 const rp = players[pid];
                                 if (rp.mesh && rp.currentStatus === 'ALIVE') {
                                     const dist = p.mesh.position.distanceTo(rp.mesh.position.clone().add(new THREE.Vector3(0,1,0)));
                                     if (dist < 0.6) {
                                         p.hasImpactedPlayer = true;
                                         if (window.TacticalShooter.NetworkEventHandler) {
                                              window.TacticalShooter.NetworkEventHandler.broadcastBulletHit(
                                                  p.mesh.position, new THREE.Vector3(0,1,0), pid, 3, "Torso", 2.0, false, p.mesh.position, null, 'impact'
                                              );
                                         }
                                         if(window.TacticalShooter.HitmarkerSystem) window.TacticalShooter.HitmarkerSystem.show('normal');
                                     }
                                 }
                             }
                         }
                    }

                } else if (p.mesh && p.velocity) {
                    if (!p.isEmitting) {
                        p.velocity.y -= 9.8 * dt; 
                        p.mesh.position.addScaledVector(p.velocity, dt);
                        if (p.mesh.position.y < 0.1) {
                            p.mesh.position.y = 0.1;
                            p.velocity.y *= -0.4; p.velocity.x *= 0.6; p.velocity.z *= 0.6;
                        }
                    }
                }

                if (p.isEmitting) {
                    if (!this.activeSmokes.includes(p)) this.activeSmokes.push(p);

                    if (window.TacticalShooter.ParticleManager) {
                        window.TacticalShooter.ParticleManager.createSmokeCloud(p.mesh.position, dt);
                    }
                    p.timer -= dt;
                    if (p.timer <= 0) {
                        p.isEmitting = false;
                        this.removeProjectile(p);
                    }
                } else {
                    p.timer -= dt;
                    if (p.timer <= 0) {
                        this.explode(p);
                    } else if (p.mesh.position.y < -50) {
                        this.removeProjectile(p);
                    }
                }
            }
        },
        
        isBlocked(start, end) { 
            const dir = new THREE.Vector3().subVectors(end, start); 
            const dist = dir.length(); 
            if (dist < 0.1) return false; 
            dir.normalize(); 
            
            const rc = new THREE.Raycaster(start, dir, 0, dist);
            
            let collidables = []; 
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.staticCollider) {
                collidables = [window.TacticalShooter.GameManager.staticCollider];
            } else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) {
                collidables = window.TacticalShooter.GameManager.currentMap.geometry;
            }
            
            const hits = rc.intersectObjects(collidables, true); 
            return hits.length > 0; 
        },
        
        dealAreaDamage(origin, maxRadius, maxDmg, maxImp, lethalRadius = 0, checkOcclusion = true, damageType = 'frag_explosion') { 
            let hitSomething = false;
            
            if (window.TacticalShooter.PlayerState) { 
                const ps = window.TacticalShooter.PlayerState; const cc = window.TacticalShooter.CharacterController; const cam = window.TacticalShooter.PlayerCamera; 
                const feetPos = cc.position.clone(); const headPos = cam ? cam.camera.position.clone() : feetPos.clone().add(new THREE.Vector3(0, 1.6, 0)); const centerPos = feetPos.clone().add(new THREE.Vector3(0, 1.0, 0)); 
                const dist = centerPos.distanceTo(origin); 
                if (dist < maxRadius) { 
                    let stanceMult = 1.0; if (dist > 1.5) { if (cc.isProne) stanceMult = 0.5; else if (cc.isCrouching) stanceMult = 0.75; } 
                    let coverMult = 1.0; 
                    if (checkOcclusion) { const checkOrigin = origin.clone(); const headBlocked = this.isBlocked(checkOrigin, headPos); const feetBlocked = this.isBlocked(checkOrigin, feetPos); if (headBlocked && feetBlocked) coverMult = 0.0; else if (headBlocked || feetBlocked) coverMult = 0.7; }
                    if (coverMult > 0) { 
                        let rawDmg = 0; 
                        if (lethalRadius > 0 && dist <= lethalRadius) { 
                            rawDmg = maxDmg;
                        } else { 
                            const linearFalloff = 1.0 - (dist / maxRadius);
                            rawDmg = maxDmg * linearFalloff;
                            if (rawDmg < 0) rawDmg = 0;
                        }
                        
                        const damage = Math.floor(rawDmg * stanceMult * coverMult); 
                        
                        if (damage > 0) { 
                            hitSomething = true; 
                            const impulseVal = maxImp * (1.0 - (dist/maxRadius)); 
                            const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF"; 
                            const biasedOrigin = origin.clone(); biasedOrigin.y -= 5.0; 
                            // Pass damageType to takeDamage
                            ps.takeDamage(damage, myId, 'Torso', impulseVal, false, biasedOrigin); 
                            if (!ps.isDead && cam) { const shake = Math.max(0, 2.0 * (1.0 - (dist / 15.0))); cam.applyExplosionShake(shake); } 
                        } 
                    } 
                } 
            } 
            if (window.TacticalShooter.RemotePlayerManager && window.TacticalShooter.PlayroomManager) { 
                const remotes = window.TacticalShooter.RemotePlayerManager.remotePlayers; 
                for (const id in remotes) { 
                    const rp = remotes[id]; if (!rp.mesh) continue; const dist = rp.mesh.position.distanceTo(origin); 
                    if (dist < maxRadius) { 
                        let coverMult = 1.0; if (checkOcclusion) { const headPos = rp.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0)); const feetPos = rp.mesh.position.clone().add(new THREE.Vector3(0, 0.1, 0)); const checkOrigin = origin.clone(); const headBlocked = this.isBlocked(checkOrigin, headPos); const feetBlocked = this.isBlocked(checkOrigin, feetPos); if (headBlocked && feetBlocked) coverMult = 0.0; else if (headBlocked || feetBlocked) coverMult = 0.7; }
                        if (coverMult > 0) { 
                            let rawDmg = 0; 
                            if (lethalRadius > 0 && dist <= lethalRadius) { 
                                rawDmg = maxDmg;
                            } else { 
                                const linearFalloff = 1.0 - (dist / maxRadius);
                                rawDmg = maxDmg * linearFalloff;
                                if (rawDmg < 0) rawDmg = 0;
                            } 
                            const damage = Math.floor(rawDmg * coverMult); 
                            if (damage > 0) { 
                                hitSomething = true; 
                                const impulse = maxImp * (1.0 - (dist/maxRadius)); 
                                const blastDir = new THREE.Vector3().subVectors(rp.mesh.position, origin).normalize(); 
                                blastDir.y = Math.abs(blastDir.y) + 1.5; blastDir.normalize(); 
                                // Pass damageType for ScoreSystem via Broadcast
                                window.TacticalShooter.PlayroomManager.broadcastBulletHit(rp.mesh.position, blastDir, id, damage, "Torso", impulse, false, origin, null, damageType); 
                            } 
                        }
                    } 
                } 
            }
            if (hitSomething && window.TacticalShooter.HitmarkerSystem) { window.TacticalShooter.HitmarkerSystem.show('normal'); }
        },
        
        removeProjectile(pRef) { 
            const index = (typeof pRef === 'number') ? pRef : this.projectiles.indexOf(pRef);
            if (index === -1) return;
            const p = this.projectiles[index]; 
            
            if (p.mesh) {
                p.mesh.visible = false;
                this.scene.remove(p.mesh); 
                p.mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); 
            }
            
            const smokeIdx = this.activeSmokes.indexOf(p);
            if (smokeIdx !== -1) this.activeSmokes.splice(smokeIdx, 1);
            
            if (p.body && window.TacticalShooter.PhysicsEngine && window.TacticalShooter.PhysicsEngine.world) {
                window.TacticalShooter.PhysicsEngine.world.removeRigidBody(p.body);
            }
            
            this.projectiles.splice(index, 1); 
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ThrowableManager = ThrowableManager;
})();
