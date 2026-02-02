
// js/data/weapons/pistol/pistol_attributes.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Weapons: {} };

    window.TacticalShooter.GameData.Weapons["PISTOL"] = {
        id: "PISTOL",
        name: "Glock", 
        type: "secondary",
        ammoType: "9mm", 
        
        hudType: "basic", 
        ammoPerShot: 1,  
        
        automatic: false,
        magazineSize: 15, 
        reserveAmmo: 60, // UPDATED: 60 (15*4)
        
        fireRate: 0.1, 
        reloadTime: 1.8, 
        
        ballistics: {
            muzzleVelocity: 365,
            segmentLength: 15,   
            dragPerSegment: 30,  
            gravity: 9.8,        
            maxRange: 100,       
            destabilizeDistance: 30, 
            destabilizeAmount: 0.8   
        },

        damageFalloff: {
            base: [
                { maxDist: 15, dmg: 25 },
                { maxDist: 45, dmg: 20 },
                { maxDist: 70, dmg: 15 },
                { maxDist: Infinity, dmg: 10 } 
            ],
            head: [
                { maxDist: 50, dmg: 40 },
                { maxDist: Infinity, dmg: 30 }
            ],
            limbMultiplier: 0.8
        },
        
        range: 100,
        damage: 25, 
        
        hipfireSpread: 0.03,
        adsSpread: 0.002, 
        sprintSpread: 0.15, 
        
        sprintMultiplier: 1.2, 
        
        recoilPitch: 0.018,
        recoilYaw: 0.007,
        recoilRecovery: 8.0,
        
        ragdollImpulse: 1.5, 
        
        // --- QUICK MELEE CONFIG ---
        quickMelee: {
            type: 'knife_swap',
            stowTime: 0.1,
            drawTime: 0.1
        },

        attachmentSlots: [
            { type: "optic", name: "OPTIC", pos: { x: 0, y: 0.06, z: 0.05 } },
            { type: "barrel", name: "MUZZLE", pos: { x: 0, y: 0.02, z: -0.25 } }, 
            { type: "magazine", name: "MAGAZINE", pos: { x: 0, y: -0.1, z: 0.07 } },
            { type: "conversion", name: "MODIFICATION", pos: { x: 0, y: 0.04, z: -0.05 } }, 
            { type: "rail_underbarrel", name: "UNDERBARREL", pos: { x: 0, y: -0.025, z: -0.12 } }
        ],

        effects: {
            shellType: 'pistol',
            magType: 'pistol',
            shell: { color: 0xd4af37, scale: 1.0, velocityRand: 1.0 },
            muzzle: { color: 0xffaa33, scale: 0.5, intensity: 2.0, duration: 0.05 },
            impact: { color: 0xffeebb, particleCount: 8, duration: 0.3, size: 0.08, gravity: -15.0 }
        },

        visuals: {
            slideTravel: -0.04, 
            remoteIK: {
                rightElbow: { x: 0.5, y: -1.0, z: 0.2 },
                leftElbow: { x: -0.5, y: -1.0, z: 0.2 },
                leftHandPos: null 
            },
            ikStats: {
                rightElbow: { x: 0.8, y: -0.5, z: -0.2 },
                leftElbow: { x: -0.6, y: -0.8, z: 0.4 },
                gripOffset: { x: 0, y: 0, z: 0 },
                leftHandMode: 'grip',
                torsoLean: 0.0 
            },
            hipPosition: { x: 0.18, y: -0.18, z: -0.4 },
            adsPosition: { x: 0, y: -0.0405, z: -0.55 }, 
            sprintPosition: { x: 0.2, y: -0.22, z: -0.3 },
            sprintRotation: { x: -0.5, y: 0.3, z: 0.1 }, 
            blockedPosition: { x: 0.05, y: -0.15, z: -0.2 },
            blockedRotation: { x: 0.8, y: -0.2, z: -0.1 }, 
            leftHandOffset: { x: 0, y: 0, z: 0 }, 
            leftHandRotation: { x: 0, y: 0, z: 0 },
            swayAmount: 0.02, swaySpeed: 2.0,
            walkBobAmount: 0.03, walkBobSpeed: 8.0,
            sprintBobAmount: 0.025, sprintBobSpeed: 13.0, 
            adsInSpeed: 18.0, adsOutSpeed: 8.0, sprintTransitionSpeed: 5.0,
            muzzleFlashIntensity: 1.0, muzzleFlashScale: 0.5, muzzleFlashDuration: 0.05,
            
            barrelSmoke: {
                color: 0xcccccc,
                opacity: 0.2, 
                size: 0.18,
                speed: 0.3, 
                density: 0.2, 
                duration: 1.0 
            }
        }
    };
    console.log('Weapon Loaded: GLOCK (PISTOL)');
})();
