
// js/visual/ragdoll_manager.js
(function() {
    // --- RAPIER RAGDOLL SYSTEM ---
    const RagdollManager = {
        scene: null,
        ragdolls: [],
        
        init(scene) {
            console.log("RagdollManager: Initialized (Rapier Mode).");
            this.scene = scene;
        },
        
        resetStaticGeometry() {},
        scanStaticGeometry(targetRoot) {},

        spawn(unusedMesh, color, startPos, rotationY, impulse, hitOffset, initialVelocity) {
            const PE = window.TacticalShooter.PhysicsEngine;
            if (!PE || !PE.world || !window.TacticalShooter.PlayerModelBuilder || !window.RAPIER) return null;

            const RAPIER = window.RAPIER;
            const builder = window.TacticalShooter.PlayerModelBuilder;
            const built = builder.build(color || '#555555'); 
            const root = built.mesh;
            const parts = built.parts;
            
            // Safety Checks
            if (!startPos || isNaN(startPos.x)) return null;
            
            root.position.copy(startPos);
            root.rotation.y = rotationY;
            root.updateMatrixWorld(true);
            
            const bodies = {};
            const meshes = {};
            
            const momentum = new THREE.Vector3(0,0,0);
            if (initialVelocity && !isNaN(initialVelocity.x)) momentum.copy(initialVelocity);

            // Helper: Create Dynamic Body from Mesh
            const createPart = (name, mesh, size, mass) => {
                const pos = new THREE.Vector3();
                const quat = new THREE.Quaternion();
                mesh.getWorldPosition(pos);
                mesh.getWorldQuaternion(quat);
                
                if(mesh.parent) mesh.parent.remove(mesh);
                this.scene.add(mesh);
                mesh.visible = true; 
                mesh.frustumCulled = false;

                const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                    .setTranslation(pos.x, pos.y, pos.z)
                    .setRotation({x: quat.x, y: quat.y, z: quat.z, w: quat.w})
                    .setLinvel(momentum.x, momentum.y, momentum.z)
                    .setLinearDamping(0.5)
                    .setAngularDamping(0.5);

                const body = PE.world.createRigidBody(bodyDesc);
                
                const colDesc = RAPIER.ColliderDesc.cuboid(size.x/2, size.y/2, size.z/2)
                    .setMass(mass)
                    .setFriction(1.0)
                    .setRestitution(0.1);
                
                PE.world.createCollider(colDesc, body);
                bodies[name] = body;
                meshes[name] = mesh;
                return body;
            };
            
            const hips = createPart('hips', parts.legs, {x:0.28, y:0.15, z:0.2}, 15);
            const torsoMesh = parts.torso.children.find(c => c.isMesh) || parts.torso;
            const torso = createPart('torso', torsoMesh, {x:0.3, y:0.35, z:0.22}, 20);
            
            const headMesh = parts.head.children.find(c => c.isMesh) || parts.head;
            const headPos = new THREE.Vector3(); headMesh.getWorldPosition(headPos);
            const headQuat = new THREE.Quaternion(); headMesh.getWorldQuaternion(headQuat);
            if(headMesh.parent) headMesh.parent.remove(headMesh); this.scene.add(headMesh);
            const headBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(headPos.x, headPos.y, headPos.z).setRotation(headQuat).setLinvel(momentum.x, momentum.y, momentum.z);
            const headBody = PE.world.createRigidBody(headBodyDesc);
            const headCol = RAPIER.ColliderDesc.ball(0.12).setMass(5);
            PE.world.createCollider(headCol, headBody);
            bodies['head'] = headBody; meshes['head'] = headMesh;

            const lArm = createPart('lArm', parts.leftArm.children[0], {x:0.1, y:0.28, z:0.1}, 5); 
            const rArm = createPart('rArm', parts.rightArm.children[0], {x:0.1, y:0.28, z:0.1}, 5);
            const lLeg = createPart('lLeg', parts.leftLeg.children[0], {x:0.14, y:0.38, z:0.14}, 8);
            const rLeg = createPart('rLeg', parts.rightLeg.children[0], {x:0.14, y:0.38, z:0.14}, 8);

            const joint = (b1, b2, anchor1, anchor2) => {
                const params = RAPIER.JointData.spherical(
                    { x: anchor1.x, y: anchor1.y, z: anchor1.z },
                    { x: anchor2.x, y: anchor2.y, z: anchor2.z }
                );
                PE.world.createImpulseJoint(params, b1, b2);
            };

            joint(hips, torso, {x:0, y:0.1, z:0}, {x:0, y:-0.22, z:0});
            joint(torso, headBody, {x:0, y:0.20, z:0}, {x:0, y:-0.15, z:0});
            joint(torso, lArm, {x:-0.2, y:0.15, z:0}, {x:0, y:0.15, z:0});
            joint(torso, rArm, {x:0.2, y:0.15, z:0}, {x:0, y:0.15, z:0});
            joint(hips, lLeg, {x:-0.1, y:-0.1, z:0}, {x:0, y:0.2, z:0});
            joint(hips, rLeg, {x:0.1, y:-0.1, z:0}, {x:0, y:0.2, z:0});

            if (impulse && !isNaN(impulse.x)) {
                // INCREASED FORCE MULTIPLIERS FOR EXPLOSIONS (Uncapped for energetic results)
                torso.applyImpulse({ 
                    x: impulse.x * 40.0, 
                    y: impulse.y * 50.0, 
                    z: impulse.z * 40.0 
                }, true);
                
                torso.applyTorqueImpulse({ x: Math.random()*5, y: Math.random()*10, z: Math.random()*5 }, true);
            }

            const ragdoll = { bodies, meshes, life: 10.0 };
            this.ragdolls.push(ragdoll);
            return ragdoll;
        },
        
        removeRagdoll(ragdoll) {
            if (!ragdoll) return;
            const index = this.ragdolls.indexOf(ragdoll);
            if (index !== -1) {
                this.disposeRagdoll(ragdoll);
                this.ragdolls.splice(index, 1);
            }
        },

        update(dt) {
            for (let i = this.ragdolls.length - 1; i >= 0; i--) {
                const rd = this.ragdolls[i];
                rd.life -= dt;
                
                if (rd.life <= 0) {
                    this.disposeRagdoll(rd);
                    this.ragdolls.splice(i, 1);
                    continue;
                }
                
                for (const name in rd.bodies) {
                    const b = rd.bodies[name];
                    const m = rd.meshes[name];
                    
                    // Only update if body is valid (checked by accessing translation safe-ish in try block or just existence)
                    if (b && m) {
                        try {
                            const t = b.translation();
                            const r = b.rotation();
                            if (isNaN(t.x) || isNaN(t.y) || isNaN(t.z)) continue;
                            m.position.set(t.x, t.y, t.z);
                            m.quaternion.set(r.x, r.y, r.z, r.w);
                        } catch(e) {
                            // If translation fails (body removed), ignore
                        }
                    }
                }
            }
        },

        disposeRagdoll(rd) {
            const PE = window.TacticalShooter.PhysicsEngine;
            for (const name in rd.bodies) {
                if (PE && PE.world) {
                    try {
                        PE.world.removeRigidBody(rd.bodies[name]);
                    } catch(e) {}
                }
            }
            for (const name in rd.meshes) {
                const m = rd.meshes[name];
                if (this.scene) this.scene.remove(m);
                if (m && m.geometry) m.geometry.dispose();
            }
            // Clear refs to prevent reuse
            rd.bodies = {};
            rd.meshes = {};
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.RagdollManager = RagdollManager;
})();
