
// js/data/weapons/m24/m24_animations.js
(function() {
    const weapon = window.TacticalShooter.GameData.Weapons["M24"];
    if (!weapon) return;

    weapon.animationLogic = {
        hasEjected: false,
        hasEjectedReload: false,
        
        updateParts(dt, playerState, parts, weaponDef, ejectCallback, dropMagCallback) {
            const handLeft = parts.handLeft; 
            const shellMesh = parts.shell;
            
            // --- RELOAD ANIMATION (Single Shell Insert) ---
            if (playerState.isReloading) {
                const t = playerState.reloadTimer;
                const phase = playerState.reloadPhase;
                
                if (phase === 'start') {
                    // Bolt logic removed (No visual bolt)
                    
                    // Trigger eject callback for sound/logic timing even without visual bolt
                    if (t > 0.4 && !this.hasEjectedReload) {
                        if (!playerState.reloadChamberingRequired && playerState.currentAmmo > 0) {
                            this.hasEjectedReload = true;
                            if (ejectCallback) ejectCallback();
                        }
                    }
                    if (shellMesh) shellMesh.visible = false;
                }
                else if (phase === 'loop') {
                    // Hand Logic (Insert shell into port)
                    if (handLeft) {
                        if (t < 0.25) { // Fetch
                            if (shellMesh) shellMesh.visible = true;
                            const p = t / 0.25;
                            // From Forend to Pouch
                            handLeft.position.lerpVectors(new window.THREE.Vector3(0, -0.02, -0.25), new window.THREE.Vector3(0, -0.2, 0), p);
                        } else { // Insert
                            if (shellMesh) shellMesh.visible = false;
                            const p = (t - 0.25) / 0.25;
                            // From Pouch to Breech
                            handLeft.position.lerpVectors(new window.THREE.Vector3(0.02, 0.05, 0), new window.THREE.Vector3(0, -0.02, -0.25), p);
                        }
                    }
                }
                return;
            } else {
                this.hasEjectedReload = false;
            }

            // --- MANUAL BOLT CYCLE (Pump Logic) ---
            const stage = playerState.pumpStage;
            const cycleTime = weaponDef.pumpCycleTime || 1.4;
            const t = playerState.pumpTimer;
            
            if (stage === 2) {
                const p = t / cycleTime;
                
                // Logic only: Trigger eject mid-cycle
                if (p > 0.4 && !this.hasEjected) {
                    this.hasEjected = true;
                    if (ejectCallback) ejectCallback();
                }
            } 
            else if (stage === 1) {
                this.hasEjected = false;
            }
            else {
                // Idle
                if (shellMesh) shellMesh.visible = false;
                if (handLeft) {
                    handLeft.position.set(0, -0.02, -0.25);
                    handLeft.rotation.set(0,0,0);
                }
            }
        },

        getOffsets(playerState, weaponDef) {
            return { pos: new window.THREE.Vector3(0,0,0), rot: new window.THREE.Euler(0,0,0) };
        }
    };
})();
