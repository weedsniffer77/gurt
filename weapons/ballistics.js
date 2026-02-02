
// js/weapons/ballistics.js
(function() {
    // Reusable Vector Pool (Module Scope)
    let _tempPos = null;
    let _tempVel = null;
    let _tempDir = null;
    let _tempNormal = null;
    
    // Persistent Target Cache to avoid per-frame allocation
    const _targetCache = [];
    
    const Ballistics = {
        raycaster: null,
        scene: null,
        projectiles: [],
        
        init(scene) {
            console.log('Ballistics: Initializing Accelerated System...');
            this.scene = scene;
            this.raycaster = new THREE.Raycaster();
            
            // Disable firstHitOnly so we can penetrate the outer collision capsule
            // and hit the actual limbs inside.
            this.raycaster.firstHitOnly = false; 
            
            this.projectiles = [];
            
            _tempPos = new THREE.Vector3();
            _tempVel = new THREE.Vector3();
            _tempDir = new THREE.Vector3();
            _tempNormal = new THREE.Vector3();
            
            console.log('Ballistics: ✓ Ready');
        },
        
        getCrosshairTarget(camera, maxDistance) {
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            this.raycaster.far = maxDistance;
            
            const potentialTargets = this._getPotentialTargets();
            const intersects = this.raycaster.intersectObjects(potentialTargets, true);
            const hit = this._getFirstValidHit(intersects);
            
            if (hit) {
                return hit.point;
            }
            
            const target = new THREE.Vector3();
            target.copy(this.raycaster.ray.direction).multiplyScalar(maxDistance).add(this.raycaster.ray.origin);
            return target;
        },
        
        _getPotentialTargets() {
            // Clear existing cache without allocating new array
            _targetCache.length = 0;
            
            // 1. Unified Static Collider (BVH)
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.staticCollider) {
                _targetCache.push(window.TacticalShooter.GameManager.staticCollider);
            } 
            // Fallback for non-BVH maps or before init
            else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) {
                 const mapGeo = window.TacticalShooter.GameManager.currentMap.geometry;
                 if (mapGeo) {
                     for (let i = 0; i < mapGeo.length; i++) {
                         _targetCache.push(mapGeo[i]);
                     }
                 }
            }

            // 2. Dynamic Targets (Players) - USE HITBOXES ONLY
            if (window.TacticalShooter.RemotePlayerManager) {
                const hitboxes = window.TacticalShooter.RemotePlayerManager.getHitboxes();
                if (hitboxes.length > 0) {
                    for (let i = 0; i < hitboxes.length; i++) {
                        _targetCache.push(hitboxes[i]);
                    }
                }
            }
            
            // 3. Active Grenades (Shootable)
            if (window.TacticalShooter.ThrowableManager) {
                const grenades = window.TacticalShooter.ThrowableManager.getMeshes();
                if (grenades.length > 0) {
                    for (let i = 0; i < grenades.length; i++) {
                        _targetCache.push(grenades[i]);
                    }
                }
            }
            
            // 4. Local Active Drone
            if (window.TacticalShooter.DroneController && window.TacticalShooter.DroneController.active && window.TacticalShooter.DroneController.mesh) {
                _targetCache.push(window.TacticalShooter.DroneController.mesh);
            }
            
            return _targetCache;
        },
        
        _getFirstValidHit(intersects) {
            if (!intersects || intersects.length === 0) return null;
            
            for (let i = 0; i < intersects.length; i++) {
                const hit = intersects[i];
                
                // Check if it's a grenade
                if (hit.object.userData.isGrenade) return hit;
                
                // Check if it's a drone
                if (hit.object.userData.type === 'drone') return hit;
                
                // IGNORE Sprites (Nametags)
                if (hit.object.isSprite) continue;

                // IGNORE Transparent Collision Boxes (Outer Capsules)
                if (hit.object.userData.bulletTransparent && !hit.object.userData.collidable) continue;
                
                // If it's a player collision box, skip it to find limb
                if (hit.object.userData.type === 'player' && hit.object.userData.bulletTransparent) continue;

                return hit;
            }
            return null;
        },

        fireProjectile(origin, initialDirection, weaponConfig, spread, onHitCallback) {
            // SAFETY FIX: Ensure Raycaster has a camera if one exists
            if (window.TacticalShooter.PlayerCamera && window.TacticalShooter.PlayerCamera.camera) {
                this.raycaster.camera = window.TacticalShooter.PlayerCamera.camera;
            }

            const bConfig = weaponConfig.ballistics || {
                muzzleVelocity: 300, segmentLength: 100, dragPerSegment: 0, gravity: 9.8, maxRange: 100, destabilizeDistance: 9999, destabilizeAmount: 0
            };

            let currentDir = initialDirection.clone().normalize();
            if (spread > 0) {
                const spreadX = (Math.random() - 0.5) * spread;
                const spreadY = (Math.random() - 0.5) * spread;
                const right = new THREE.Vector3(1, 0, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), currentDir));
                const up = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), currentDir));
                currentDir.add(right.multiplyScalar(spreadX));
                currentDir.add(up.multiplyScalar(spreadY));
                currentDir.normalize();
            }

            const instantDist = bConfig.segmentLength;
            this.raycaster.set(origin, currentDir);
            this.raycaster.far = instantDist;
            
            const potentialTargets = this._getPotentialTargets();
            const intersects = this.raycaster.intersectObjects(potentialTargets, true);
            const hit = this._getFirstValidHit(intersects);
            
            if (hit) {
                // Grenade Detonation Check
                if (hit.object.userData.isGrenade) {
                    if (window.TacticalShooter.ThrowableManager) {
                        window.TacticalShooter.ThrowableManager.detonateByMesh(hit.object);
                        return;
                    }
                }

                const result = {
                    hit: true, point: hit.point,
                    normal: hit.face ? hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)) : new THREE.Vector3(0, 1, 0),
                    distance: hit.distance, object: hit.object, playerId: hit.object.userData.playerId || null,
                    direction: currentDir.clone() // PASS BULLET DIRECTION
                };
                if (onHitCallback) onHitCallback(result);
                return; 
            }

            if (bConfig.maxRange <= instantDist) return;

            const startSpeed = Math.max(10, bConfig.muzzleVelocity - bConfig.dragPerSegment);
            const startPos = origin.clone().add(currentDir.clone().multiplyScalar(instantDist));
            
            const projectile = {
                position: startPos,
                velocity: currentDir.clone().multiplyScalar(startSpeed),
                distanceTraveled: instantDist,
                dragPerSeg: bConfig.dragPerSegment,
                segLen: bConfig.segmentLength,
                gravity: bConfig.gravity,
                maxRange: bConfig.maxRange,
                destabDist: bConfig.destabilizeDistance || 9999,
                destabAmt: bConfig.destabilizeAmount || 0,
                callback: onHitCallback
            };
            
            this.projectiles.push(projectile);
        },
        
        update(dt) {
            if (this.projectiles.length === 0) return;
            if (!_tempPos) return;

            const potentialTargets = this._getPotentialTargets();
            
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const p = this.projectiles[i];
                _tempVel.copy(p.velocity);
                p.velocity.y -= p.gravity * dt;
                
                if (p.distanceTraveled > p.destabDist && p.destabAmt > 0) {
                    p.velocity.x += (Math.random() - 0.5) * p.destabAmt;
                    p.velocity.z += (Math.random() - 0.5) * p.destabAmt;
                }

                const frameDist = p.velocity.length() * dt;
                _tempPos.copy(p.position).addScaledVector(p.velocity, dt);
                _tempDir.copy(_tempPos).sub(p.position).normalize();
                
                this.raycaster.set(p.position, _tempDir);
                this.raycaster.far = frameDist;
                
                const intersects = this.raycaster.intersectObjects(potentialTargets, true);
                const hit = this._getFirstValidHit(intersects);
                
                if (hit) {
                    if (hit.object.userData.isGrenade) {
                        if (window.TacticalShooter.ThrowableManager) {
                            window.TacticalShooter.ThrowableManager.detonateByMesh(hit.object);
                        }
                        this.projectiles.splice(i, 1);
                        continue;
                    }

                    let normal = new THREE.Vector3(0,1,0);
                    if (hit.face) {
                        _tempNormal.copy(hit.face.normal).applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
                        normal.copy(_tempNormal);
                    }

                    const result = {
                        hit: true,
                        point: hit.point,
                        normal: normal,
                        distance: p.distanceTraveled + hit.distance,
                        object: hit.object,
                        playerId: hit.object.userData.playerId || null,
                        direction: _tempDir.clone() // PASS BULLET DIRECTION
                    };
                    
                    if (p.callback) p.callback(result);
                    this.projectiles.splice(i, 1);
                    continue;
                }
                
                p.position.copy(_tempPos);
                p.distanceTraveled += frameDist;
                
                const dragPerMeter = p.dragPerSeg / p.segLen;
                const speedLoss = dragPerMeter * frameDist;
                const currentSpeed = p.velocity.length();
                if (currentSpeed > 0) {
                    const newSpeed = Math.max(0, currentSpeed - speedLoss);
                    p.velocity.normalize().multiplyScalar(newSpeed);
                }

                if (p.distanceTraveled >= p.maxRange || p.position.y < -50 || currentSpeed <= 0.1) {
                    this.projectiles.splice(i, 1);
                }
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.Ballistics = Ballistics;
})();
