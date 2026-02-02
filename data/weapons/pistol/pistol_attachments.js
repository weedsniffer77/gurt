
// js/data/weapons/pistol/pistol_attachments.js
(function() {
    const G = window.TacticalShooter.GameData.Attachments;

    G["pistol_mag_ext"] = {
        name: "30 ROUND MAG", 
        type: "magazine",
        requires: "pistol_auto", 
        apply: (def) => {
            def.magazineSize = 30;
            def.reserveAmmo = 150; 
            def.reloadTime = (def.reloadTime || 1.8) * 1.25; 
            def.sprintMultiplier = (def.sprintMultiplier || 1.2) * 0.98; // -2%
            if (def.allowADS === false) {
                def.magazineSize *= 2;
                def.reserveAmmo *= 2;
            }
        }
    };

    G["pistol_auto"] = {
        name: "FULL AUTO",
        type: "conversion",
        apply: (def) => {
            def.automatic = true;
            def.fireRate = 0.05;
            def.visualFireRate = 0.1; 
            if (!def.projectilesPerShot) def.projectilesPerShot = 1;
            def.damage = 15; 
            
            // Recoil increased ~5x from base auto stats
            // Base was 0.012/0.008. Now set to high instability.
            def.recoilPitch = 0.06; 
            def.recoilYaw = 0.04;
            def.recoilRecovery = 25.0; // Snappy but violent
            
            def.hipfireSpread = 0.08; 
            def.adsSpread = 0.12; // Massive ADS spread
            def.sprintSpread = 0.25;
            
            // Mobility Reduction (-3%)
            def.sprintMultiplier = (def.sprintMultiplier || 1.2) * 0.97;
            
            // Add Visual Stat Modifier for StatSystem (Massive Control Penalty)
            def.visuals = def.visuals || {};
            def.visuals.statRecoilMultiplier = 5.0; 
            
            def.damageFalloff = {
                base: [{ maxDist: 8, dmg: 15 }, { maxDist: 15, dmg: 10 }, { maxDist: 25, dmg: 8 }, { maxDist: Infinity, dmg: 5 }],
                head: [{ maxDist: 8, dmg: 22 }, { maxDist: 15, dmg: 15 }, { maxDist: Infinity, dmg: 10 }],
                limbMultiplier: 0.75
            };
        }
    };

    // AKIMBO MOVED TO PERKS

    console.log("Attachments: Pistol loaded");
})();
