
// js/data/scorestreaks/fpv_drone.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Scorestreaks: {} };

    // 1. Define the Handheld Drone "Weapon"
    const DRONE_REMOTE_DEF = {
        id: "DRONE_REMOTE",
        name: "FPV DRONE",
        type: "special",
        magazineSize: 1,
        reserveAmmo: 0,
        fireRate: 1.0, 
        drawTime: 0.5,
        holsterTime: 0.2,
        sprintMultiplier: 1.0, 
        
        visuals: {
            hipPosition: { x: 0.0, y: -0.2, z: -0.4 }, 
            adsPosition: { x: 0.0, y: -0.1, z: -0.3 }, 
            sprintPosition: { x: 0.1, y: -0.2, z: -0.3 },
            sprintRotation: { x: -0.2, y: 0.3, z: 0 },
            blockedPosition: { x: 0.1, y: -0.2, z: -0.3 },
            blockedRotation: { x: 0.5, y: -0.2, z: -0.1 },
            
            adsInSpeed: 8.0,
            adsOutSpeed: 10.0,
            walkBobAmount: 0.05, walkBobSpeed: 6.0,
            sprintBobAmount: 0.06, sprintBobSpeed: 11.0,
            sprintTransitionSpeed: 5.0,

            remoteIK: { rightElbow: { x: 0.5, y: -0.5, z: 0.2 }, leftElbow: { x: -0.5, y: -0.5, z: 0.2 }, leftHandPos: { x: -0.1, y: -0.2, z: -0.4 } },
            
            // PREVENT THROWING ANIMATION
            suppressMeleeAnim: true
        },
        
        buildMesh: function() {
            if (window.TacticalShooter.DroneModel) {
                const group = window.TacticalShooter.DroneModel.buildMesh();
                group.scale.set(0.6, 0.6, 0.6); 
                group.rotation.y = Math.PI; 
                group.traverse(c => { if (c.isMesh) c.userData.bulletTransparent = true; });
                return { mesh: group, parts: {} };
            }
            const group = new window.THREE.Group();
            return { mesh: group, parts: {} };
        }
    };
    window.TacticalShooter.GameData.Weapons["DRONE_REMOTE"] = DRONE_REMOTE_DEF;

    // 2. Define the Scorestreak
    window.TacticalShooter.GameData.Scorestreaks["FPV_DRONE"] = {
        id: "FPV_DRONE",
        name: "FPV DRONE",
        killsRequired: 6,
        description: "Remote controlled explosive drone.",
        icon: "🚁", 
        
        statsViewer: {
            labels: {
                damage: "DAMAGE",
                blastRadius: "BLAST RADIUS",
                duration: "DURATION",
                durability: "DURABILITY"
            },
            overrides: {
                damage: 150, 
                rawDamage: 150,
                blastRadius: 160,
                rawBlast: "8m",
                duration: 30, // Updated Duration Display
                rawDuration: "30 sec", // Updated Visual String
                durability: 75,
                rawDurability: 75,
                mobility: 0
            }
        },
        
        buildMesh: function() {
            if (window.TacticalShooter.DroneModel) {
                return { mesh: window.TacticalShooter.DroneModel.buildMesh(), parts: {} };
            }
            return { mesh: new window.THREE.Group(), parts: {} };
        },
        
        onActivate: function(playerState) {
             const WM = window.TacticalShooter.WeaponManager;
             
             // Equip Remote
             const remoteDef = window.TacticalShooter.GameData.Weapons["DRONE_REMOTE"];
             
             remoteDef.attackAction = () => {
                 playerState.currentAmmo = 0; 

                 // INSTANTLY HIDE WEAPON & HANDS
                 if (window.TacticalShooter.GunRenderer) {
                     window.TacticalShooter.GunRenderer.setVisible(false);
                     // Also specifically hide weapon container if visible
                     if (window.TacticalShooter.GunRenderer.weaponContainer) {
                         window.TacticalShooter.GunRenderer.weaponContainer.visible = false;
                     }
                 }
                 
                 const CC = window.TacticalShooter.CharacterController;
                 const PC = window.TacticalShooter.PlayerCamera;
                 
                 const forward = PC.getForwardDirection();
                 const startPos = CC.position.clone().add(new window.THREE.Vector3(0, 1.5, 0)).add(forward.multiplyScalar(1.0));
                 const startRot = PC.camera.quaternion.clone();
                 const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                 
                 // Launch Impulse
                 const vel = forward.clone().multiplyScalar(25.0);
                 vel.y += 2.0;
                 
                 if (window.TacticalShooter.DroneController) {
                     // Activate Immediately (Drone spawns and moves)
                     // Camera takeover is delayed internally by 0.7s
                     window.TacticalShooter.DroneController.activate(startPos, startRot, myId, vel);
                 }
                 
                 // Auto-switch back to primary so player is holding gun when drone view ends
                 if (WM) WM.initiateSwitch('primary');
             };
             
             playerState.setWeapon(remoteDef);
             WM.currentWeapon = remoteDef;
             WM.drawTimer = 0.5;
             
             if (window.TacticalShooter.GunRenderer) {
                 window.TacticalShooter.GunRenderer.loadWeapon(remoteDef);
             }
        }
    };
    console.log("Scorestreak Loaded: FPV Drone");
})();
