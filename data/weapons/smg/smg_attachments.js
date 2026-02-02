
// js/data/weapons/smg/smg_attachments.js
(function() {
    const G = window.TacticalShooter.GameData.Attachments;

    G["smg_mag_ext"] = {
        name: "45 ROUND MAG",
        type: "magazine",
        apply: (def) => {
            def.magazineSize = 45;
            def.reserveAmmo = 180; 
            def.reloadTime = (def.reloadTime || 3.0) * 1.25; 
            def.sprintMultiplier = (def.sprintMultiplier || 1.05) * 0.96; // -4%
        }
    };

    G["smg_stock_light"] = {
        name: "LIGHT STOCK",
        type: "stock",
        apply: (def) => {
            // Nerfed: 30% reduction -> 18% reduction (Multiplier 0.82)
            def.recoilPitch = (def.recoilPitch || 0.012) * 0.82;
            def.recoilYaw = (def.recoilYaw || 0.008) * 0.82;
            def.adsSpread = (def.adsSpread || 0.01) * 0.5;
            def.drawTime = (def.drawTime || 0.4) * 1.1;
            def.adsInSpeed = (def.visuals.adsInSpeed || 18.0) * 0.9;
            if (def.visuals && def.visuals.hipPosition) {
                def.visuals.hipPosition.z += 0.05; 
            }
        }
    };

    G["smg_stock_fixed"] = {
        name: "FIXED STOCK",
        type: "stock",
        apply: (def) => {
            // Nerfed: 50% reduction -> 30% reduction (Multiplier 0.70)
            def.recoilPitch = (def.recoilPitch || 0.012) * 0.70;
            def.recoilYaw = (def.recoilYaw || 0.008) * 0.70;
            def.adsSpread = 0.001; 
            def.drawTime = (def.drawTime || 0.4) * 1.3;
            def.adsInSpeed = (def.visuals.adsInSpeed || 18.0) * 0.8;
            def.sprintMultiplier = (def.sprintMultiplier || 1.1) * 0.95;
            if (def.visuals && def.visuals.hipPosition) {
                def.visuals.hipPosition.z += 0.08; 
            }
        }
    };

    G["smg_conversion_pdw"] = {
        name: "MP5K",
        type: "conversion",
        apply: (def) => {
            def.range = 80;
            def.hipfireSpread *= 0.9; 
            def.adsSpread *= 1.2; 
            def.drawTime *= 0.8;
            def.sprintMultiplier = 1.15;
            
            // Major Control Reduction (Increase Recoil)
            def.recoilPitch = (def.recoilPitch || 0.016) * 1.25;
            def.recoilYaw = (def.recoilYaw || 0.010) * 1.3;

            if (def.attachmentSlots) {
                def.attachmentSlots.forEach(slot => {
                    if (slot.type === 'handguard') slot.pos.z = -0.16; 
                    if (slot.type.startsWith('rail_')) slot.pos.z = -0.14; 
                    if (slot.type === 'barrel') slot.pos.z = -0.22; 
                });
            }
        }
    };

    G["smg_hg_rail"] = {
        name: "TRI-RAIL HANDGUARD",
        type: "handguard",
        apply: (def) => {
            // Increase ADS time
            if (def.visuals) def.visuals.adsInSpeed = (def.visuals.adsInSpeed || 20) * 0.95;
        }
    };

    console.log("Attachments: SMG loaded");
})();
