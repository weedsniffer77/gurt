
// js/data/scorestreaks/ammo_box.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Scorestreaks: {} };

    // Define temporary weapon for deployment
    const AMMO_BOX_DEPLOY_DEF = {
        id: "AMMO_BOX_DEPLOY",
        name: "DEPLOY BOX",
        type: "special",
        magazineSize: 1,
        reserveAmmo: 0,
        fireRate: 1.0, 
        drawTime: 0.5,
        holsterTime: 0.2,
        sprintMultiplier: 1.0, 
        
        visuals: {
            hipPosition: { x: 0.2, y: -0.25, z: -0.3 }, 
            adsPosition: { x: 0.2, y: -0.25, z: -0.3 }, 
            sprintPosition: { x: 0.2, y: -0.35, z: -0.2 }, 
            sprintRotation: { x: -0.2, y: 0.4, z: 0.1 },   
            blockedPosition: { x: 0.1, y: -0.2, z: -0.2 }, 
            blockedRotation: { x: 0.5, y: -0.2, z: -0.1 }, 
            
            adsInSpeed: 8.0,
            adsOutSpeed: 10.0,
            walkBobAmount: 0.05, walkBobSpeed: 6.0,
            sprintBobAmount: 0.06, sprintBobSpeed: 11.0,
            sprintTransitionSpeed: 5.0,

            remoteIK: { rightElbow: { x: 0.5, y: -1.0, z: 0.2 }, leftElbow: { x: -0.5, y: -1.0, z: 0.2 } },
            leftHandOffset: { x: 0, y: 0, z: 0 }
        },
        
        buildMesh: function() {
            let mesh = new window.THREE.Group();
            if (window.TacticalShooter.AmmoBoxModel) {
                mesh = window.TacticalShooter.AmmoBoxModel.buildMesh();
            }
            return { mesh: mesh, parts: {} };
        }
    };

    // REGISTER AS WEAPON SO RENDERER FINDS IT
    window.TacticalShooter.GameData.Weapons["AMMO_BOX_DEPLOY"] = AMMO_BOX_DEPLOY_DEF;

    window.TacticalShooter.GameData.Scorestreaks["AMMO_BOX"] = {
        id: "AMMO_BOX",
        name: "AMMO BOX",
        killsRequired: 5,
        description: "Throw a crate to replenish ammo.",
        icon: "📦", 
        
        statsViewer: {
            labels: {
                mobility: "MOBILITY"
            },
            overrides: {
                mobility: 90,     
                rawSprint: 90     
            }
        },
        
        buildMesh: function() {
            let mesh = new window.THREE.Group();
            if (window.TacticalShooter.AmmoBoxModel) {
                mesh = window.TacticalShooter.AmmoBoxModel.buildMesh();
            }
            return { mesh: mesh, parts: {} };
        },

        onActivate: function(playerState) {
            // Switch Player Weapon to the Deployable Box
            if (window.TacticalShooter.WeaponManager) {
                const WM = window.TacticalShooter.WeaponManager;
                const LM = window.TacticalShooter.LoadoutManager;
                
                const deployDef = window.TacticalShooter.GameData.Weapons["AMMO_BOX_DEPLOY"];
                
                // Reset ammo (1 use)
                deployDef.magazineSize = 1;
                playerState.currentAmmo = 1;
                playerState.reserveAmmo = 0;
                
                deployDef.attackAction = () => {
                    // Consume Immediately
                    playerState.currentAmmo = 0;
                    
                    // --- INSTANT HIDE ---
                    if (window.TacticalShooter.GunRenderer) {
                        window.TacticalShooter.GunRenderer.setVisible(false);
                    }
                    
                    if (window.TacticalShooter.EntityManager) {
                        const CC = window.TacticalShooter.CharacterController;
                        const PC = window.TacticalShooter.PlayerCamera;
                        
                        const forward = PC.getForwardDirection();
                        forward.y = 0; forward.normalize();
                        
                        const startPos = CC.position.clone().add(forward.multiplyScalar(0.5));
                        startPos.y += 1.0; 
                        
                        const throwDir = PC.getForwardDirection().normalize();
                        throwDir.y += 0.2; throwDir.normalize();
                        const velocity = throwDir.multiplyScalar(6.0); 
                        
                        const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                        
                        // Spawn Locally and Get ID
                        const entityId = window.TacticalShooter.EntityManager.spawnEntity('ammo_box', startPos, new window.THREE.Quaternion(), myId, velocity);
                        
                        // Broadcast with ID so others can sync usage
                        if (window.TacticalShooter.NetworkEventHandler && entityId) {
                            window.TacticalShooter.NetworkEventHandler.broadcastSpawnEntity('ammo_box', startPos, new window.THREE.Quaternion(), velocity, entityId);
                        }
                    }
                    
                    // Switch back to primary 
                    setTimeout(() => {
                        LM.activeSlot = 'primary'; 
                        const primaryDef = LM.getActiveWeaponDef();
                        if (primaryDef) {
                            WM.completeSwitch(primaryDef);
                            // Restore visibility for the primary gun
                            if (window.TacticalShooter.GunRenderer) {
                                window.TacticalShooter.GunRenderer.setVisible(true);
                            }
                        }
                    }, 400); 
                };
                
                playerState.setWeapon(deployDef);
                WM.currentWeapon = deployDef;
                WM.drawTimer = 0.5;
                
                if (window.TacticalShooter.GunRenderer) {
                    window.TacticalShooter.GunRenderer.loadWeapon(deployDef);
                }
            }
        }
    };
    
    // Add logic for interaction event (refill)
    window.TacticalShooter.GameData.Scorestreaks["AMMO_BOX"].interact = function(playerState) {
        if (playerState && playerState.modules.ammo) {
            const ammo = playerState.modules.ammo;
            const PerkSys = window.TacticalShooter.PerkSystem;
            
            // Check Scavenger (Penalty logic: 65% Reduction)
            let multiplier = 1.0;
            if (PerkSys && PerkSys.hasPerk('SCAVENGER')) {
                multiplier = 0.35; 
            }
            
            // 1. Refill Current Mag
            ammo.currentAmmo = ammo.maxAmmo;
            
            // 2. Refill Reserves with Caps
            if (ammo.ammoPools) {
                const caps = {
                    '12gauge': 120,
                    '9mm': 600,
                    '762mm': 300,
                    'rocket_heat': 10,
                    'rocket_frag': 10
                };
                
                for(let key in ammo.ammoPools) {
                    let cap = caps[key] || 999;
                    let amountToAdd = Math.floor(200 * multiplier); 
                    
                    if (key.startsWith('rocket')) amountToAdd = Math.max(1, Math.floor(5 * multiplier));
                    
                    ammo.ammoPools[key] = Math.min(cap, ammo.ammoPools[key] + amountToAdd);
                }
            }
            
            // 3. Refill Grenades
            if (window.TacticalShooter.InventoryController) {
                const IC = window.TacticalShooter.InventoryController;
                IC.grenadeInventory.forEach(slot => {
                    if (slot && slot.count > 0) {
                        const add = Math.max(1, Math.floor(2 * multiplier));
                        slot.count = Math.min(6, slot.count + add);
                    }
                });
                
                const WM = window.TacticalShooter.WeaponManager;
                if (WM && WM.currentWeapon && WM.currentWeapon.type === 'throwable') {
                    const LM = window.TacticalShooter.LoadoutManager;
                    const count = IC.getGrenadeCount(LM.activeSlot);
                    playerState.reserveAmmo = Math.max(0, count - 1);
                    playerState.currentAmmo = (count > 0) ? 1 : 0;
                    playerState.updateHUD();
                }
            }
        }
    };

    console.log("Scorestreak Loaded: Ammo Box (Entity Mode)");
})();
