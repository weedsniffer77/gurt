
// js/data/common_attachments.js
(function() {
    const G = window.TacticalShooter.GameData.Attachments;
    
    // --- FLASH HIDER (Global) ---
    G["att_flashhider"] = {
        name: "FLASH HIDER",
        type: "barrel",
        apply: (def) => {
            if (!def.visuals) def.visuals = {};
            if (def.visuals.muzzleFlashScale) {
                def.visuals.muzzleFlashScale *= 0.5;
            } else {
                def.visuals.muzzleFlashScale = 0.5; 
            }
        }
    };

    // --- OPTICS ---
    // Now purely data-driven. Weapon MUST provide `visuals.opticAdjustment` to align sights.
    G["optic_reddot"] = {
        name: "Red Dot",
        type: "optic",
        excludes: ["pistol_akimbo"], // Added exclusion
        apply: (def) => {
            def.visuals = def.visuals || {};
            def.visuals.hideCrosshair = true; 
            
            if (def.visuals.adsPosition) {
                // Default drop
                let offset = 0.02; 
                
                // Weapon specific override (Data-Driven)
                if (def.visuals.opticAdjustment && def.visuals.opticAdjustment.reddot !== undefined) {
                    offset = def.visuals.opticAdjustment.reddot;
                }
                
                def.visuals.adsPosition.y -= offset; 
                
                // Rotation adjustment (e.g. SMG)
                if (def.visuals.opticAdjustment && def.visuals.opticAdjustment.reddotRotation) {
                    if (!def.visuals.adsRotationOffset) def.visuals.adsRotationOffset = {x:0, y:0, z:0};
                    def.visuals.adsRotationOffset.x += (def.visuals.opticAdjustment.reddotRotation.x || 0);
                    def.visuals.adsRotationOffset.y += (def.visuals.opticAdjustment.reddotRotation.y || 0);
                    def.visuals.adsRotationOffset.z += (def.visuals.opticAdjustment.reddotRotation.z || 0);
                }
            }
        }
    };

    G["optic_holo"] = {
        name: "Holographic",
        type: "optic",
        excludes: ["pistol_akimbo"], // Added exclusion
        apply: (def) => {
            def.visuals = def.visuals || {};
            def.visuals.hideCrosshair = true; 
            if (def.visuals.adsPosition) {
                // Default drop
                let offset = 0.025;
                
                // Weapon specific override (Data-Driven)
                if (def.visuals.opticAdjustment && def.visuals.opticAdjustment.holo !== undefined) {
                    offset = def.visuals.opticAdjustment.holo;
                }
                
                def.visuals.adsPosition.y -= offset;
            }
        }
    };

    const flashApply = (def) => {};
    const laserApply = (def) => {
        def.activeModifiers = def.activeModifiers || {};
        def.activeModifiers.laser = { spreadMultiplier: 0.6 };
    };

    G["att_flash_l"] = { name: "FLASHLIGHT", type: "rail_left", apply: flashApply };
    G["att_laser_l"] = { name: "GREEN LASER", type: "rail_left", apply: laserApply };
    G["att_flash_r"] = { name: "FLASHLIGHT", type: "rail_right", apply: flashApply };
    G["att_laser_r"] = { name: "GREEN LASER", type: "rail_right", apply: laserApply };
    G["att_flash_b"] = { name: "FLASHLIGHT", type: "rail_bottom", apply: flashApply };
    G["att_laser_b"] = { name: "GREEN LASER", type: "rail_bottom", apply: laserApply };
    G["pistol_flash"] = { name: "FLASHLIGHT", type: "rail_underbarrel", apply: flashApply };
    G["pistol_laser"] = { name: "GREEN LASER", type: "rail_underbarrel", apply: laserApply };
    G["shotgun_flash"] = { name: "FLASHLIGHT", type: "rail_underbarrel", apply: flashApply };
    G["shotgun_laser"] = { name: "GREEN LASER", type: "rail_underbarrel", apply: laserApply };
    console.log("Attachments: Common loaded");
})();
