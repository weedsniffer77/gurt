
// js/data/weapons/smg/smg_animations.js
(function() {
    const weapon = window.TacticalShooter.GameData.Weapons["SMG"];
    if (!weapon) return;

    weapon.animationLogic = {
        slideOffset: 0,
        
        updateParts(dt, playerState, parts, weaponDef, ejectCallback, dropMagCallback) {
            const magMesh = parts.magazine;
            const handlePivot = parts.slide; 
            const handLeft = parts.handLeft; 
            
            const isReloading = playerState.isReloading;
            const t = playerState.reloadTimer;
            
            // Retrieve initial offset stored during mesh build (default -0.20 or similar)
            // If not found, fallback to 0 (but this caused the bug, so hopefully it's found)
            const baseZ = (handlePivot && handlePivot.userData.baseZ !== undefined) ? handlePivot.userData.baseZ : 0.0;
            
            if (isReloading && magMesh && handlePivot) {
                // Sequence (Total ~2.8s)
                // 0.0 - 0.5: Lock Handle (Hand moves to handle)
                // 0.5 - 0.8: Flick (Drop Mag) - Hand moves to magwell
                // 0.8 - 1.8: Insert Mag - Hand grabs mag, inserts
                // 1.8 - 2.0: Center Gun - Hand moves to handle
                // 2.0 - 2.4: Slap - Hand slaps
                // 2.4 - 2.8: Hand returns to grip
                
                // Offsets relative to baseZ
                // Locking adds +0.04 to pull handle back
                const lockedOffset = 0.04; 
                const restOffset = 0.0;
                
                const lockedRot = -0.5; 
                const restRot = 0.0;
                
                // --- HANDLE LOGIC ---
                if (t < 0.5) {
                    const p = t / 0.5;
                    handlePivot.position.z = baseZ + (restOffset + (lockedOffset * p));
                    if (p > 0.8) {
                        const rotP = (p - 0.8) / 0.2;
                        handlePivot.rotation.z = restRot + (lockedRot * rotP);
                    } else handlePivot.rotation.z = restRot;
                    
                    // Hand Move: From Grip to Handle
                    if (handLeft) {
                        const startPos = handLeft.userData.restPos || new window.THREE.Vector3(0,0,0);
                        const hP = Math.sin(p * Math.PI/2);
                        // Approx handle pos relative to grip
                        handLeft.position.copy(startPos).lerp(new window.THREE.Vector3(-0.05, 0.08, 0.05), hP);
                        handLeft.rotation.z = 0.5 * hP;
                    }
                } 
                else if (t < 2.2) {
                    handlePivot.position.z = baseZ + lockedOffset;
                    handlePivot.rotation.z = lockedRot;
                    
                    if (t < 0.8) {
                        // Hand moves from Handle to Magwell
                        if (handLeft) {
                            const p = (t - 0.5) / 0.3;
                            handLeft.position.set(-0.05, 0.08, 0.05).lerp(new window.THREE.Vector3(0, -0.15, 0.1), p);
                            handLeft.rotation.z = 0.5 - (0.5*p);
                        }
                    } else if (t < 1.8) {
                        // Insert Mag
                        if (handLeft) {
                            const p = (t - 0.8) / 1.0;
                            // Dip down then up
                            if (p < 0.5) handLeft.position.set(0, -0.15 - (p*0.2), 0.1);
                            else handLeft.position.set(0, -0.35 + ((p-0.5)*0.4), 0.1);
                        }
                    } else {
                        // Move back to Handle for Slap
                        if (handLeft) {
                            const p = (t - 1.8) / 0.4;
                            handLeft.position.set(0, -0.15, 0.1).lerp(new window.THREE.Vector3(-0.05, 0.12, 0.05), p);
                            handLeft.rotation.z = 0.8 * p;
                        }
                    }
                }
                else if (t < 2.4) {
                    const p = (t - 2.2) / 0.2;
                    if (p < 0.2) handlePivot.rotation.z = restRot; 
                    handlePivot.position.z = baseZ + (lockedOffset * (1.0 - p));
                    
                    // Slap!
                    if (handLeft) {
                        handLeft.position.set(-0.05, 0.12 - (p*0.1), 0.05);
                    }
                } 
                else {
                    handlePivot.position.z = baseZ + restOffset;
                    handlePivot.rotation.z = restRot;
                    
                    // Return to grip
                    if (handLeft) {
                        const targetPos = handLeft.userData.restPos || new window.THREE.Vector3(0,0,0);
                        const p = Math.min(1.0, (t - 2.4) / 0.4);
                        handLeft.position.set(-0.05, 0.02, 0.05).lerp(targetPos, p);
                        handLeft.rotation.z = 0.8 * (1.0 - p);
                    }
                }

                // --- MAG LOGIC ---
                if (t > 0.6 && !playerState.hasDroppedMag) {
                    playerState.hasDroppedMag = true;
                    if (magMesh) {
                        magMesh.updateMatrixWorld(true);
                        if (dropMagCallback) dropMagCallback(); 
                        magMesh.visible = false; 
                    }
                }
                if (t > 1.2 && t < 1.8) {
                    magMesh.visible = true;
                    const p = (t - 1.2) / 0.6;
                    magMesh.position.y = -0.5 * (1.0 - p);
                } else if (t >= 1.8) {
                    magMesh.visible = true;
                    magMesh.position.y = 0;
                }

            } else {
                if (magMesh) { magMesh.visible = true; magMesh.position.y = 0; }
                if (handlePivot) { 
                    handlePivot.position.z = baseZ; 
                    handlePivot.rotation.z = 0; 
                }
                if (handLeft) { 
                    const rest = handLeft.userData.restPos || new window.THREE.Vector3(0,0,0);
                    handLeft.position.copy(rest); 
                    handLeft.rotation.set(0,0,0); 
                }
            }
        },

        getOffsets(playerState, weaponDef) {
            const pos = new window.THREE.Vector3(0,0,0);
            const rot = new window.THREE.Euler(0,0,0);
            
            if (playerState.isReloading) {
                const t = playerState.reloadTimer;
                if (t < 0.5) { rot.x = 0.2; rot.z = 0.3; } 
                else if (t < 0.8) {
                    const p = (t - 0.5) / 0.3;
                    rot.z = 0.3 - (p * 0.8); 
                    rot.x = 0.2;
                }
                else if (t < 1.8) { rot.z = -0.4; rot.x = 0.3; }
                else if (t < 2.2) {
                    const p = (t - 1.8) / 0.4;
                    rot.z = -0.4 * (1.0 - p);
                    rot.x = 0.3 * (1.0 - p);
                }
                else if (t < 2.5) {
                    const impactTime = 2.25; 
                    if (t > impactTime) {
                        const decay = Math.max(0, 1.0 - (t - impactTime) * 10.0);
                        rot.x = -0.1 * decay; 
                        pos.z = 0.03 * decay; 
                        rot.z = -0.05 * decay; 
                    }
                }
            }
            return { pos, rot };
        }
    };
})();
