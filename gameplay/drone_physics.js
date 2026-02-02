
// js/gameplay/drone_physics.js
(function() {
    const DronePhysics = {
        update(dt, body, inputManager, config, state) {
            if (!body) return;
            
            // Get Input State from Handler
            let inputs = { thrust:0, yaw:0, pitch:0, roll:0, lift:0 };
            
            if (window.TacticalShooter.DroneInputHandler && inputManager) {
                inputs = window.TacticalShooter.DroneInputHandler.getControlState(dt, inputManager, config);
            }

            const currentRot = body.rotation();
            const bodyQuat = new THREE.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w);
            const currentEuler = new THREE.Euler().setFromQuaternion(bodyQuat, 'YXZ');
            
            // --- ANGULAR VELOCITY CONTROL ---
            let targetAngVel = new THREE.Vector3();
            
            if (config.realisticMode) {
                // ACRO MODE
                targetAngVel.x = inputs.pitch * 40.0;
                targetAngVel.y = inputs.yaw * 40.0;
                
                // Roll Sensitivity from Settings via Handler calc logic? 
                // Handler returns normalized roll (-1 to 1). We apply sensitivity here.
                const SM = window.TacticalShooter.SettingsManager;
                const rollMult = SM ? SM.settings.droneRollSensitivity : 2.0;
                
                targetAngVel.z = inputs.roll * 5.0 * rollMult; 
                
                const worldAngVel = targetAngVel.clone().applyQuaternion(bodyQuat);
                
                // Damping if no input
                if (Math.abs(inputs.pitch) < 0.01 && Math.abs(inputs.yaw) < 0.01 && Math.abs(inputs.roll) < 0.01) {
                     const currentAngVel = body.angvel();
                     const damped = new THREE.Vector3(currentAngVel.x, currentAngVel.y, currentAngVel.z).multiplyScalar(1.0 - 2.0 * dt);
                     body.setAngvel(damped, true);
                } else {
                     body.setAngvel(worldAngVel, true);
                }
            } else {
                // AUTO LEVEL MODE (Standard)
                // In Standard, inputs.roll comes from Strafe keys (Left = +1, Right = -1)
                // We use this to tilt the drone visually
                let rollDiff = (inputs.roll * config.tiltAngle) - currentEuler.z;
                let targetRollRate = rollDiff * config.correctionSpeed;
                targetRollRate = Math.max(-5.0, Math.min(5.0, targetRollRate));

                // Standard Mode Input Mapping:
                // Pitch Input comes from Mouse Y.
                targetAngVel.set(
                    inputs.pitch * 40.0, 
                    inputs.yaw * 40.0,   
                    targetRollRate     
                );
                
                const worldAngVel = targetAngVel.clone().applyQuaternion(bodyQuat);
                body.setAngvel({ x: worldAngVel.x, y: worldAngVel.y, z: worldAngVel.z }, true);
            }

            // --- LINEAR FORCE ---
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(bodyQuat);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(bodyQuat);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(bodyQuat); // Local Up
            
            const forceVec = new THREE.Vector3();
            
            if (config.realisticMode) {
                // Realistic: Thrust is LOCAL UP
                const baseHover = 9.81 * config.mass;
                const liftThrust = baseHover + (inputs.lift * config.speed * 0.8);
                forceVec.add(up.multiplyScalar(liftThrust));
            } else {
                // Arcade: Global Hover + Planar Movement
                forceVec.add(forward.multiplyScalar(inputs.thrust * config.speed));
                
                // inputs.roll contains strafe direction in Standard mode (Left/Right keys)
                // Left Key -> roll = +1. Right Key -> roll = -1.
                // Right Vector * -1 = Left. 
                // Strafe Left (Key A) should move Left.
                // inputs.roll is +1.
                // We want force Left.
                // Right vector is +X (local).
                // So -1 * Right = Left.
                // Actually, DroneInputHandler says: RightKey -> roll -= 1 (is -1). LeftKey -> roll += 1 (is +1).
                // So force = right * (-roll * speed)?
                // Let's just map it: roll=+1 (Left). Force should be -Right.
                // So force = right * (-1 * speed).
                forceVec.add(right.multiplyScalar(-inputs.roll * config.strafeSpeed));
                
                // Auto-Hover
                const pitchMag = Math.abs(currentEuler.x);
                let autoHoverMult = 1.0;
                if (pitchMag > 0.5) autoHoverMult = Math.max(0, 1.0 - ((pitchMag - 0.5) * 2.0));
                
                const baseGravityForce = 9.81 * config.mass;
                const hoverForce = (baseGravityForce * autoHoverMult) + (inputs.lift * config.speed * 0.8);
                
                forceVec.add(new THREE.Vector3(0, hoverForce, 0)); 
            }

            forceVec.multiplyScalar(dt); 
            body.applyImpulse(forceVec, true);
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.DronePhysics = DronePhysics;
})();
