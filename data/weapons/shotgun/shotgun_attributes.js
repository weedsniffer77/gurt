
// js/data/weapons/shotgun/shotgun_attributes.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Weapons: {} };

    window.TacticalShooter.GameData.Weapons["SHOTGUN"] = {
        id: "SHOTGUN",
        name: "HP9",
        type: "primary",
        ammoType: "12gauge",
        
        hudType: "shotgun", 
        ammoPerShot: 1,
        
        automatic: false,
        magazineSize: 6, 
        reserveAmmo: 24, // UPDATED: 24 reserve
        
        actionType: "pump",
        pumpCycleTime: 0.35, 
        
        reloadType: "incremental", 
        reloadStart: 1.5, 
        reloadStartAddsAmmo: true, // NEW: Tells ammo logic to add round during start
        reloadStartInsertTime: 0.9, // Time during start when round is added
        reloadLoop: 0.75, 
        
        fireRate: 0.1, 
        
        drawTime: 0.8,
        holsterTime: 0.6,
        
        ballistics: {
            muzzleVelocity: 400, 
            segmentLength: 15,   
            dragPerSegment: 40,  
            gravity: 9.8,        
            maxRange: 100,       
            destabilizeDistance: 15, 
            destabilizeAmount: 3.0 
        },

        projectilesPerShot: 12, 

        damageFalloff: {
            base: [ { maxDist: 5, dmg: 15 }, { maxDist: 15, dmg: 10 }, { maxDist: 30, dmg: 5 }, { maxDist: 60, dmg: 2 }, { maxDist: Infinity, dmg: 1 } ],
            head: [ { maxDist: 5, dmg: 20 }, { maxDist: 15, dmg: 15 }, { maxDist: 30, dmg: 8 }, { maxDist: Infinity, dmg: 2 } ],
            limbMultiplier: 0.75
        },
        
        damage: 180, 
        range: 60,
        
        hipfireSpread: 0.04, 
        adsSpread: 0.03, 
        sprintSpread: 0.15, 
        
        sprintMultiplier: 0.9, 
        
        recoilPitch: 0.12, 
        recoilYaw: 0.03,
        recoilRecovery: 8.0,
        
        ragdollImpulse: 24.0, 
        
        // --- QUICK MELEE CONFIG ---
        quickMelee: {
            type: 'bash',
            damage: 35,
            range: 2.0,
            duration: 0.6,
            animType: 1
        },
        
        attachmentSlots: [
            { type: "optic", name: "SIGHT", pos: { x: 0, y: 0.08, z: 0.0 } },
            { type: "stock", name: "GRIP", pos: { x: 0, y: 0.0, z: 0.22 } }, 
            { type: "barrel", name: "MUZZLE", pos: { x: 0, y: 0.02, z: -0.6 } },
            { type: "rail_underbarrel", name: "UNDERBARREL", pos: { x: 0, y: -0.05, z: -0.35 } }
        ],

        effects: {
            shellType: 'shotgun', 
            magType: 'none', 
            shell: { color: 0xaa2222, scale: 1.0, velocityRand: 1.0 }, 
            muzzle: { color: 0xffaa33, scale: 1.5, intensity: 4.0, duration: 0.05 },
            impact: { color: 0xffeebb, particleCount: 8, duration: 0.3, size: 0.08, gravity: -15.0 }
        },

        visuals: {
            slideTravel: -0.15, 
            remoteIK: { rightElbow: { x: 0.8, y: -0.5, z: -0.2 }, leftElbow: { x: -0.6, y: -0.8, z: 0.4 }, leftHandPos: null },
            holsterStyle: 'back', 
            ikStats: { rightElbow: { x: 0.8, y: -0.5, z: -0.2 }, leftElbow: { x: -0.6, y: -0.8, z: 0.4 }, gripOffset: { x: 0.15, y: -0.18, z: -0.3 }, leftHandMode: 'grip', torsoLean: 0.2 },
            hipPosition: { x: 0.15, y: -0.22, z: -0.35 },
            adsPosition: { x: 0, y: -0.0395, z: -0.4 }, 
            sprintPosition: { x: 0.2, y: -0.15, z: -0.2 },
            sprintRotation: { x: -0.4, y: 0.5, z: 0.1 }, 
            blockedPosition: { x: 0.1, y: -0.2, z: -0.2 },
            blockedRotation: { x: 0.5, y: -0.2, z: -0.1 }, 
            leftHandOffset: { x: 0, y: 0, z: 0 }, 
            walkBobAmount: 0.04, walkBobSpeed: 7.0,
            sprintBobAmount: 0.03, sprintBobSpeed: 12.0,
            adsInSpeed: 12.0, adsOutSpeed: 10.0, sprintTransitionSpeed: 4.0,
            muzzleFlashIntensity: 3.0, muzzleFlashScale: 1.2, muzzleFlashDuration: 0.05,
            
            opticAdjustment: {
                reddot: 0.028,
                holo: 0.033
            },
            
            barrelSmoke: { color: 0xdddddd, opacity: 0.5, duration: 5.0, density: 1.0 }
        }
    };
})();
