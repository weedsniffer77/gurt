
// js/data/weapons/pistol/pistol_animations.js
(function() {
    const weapon = window.TacticalShooter.GameData.Weapons["PISTOL"];
    if (!weapon) return;

    weapon.animationLogic = {
        wastedRound: false, 
        wastedRoundRight: false,
        wastedRoundLeft: false,
        
        updateParts(dt, playerState, parts, weaponDef, ejectCallback, dropMagCallback) {
            const slideMesh = parts.slide;
            const magMesh = parts.magazine;
            const slideLeft = parts.slideLeft;
            const magLeft = parts.magazineLeft;
            const rightRoot = parts.rightRoot;
            const leftRoot = parts.leftRoot;
            const handLeft = parts.handLeft; 
            
            const isAkimbo = !!slideLeft;
            const wm = window.TacticalShooter.WeaponManager;
            const isAuto = weaponDef.automatic;
            const fireCycle = wm ? wm.fireTimer : 0;
            
            // --- SPRINT ANIMATION ---
            const inputManager = window.TacticalShooter.InputManager;
            const charController = window.TacticalShooter.CharacterController;
            let isSprinting = false;
            
            if (inputManager && charController) {
                const vel = charController.velocity;
                const hSpeed = new window.THREE.Vector3(vel.x, 0, vel.z).length();
                if (hSpeed > charController.config.walkSpeed + 1.0) isSprinting = true;
            }
            
            // Sprint targets (Overridden by reload if needed)
            let rX = isSprinting ? 0.2 : 0.0;
            let rRotX = isSprinting ? -0.8 : 0.0;
            let lX = isSprinting ? -0.2 : 0.0;
            let lRotX = isSprinting ? -0.8 : 0.0;
            let rY = 0.0;
            let lY = 0.0;

            // --- RELOAD LOGIC ---
            const isReloading = playerState.isReloading;
            const t = playerState.reloadTimer;
            const lockedZ = 0.03; const restZ = -0.02; 
            const magRestY = -0.05; const magDropY = -0.4;
            let rightZ = restZ; let leftZ = restZ;
            const isEmptyReload = playerState.reloadChamberingRequired;

            if (t < 0.1) {
                this.wastedRound = false;
                this.wastedRoundRight = false;
                this.wastedRoundLeft = false;
            }

            if (isReloading) {
                // Disable sprint pose during reload
                rX = 0; rRotX = 0; lX = 0; lRotX = 0;

                if (isAkimbo) {
                    if (isEmptyReload) {
                        // Total Reload Time ~3.6s
                        // Right Gun: 0.0 - 1.7
                        const rightDropTime = 0.5; 
                        const rightInsertTime = 1.3; 
                        const rightReleaseTime = 1.7;
                        
                        // Left Gun: 1.8 - 3.5
                        const leftStart = 1.8;
                        const leftDropTime = leftStart + 0.5; // 2.3
                        const leftInsertTime = leftStart + 1.3; // 3.1
                        const leftReleaseTime = leftStart + 1.7; // 3.5
                        
                        // --- RIGHT GUN RELOAD ---
                        if (t > rightDropTime && t < rightInsertTime) { 
                            if (t < rightInsertTime - 0.3) rY = -0.3; // Dip
                            else { const p = (t - (rightInsertTime - 0.3)) / 0.3; rY = -0.3 * (1.0 - p); } // Raise

                            if (!playerState.hasDroppedMag) { 
                                playerState.hasDroppedMag = true; 
                                if (magMesh) { magMesh.updateMatrixWorld(true); if (dropMagCallback) dropMagCallback(false); magMesh.visible = false; }
                            } 
                        } else if (t >= rightInsertTime) { 
                            rY = 0;
                            if (magMesh) { magMesh.visible = true; if (t < rightInsertTime + 0.3) { const p = (t - rightInsertTime) / 0.3; const ease = 1 - Math.pow(1 - p, 3); magMesh.position.y = window.THREE.MathUtils.lerp(magDropY, magRestY, ease); } else { magMesh.position.y = magRestY; } }
                        }
                        
                        // --- LEFT GUN RELOAD ---
                        if (t > leftDropTime && t < leftInsertTime) { 
                            if (t < leftInsertTime - 0.3) lY = -0.3; // Dip
                            else { const p = (t - (leftInsertTime - 0.3)) / 0.3; lY = -0.3 * (1.0 - p); } // Raise

                            if (!playerState.hasDroppedMagLeft) { 
                                playerState.hasDroppedMagLeft = true; 
                                if (magLeft) { magLeft.updateMatrixWorld(true); if (dropMagCallback) dropMagCallback(true); magLeft.visible = false; }
                            } 
                        } else if (t >= leftInsertTime) { 
                            lY = 0;
                            if (magLeft) { magLeft.visible = true; if (t < leftInsertTime + 0.3) { const p = (t - leftInsertTime) / 0.3; const ease = 1 - Math.pow(1 - p, 3); magLeft.position.y = window.THREE.MathUtils.lerp(magDropY, magRestY, ease); } else { magLeft.position.y = magRestY; } }
                        }
                        
                        rightZ = (t < rightReleaseTime) ? lockedZ : restZ; 
                        leftZ = (t < leftReleaseTime) ? lockedZ : restZ;
                    } else {
                        // PARTIAL RELOAD (Rack & Waste) - Extended
                        // Add Dipping Logic Here
                        
                        const rRack = 0.4; const rFwd = 1.5;
                        const lStart = 1.8; const lRack = lStart + 0.4; const lFwd = lStart + 1.5;
                        
                        // Right Dip: 0.1 - 1.0
                        if (t > 0.1 && t < 1.0) {
                            if (t < 0.6) rY = -0.2; 
                            else { const p = (t - 0.6)/0.4; rY = -0.2 * (1.0 - p); }
                        } else rY = 0;
                        
                        // Left Dip: 1.9 - 2.8
                        if (t > 1.9 && t < 2.8) {
                            if (t < 2.4) lY = -0.2; 
                            else { const p = (t - 2.4)/0.4; lY = -0.2 * (1.0 - p); }
                        } else lY = 0;

                        if (t < rRack) { const p = t / rRack; rightZ = window.THREE.MathUtils.lerp(restZ, lockedZ, p); if (t > 0.2 && !this.wastedRoundRight) { this.wastedRoundRight = true; if (ejectCallback) ejectCallback('right'); if (playerState.currentAmmo > 0) playerState.consumeAmmo(1); } } else if (t < rFwd) { rightZ = lockedZ; } else { const p = (t - rFwd) / 0.2; rightZ = window.THREE.MathUtils.lerp(lockedZ, restZ, Math.min(1, p*2)); }
                        
                        if (t > lStart && t < lRack) { const p = (t - lStart) / 0.4; leftZ = window.THREE.MathUtils.lerp(restZ, lockedZ, p); if (t > lStart + 0.2 && !this.wastedRoundLeft) { this.wastedRoundLeft = true; if (ejectCallback) ejectCallback('left'); if (playerState.currentAmmo > 0) playerState.consumeAmmo(1); } } else if (t >= lRack && t < lFwd) { leftZ = lockedZ; } else if (t >= lFwd) { const p = (t - lFwd) / 0.2; leftZ = window.THREE.MathUtils.lerp(lockedZ, restZ, Math.min(1, p*2)); }
                    }
                } else {
                    // ... (Single Pistol logic unchanged) ...
                    const startHandPos = handLeft.userData.restPos || new window.THREE.Vector3(0,0,0);
                    if (isEmptyReload) {
                        const dropTime = 0.4; const insertTime = 1.0; const releaseTime = 1.4;
                        if (t < dropTime) { if(handLeft) handLeft.position.set(0, -0.15, 0.05); } 
                        else if (t < insertTime) {
                            if (!playerState.hasDroppedMag) { 
                                playerState.hasDroppedMag = true; 
                                if (magMesh) { magMesh.updateMatrixWorld(true); if (dropMagCallback) dropMagCallback(false); magMesh.visible = false; }
                            }
                            if(handLeft) handLeft.position.set(0, -0.3, 0.05);
                        } else if (t >= insertTime) {
                            if (magMesh) { magMesh.visible = true; const p = Math.min(1, (t - insertTime) / 0.3); magMesh.position.y = window.THREE.MathUtils.lerp(magDropY, magRestY, 1 - Math.pow(1 - p, 3)); }
                            if(handLeft) { const p = Math.min(1, (t - insertTime) / 0.3); handLeft.position.set(0, window.THREE.MathUtils.lerp(-0.3, -0.15, p), 0.05); }
                        }
                        if (t > 1.3 && t < releaseTime) { rightZ = lockedZ; if(handLeft) handLeft.position.set(0, 0.05, 0); } 
                        else if (t >= releaseTime) { rightZ = restZ; if(handLeft) handLeft.position.lerp(startHandPos, (t-releaseTime)/0.2); } 
                        else { rightZ = lockedZ; }
                    } else {
                        // PARTIAL
                        const rackDur = 0.3; const releaseTime = 1.4; const dropTime = 0.5; const insertTime = 1.0;
                        if (t < rackDur) {
                            if(handLeft) handLeft.position.set(0, 0.05, 0);
                            const p = t / rackDur; rightZ = window.THREE.MathUtils.lerp(restZ, lockedZ, p);
                            if (t > 0.2 && !this.wastedRound) { this.wastedRound = true; if (ejectCallback) ejectCallback(); if (playerState.currentAmmo > 0) { if (playerState.consumeAmmo(1)) {} else { playerState.currentAmmo--; } } }
                        } else if (t < 0.6) {
                            if(handLeft) handLeft.position.lerp(new window.THREE.Vector3(0, -0.15, 0.05), (t-rackDur)/0.3);
                            rightZ = lockedZ;
                        } else if (t < releaseTime) {
                            rightZ = lockedZ;
                            if (t > dropTime && t < insertTime) { if (!playerState.hasDroppedMag) { playerState.hasDroppedMag = true; if(magMesh) { magMesh.updateMatrixWorld(true); if (dropMagCallback) dropMagCallback(false); magMesh.visible = false; } } if(handLeft) handLeft.position.set(0, -0.3, 0.05); } 
                            else if (t >= insertTime) { if (magMesh) { magMesh.visible = true; const p = Math.min(1,(t-insertTime)/0.3); magMesh.position.y = window.THREE.MathUtils.lerp(magDropY, magRestY, 1-Math.pow(1-p,3)); } if(handLeft) { const p = Math.min(1,(t-insertTime)/0.3); handLeft.position.set(0, window.THREE.MathUtils.lerp(-0.3, -0.15, p), 0.05); } }
                        } else {
                            const p = (t - releaseTime) / 0.2; rightZ = window.THREE.MathUtils.lerp(lockedZ, restZ, Math.min(1, p * 2));
                            if(handLeft) handLeft.position.lerp(startHandPos, p);
                        }
                    }
                }
            } 
            else {
                // NOT RELOADING
                if (magMesh) { magMesh.visible = true; magMesh.position.y = magRestY; }
                if (magLeft) { magLeft.visible = true; magLeft.position.y = magRestY; }
                
                if (handLeft) { 
                    const rest = handLeft.userData.restPos || new window.THREE.Vector3(0,0,0);
                    handLeft.position.copy(rest); 
                    handLeft.rotation.set(0,0,0); 
                    if (isAkimbo) handLeft.rotation.x = -0.25; 
                }
                
                if (playerState.currentAmmo === 0) { rightZ = lockedZ; leftZ = lockedZ; } 
                else if (isAuto && fireCycle > 0) {
                    const totalTime = weaponDef.visualFireRate || weaponDef.fireRate; const progress = 1.0 - (fireCycle / totalTime); const recoilZ = (progress < 0.5) ? (restZ + (progress/0.5)*0.05) : (lockedZ - ((progress-0.5)/0.5)*0.05);
                    rightZ = recoilZ; leftZ = recoilZ;
                } else { rightZ = restZ; leftZ = restZ; }
            }

            // Apply calculated transforms to gun roots and slides
            const spd = 20.0;
            if (rightRoot && leftRoot) {
                // Apply Sprint X Offset
                rightRoot.position.x = window.THREE.MathUtils.lerp(rightRoot.position.x, 0.2 + rX, dt * 8);
                leftRoot.position.x = window.THREE.MathUtils.lerp(leftRoot.position.x, -0.2 + lX, dt * 8);
                
                // Apply Reload Dip Y Offset
                rightRoot.position.y = window.THREE.MathUtils.lerp(rightRoot.position.y, rY, dt * 8);
                leftRoot.position.y = window.THREE.MathUtils.lerp(leftRoot.position.y, lY, dt * 8);
                
                // Apply Rotations
                rightRoot.rotation.x = window.THREE.MathUtils.lerp(rightRoot.rotation.x, rRotX, dt * 8);
                leftRoot.rotation.x = window.THREE.MathUtils.lerp(leftRoot.rotation.x, lRotX, dt * 8);
            }

            if (slideMesh) slideMesh.position.z = slideMesh.position.z + (rightZ - slideMesh.position.z) * dt * spd;
            if (slideLeft) slideLeft.position.z = slideLeft.position.z + (leftZ - slideLeft.position.z) * dt * spd;
        },

        getOffsets(playerState, weaponDef) {
            const pos = new window.THREE.Vector3(0,0,0);
            const rot = new window.THREE.Euler(0,0,0);
            const isAkimbo = weaponDef.attachments.includes('pistol_akimbo');
            if (playerState.isReloading && !isAkimbo) {
                const t = playerState.reloadTimer;
                if (t < 0.4) { const p = t / 0.4; const s = p * p * (3 - 2 * p); rot.z = 0.5 * s; rot.x = 0.3 * s; } 
                else if (t < 1.2) { rot.z = 0.5; rot.x = 0.3; }
                else if (t < 1.6) { const p = (t - 1.2) / 0.4; const s = p * p * (3 - 2 * p); rot.z = 0.5 * (1 - s); rot.x = 0.3 * (1 - s); }
            }
            return { pos, rot };
        }
    };
})();
