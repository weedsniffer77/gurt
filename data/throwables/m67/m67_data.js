
// js/data/throwables/m67/m67_data.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Throwables: {} };

    window.TacticalShooter.GameData.Throwables["FRAG"] = {
        id: "FRAG",
        name: "M67 FRAG",
        type: "throwable", 
        slotType: "lethal", 
        count: 2, 
        
        magazineSize: 1, 
        reserveAmmo: 3, 
        fireRate: 1.5, 
        drawTime: 0.5,
        holsterTime: 0.4,
        allowADS: true, 
        
        physics: {
            mass: 0.4, 
            bounciness: 0.4,
            linearDamping: 0.3,
            angularDamping: 0.3,
            throwSpeed: 18.0
        },
        
        fuseTime: 5.0,
        
        explosion: {
            type: "frag",
            radius: 10.0,
            maxDamage: 250, // Updated for new curve (250 core)
            impulse: 15.0, // Reduced to ~60% of original 25.0 (was 18.0 in prev step, reduced further for safety)
            vfx: {
                sparks: { count: 60, color: 0xffaa00, speed: 14, gravity: -12, lifetime: 0.9 },
                dust: true
            }
        },
        
        // --- QUICK MELEE CONFIG ---
        quickMelee: {
            type: 'knife_swap',
            stowTime: 0.1,
            drawTime: 0.1
        },
        
        visuals: {
            hipPosition: { x: 0.2, y: -0.25, z: -0.4 }, 
            adsPosition: { x: 0.3, y: -0.1, z: -0.2 }, 
            sprintPosition: { x: 0.1, y: -0.3, z: -0.2 },
            sprintRotation: { x: -0.2, y: 0.5, z: 0 },
            adsInSpeed: 8.0,
            adsOutSpeed: 12.0,
            walkBobAmount: 0.04, walkBobSpeed: 7.0,
            sprintBobAmount: 0.05, sprintBobSpeed: 12.0,
            remoteIK: {
                rightElbow: { x: 0.8, y: -0.5, z: 0.2 },
                leftElbow: { x: -0.5, y: -0.5, z: 0.5 },
                leftHandPos: { x: -0.2, y: -0.2, z: -0.6 }
            }
        },
        
        preview: {
            scale: 2.5,
            rotation: { x: 0, y: 0, z: 0 },
            position: { x: 0, y: 0, z: 0 }
        }
    };
    console.log('Throwable Loaded: M67 FRAG');
})();
