
// js/data/weapons/type92/type92_animations.js
(function() {
    const weapon = window.TacticalShooter.GameData.Weapons["TYPE92"];
    if (!weapon) return;

    weapon.animationLogic = {
        wastedRound: false,
        
        updateParts(dt, playerState, parts, weaponDef, ejectCallback, dropMagCallback) {
            const slideMesh = parts.slide;
            const magMesh = parts.magazine;
            const handLeft = parts.handLeft;
            
            // Slide travel: rest -0.03, back 0.0
            const restZ = -0.03;
            const lockedZ = 0.015;
            const magRestY = -0.065; 
            const magDropY = -0.4;
            
            const wm = window.TacticalShooter.WeaponManager;
            const fireCycle = wm ? wm.fireTimer : 0;
            const isFiring = fireCycle > 0;
            
            if (playerState.isReloading) {
                const t = playerState.reloadTimer;
                const isEmpty = playerState.reloadChamberingRequired;
                
                // Reload sequence (1.9s)
                
                if (handLeft) {
                    const startPos = handLeft.userData.restPos || new window.THREE.Vector3(0,0,0);
                    
                    if (t < 0.4) {
                        handLeft.position.set(0, -0.20, 0.05);
                        if (!playerState.hasDroppedMag && t > 0.3) {
                            playerState.hasDroppedMag = true;
                            if (magMesh) { magMesh.updateMatrixWorld(true); if (dropMagCallback) dropMagCallback(false); magMesh.visible = false; }
                        }
                    } else if (t < 1.1) {
                        handLeft.position.set(0, -0.35, 0.05);
                        if (magMesh && t > 0.8) magMesh.visible = true; 
                    } else {
                        if (magMesh) { 
                            const p = Math.min(1, (t - 1.1) / 0.2);
                            magMesh.position.y = window.THREE.MathUtils.lerp(magDropY, magRestY, p);
                        }
                        if (isEmpty && t < 1.5) {
                            handLeft.position.set(0, 0.05, 0); 
                        } else {
                            const p = Math.min(1, (t - 1.5)/0.4);
                            handLeft.position.lerp(startPos, p);
                        }
                    }
                }
                
                if (isEmpty) {
                    // Slide Logic:
                    // 0.0 - 1.5: Locked Back
                    // 1.5+: Snap Forward quickly (0.05s) to avoid slow drift
                    if (t > 1.5) {
                        const p = Math.min(1, (t - 1.5) / 0.05); // Fast snap
                        slideMesh.position.z = window.THREE.MathUtils.lerp(lockedZ, restZ, p);
                    } else {
                        slideMesh.position.z = lockedZ;
                    }
                } else {
                    slideMesh.position.z = restZ;
                }
            } else {
                // Normal
                if (magMesh) { magMesh.visible = true; magMesh.position.y = magRestY; }
                if (handLeft) { 
                    const rest = handLeft.userData.restPos || new window.THREE.Vector3(0,0,0);
                    handLeft.position.copy(rest); 
                }
                
                if (playerState.currentAmmo === 0) {
                    slideMesh.position.z = lockedZ;
                } else if (isFiring) {
                    const totalTime = weaponDef.visualFireRate || weaponDef.fireRate;
                    const p = 1.0 - (fireCycle / totalTime);
                    if (p < 0.3) slideMesh.position.z = window.THREE.MathUtils.lerp(restZ, lockedZ, p/0.3);
                    else slideMesh.position.z = window.THREE.MathUtils.lerp(lockedZ, restZ, (p-0.3)/0.7);
                } else {
                    slideMesh.position.z = restZ;
                }
            }
        },
        
        getOffsets(playerState, weaponDef) {
            return { pos: new window.THREE.Vector3(0,0,0), rot: new window.THREE.Euler(0,0,0) };
        }
    };
})();
