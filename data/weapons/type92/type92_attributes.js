
// js/data/weapons/type92/type92_attributes.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Weapons: {} };

    window.TacticalShooter.GameData.Weapons["TYPE92"] = {
        id: "TYPE92",
        name: "Type 92", 
        type: "secondary",
        ammoType: "9mm", 
        
        hudType: "basic", 
        ammoPerShot: 1,  
        
        automatic: false,
        magazineSize: 15, 
        reserveAmmo: 75, // Base 75
        
        fireRate: 0.1, 
        reloadTime: 1.9, 
        
        ballistics: {
            muzzleVelocity: 380, 
            segmentLength: 15,   
            dragPerSegment: 25,  
            gravity: 9.8,        
            maxRange: 120,       
            destabilizeDistance: 40, 
            destabilizeAmount: 0.7   
        },

        damageFalloff: {
            base: [
                { maxDist: 15, dmg: 30 }, 
                { maxDist: 40, dmg: 22 },
                { maxDist: 70, dmg: 18 },
                { maxDist: Infinity, dmg: 12 } 
            ],
            head: [
                { maxDist: 40, dmg: 50 }, 
                { maxDist: Infinity, dmg: 35 }
            ],
            limbMultiplier: 0.8
        },
        
        range: 120,
        damage: 30, 
        
        hipfireSpread: 0.025, 
        adsSpread: 0.001, 
        sprintSpread: 0.15, 
        
        sprintMultiplier: 1.15, 
        
        recoilPitch: 0.015, 
        recoilYaw: 0.005,   
        recoilRecovery: 10.0,
        
        ragdollImpulse: 2.7, // Increased to match new baseline
        
        // --- QUICK MELEE CONFIG ---
        quickMelee: {
            type: 'knife_swap',
            stowTime: 0.1,
            drawTime: 0.1
        },

        attachmentSlots: [
            { type: "optic", name: "OPTIC", pos: { x: 0, y: 0.055, z: 0.02 } },
            { type: "barrel", name: "MUZZLE", pos: { x: 0, y: 0.022, z: -0.25 } }, 
            { type: "trigger", name: "TRIGGER", pos: { x: 0, y: -0.01, z: 0.02 } }, 
            { type: "rail_underbarrel", name: "RAIL", pos: { x: 0, y: -0.02, z: -0.10 } }
        ],

        effects: {
            shellType: 'pistol',
            magType: 'pistol',
            shell: { color: 0xd4af37, scale: 1.0, velocityRand: 1.0 },
            muzzle: { color: 0xffcc44, scale: 0.55, intensity: 2.5, duration: 0.06 },
            impact: { color: 0xffeebb, particleCount: 8, duration: 0.3, size: 0.08, gravity: -15.0 }
        },

        visuals: {
            slideTravel: -0.045, 
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
            adsPosition: { x: 0, y: -0.038, z: -0.50 }, 
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
            
            opticAdjustment: {
                reddot: 0.025,
                holo: 0.030
            },

            barrelSmoke: {
                color: 0xcccccc,
                opacity: 0.25, 
                size: 0.18,
                speed: 0.3, 
                density: 0.3, 
                duration: 1.5 
            }
        }
    };
    console.log('Weapon Loaded: Type 92');
})();
