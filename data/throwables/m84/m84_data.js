
// js/data/throwables/m84/m84_data.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Throwables: {} };

    window.TacticalShooter.GameData.Throwables["FLASH"] = {
        id: "FLASH",
        name: "M84 STUN",
        type: "throwable", 
        slotType: "tactical", 
        count: 2, 
        
        magazineSize: 1,
        reserveAmmo: 3,
        fireRate: 1.5,
        drawTime: 0.5,
        holsterTime: 0.4,
        allowADS: true,

        physics: {
            mass: 0.55, 
            bounciness: 0.3, 
            linearDamping: 0.4,
            angularDamping: 0.4,
            throwSpeed: 20.0
        },
        
        fuseTime: 2.0, 
        
        explosion: {
            type: "flash",
            radius: 15.0,
            maxDamage: 5, 
            impulse: 2.0,
            vfx: {
                sparks: { count: 30, color: 0xffffff, speed: 25, gravity: 0, lifetime: 0.15 },
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
            adsPosition: { x: 0.35, y: 0.1, z: 0.1 }, 
            sprintPosition: { x: 0.1, y: -0.3, z: -0.2 },
            sprintRotation: { x: -0.2, y: 0.5, z: 0 },
            
            // Added missing properties to prevent animator crash
            blockedPosition: { x: 0.1, y: -0.2, z: -0.2 },
            blockedRotation: { x: 0.5, y: -0.2, z: -0.1 },
            
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
    console.log('Throwable Loaded: M84 FLASH');
})();
