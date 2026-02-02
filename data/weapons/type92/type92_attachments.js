
// js/data/weapons/type92/type92_attachments.js
(function() {
    const G = window.TacticalShooter.GameData.Attachments;

    G["type92_trigger_match"] = {
        name: "MATCH TRIGGER",
        type: "trigger",
        apply: (def) => {
            def.automatic = true;
            def.isMatchTrigger = true;
            
            // Check if subsonic applied first
            if (def.isSubsonic) {
                def.fireRate = 0.2; // 300 RPM
            } else {
                def.fireRate = 0.1333; // 450 RPM
            }
            
            // Reduced Accuracy (-15%)
            def.hipfireSpread = (def.hipfireSpread || 0.025) * 1.15;
            def.adsSpread = (def.adsSpread || 0.001) * 1.15;
            
            // Reduced Control (-10%)
            def.recoilPitch = (def.recoilPitch || 0.015) * 1.1;
            def.recoilYaw = (def.recoilYaw || 0.005) * 1.1;
            
            // Custom Visual Stat Override
            def.visuals = def.visuals || {};
            def.visuals.customStats = {
                fireRate: 45 // 450 RPM
            };
        }
    };

    G["type92_suppressor"] = {
        name: "Suppressor",
        type: "barrel",
        description: "no muzzle flash, dead enemies' cameras won't focus on you after they are killed",
        apply: (def) => {
            if (!def.visuals) def.visuals = {};
            // Completely eliminate flash
            def.visuals.muzzleFlashScale = 0; 
            def.visuals.muzzleFlashIntensity = 0;
            
            def.recoilPitch *= 0.9;
            def.recoilYaw *= 0.9;
            def.range *= 1.05;
            def.sprintMultiplier = (def.sprintMultiplier || 1.15) * 0.925;
        }
    };

    // SUBSONIC MOVED TO PERKS

    console.log("Attachments: Type 92 loaded");
})();
