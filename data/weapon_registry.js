
// js/data/weapon_registry.js
(function() {
    const scripts = [
        "data/common_attachments.js", // Load First
        
        "data/weapons/pistol/pistol_attachments.js",
        "data/weapons/pistol/pistol_attributes.js",
        "data/weapons/pistol/pistol_model.js",
        "data/weapons/pistol/pistol_animations.js",
        
        "data/weapons/shotgun/shotgun_attachments.js",
        "data/weapons/shotgun/shotgun_attributes.js",
        "data/weapons/shotgun/shotgun_model.js",
        "data/weapons/shotgun/shotgun_animations.js",
        
        "data/weapons/smg/smg_attachments.js",
        "data/weapons/smg/smg_attributes.js",
        "data/weapons/smg/smg_model.js",
        "data/weapons/smg/smg_animations.js",

        "data/weapons/knife/knife_attributes.js",
        "data/weapons/knife/knife_model.js",
        
        // TYPE 92
        "data/weapons/type92/type92_attributes.js",
        "data/weapons/type92/type92_attachments.js",
        "data/weapons/type92/type92_model.js",
        "data/weapons/type92/type92_animations.js",

        // M24 SNIPER
        "data/weapons/m24/m24_attributes.js",
        "data/weapons/m24/m24_model.js",
        "data/weapons/m24/m24_animations.js",

        // RPG-7
        "data/weapons/rpg7/rpg7_attributes.js",
        "data/weapons/rpg7/rpg7_attachments.js", 
        "data/weapons/rpg7/rpg7_model.js",
        "data/weapons/rpg7/rpg7_animations.js"
    ];

    function loadNext(index) {
        if (index >= scripts.length) {
            console.log("WeaponRegistry: All weapons & attachments loaded.");
            return;
        }
        const s = document.createElement('script');
        s.src = scripts[index];
        s.onload = () => loadNext(index + 1);
        s.onerror = () => {
            console.error("Failed to load weapon script:", scripts[index]);
            loadNext(index + 1);
        };
        document.head.appendChild(s);
    }
    
    // Start loading
    loadNext(0);
})();
