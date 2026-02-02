
// js/input/drone_input_handler.js
(function() {
    const DroneInputHandler = {
        getControlState(dt, inputManager, config) {
            const state = {
                thrust: 0,
                yaw: 0,
                pitch: 0,
                roll: 0,
                lift: 0
            };

            if (!inputManager) return state;

            // Sensitivities from Settings or Defaults
            const SM = window.TacticalShooter.SettingsManager;
            const mouseSensMult = SM ? SM.settings.droneSensitivity : 1.0;
            const rollSensMult = SM ? SM.settings.droneRollSensitivity : 1.0;

            const mouseDelta = inputManager.getMouseDelta();
            const sens = 0.003 * mouseSensMult;

            // Mouse is always Pitch/Yaw
            state.pitch = -mouseDelta.y * sens * 2.0;
            state.yaw = -mouseDelta.x * sens * 2.0;

            if (config.realisticMode) {
                // --- REALISTIC (ACRO-ish) ---
                if (inputManager.isActionActive('DroneThrottleUp')) state.lift += 1;
                if (inputManager.isActionActive('DroneThrottleDown')) state.lift -= 1;
                
                if (inputManager.isActionActive('DroneYawLeft')) state.yaw += 2.0 * dt;
                if (inputManager.isActionActive('DroneYawRight')) state.yaw -= 2.0 * dt;
                
                if (inputManager.isActionActive('DroneRollLeft')) state.roll += 1;
                if (inputManager.isActionActive('DroneRollRight')) state.roll -= 1;
                
                // Keyboard Pitch Aux (W = Forward/Nose Down = Negative Pitch)
                if (inputManager.isActionActive('DronePitchDown')) state.pitch -= 2.0 * dt;
                if (inputManager.isActionActive('DronePitchUp')) state.pitch += 2.0 * dt;

            } else {
                // --- STANDARD (ARCADE) ---
                // Forward/Back = Thrust (Pitch visual only)
                if (inputManager.isActionActive('DroneMoveForward')) state.thrust += 1;
                if (inputManager.isActionActive('DroneMoveBackward')) state.thrust -= 1;
                
                // Left/Right = Strafe (Roll visual only)
                if (inputManager.isActionActive('DroneMoveRight')) state.roll -= 1; // Strafe Right
                if (inputManager.isActionActive('DroneMoveLeft')) state.roll += 1; // Strafe Left
                
                // Up/Down = Lift
                if (inputManager.isActionActive('DroneAscend')) state.lift += 1;
                if (inputManager.isActionActive('DroneDescend')) state.lift -= 1;
            }
            
            return state;
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.DroneInputHandler = DroneInputHandler;
})();
