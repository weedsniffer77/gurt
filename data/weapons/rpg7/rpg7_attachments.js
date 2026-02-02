
// js/data/weapons/rpg7/rpg7_attachments.js
(function() {
    const G = window.TacticalShooter.GameData.Attachments;

    G["rpg_rocket_pg7v"] = {
        name: "PG-7V (HEAT)",
        type: "rocket",
        description: "Penetrates walls",
        apply: (def) => {
            // Default stats already set in attributes.js
            def.explosive.radius = 4.0;
            def.explosive.damage = 200;
            def.ammoType = "rocket_heat";
            // Visuals handle mesh change logic via updateParts or buildMesh checks
        }
    };

    G["rpg_rocket_ogv7"] = {
        name: "OG-7V (FRAG)",
        type: "rocket",
        description: "Large explosive radius",
        apply: (def) => {
            def.explosive.radius = 10.0;
            def.explosive.damage = 150; 
            def.ammoType = "rocket_frag";
            
            // Reduced Ammo Count
            def.reserveAmmo = 3; 
            
            // Slower Reload: 3.0s * 1.17 = 3.51s
            def.reloadTime *= 1.17;
            
            // Visuals handled by model builder
        }
    };
    
    // SECRET ATTACHMENT - HIDDEN
    G["rpg_akimbo"] = {
        name: "DUAL WIELD",
        type: "special",
        hidden: true,
        description: "Secret Dev Item",
        apply: (def) => {
            // Logic handled by ChatSystem injection
        }
    };

    console.log("Attachments: RPG-7 loaded");
})();
