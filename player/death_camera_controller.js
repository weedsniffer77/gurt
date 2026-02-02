
// js/player/death_camera_controller.js
(function() {
    const DeathCameraController = {
        active: false,
        ragdoll: null,
        killerId: null,
        focusMode: 'killer', // 'killer', 'body', 'origin'
        
        // Fallback state if killer leaves
        staticKillerPos: null,
        focusPoint: null,
        
        start(ragdoll, damageVector, killerId, focusBody = false, focusPoint = null) {
            if (!ragdoll) return;
            this.ragdoll = ragdoll;
            this.killerId = killerId;
            
            // Mode Selection Priority: Origin > Body > Killer
            if (focusPoint) {
                this.focusMode = 'origin';
                this.focusPoint = focusPoint.clone();
            } else if (focusBody) {
                this.focusMode = 'body';
                this.focusPoint = null;
            } else {
                this.focusMode = 'killer';
                this.focusPoint = null;
            }
            
            this.active = true;
            
            // Calculate a static fallback position based on the damage vector
            const hitDirection = damageVector ? damageVector.clone().normalize().multiplyScalar(-1) : new THREE.Vector3(0, 0, 1);
            
            let torso = (this.ragdoll && this.ragdoll.bodies) ? this.ragdoll.bodies['torso'] : null;
            
            // CRITICAL FIX: Guard against undefined torso body
            let startPos = new THREE.Vector3();
            if (torso && torso.isValid && torso.isValid() && torso.translation) {
                const t = torso.translation();
                startPos.set(t.x, t.y, t.z);
            } else if (window.TacticalShooter.CharacterController) {
                startPos.copy(window.TacticalShooter.CharacterController.position);
            }
            
            // Default static killer position (fallback)
            this.staticKillerPos = startPos.clone().add(hitDirection.multiplyScalar(20.0));
            this.staticKillerPos.y = Math.max(1.5, this.staticKillerPos.y); // Keep above ground
            
            console.log(`DeathCameraController: Active. Mode: ${this.focusMode}, Killer ID: ${killerId}`);
        },
        
        stop() {
            this.active = false;
            this.ragdoll = null;
            this.killerId = null;
            this.focusPoint = null;
        },
        
        update(dt, camera) {
            // CRITICAL FIX: Check if ragdoll and bodies still exist and are valid in physics world
            if (!this.active || !this.ragdoll || !this.ragdoll.bodies) return;
            
            // 1. Get Body Position (Torso)
            let torso = this.ragdoll.bodies['torso'];
            
            // Safety Check: If torso is gone or invalid (physics engine reset during tab out), stop cam
            if (!torso || (torso.isValid && !torso.isValid())) {
                this.stop();
                return; 
            }
            
            // Rapier uses translation(), fall back safely
            let t = { x:0, y:0, z:0 };
            try {
                if (typeof torso.translation === 'function') t = torso.translation();
                else if (torso.position) t = torso.position;
            } catch(e) {
                // If physics call fails, abort gracefully
                this.stop();
                return;
            }
            
            const bodyPos = new THREE.Vector3(t.x, t.y, t.z);
            
            // 2. Determine Look Target & Camera Position
            let targetLook = null;
            let targetCamPos = null;
            
            if (this.focusMode === 'body') {
                // Focus on Body: Look at body, camera above and slightly offset
                targetLook = bodyPos.clone();
                // Top-down view for stealth death
                targetCamPos = bodyPos.clone().add(new THREE.Vector3(0, 3.5, 2.0));
            } 
            else if (this.focusMode === 'origin' && this.focusPoint) {
                // Focus on Origin (Explosion): Look at explosion center
                targetLook = this.focusPoint.clone();
                
                // Position camera behind body relative to explosion
                const dirToExplosion = new THREE.Vector3().subVectors(targetLook, bodyPos).normalize();
                if (dirToExplosion.lengthSq() < 0.001) dirToExplosion.set(0, 0, 1);
                
                const backDir = dirToExplosion.clone().negate();
                targetCamPos = bodyPos.clone().add(backDir.multiplyScalar(3.0));
                targetCamPos.y += 1.5; 
            }
            else {
                // Focus on Killer (Default)
                let killerPos = this.staticKillerPos;
                
                // Try to get live position if killer is still in game
                if (this.killerId && window.TacticalShooter.RemotePlayerManager) {
                    const killer = window.TacticalShooter.RemotePlayerManager.remotePlayers[this.killerId];
                    if (killer && killer.mesh && killer.currentStatus === 'ALIVE') {
                        // Update static pos while we have live data
                        this.staticKillerPos = killer.mesh.position.clone();
                        this.staticKillerPos.y += 1.5; 
                        killerPos = this.staticKillerPos;
                    }
                }
                
                targetLook = killerPos.clone();
                
                // Position camera behind body looking at killer
                const dirToKiller = new THREE.Vector3().subVectors(targetLook, bodyPos).normalize();
                if (dirToKiller.lengthSq() < 0.001) dirToKiller.set(0, 0, 1);
                
                const backDir = dirToKiller.clone().negate();
                targetCamPos = bodyPos.clone().add(backDir.multiplyScalar(2.5));
                targetCamPos.y += 1.2;
            }
            
            // 3. Smooth Update
            camera.position.lerp(targetCamPos, dt * 5.0);
            camera.lookAt(targetLook);
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.DeathCameraController = DeathCameraController;
})();
