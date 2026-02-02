
// js/data/weapons/smg/smg_attributes.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Weapons: {} };

    window.TacticalShooter.GameData.Weapons["SMG"] = {
        id: "SMG",
        name: "MP5", 
        type: "primary",
        ammoType: "9mm", 
        
        hudType: "basic",
        ammoPerShot: 1,
        
        automatic: true,
        magazineSize: 30, 
        reserveAmmo: 60, // UPDATED: 60 (30*2)
        
        fireRate: 0.075, 
        visualFireRate: 0.075,
        
        reloadTime: 2.8, 
        drawTime: 0.4,
        holsterTime: 0.3,
        
        ballistics: {
            muzzleVelocity: 400,
            segmentLength: 20,   
            dragPerSegment: 20,  
            gravity: 9.8,        
            maxRange: 200,       
            destabilizeDistance: 60, 
            destabilizeAmount: 1.5   
        },

        damageFalloff: {
            base: [ 
                { maxDist: 20, dmg: 25 }, 
                { maxDist: 75, dmg: 5 }, 
                { maxDist: 150, dmg: 0 },
                { maxDist: Infinity, dmg: 0 } 
            ],
            head: [ 
                { maxDist: 20, dmg: 40 }, 
                { maxDist: 75, dmg: 10 }, 
                { maxDist: 150, dmg: 0 },
                { maxDist: Infinity, dmg: 0 } 
            ],
            limbMultiplier: 0.9
        },
        
        damage: 25, 
        range: 150,
        
        hipfireSpread: 0.04, 
        adsSpread: 0.05, 
        sprintSpread: 0.20, 
        
        sprintMultiplier: 1.05, 
        
        recoilPitch: 0.032, 
        recoilYaw: 0.020,   
        recoilRecovery: 12.0, 
        
        ragdollImpulse: 4.5, 
        
        // --- QUICK MELEE CONFIG ---
        quickMelee: {
            type: 'bash',
            damage: 35,
            range: 2.0,
            duration: 0.6,
            animType: 1
        },
        
        attachmentSlots: [
            { type: "optic", name: "SIGHT", pos: { x: 0, y: 0.08, z: 0.05 } },
            { type: "barrel", name: "MUZZLE", pos: { x: 0, y: 0.02, z: -0.35 } }, 
            { type: "magazine", name: "MAGAZINE", pos: { x: 0, y: -0.05, z: -0.08 } },
            { type: "stock", name: "STOCK", pos: { x: 0, y: 0.0375, z: 0.15 } }, 
            { type: "handguard", name: "HANDGUARD", pos: { x: 0, y: -0.01, z: -0.20 } },
            { type: "conversion", name: "MODIFICATION", pos: { x: 0, y: 0.04, z: -0.1 } },
            { type: "rail_left", name: "LEFT RAIL", pos: { x: -0.04, y: 0.01, z: -0.20 } },
            { type: "rail_right", name: "RIGHT RAIL", pos: { x: 0.04, y: 0.01, z: -0.20 } },
            { type: "rail_bottom", name: "LOWER RAIL", pos: { x: 0, y: -0.05, z: -0.20 } }
        ],

        effects: {
            shellType: 'pistol',
            magType: 'smg',
            shell: { color: 0xd4af37, scale: 1.0, velocityRand: 1.0 },
            muzzle: { color: 0xffaa33, scale: 0.4, intensity: 1.0, duration: 0.04 }, 
            impact: { color: 0xffeebb, particleCount: 8, duration: 0.3, size: 0.08, gravity: -15.0 }
        },

        visuals: {
            slideTravel: -0.03,
            remoteIK: { rightElbow: { x: 0.5, y: -1.0, z: 0.2 }, leftElbow: { x: -0.5, y: -1.0, z: 0.2 }, leftHandPos: null },
            holsterStyle: 'side', 
            ikStats: { rightElbow: { x: 0.8, y: -0.5, z: -0.2 }, leftElbow: { x: -0.6, y: -0.8, z: 0.4 }, gripOffset: { x: 0.2, y: -0.18, z: -0.4 }, leftHandMode: 'grip', torsoLean: 0.1 },
            hipPosition: { x: 0.18, y: -0.22, z: -0.4 },
            adsPosition: { x: 0, y: -0.094, z: -0.35 }, 
            adsRotationOffset: { x: 0, y: 0, z: 0 },
            sprintPosition: { x: 0.2, y: -0.18, z: -0.3 },
            sprintRotation: { x: -0.4, y: 0.4, z: 0.1 }, 
            blockedPosition: { x: 0.05, y: -0.15, z: -0.3 },
            blockedRotation: { x: 0.8, y: -0.2, z: -0.1 }, 
            leftHandOffset: { x: 0, y: 0, z: 0 }, 
            walkBobAmount: 0.035, walkBobSpeed: 8.0,
            sprintBobAmount: 0.03, sprintBobSpeed: 13.0,
            adsInSpeed: 16.0,
            adsOutSpeed: 15.0, sprintTransitionSpeed: 8.0,
            muzzleFlashIntensity: 0.8, muzzleFlashScale: 0.4, muzzleFlashDuration: 0.04,
            
            opticAdjustment: {
                reddot: 0.008,
                reddotRotation: { x: 0.045, y: 0, z: 0 },
                holo: 0.031
            },
            
            barrelSmoke: {
                color: 0xcccccc,
                opacity: 0.3,
                size: 0.18,
                speed: 0.35, 
                density: 0.09, 
                duration: 3.5, 
                rampUp: true   
            }
        }
    };
    console.log('Weapon Loaded: SMG 1 (Balanced)');
})();
