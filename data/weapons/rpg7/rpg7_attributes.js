
// js/data/weapons/rpg7/rpg7_attributes.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Weapons: {} };

    window.TacticalShooter.GameData.Weapons["RPG7"] = {
        id: "RPG7",
        name: "RPG-7",
        type: "heavy", 
        ammoType: "rocket_heat", 
        
        hudType: "rpg",
        ammoPerShot: 1,
        
        automatic: false,
        magazineSize: 1, 
        reserveAmmo: 4, // UPDATED: 1 Loaded + 4 Reserve = 5 Total
        
        fireRate: 1.0, 
        reloadTime: 2.4, // Reduced from 3.0
        
        drawTime: 1.2,
        holsterTime: 1.0,
        
        damage: 200, 
        range: 500,
        
        explosive: {
            radius: 4.0, 
            damage: 200,
            impulse: 18.75 // Reduced from 25.0
        },

        statsViewer: {
            labels: {
                damage: "DAMAGE",
                blastRadius: "BLAST RADIUS",
                mobility: "MOBILITY",
                reload: "RELOAD SPEED"
            }
        },

        damageFalloff: {
            base: [{ maxDist: Infinity, dmg: 200 }]
        },
        
        hipfireSpread: 0.05, 
        adsSpread: 0.005, 
        sprintSpread: 0.4, 
        
        sprintMultiplier: 0.8, 
        
        recoilPitch: 0.2, 
        recoilYaw: 0.05, 
        recoilRecovery: 4.0, 
        
        ragdollImpulse: 30.0, // Reduced from 40.0
        
        // --- QUICK MELEE CONFIG ---
        quickMelee: {
            type: 'bash',
            damage: 35,
            range: 2.0,
            duration: 0.6,
            animType: 1
        },
        
        attachmentSlots: [
            { type: "rocket", name: "WARHEAD", pos: { x: 0, y: 0.1, z: -0.3 } }
        ], 

        effects: {
            shellType: 'none', 
            magType: 'none', 
            muzzle: { color: 0xffaa33, scale: 6.0, intensity: 10.0, duration: 0.2 },
            impact: { color: 0xffaa00, particleCount: 20, duration: 0.5, size: 0.2, gravity: -10.0 }
        },

        visuals: {
            slideTravel: 0, 
            remoteIK: { 
                rightElbow: { x: 0.6, y: -0.6, z: 0.3 }, 
                leftElbow: { x: -0.6, y: -0.6, z: 0.3 },
                leftHandPos: null
            },
            ikStats: { 
                rightElbow: { x: 0.8, y: -0.5, z: 0.1 }, 
                leftElbow: { x: -0.5, y: -0.5, z: 0.3 }, 
                gripOffset: { x: 0.0, y: 0.04, z: -0.5 }, 
                leftHandMode: 'grip', 
                torsoLean: 0.0 
            },
            hipPosition: { x: 0.25, y: -0.25, z: -0.45 }, 
            adsPosition: { x: 0.0, y: -0.188, z: -0.48 }, 
            sprintPosition: { x: 0.25, y: -0.35, z: -0.2 },
            sprintRotation: { x: -0.2, y: 0.4, z: 0.1 }, 
            blockedPosition: { x: 0.2, y: -0.3, z: 0.0 },
            blockedRotation: { x: 0.5, y: -0.2, z: -0.1 }, 
            leftHandOffset: { x: 0, y: 0, z: 0 }, 
            walkBobAmount: 0.08, walkBobSpeed: 4.5,
            sprintBobAmount: 0.10, sprintBobSpeed: 9.0,
            adsInSpeed: 4.0, 
            adsOutSpeed: 5.0, 
            sprintTransitionSpeed: 3.0,
            muzzleFlashIntensity: 5.0, muzzleFlashScale: 3.0, muzzleFlashDuration: 0.15,
            barrelSmoke: { color: 0x555555, opacity: 0.0, duration: 0.1, density: 0.0 }
        }
    };
})();
