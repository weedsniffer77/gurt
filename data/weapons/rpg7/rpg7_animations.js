
// js/data/weapons/rpg7/rpg7_animations.js
(function() {
    const weapon = window.TacticalShooter.GameData.Weapons["RPG7"];
    if (!weapon) return;

    weapon.animationLogic = {
        updateParts(dt, playerState, parts, weaponDef, ejectCallback, dropMagCallback) {
            const rocketGroup = parts.magazine;
            const rOGV = parts.rocketOGV;
            const rHEAT = parts.rocketHEAT;
            
            // Left Gun
            const rocketGroupL = parts.magazineLeft;
            const rOGVL = parts.rocketOGVLeft;
            const rHEATL = parts.rocketHEATLeft;
            
            // Loaded Pos: 0, 0.12, -0.135
            const loadedPos = new window.THREE.Vector3(0, 0.12, -0.135);
            // Extracted Pos (Pulled Forward): Z = -0.6
            const extractedPos = new window.THREE.Vector3(0, 0.12, -0.6); 
            // Low Pos (Hidden): Y = -0.5
            const lowPos = new window.THREE.Vector3(0, -0.5, -0.6);
            
            if (playerState.isReloading) {
                const t = playerState.reloadTimer;
                const PA = playerState.modules.ammo;
                const phase = playerState.reloadPhase;
                
                // --- PHASE 1: UNLOAD SWAP (Removing OLD rocket) ---
                if (phase === 'unload_swap') {
                    const currentType = PA.currentAmmoType;
                    
                    const updateGroup = (grp, ogv, heat) => {
                        if (!grp) return;
                        grp.visible = true;
                        if (ogv) ogv.visible = (currentType === 'rocket_frag');
                        if (heat) heat.visible = (currentType === 'rocket_heat');
                        
                        if (t < 0.8) {
                            const p = t / 0.8;
                            grp.position.lerpVectors(loadedPos, extractedPos, p);
                        } else {
                            const p = (t - 0.8) / 0.4;
                            grp.position.lerpVectors(extractedPos, lowPos, p);
                        }
                        grp.rotation.x = 0;
                    };
                    
                    updateGroup(rocketGroup, rOGV, rHEAT);
                    updateGroup(rocketGroupL, rOGVL, rHEATL);
                }
                
                // --- PHASE 2: STANDARD RELOAD (Inserting NEW rocket) ---
                else {
                    const ammoType = PA.currentAmmoType;
                    
                    const updateGroup = (grp, ogv, heat) => {
                        if (!grp) return;
                        if (t < 0.5) {
                            grp.visible = false;
                        } 
                        else if (t < 1.5) {
                            grp.visible = true;
                            if (ogv) ogv.visible = (ammoType === 'rocket_frag');
                            if (heat) heat.visible = (ammoType === 'rocket_heat');

                            const p = (t - 0.5) / 1.0;
                            grp.position.lerpVectors(extractedPos, loadedPos, p);
                            grp.rotation.x = 0;
                        } 
                        else {
                            grp.visible = true;
                            grp.position.copy(loadedPos);
                            if (ogv) ogv.visible = (ammoType === 'rocket_frag');
                            if (heat) heat.visible = (ammoType === 'rocket_heat');
                        }
                    };
                    
                    updateGroup(rocketGroup, rOGV, rHEAT);
                    updateGroup(rocketGroupL, rOGVL, rHEATL);
                }
            } else {
                // IDLE
                const PA = playerState.modules.ammo;
                const updateGroup = (grp, ogv, heat) => {
                    if (!grp) return;
                    grp.visible = (playerState.currentAmmo > 0);
                    grp.position.copy(loadedPos);
                    grp.rotation.set(0,0,0);
                    if (PA) {
                        if (ogv) ogv.visible = (PA.currentAmmoType === 'rocket_frag');
                        if (heat) heat.visible = (PA.currentAmmoType === 'rocket_heat');
                    }
                };
                
                updateGroup(rocketGroup, rOGV, rHEAT);
                updateGroup(rocketGroupL, rOGVL, rHEATL);
            }
        },

        getOffsets(playerState, weaponDef) {
            const pos = new window.THREE.Vector3(0,0,0);
            const rot = new window.THREE.Euler(0,0,0);
            
            if (playerState.isReloading) {
                const t = playerState.reloadTimer;
                const phase = playerState.reloadPhase;
                
                if (phase === 'unload_swap') {
                    // Tilt for extraction
                    if (t < 0.8) {
                         rot.x = -0.2 * (t/0.8);
                    } else {
                         rot.x = -0.2;
                         rot.z = 0.1;
                    }
                } else {
                    // Standard insertion tilt
                    if (t < 0.5) {
                        const p = t / 0.5;
                        rot.x = 0.3 * p; 
                        pos.y = -0.2 * p; 
                        rot.z = 0.2 * p;
                    } else if (t < 2.5) {
                        rot.x = 0.3;
                        pos.y = -0.2;
                        rot.z = 0.2;
                    } else {
                        const p = (t - 2.5) / 0.5;
                        rot.x = 0.3 * (1-p);
                        pos.y = -0.2 * (1-p);
                        rot.z = 0.2 * (1-p);
                    }
                }
            }
            
            return { pos, rot };
        }
    };
})();
