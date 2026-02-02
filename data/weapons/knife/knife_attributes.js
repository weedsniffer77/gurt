
// js/data/weapons/knife/knife_attributes.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Weapons: {} };

    window.TacticalShooter.GameData.Weapons["KNIFE"] = {
        id: "KNIFE",
        name: "Combat Knife",
        type: "melee",
        
        hudType: "basic",
        ammoPerShot: 0,
        
        automatic: false,
        magazineSize: 0, 
        reserveAmmo: 0,
        
        // Matches slash duration (0.5s in animator + recovery)
        fireRate: 0.7, 
        
        // ANIMATION TIMINGS
        drawTime: 0.3,
        holsterTime: 0.3,
        
        ballistics: {
            muzzleVelocity: 50, 
            segmentLength: 2,   
            dragPerSegment: 0,  
            gravity: 0,        
            maxRange: 1.5, // Reduced to 1.5m 
            destabilizeDistance: 99, 
            destabilizeAmount: 0 
        },

        damageFalloff: {
            base: [{ maxDist: 1.8, dmg: 50 }, { maxDist: Infinity, dmg: 0 }]
        },
        
        damage: 50, 
        range: 1.5, // Reduced to 1.5m
        
        hipfireSpread: 0.0,
        adsSpread: 0.0, 
        sprintSpread: 0.0, 
        sprintMultiplier: 1.32, 
        
        recoilPitch: 0.0,
        recoilYaw: 0.0,
        ragdollImpulse: 5.0, // Slash force

        effects: {
            shellType: 'none',
            magType: 'none',
            shell: null,
            muzzle: null,
            impact: { 
                color: 0xffffff, // White Sparks for Steel on Steel/Concrete look
                particleCount: 8, 
                duration: 0.1, 
                size: 0.05, 
                gravity: -10.0 
            }
        },

        visuals: {
            slideTravel: 0,
            
            // TPV Remote IK
            remoteIK: {
                rightElbow: { x: 0.6, y: -0.6, z: 0.2 },
                leftElbow: { x: -0.6, y: -0.6, z: 0.2 },
                leftHandPos: { x: -0.2, y: -0.25, z: -0.45 } // Knife holds left hand forward
            },

            // TACTICAL POSE: Pointing Up and Tilted
            hipPosition: { x: 0.20, y: -0.20, z: -0.3 }, 
            hipRotation: { x: 0.5, y: -0.2, z: -0.2 }, // Tilt up (X), Angle In (Y), Cant (Z)

            adsPosition: { x: 0.15, y: -0.15, z: -0.35 }, 
            sprintPosition: { x: 0.1, y: -0.1, z: -0.25 },
            sprintRotation: { x: 0.2, y: 0.8, z: -0.2 }, 
            blockedPosition: { x: 0.1, y: -0.2, z: -0.2 },
            blockedRotation: { x: 0.5, y: -0.2, z: -0.1 }, 
            leftHandOffset: { x: -99, y: -99, z: -99 }, 
            walkBobAmount: 0.04, walkBobSpeed: 9.0,
            sprintBobAmount: 0.04, sprintBobSpeed: 14.0,
            adsInSpeed: 10.0, adsOutSpeed: 10.0, sprintTransitionSpeed: 6.0
        }
    };
    console.log('Weapon Loaded: KNIFE (Attributes)');
})();
