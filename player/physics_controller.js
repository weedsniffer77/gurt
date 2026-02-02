
// js/player/physics_controller.js
(function() {
    const PhysicsController = {
        raycaster: null,
        
        // Configuration
        skinWidth: 0.05, 
        maxIterations: 4,
        stepHeight: 0.6, 
        
        // Vector Pool
        _tempVec: null,
        _origin: null,
        _dir: null,
        _up: null,
        _down: null,
        
        init() {
            if (!window.THREE) return;
            const THREE = window.THREE;
            this.raycaster = new THREE.Raycaster();
            this.raycaster.firstHitOnly = false; // Default false, toggled in _raycastSafe
            
            // Pool Initialization
            this._tempVec = new THREE.Vector3();
            this._origin = new THREE.Vector3();
            this._dir = new THREE.Vector3();
            this._up = new THREE.Vector3(0, 1, 0);
            this._down = new THREE.Vector3(0, -1, 0);
        },

        getCollidables(scene) {
            let list = [];
            
            // 1. Static Collider (BVH) - Preferred
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.staticCollider) {
                list.push(window.TacticalShooter.GameManager.staticCollider);
            } 
            // Fallback (Legacy/Map Build)
            else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) {
                 const mapGeo = window.TacticalShooter.GameManager.currentMap.geometry;
                 if (mapGeo && mapGeo.length > 0) list = [...mapGeo];
            } else if (scene) {
                 list = scene.children.filter(obj => obj.userData.collidable && !obj.userData.type);
            }
            
            // 2. Remote Players (Dynamic)
            if (window.TacticalShooter.RemotePlayerManager) {
                const playerBoxes = window.TacticalShooter.RemotePlayerManager.getHitboxes();
                if (playerBoxes.length > 0) list = list.concat(playerBoxes);
            }
            
            return list;
        },
        
        // --- SAFE RAYCAST HELPER ---
        _raycastSafe(objects, recursive = true, useFirstHit = true) {
            // 1. Inject Camera to prevent THREE.Sprite crash
            if (window.TacticalShooter.PlayerCamera && window.TacticalShooter.PlayerCamera.camera) {
                this.raycaster.camera = window.TacticalShooter.PlayerCamera.camera;
            }
            
            // 2. Optimize for BVH (Mesh-BVH supports firstHitOnly)
            // If we only need collision detection (movement), finding one hit is enough?
            // Actually, we might need the closest one. 'firstHitOnly' in BVH returns the first INTERSECTION found, not necessarily closest.
            // BUT THREE-mesh-bvh implementation of raycast usually sorts? No, it stops early.
            // For physics movement, we usually want the CLOSEST hit.
            // So keep firstHitOnly = false to get all, then sort by distance (default THREE behavior).
            // HOWEVER, acceleratedRaycast can be configured. 
            // Let's rely on standard logic but filter sprites efficiently.
            
            this.raycaster.firstHitOnly = false; // We need closest hit, so we need all to sort them.
            
            // 3. Perform Raycast
            const hits = this.raycaster.intersectObjects(objects, recursive);
            
            // 4. Filter out Sprites (Nametags) and non-collidable debris
            if (hits.length === 0) return hits;
            
            return hits.filter(h => {
                if (h.object.isSprite) return false;
                if (h.object.userData.bulletTransparent && !h.object.userData.collidable) return false;
                return true;
            });
        },

        move(position, velocity, radius, height, dt, scene, isCrouching, isSliding) {
            if (!scene) {
                position.add(velocity.clone().multiplyScalar(dt));
                return { isGrounded: false, isSupported: false, headOffset: 0 };
            }

            const collidables = this.getCollidables(scene);
            
            // 1. Resolve Vertical Movement (Gravity)
            const isGrounded = this._resolveVertical(position, velocity, radius, height, dt, collidables);
            
            // 2. Resolve Horizontal Movement (Slide & Step)
            // Use Pool
            const horizVel = this._tempVec.set(velocity.x, 0, velocity.z);
            
            if (horizVel.lengthSq() > 0.000001) {
                this._collideAndSlide(position, velocity, horizVel, radius, height, dt, collidables, isGrounded);
            }

            // 3. Ceiling Check
            if (velocity.y > 0) {
               this._checkCeiling(position, velocity, height, collidables);
            }

            // 4. Utilities
            const headOffset = this.checkHeadClearance(position, height, collidables);
            const isSupported = this.checkWallSupport(position, height, collidables);

            return { isGrounded, isSupported, headOffset };
        },

        _resolveVertical(position, velocity, radius, height, dt, collidables) {
            const deltaY = velocity.y * dt;
            // Use Pool
            this._origin.copy(position);
            
            const stepHeight = 0.5; 
            this._origin.y += stepHeight;
            
            this.raycaster.set(this._origin, this._down);
            const checkDist = stepHeight + Math.max(0, -deltaY) + 0.1;
            this.raycaster.far = checkDist;
            
            const hits = this._raycastSafe(collidables, true);
            
            if (hits.length > 0) {
                const hit = hits[0];
                const distToGround = hit.distance - stepHeight;
                
                if (velocity.y <= 0 && distToGround <= 0.05) {
                    position.y = hit.point.y;
                    velocity.y = 0;
                    return true;
                } 
                else if (velocity.y <= 0 && distToGround > -0.4 && distToGround < 0) {
                     position.y = hit.point.y;
                     velocity.y = 0;
                     return true;
                }
            }
            
            position.y += deltaY;
            return false;
        },

        _collideAndSlide(position, fullVelocity, horizVel, radius, height, dt, collidables, isGrounded) {
            let distanceToTravel = horizVel.length() * dt;
            let direction = this._dir.copy(horizVel).normalize();
            
            if (distanceToTravel < 0.0001) return;

            for (let i = 0; i < this.maxIterations; i++) {
                const searchDist = distanceToTravel + radius + this.skinWidth;
                const hit = this._castCapsule(position, direction, searchDist, radius, height, collidables);
                
                if (hit) {
                    const distToWall = Math.max(0, hit.distance - radius - this.skinWidth);
                    
                    // Auto-Step for small obstacles
                    if (isGrounded && distToWall < 0.1) {
                        if (this.tryAutoStep(position, direction, height, radius, collidables)) {
                            distanceToTravel -= 0.01;
                            continue;
                        }
                    }

                    position.add(direction.multiplyScalar(distToWall));
                    
                    distanceToTravel -= distToWall;
                    if (distanceToTravel <= 0.001) break;

                    const normal = hit.normal;
                    
                    if (normal.y > 0.5) {
                        // Slope Climb
                        const dot = direction.dot(normal);
                        const projected = direction.clone().sub(normal.clone().multiplyScalar(dot)).normalize();
                        direction.copy(projected);
                    } else {
                        // Wall: Flatten
                        normal.y = 0;
                        normal.normalize();
                        position.add(normal.clone().multiplyScalar(0.002));

                        const velDot = fullVelocity.x * normal.x + fullVelocity.z * normal.z;
                        fullVelocity.x -= normal.x * velDot;
                        fullVelocity.z -= normal.z * velDot;
                        
                        // Recalculate remaining direction
                        const remainingHoriz = new THREE.Vector3(fullVelocity.x, 0, fullVelocity.z);
                        const speed = remainingHoriz.length();
                        
                        if (speed < 0.0001) break;
                        direction = remainingHoriz.normalize();
                        distanceToTravel = speed * (dt * (1 - (i/this.maxIterations))); 
                    }

                } else {
                    position.add(direction.multiplyScalar(distanceToTravel));
                    break;
                }
            }
        },
        
        tryAutoStep(position, direction, height, radius, collidables) {
            const stepH = this.stepHeight;
            const lookAhead = radius + 0.2; 
            if (!this.hasHeadroom(position, height + stepH, {children:collidables})) return false; // Rough check

            // Use Pool Vector
            const highOrigin = this._origin.copy(position);
            highOrigin.y += stepH + 0.05; 
            
            this.raycaster.set(highOrigin, direction);
            this.raycaster.far = lookAhead;
            
            if (this._raycastSafe(collidables, true).length > 0) return false;
            
            // Use Pool Vector for forward point
            const forwardPoint = new THREE.Vector3().copy(position).add(direction.clone().multiplyScalar(lookAhead));
            forwardPoint.y += stepH + 0.05;
            
            this.raycaster.set(forwardPoint, this._down);
            this.raycaster.far = stepH + 0.1; 
            
            const downHits = this._raycastSafe(collidables, true);
            if (downHits.length > 0) {
                const landY = downHits[0].point.y;
                const rise = landY - position.y;
                if (rise > 0.01 && rise <= stepH) {
                    position.y = landY;
                    position.add(direction.clone().multiplyScalar(0.1));
                    return true;
                }
            }
            return false;
        },

        _castCapsule(position, direction, distance, radius, height, collidables) {
            const checks = [0.3, height * 0.5, height - 0.2];
            let closestHit = null;
            let minDistance = distance;

            for (let yOffset of checks) {
                const origin = this._origin.copy(position);
                origin.y += yOffset;
                
                this.raycaster.set(origin, direction);
                this.raycaster.far = distance;
                
                const hits = this._raycastSafe(collidables, true);
                if (hits.length > 0) {
                    const hit = hits[0];
                    if (hit.distance < minDistance) {
                        minDistance = hit.distance;
                        closestHit = {
                            distance: hit.distance,
                            point: hit.point,
                            normal: hit.face.normal.clone().applyQuaternion(hit.object.quaternion).normalize()
                        };
                    }
                }
            }
            return closestHit;
        },

        _checkCeiling(position, velocity, height, collidables) {
            const origin = this._origin.copy(position);
            origin.y += height * 0.5;
            this.raycaster.set(origin, this._up);
            this.raycaster.far = height * 0.5 + 0.1; 
            
            const hits = this._raycastSafe(collidables, true);
            if (hits.length > 0) {
                velocity.y = 0; 
            }
        },

        checkHeadClearance(position, height, collidables) {
            const origin = this._origin.copy(position);
            const currentHeadTop = origin.y + height;
            const targetStandingHeadTop = origin.y + 1.85; 
            
            if (height >= 1.84) return 0;
            
            const distToCheck = targetStandingHeadTop - currentHeadTop;
            if (distToCheck <= 0) return 0;

            origin.y = currentHeadTop - 0.1; 
            this.raycaster.set(origin, this._up);
            this.raycaster.far = distToCheck + 0.2; 
            
            const hits = this._raycastSafe(collidables, true);
            if (hits.length > 0) {
                const available = Math.max(0, hits[0].distance - 0.1);
                if (available < distToCheck) {
                    return available - distToCheck; 
                }
            }
            return 0;
        },
        
        hasHeadroom(position, requiredHeight, scene) {
            const collidables = this.getCollidables(scene);
            const start = this._origin.copy(position);
            start.y += 0.5; 
            this.raycaster.set(start, this._up);
            this.raycaster.far = requiredHeight - 0.5; 
            const hits = this._raycastSafe(collidables, true);
            return hits.length === 0;
        },
        
        checkJumpClearance(position, height, scene) {
            return this.hasHeadroom(position, height + 0.5, scene);
        },

        checkWallSupport(position, height, collidables) {
            const origin = this._origin.copy(position);
            origin.y += height * 0.8;
            const cam = window.TacticalShooter.PlayerCamera.camera;
            if (!cam) return false;
            
            const forward = this._dir;
            cam.getWorldDirection(forward);
            forward.y = 0; forward.normalize();
            
            this.raycaster.set(origin, forward);
            this.raycaster.far = 0.8;
            const hits = this._raycastSafe(collidables, true);
            return hits.length > 0;
        },
        
        getLeanOffset(position, height, leanFactor, maxDist, scene, rightVector) {
            if (Math.abs(leanFactor) < 0.01) return { offset: new THREE.Vector3(), effective: 0 };
            const collidables = this.getCollidables(scene);
            
            const headPos = this._origin.copy(position);
            headPos.y += height * 0.9;
            
            const leanSign = Math.sign(leanFactor);
            const leanDir = rightVector.clone().multiplyScalar(leanSign); 
            const targetDist = Math.abs(leanFactor) * maxDist;
            
            this.raycaster.set(headPos, leanDir);
            this.raycaster.far = targetDist + 0.3; 
            const hits = this._raycastSafe(collidables, true);
            let actualDist = targetDist;
            if (hits.length > 0) {
                actualDist = Math.max(0, hits[0].distance - 0.2);
            }
            const effective = (actualDist / maxDist) * leanSign;
            const offset = leanDir.multiplyScalar(actualDist);
            return { offset, effective };
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.PhysicsController = PhysicsController;
})();
