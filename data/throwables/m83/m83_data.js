
// js/data/throwables/m83/m83_data.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Throwables: {} };

    window.TacticalShooter.GameData.Throwables["SMOKE"] = {
        id: "SMOKE",
        name: "M83 SMOKE",
        type: "throwable", 
        slotType: "tactical", 
        count: 2, 
        
        magazineSize: 1,
        reserveAmmo: 3,
        fireRate: 1.5,
        drawTime: 0.6,
        holsterTime: 0.5,
        allowADS: true,

        physics: {
            mass: 0.6, 
            bounciness: 0.2, 
            linearDamping: 0.5,
            angularDamping: 0.5,
            throwSpeed: 18.0
        },
        
        fuseTime: 2.0, 
        
        explosion: {
            type: "smoke",
            radius: 0.0, // No damage
            maxDamage: 0, 
            impulse: 0.0,
            duration: 5.0, // Active emission time
            vfx: {
                dust: false
            }
        },
        
        // --- QUICK MELEE CONFIG ---
        quickMelee: {
            type: 'knife_swap',
            stowTime: 0.1,
            drawTime: 0.1
        },
        
        visuals: {
            hipPosition: { x: 0.2, y: -0.25, z: -0.3 }, 
            adsPosition: { x: 0.3, y: 0.05, z: 0.0 }, 
            sprintPosition: { x: 0.1, y: -0.3, z: -0.2 },
            sprintRotation: { x: -0.2, y: 0.5, z: 0 },
            
            blockedPosition: { x: 0.1, y: -0.2, z: -0.2 },
            blockedRotation: { x: 0.5, y: -0.2, z: -0.1 },
            
            adsInSpeed: 7.0,
            adsOutSpeed: 10.0,
            walkBobAmount: 0.04, walkBobSpeed: 7.0,
            sprintBobAmount: 0.05, sprintBobSpeed: 12.0,
            
            remoteIK: {
                rightElbow: { x: 0.8, y: -0.5, z: 0.2 },
                leftElbow: { x: -0.5, y: -0.5, z: 0.5 },
                leftHandPos: { x: -0.2, y: -0.2, z: -0.6 }
            },
            
            // Custom Stats Display for Loadout
            customStats: {
                damage: null,
                radius: null,
                duration: "50s"
            }
        },
        
        preview: {
            scale: 2.5,
            rotation: { x: 0, y: 0, z: 0 },
            position: { x: 0, y: 0, z: 0 }
        }
    };
    console.log('Throwable Loaded: M83 SMOKE');
})();
