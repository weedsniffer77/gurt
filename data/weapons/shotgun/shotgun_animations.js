
// js/data/weapons/shotgun/shotgun_animations.js
(function() {
    const weapon = window.TacticalShooter.GameData.Weapons["SHOTGUN"];
    if (!weapon) return;

    weapon.animationLogic = {
        slideOffset: -0.15, 
        lastEjectTime: 0, 
        hasEjectedDuringCycle: false,
        
        updateParts(dt, playerState, parts, weaponDef, ejectCallback) {
            const slideMesh = parts.slide;
            const boltMesh = parts.bolt;
            const handLeft = parts.handLeft;
            const shellMesh = parts.shell; // Physical shell in hand
            
            if (!slideMesh) return;

            // Updated Limits based on model reset
            const restPos = -0.15; // Forward (Closed)
            const backPos = 0.0; // Back (Open) - since rest is -0.15, back is closer to 0
            
            let targetSlide = restPos; 
            
            // --- RELOAD SEQUENCE ---
            if (playerState.isReloading) {
                const t = playerState.reloadTimer;
                
                // 1. EMPTY START (1.5s) - Load into Side Port
                if (playerState.reloadPhase === 'start') {
                    // Sequence:
                    // 0.0 - 0.3: Pump Back (Open) & Eject
                    // 0.3 - 0.6: Hand grabs shell (moves away from pump)
                    // 0.6 - 0.9: Hand Inserts into SIDE PORT (Right side)
                    // 0.9 - 1.2: Hand returns to Pump & Pump Forward (Close)
                    
                    if (t < 0.3) {
                        const p = t / 0.3;
                        targetSlide = window.THREE.MathUtils.lerp(restPos, backPos, p);
                        if (t > 0.15 && (Date.now() - this.lastEjectTime > 1000)) {
                            this.lastEjectTime = Date.now();
                            if (ejectCallback) ejectCallback();
                        }
                    } else if (t < 1.2) {
                        targetSlide = backPos; // Hold Open
                        
                        // Hand Animation
                        if (handLeft) {
                            if (t < 0.6) {
                                // Move to Pocket/Belt
                                const p = (t - 0.3) / 0.3;
                                handLeft.position.set(0, -0.2 * p, 0); 
                                if (shellMesh) shellMesh.visible = false;
                            } else if (t < 0.9) {
                                // Move to Ejection Port (Right Side)
                                // Gun is rotated -90 Y. Right side is Local -Z? Or Global +X?
                                // Model places port at `0.04, 0.01, 0.02` (global relative to rig)
                                // Hand needs to go there.
                                if (shellMesh) shellMesh.visible = true;
                                const p = (t - 0.6) / 0.3;
                                
                                // Move up and right
                                handLeft.position.lerpVectors(
                                    new window.THREE.Vector3(0, -0.2, 0),
                                    new window.THREE.Vector3(0.08, 0.05, 0.25), // Approx side port pos relative to pump
                                    p
                                );
                                // Rotate hand to align shell
                                handLeft.rotation.z = -0.5 * p;
                                handLeft.rotation.y = -0.5 * p;
                            } else {
                                // Inserted! Hide Shell and Return
                                if (shellMesh) shellMesh.visible = false;
                                const p = (t - 0.9) / 0.3;
                                handLeft.position.lerpVectors(
                                    new window.THREE.Vector3(0.08, 0.05, 0.25),
                                    new window.THREE.Vector3(0, 0, 0), // Back to pump
                                    p
                                );
                                handLeft.rotation.set(0, 0, 0);
                            }
                        }
                    } else if (t < 1.5) {
                        // Close Pump
                        const p = (t - 1.2) / 0.3;
                        targetSlide = window.THREE.MathUtils.lerp(backPos, restPos, p);
                    } else {
                        targetSlide = restPos;
                    }
                }
                // 2. LOOP (0.75s) - Load into Bottom Port
                else if (playerState.reloadPhase === 'loop') {
                    // 0.0 - 0.3: Fetch Shell
                    // 0.3 - 0.5: Insert Bottom
                    // 0.5 - 0.75: Return
                    if (handLeft) {
                        if (t < 0.3) {
                            const p = t / 0.3;
                            handLeft.position.set(0, -0.2 * p, 0);
                            if (shellMesh) shellMesh.visible = false;
                        } else if (t < 0.5) {
                            if (shellMesh) shellMesh.visible = true;
                            const p = (t - 0.3) / 0.2;
                            // Bottom port is at ~60mm back.
                            handLeft.position.lerpVectors(
                                new window.THREE.Vector3(0, -0.2, 0),
                                new window.THREE.Vector3(0, -0.05, 0.2), // Under receiver
                                p
                            );
                            handLeft.rotation.x = 0.5 * p; // Tilt up to push in
                        } else {
                            if (shellMesh) shellMesh.visible = false;
                            const p = (t - 0.5) / 0.25;
                            handLeft.position.lerpVectors(
                                new window.THREE.Vector3(0, -0.05, 0.2),
                                new window.THREE.Vector3(0, 0, 0),
                                p
                            );
                            handLeft.rotation.set(0, 0, 0);
                        }
                    }
                    targetSlide = restPos;
                }
                
                this.slideOffset = targetSlide;
                slideMesh.position.z = this.slideOffset;
                this.syncBolt(boltMesh, this.slideOffset, restPos);
                return;
            }

            // --- STANDARD PUMP LOGIC ---
            // If we are NOT reloading, ensure shell is hidden
            if (shellMesh) shellMesh.visible = false;

            const stage = playerState.pumpStage;
            
            if (stage === 1) { 
                targetSlide = restPos; 
                this.hasEjectedDuringCycle = false;
            }
            else if (stage === 2) { 
                const cycleDuration = weaponDef.pumpCycleTime || 0.35;
                const halfCycle = cycleDuration / 2;
                const t = playerState.pumpTimer;
                
                if (t < halfCycle) {
                    const p = t / halfCycle;
                    targetSlide = window.THREE.MathUtils.lerp(restPos, backPos, Math.sin(p * Math.PI / 2));
                } else {
                    const p = (t - halfCycle) / halfCycle;
                    targetSlide = window.THREE.MathUtils.lerp(backPos, restPos, Math.sin(p * Math.PI / 2));
                    
                    if (!this.hasEjectedDuringCycle) {
                        this.hasEjectedDuringCycle = true;
                        if (ejectCallback) ejectCallback();
                    }
                }
                
                this.slideOffset = targetSlide;
                slideMesh.position.z = this.slideOffset;
                this.syncBolt(boltMesh, this.slideOffset, restPos);
                return;
            }

            // Idle
            const slideSpeed = 20.0;
            this.slideOffset = window.THREE.MathUtils.lerp(this.slideOffset, restPos, dt * slideSpeed);
            slideMesh.position.z = this.slideOffset;
            this.syncBolt(boltMesh, this.slideOffset, restPos);
            
            // Reset Hand
            if (handLeft) {
                handLeft.position.set(0,0,0);
                handLeft.rotation.set(0,0,0);
            }
        },
        
        syncBolt(bolt, currentZ, restZ) {
            if (!bolt) return;
            // restZ = -0.15 (Closed). currentZ moves towards 0.0 (Open).
            // Delta is positive as we open.
            const delta = currentZ - restZ;
            
            // Bolt is on right side. X axis of Receiver? 
            // In model: Receiver Rotated -90 Y. 
            // Bolt moves along Receiver X (Gun Z).
            // But Bolt geometry is local to Receiver.
            // Receiver X is Gun Z.
            // Bolt should move BACK (Receiver +X) when Pump moves BACK (Gun +Z).
            // Since Gun +Z = Receiver +X, we just add delta.
            
            const startX = bolt.userData.restX || 0.07;
            bolt.position.x = startX + (delta * 1.0); // 1:1 movement
            
            // Culling/Occlusion
            // As it moves back, it goes 'into' the stock area.
            // Shrink X scale to simulate hiding? 
            // Bolt geom is Box(Length, Height, Thick).
            // Scaling X shrinks it towards center. If pivot is center, it shrinks from both ends.
            // We want it to disappear from the front? 
            // Actually, usually it slides back into the receiver housing.
            // If we assume the rear of the receiver is solid, we can just slide it back.
            // But if user wants "occluded", scaling X is a cheap trick.
            
            const maxTravel = 0.15;
            const ratio = Math.max(0, delta / maxTravel); // 0 to 1
            
            // Shrink as it opens
            bolt.scale.x = 1.0 - (ratio * 0.8);
            
            // Compensate position for shrink (keep rear aligned? or front aligned?)
            // If we shrink from center, we need to move it to keep one edge fixed.
            // Let's just let it shrink, it looks like it's withdrawing.
        },

        getOffsets(playerState, weaponDef) {
            const pos = new window.THREE.Vector3(0,0,0);
            const rot = new window.THREE.Euler(0,0,0);
            
            if (playerState.isReloading) {
                if (playerState.reloadPhase === 'start') {
                    // Tilt Left (Roll +Z) to show Right Side Port
                    const t = playerState.reloadTimer;
                    let p = 0;
                    if (t < 0.3) p = t/0.3;
                    else if (t < 1.2) p = 1.0;
                    else p = 1.0 - ((t-1.2)/0.3);
                    
                    rot.z = 0.6 * p; 
                    rot.x = 0.1 * p;
                    pos.y = -0.05 * p;
                } 
                else if (playerState.reloadPhase === 'loop') {
                    // Tilt Right/Up (Roll -Z, Pitch +X) to show Bottom
                    rot.z = -0.8;
                    rot.x = 0.5;
                    pos.y = 0.1;
                }
                return { pos, rot };
            }

            const stage = playerState.pumpStage;
            if (stage === 2) {
                const t = playerState.pumpTimer;
                const freq = 30.0;
                rot.z = Math.sin(t * freq) * 0.05;
                rot.x = Math.abs(Math.sin(t * freq)) * 0.05;
                pos.x = Math.sin(t * 20.0) * 0.01;
            }

            return { pos, rot };
        }
    };
})();
