
// js/ui/hud/right_side_hud.js
(function() {
    // This class acts as a dedicated controller for the bottom-right HUD area.
    // It is currently delegating to BasicHUD/ShotgunHUD but is the structured home for future inventory.
    const RightSideHUD = {
        init() {
            // No specific initialization needed beyond the sub-modules yet
        },
        
        // Future expansion for Grenades/Equipment slots can go here
        updateInventory(equipmentData) {
            // Placeholder
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.RightSideHUD = RightSideHUD;
})();
