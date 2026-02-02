
// js/data/weapons/m24/m24_attributes.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Weapons: {} };

    window.TacticalShooter.GameData.Weapons["M24"] = {
        id: "M24",
        name: "M24",
        type: "primary",
        ammoType: "762mm",
        
        hudType: "rifle",
        ammoPerShot: 1,
        
        automatic: false,
        magazineSize: 5, 
        reserveAmmo: 20, // UPDATED: 20 reserve
        
        // Manual Bolt
        actionType: "pump", 
        pumpCycleTime: 1.4, 
        
        fireRate: 0.2,
        
        reloadType: "incremental",
        reloadStart: 1.25, 
        reloadLoop: 0.5,   
        
        drawTime: 0.9,
        holsterTime: 0.7,
        
        ballistics: {
            muzzleVelocity: 800, 
            segmentLength: 50,   
            dragPerSegment: 10,  
            gravity: 9.8,        
            maxRange: 800,       
            destabilizeDistance: 300, 
            destabilizeAmount: 0.5 
        },

        damageFalloff: {
            base: [ 
                { maxDist: 35, dmg: 110 }, 
                { maxDist: 75, dmg: 90 }, 
                { maxDist: 150, dmg: 70 }, 
                { maxDist: Infinity, dmg: 55 } 
            ],
            head: [ 
                { maxDist: 200, dmg: 200 }, 
                { maxDist: Infinity, dmg: 150 } 
            ],
            limbMultiplier: 0.6
        },
        
        damage: 110, 
        range: 800,
        
        hipfireSpread: 0.15,
        adsSpread: 0.0,
        sprintSpread: 0.3, 
        
        sprintMultiplier: 0.85, 
        
        recoilPitch: 0.15, 
        recoilYaw: 0.05,
        recoilRecovery: 6.0,
        
        ragdollImpulse: 50.0, 
        
        // --- QUICK MELEE CONFIG ---
        quickMelee: {
            type: 'bash',
            damage: 35,
            range: 2.0,
            duration: 0.6,
            animType: 1
        },
        
        attachmentSlots: [
            { type: "optic", name: "SCOPE", pos: { x: 0, y: 0.055, z: 0.10 } },
            { type: "barrel", name: "MUZZLE", pos: { x: 0, y: 0.02, z: -0.85 } },
            { type: "rail_underbarrel", name: "BIPOD", pos: { x: 0, y: -0.04, z: -0.45 } }
        ],

        effects: {
            shellType: 'rifle', 
            magType: 'none', 
            shell: { color: 0xd4af37, scale: 1.0, velocityRand: 1.0 }, 
            muzzle: { color: 0xffaa33, scale: 2.0, intensity: 5.0, duration: 0.08 },
            impact: { color: 0xffeebb, particleCount: 12, duration: 0.4, size: 0.1, gravity: -15.0 }
        },

        visuals: {
            slideTravel: 0, 
            remoteIK: { rightElbow: { x: 0.8, y: -0.5, z: -0.2 }, leftElbow: { x: -0.6, y: -0.8, z: 0.4 }, leftHandPos: null },
            holsterStyle: 'back', 
            ikStats: { rightElbow: { x: 0.8, y: -0.5, z: -0.2 }, leftElbow: { x: -0.6, y: -0.8, z: 0.4 }, gripOffset: { x: 0.1, y: -0.15, z: -0.3 }, leftHandMode: 'grip', torsoLean: 0.1 },
            
            hipPosition: { x: 0.15, y: -0.2, z: -0.45 },
            adsPosition: { x: 0, y: -0.052, z: -0.2 }, 
            
            sprintPosition: { x: 0.25, y: -0.25, z: -0.3 },
            sprintRotation: { x: -0.3, y: 0.5, z: 0.1 }, 
            
            blockedPosition: { x: 0.1, y: -0.2, z: -0.3 },
            blockedRotation: { x: 0.5, y: -0.2, z: -0.1 }, 
            
            leftHandOffset: { x: 0, y: 0, z: 0 }, 
            
            walkBobAmount: 0.05, walkBobSpeed: 6.0,
            sprintBobAmount: 0.06, sprintBobSpeed: 11.0,
            
            adsInSpeed: 8.0, 
            adsOutSpeed: 10.0, 
            sprintTransitionSpeed: 6.0,
            
            muzzleFlashIntensity: 4.0, muzzleFlashScale: 1.5, muzzleFlashDuration: 0.06,
            
            opticAdjustment: {
                reddot: 0.035,
                holo: 0.040
            },
            
            barrelSmoke: { color: 0xdddddd, opacity: 0.4, duration: 6.0, density: 1.5 }
        }
    };
    console.log('Weapon Loaded: M24');
})();
