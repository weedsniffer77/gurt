
// js/data/scorestreak_registry.js
(function() {
    // Ensure GameData container exists
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || {};
    if (!window.TacticalShooter.GameData.Scorestreaks) {
        window.TacticalShooter.GameData.Scorestreaks = {};
    }

    const scripts = [
        "data/scorestreaks/ammo_box_model.js", 
        "data/scorestreaks/ammo_box.js",
        
        // FPV Drone Files
        "data/scorestreaks/fpv_drone_model.js",
        "gameplay/drone_hud.js",
        "gameplay/drone_controller.js",
        "data/scorestreaks/fpv_drone.js",
        
        // Airstrike
        "data/scorestreaks/airstrike.js"
    ];

    function loadNext(index) {
        if (index >= scripts.length) {
            console.log("ScorestreakRegistry: All streaks loaded.");
            return;
        }
        const s = document.createElement('script');
        s.src = scripts[index];
        s.onload = () => loadNext(index + 1);
        s.onerror = () => {
            console.error("Failed to load scorestreak script:", scripts[index]);
            loadNext(index + 1);
        };
        document.head.appendChild(s);
    }
    
    // Start loading
    loadNext(0);
})();
