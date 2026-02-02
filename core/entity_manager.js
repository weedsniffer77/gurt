
// js/core/entity_manager.js
(function() {
    const EntityManager = {
        entities: [],
        scene: null,
        
        // Interaction Logic
        closestInteractable: null,
        interactionHoldTime: 0,
        requiredHoldTime: 1.0, 
        interactDistance: 2.5, 

        init(scene) {
            console.log("EntityManager: Initialized.");
            this.scene = scene;
            this.entities = [];
        },
        
        spawnLootBox(position, color, type, amount) {
            if (!this.scene && window.TacticalShooter.GameManager) {
                this.scene = window.TacticalShooter.GameManager.scene;
            }
            if (!this.scene) return null;

            const id = Math.random().toString(36).substr(2, 9);
            
            let mesh = null;
            if (window.TacticalShooter.LootVisuals) {
                // Pass type (e.g. 'FRAG') to builder
                mesh = window.TacticalShooter.LootVisuals.createBox(color, type);
            } else {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.15), new THREE.MeshBasicMaterial({ color: color === -1 ? 0x555555 : color }));
            }
            
            mesh.position.copy(position);
            this.scene.add(mesh);
            
            let body = null;
            if (window.TacticalShooter.PhysicsEngine && window.RAPIER) {
                const PE = window.TacticalShooter.PhysicsEngine;
                const RAPIER = window.RAPIER;
                
                if (PE.world) {
                    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                        .setTranslation(position.x, position.y, position.z)
                        .setLinearDamping(0.5)
                        .setAngularDamping(0.5);
                    body = PE.world.createRigidBody(bodyDesc);
                    
                    // Simple box collider for physics even if mesh is round grenade
                    const colDesc = RAPIER.ColliderDesc.cuboid(0.15, 0.075, 0.075).setMass(5.0).setRestitution(0.4); 
                    PE.world.createCollider(colDesc, body);
                    body.setLinvel({ x: (Math.random()-0.5)*2, y: 3.0, z: (Math.random()-0.5)*2 }, true);
                    body.setAngvel({ x: Math.random()*5, y: Math.random()*5, z: Math.random()*5 }, true);
                }
            }

            const entity = {
                id: id,
                type: 'loot_v2',
                mesh: mesh,
                body: body,
                data: { type: type, amount: amount },
                life: 60.0, 
                pickupDelay: 1.0, 
                active: true,
                uiName: `${amount}x ${type.toUpperCase()}`
            };
            
            this.entities.push(entity);
            return id;
        },

        spawnEntity(type, position, quaternion, ownerId, velocity = null, networkId = null, extraData = {}) {
            if (type.startsWith('loot_v2')) {
                const parts = type.split('|');
                const ammoType = parts[1];
                const amount = parseInt(parts[2]);
                const color = parseInt(parts[3]);
                const id = this.spawnLootBox(position, color, ammoType, amount);
                if (networkId) {
                    const ent = this.entities.find(e => e.id === id);
                    if (ent) ent.id = networkId;
                }
                return id;
            }

            if (type === 'ammo_box') {
                 if (!this.scene && window.TacticalShooter.GameManager) this.scene = window.TacticalShooter.GameManager.scene;
                 
                 let mesh = null;
                 if (window.TacticalShooter.AmmoBoxModel) {
                     mesh = window.TacticalShooter.AmmoBoxModel.buildMesh();
                 } else {
                     mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({color:0x00ff00}));
                 }
                 
                 mesh.position.copy(position);
                 this.scene.add(mesh);
                 
                 let body = null;
                 if (window.TacticalShooter.PhysicsEngine && window.RAPIER) {
                     const PE = window.TacticalShooter.PhysicsEngine;
                     const bodyDesc = window.RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);
                     body = PE.world.createRigidBody(bodyDesc);
                     const col = window.RAPIER.ColliderDesc.cuboid(0.25, 0.25, 0.25).setMass(50);
                     PE.world.createCollider(col, body);
                 }
                 
                 const finalId = networkId || Math.random().toString(36).substr(2,9);

                 const ent = {
                     id: finalId,
                     type: 'ammo_box',
                     mesh: mesh,
                     body: body,
                     life: 120.0,
                     pickupDelay: 0,
                     interact: (e) => {
                         if (window.TacticalShooter.GameData.Scorestreaks.AMMO_BOX.interact) {
                             window.TacticalShooter.GameData.Scorestreaks.AMMO_BOX.interact(window.TacticalShooter.PlayerState);
                         }
                         e.usesRemaining--;
                         if (e.usesRemaining <= 0) {
                             this.removeEntity(e.id);
                             if (window.TacticalShooter.NetworkEventHandler) {
                                 window.TacticalShooter.NetworkEventHandler.broadcastEntityUsed(e.id);
                             }
                         }
                     },
                     usesRemaining: 1, 
                     uiName: "AMMO BOX"
                 };
                 this.entities.push(ent);
                 return ent.id;
            }
            return null;
        },
        
        spawnRemote(type, position, quaternion, velocity, networkId) {
            this.spawnEntity(type, position, quaternion, "NET", velocity, networkId);
        },

        handleRemoteUsage(entityId) {
             const ent = this.entities.find(e => e.id === entityId);
             if (ent) {
                 if (ent.type === 'ammo_box') {
                     ent.usesRemaining--;
                     if (ent.usesRemaining <= 0) this.removeEntity(ent.id);
                 } else {
                     this.removeEntity(ent.id); 
                 }
             }
        },
        
        update(dt, playerPosition) {
            // --- BLOCK INTERACTION IF DRONE ACTIVE ---
            if (window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.isControllingDrone) {
                this.closestInteractable = null;
                this.updateUI(dt);
                return;
            }

            this.closestInteractable = null; 
            
            for (let i = this.entities.length - 1; i >= 0; i--) {
                const e = this.entities[i];
                e.life -= dt;
                if (e.pickupDelay > 0) e.pickupDelay -= dt;
                
                if (e.life <= 0 || (e.mesh && e.mesh.position.y < -50)) {
                    this.removeEntity(i);
                    continue;
                }
                
                if (e.body) {
                    const t = e.body.translation();
                    const r = e.body.rotation();
                    e.mesh.position.set(t.x, t.y, t.z);
                    e.mesh.quaternion.set(r.x, r.y, r.z, r.w);
                }
                
                if (playerPosition) {
                    const dist = playerPosition.distanceTo(e.mesh.position);
                    
                    if (e.type === 'loot_v2' && e.pickupDelay <= 0 && dist < 1.5) {
                        if (window.TacticalShooter.LootSystem && window.TacticalShooter.PlayerState) {
                            const success = window.TacticalShooter.LootSystem.handlePickup(e, window.TacticalShooter.PlayerState);
                            if (success) {
                                if (window.TacticalShooter.NetworkEventHandler) {
                                    window.TacticalShooter.NetworkEventHandler.broadcastEntityUsed(e.id);
                                }
                                this.removeEntity(i);
                                continue;
                            }
                        }
                    }
                    
                    if (e.interact && dist < this.interactDistance) {
                        if (!this.closestInteractable || dist < playerPosition.distanceTo(this.closestInteractable.mesh.position)) {
                            this.closestInteractable = e;
                        }
                    }
                }
            }
            
            this.updateUI(dt);
        },
        
        updateUI(dt) {
            const prompt = document.getElementById('interaction-prompt');
            const actEl = document.getElementById('interact-action');
            const progressCircle = document.getElementById('interact-progress');
            
            if (!prompt) return;
            
            // Check Drone Active again just in case called out of order
            const droneActive = window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.isControllingDrone;

            if (this.closestInteractable && !droneActive) {
                prompt.style.display = 'flex';
                actEl.textContent = this.closestInteractable.uiName;
                
                const IM = window.TacticalShooter.InputManager;
                if (IM && IM.isActionActive('Interact')) {
                    this.interactionHoldTime += dt;
                    if (this.interactionHoldTime >= this.requiredHoldTime) {
                        this.closestInteractable.interact(this.closestInteractable);
                        this.interactionHoldTime = 0;
                        this.closestInteractable = null; 
                    }
                } else {
                    this.interactionHoldTime = Math.max(0, this.interactionHoldTime - dt * 3.0);
                }
                
                if (progressCircle) {
                     const maxDash = 113;
                     const p = Math.min(1.0, this.interactionHoldTime / this.requiredHoldTime);
                     progressCircle.style.strokeDashoffset = maxDash * (1.0 - p);
                }
            } else {
                prompt.style.display = 'none';
                this.interactionHoldTime = 0;
            }
        },
        
        removeEntity(indexOrId) {
            let index = -1;
            if (typeof indexOrId === 'number') index = indexOrId;
            else index = this.entities.findIndex(e => e.id === indexOrId);
            
            if (index !== -1) {
                const e = this.entities[index];
                if (e.mesh) {
                    if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
                    else if (this.scene) this.scene.remove(e.mesh);
                    
                    e.mesh.traverse(c => {
                        if (c.geometry) c.geometry.dispose();
                        if (c.material) c.material.dispose();
                    });
                }
                if (e.body && window.TacticalShooter.PhysicsEngine && window.TacticalShooter.PhysicsEngine.world) {
                    window.TacticalShooter.PhysicsEngine.world.removeRigidBody(e.body);
                }
                this.entities.splice(index, 1);
            }
        },
        
        reset() {
            while(this.entities.length > 0) this.removeEntity(0);
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.EntityManager = EntityManager;
})();
