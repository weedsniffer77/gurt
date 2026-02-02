
// js/weapons/projectile_manager.js
(function() {
    const ProjectileManager = {
        scene: null,
        rockets: [],
        raycaster: null,
        
        init(scene) {
            console.log('ProjectileManager: Initializing...');
            this.scene = scene;
            this.rockets = [];
            this.raycaster = new THREE.Raycaster();
            this.raycaster.firstHitOnly = false;
        },
        
        spawnRemote(origin, direction, type, ownerId) {
            // Direction comes in as 'velocity' from the network packet for throws
            const dirVec = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
            const startPos = new THREE.Vector3(origin.x, origin.y, origin.z);
            this.spawnRocket(startPos, dirVec, type, ownerId);
        },

        spawnRocket(origin, direction, type, ownerId) {
             const GD = window.TacticalShooter.GameData.Weapons;
             const def = GD["RPG7"]; 
             if (!def) return;
             
             let warheadType = 'PG7V';
             if (type === 'OGV7') {
                 warheadType = 'OGV7';
             } else if (type !== 'RPG7' && type !== 'PG7V') {
                 if (window.TacticalShooter.WeaponManager && window.TacticalShooter.WeaponManager.currentWeapon && window.TacticalShooter.WeaponManager.currentWeapon.id === 'RPG7') {
                     const atts = window.TacticalShooter.WeaponManager.currentWeapon.attachments || [];
                     if (atts.includes('rpg_rocket_ogv7')) warheadType = 'OGV7';
                 }
             }

             const isOGV = (warheadType === 'OGV7');
             const startSpeed = 70.0; 
             let maxSpeed = 300.0;
             if (isOGV) maxSpeed *= 0.8; 
             
             const mesh = new THREE.Group();
             
             const matWarheadGreen = new THREE.MeshStandardMaterial({ color: 0x3d4435, roughness: 0.7, metalness: 0.2 });
             const matWarheadGrey = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.3 });
             const matFin = new THREE.MeshStandardMaterial({ color: 0x222222 });
             const matAlum = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });
             
             const mm = 0.001;

             if (isOGV) {
                 const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0195, 0.0195, 0.4).rotateX(Math.PI/2), matWarheadGrey);
                 mesh.add(body);
             } else {
                 const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 12).rotateX(Math.PI/2), matWarheadGreen);
                 cone.position.z = -0.1;
                 mesh.add(cone);
                 const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4).rotateX(Math.PI/2), matWarheadGreen);
                 rod.position.z = 0.15;
                 mesh.add(rod);
             }
             
             const finGeo = new THREE.BoxGeometry(0.002, 0.14, 0.06);
             for(let i=0; i<4; i++) {
                 const fin = new THREE.Mesh(finGeo, matFin);
                 fin.position.z = 0.35;
                 fin.rotation.z = (Math.PI/2) * i + (Math.PI/4);
                 mesh.add(fin);
             }

             const light = new THREE.PointLight(0xffaa00, 200.0, 120.0);
             light.position.set(0,0,0.35);
             mesh.add(light);
             
             if (window.TacticalShooter.ParticleManager && window.TacticalShooter.ParticleManager.smokeTexture) {
                 const spriteMat = new THREE.SpriteMaterial({
                     map: window.TacticalShooter.ParticleManager.smokeTexture,
                     color: 0xffdd88, 
                     blending: THREE.AdditiveBlending,
                     depthWrite: false
                 });
                 const glowSprite = new THREE.Sprite(spriteMat);
                 glowSprite.scale.set(0.8, 0.8, 1);
                 glowSprite.position.set(0,0,0.35);
                 mesh.add(glowSprite);
             }

             const initialVel = direction.clone().normalize().multiplyScalar(startSpeed);

             mesh.position.copy(origin);
             mesh.lookAt(origin.clone().add(direction));
             
             this.scene.add(mesh);
             
             this.rockets.push({
                 mesh: mesh,
                 pos: origin.clone(),
                 velocity: initialVel,
                 maxSpeed: maxSpeed,
                 accel: 47.3,
                 distTraveled: 0,
                 maxDist: 900,
                 warhead: warheadType,
                 ownerId: ownerId,
                 active: true,
                 smokeAccum: 0
             });
        },

        update(dt) {
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.camera) {
                this.raycaster.camera = window.TacticalShooter.GameManager.camera;
            }
            
            let collidables = [];
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.staticCollider) {
                collidables.push(window.TacticalShooter.GameManager.staticCollider);
            } else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) {
                collidables = window.TacticalShooter.GameManager.currentMap.geometry;
            }
            if (window.TacticalShooter.RemotePlayerManager) {
                const hitboxes = window.TacticalShooter.RemotePlayerManager.getHitboxes();
                collidables = collidables.concat(hitboxes);
            }
            
            const gravity = 9.8;

            for (let i = this.rockets.length - 1; i >= 0; i--) {
                const r = this.rockets[i];
                if (!r.active) continue;
                
                // Physics
                r.velocity.y -= gravity * dt;
                
                const currentSpeed = r.velocity.length();
                if (currentSpeed < r.maxSpeed) {
                    const dir = r.velocity.clone().normalize();
                    r.velocity.add(dir.multiplyScalar(r.accel * dt));
                    if (r.velocity.length() > r.maxSpeed) {
                        r.velocity.normalize().multiplyScalar(r.maxSpeed);
                    }
                }
                
                const stepVec = r.velocity.clone().multiplyScalar(dt);
                const stepDist = stepVec.length();
                const nextPos = r.pos.clone().add(stepVec);
                
                const dir = stepVec.clone().normalize();
                this.raycaster.set(r.pos, dir);
                this.raycaster.far = stepDist;
                
                const hits = this.raycaster.intersectObjects(collidables, true);
                
                const validHit = hits.find(h => {
                    if (h.object.isSprite) return false;
                    if (h.object.userData.type === 'player' && h.object.userData.playerId === r.ownerId && r.distTraveled < 2.0) return false;
                    if (h.object.userData.bulletTransparent && !h.object.userData.collidable && h.object.userData.type !== 'player') return false;
                    return true;
                });
                
                if (validHit) {
                    r.pos.copy(validHit.point);
                    r.mesh.position.copy(r.pos);
                    
                    let normal = new THREE.Vector3(0,1,0);
                    if (validHit.face && validHit.face.normal) {
                        normal.copy(validHit.face.normal).transformDirection(validHit.object.matrixWorld).normalize();
                    }
                    
                    r.dir = r.velocity.clone().normalize();
                    
                    this.explodeRocket(r, validHit.object, normal, collidables);
                    this.removeRocket(i);
                    continue;
                }
                
                r.pos.copy(nextPos);
                r.mesh.position.copy(r.pos);
                r.distTraveled += stepDist;
                r.mesh.lookAt(r.pos.clone().add(r.velocity));
                
                if (r.distTraveled > r.maxDist) {
                    this.removeRocket(i);
                }
            }
        },
        
        explodeRocket(rocket, hitObj, normal, worldCollidables) {
            const PM = window.TacticalShooter.ParticleManager;
            const TM = window.TacticalShooter.ThrowableManager; 
            const isPG7V = (rocket.warhead === 'PG7V');
            const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
            
            const rocketDir = rocket.dir || (rocket.velocity ? rocket.velocity.clone().normalize() : new THREE.Vector3(0,0,1));
            const isArmed = isPG7V ? true : (rocket.distTraveled >= 5.0);

            if (PM) {
                 if (isArmed) {
                     const scale = isPG7V ? 1.0 : 2.5; 
                     PM.createGrenadeExplosion(rocket.pos, normal, 'metal', scale);
                     PM.spawnExplosionLight(rocket.pos, 0xffaa00, 30.0 * scale, 20.0 * scale, 0.5 * scale);
                 } else {
                     PM.createImpactSparks(rocket.pos, normal, { count: 8, speed: 4.0, color: 0xffffaa });
                     PM.createImpactDust(rocket.pos, normal, { count: 4, sizeStart: 0.2, sizeEnd: 0.5, opacity: 0.4 });
                 }
            }
            
            // --- PERK: ROCKET JUMP CHECK ---
            const hasRocketJump = window.TacticalShooter.PerkSystem && window.TacticalShooter.PerkSystem.hasPerk('ROCKET_JUMP');
            
            let maxDamageOverride = null;
            if (rocket.ownerId === myId || rocket.ownerId === "SELF") {
                 if (window.TacticalShooter.PerkSystem) {
                     const CC = window.TacticalShooter.CharacterController;
                     const dist = rocket.pos.distanceTo(CC.position);
                     const result = window.TacticalShooter.PerkSystem.onRocketExplosion(rocket, dist);
                     if (result !== null) {
                         maxDamageOverride = result;
                     }
                 }
            }

            if (hitObj.userData.type === 'player' && hitObj.userData.playerId) {
                if (rocket.ownerId === myId || rocket.ownerId === "SELF") {
                    if (window.TacticalShooter.NetworkEventHandler) {
                        const blastDir = rocketDir.clone();
                        blastDir.y += 0.2; 
                        blastDir.normalize();
                        
                        window.TacticalShooter.NetworkEventHandler.broadcastBulletHit(
                            rocket.pos, blastDir, hitObj.userData.playerId, 1000, 'Torso', 50.0, false, rocket.pos
                        );
                    }
                    if (window.TacticalShooter.HitmarkerSystem) window.TacticalShooter.HitmarkerSystem.show('normal');
                }
            }

            if (!isArmed || !TM) return;

            const impulseVal = 120.0; // Reduced from 160.0

            if (isPG7V) {
                const rayOrigin = rocket.pos.clone().sub(rocketDir.clone().multiplyScalar(0.1));
                this.raycaster.set(rayOrigin, rocketDir);
                this.raycaster.far = 1.0;
                
                const hits = this.raycaster.intersectObjects(worldCollidables, true);
                const validHits = hits.filter(h => !h.object.isSprite && (!h.object.userData.bulletTransparent || h.object.userData.collidable === true));
                
                // If using ROCKET JUMP, damage is capped via maxDamageOverride
                const finalDamage = maxDamageOverride !== null ? maxDamageOverride : 250;
                const splashDamage = maxDamageOverride !== null ? maxDamageOverride : 200;

                if (validHits.length >= 2) {
                    const boomPos = rocket.pos.clone().add(rocketDir.clone().multiplyScalar(2.0));
                    if (PM) {
                        PM.createWallPenetration(validHits[1].point, rocketDir); 
                        PM.createGrenadeExplosion(boomPos, rocketDir, 'concrete', 1.0);
                    }
                    if (rocket.ownerId === myId || rocket.ownerId === "SELF") {
                        TM.dealAreaDamage(boomPos, 8.0, finalDamage, impulseVal, 1.0, false);
                    }
                } else {
                    if (rocket.ownerId === myId || rocket.ownerId === "SELF") {
                         const safeOrigin = rocket.pos.clone().add(normal.clone().multiplyScalar(0.1));
                         TM.dealAreaDamage(safeOrigin, 6.0, splashDamage, impulseVal, 1.0, true);
                    }
                }
            } else {
                // OGV (Frag)
                if (rocket.ownerId === myId || rocket.ownerId === "SELF") {
                    const safeOrigin = rocket.pos.clone().add(new THREE.Vector3(0, 0.1, 0));
                    // Check Perk for Lethal Radius Reduction
                    const lethalRad = hasRocketJump ? 2.0 : 4.0;
                    TM.dealAreaDamage(safeOrigin, 8.0, 150, impulseVal, lethalRad, true);
                }
            }
        },
        
        removeRocket(index) {
             const r = this.rockets[index];
             if (r.mesh) {
                 this.scene.remove(r.mesh);
                 r.mesh.traverse(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) c.material.dispose();
                });
             }
             this.rockets.splice(index, 1);
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ProjectileManager = ProjectileManager;
})();
