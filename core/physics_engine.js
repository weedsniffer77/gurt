
// js/core/physics_engine.js
(function() {
    const PhysicsEngine = {
        world: null,
        staticHandles: [],
        paused: false,
        
        init() {
            console.log("PhysicsEngine: Initializing Rapier...");
            
            if (!window.RAPIER) {
                console.error("PhysicsEngine: Rapier not loaded!");
                return;
            }

            const RAPIER = window.RAPIER;
            
            // Create World with standard Earth gravity
            const gravity = { x: 0.0, y: -9.81, z: 0.0 };
            this.world = new RAPIER.World(gravity);
            
            // Create infinite ground plane (failsafe)
            const groundDesc = RAPIER.RigidBodyDesc.fixed();
            const groundBody = this.world.createRigidBody(groundDesc);
            
            // FAILSAFE FLOOR FIX:
            // The user requested to move it up.
            // Original: 500x5x500 at -5.0 (Top=0).
            // New Request: "Move it up".
            // I will set Top to 0.0, but make it thinner (1m) and position at -0.5.
            // Top = -0.5 + 0.5 = 0.0.
            // Center Y = -0.5. Half-Height = 0.5.
            const groundCol = RAPIER.ColliderDesc.cuboid(500.0, 0.5, 500.0).setTranslation(0, -0.5, 0);
            this.world.createCollider(groundCol, groundBody);
            
            console.log("PhysicsEngine: ✓ World Ready");
        },
        
        setPaused(isPaused) {
            this.paused = isPaused;
        },
        
        resetStaticGeometry() {
            if (!this.world) return;
            const RAPIER = window.RAPIER;
            
            // Remove all static bodies we tracked
            for (const handle of this.staticHandles) {
                try {
                    const body = this.world.getRigidBody(handle);
                    if (body) {
                        this.world.removeRigidBody(body);
                    }
                } catch(e) { console.warn("PhysicsEngine: Error removing body", e); }
            }
            this.staticHandles = [];
            console.log("PhysicsEngine: Static geometry cleared.");
        },
        
        // Adds a trimesh collider for the map
        addStaticTrimesh(geometry, position, quaternion, scale) {
            if (!this.world || !window.RAPIER) return;
            const RAPIER = window.RAPIER;

            // 1. Create RigidBody
            const bodyDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(position.x, position.y, position.z)
                .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w });
            const body = this.world.createRigidBody(bodyDesc);
            
            // 2. Extract Vertices/Indices
            const posAttr = geometry.attributes.position;
            const indices = geometry.index ? geometry.index.array : null;
            
            let vertices, ind;

            // If scaled, apply scale to vertices directly (Rapier trimesh doesn't support scale in descriptor easily)
            if (scale && (Math.abs(scale.x - 1) > 0.001 || Math.abs(scale.y - 1) > 0.001 || Math.abs(scale.z - 1) > 0.001)) {
                const count = posAttr.count;
                vertices = new Float32Array(count * 3);
                for(let i=0; i<count; i++) {
                    vertices[i*3] = posAttr.getX(i) * scale.x;
                    vertices[i*3+1] = posAttr.getY(i) * scale.y;
                    vertices[i*3+2] = posAttr.getZ(i) * scale.z;
                }
            } else {
                vertices = posAttr.array;
            }

            if (!indices) {
                // Generate indices for non-indexed geometry
                const count = posAttr.count;
                ind = new Uint32Array(count);
                for(let i=0; i<count; i++) ind[i] = i;
            } else {
                ind = indices;
            }

            // 3. Create Collider
            const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, ind);
            this.world.createCollider(colliderDesc, body);
            
            this.staticHandles.push(body.handle);
        },
        
        addStaticCuboid(size, position, quaternion) {
            if (!this.world || !window.RAPIER) return;
            const RAPIER = window.RAPIER;
            
            const bodyDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(position.x, position.y, position.z)
                .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w });
            const body = this.world.createRigidBody(bodyDesc);
            
            const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x/2, size.y/2, size.z/2);
            this.world.createCollider(colliderDesc, body);
            
            this.staticHandles.push(body.handle);
        },
        
        // SAFE REMOVE HELPER
        removeBody(body) {
            if (this.world && body) {
                try {
                    // Check validity if possible, or just try-catch
                    this.world.removeRigidBody(body);
                } catch(e) {
                    // Ignore errors if body already gone
                }
            }
        },
        
        step(dt) {
            if (!this.world || this.paused) return;
            try {
                this.world.timestep = Math.min(dt, 0.1);
                this.world.step();
            } catch(e) {
                console.error("PhysicsEngine: Step failed (Recursion/Aliasing prevented)", e);
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.PhysicsEngine = PhysicsEngine;
})();
