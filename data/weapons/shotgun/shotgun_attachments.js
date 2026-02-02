
// js/data/weapons/shotgun/shotgun_attachments.js
(function() {
    const G = window.TacticalShooter.GameData.Attachments;

    // Rails handled by Common Attachments logic (shotgun_flash/laser mapped there)
    
    G["shotgun_stock_none"] = {
        name: "BIRDSHEAD GRIP",
        type: "stock",
        apply: (def) => {
            def.drawTime *= 0.6; 
            def.adsInSpeed *= 1.3; 
            def.sprintMultiplier = 1.15; 
            def.hipfireSpread *= 1.2; 
            def.recoilPitch *= 1.5; 
            def.recoilYaw *= 1.5;
            if (def.visuals) {
                def.visuals.hipPosition.z += 0.1;
                def.visuals.adsPosition.z += 0.15;
            }
        }
    };

    console.log("Attachments: Shotgun loaded");
})();
