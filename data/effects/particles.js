
// js/data/effects/particles.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || {};
    
    // Centralized Effect Configurations
    window.TacticalShooter.GameData.Effects = {
        
        // "Punchy Waves" - Fast expansion, low initial opacity
        MuzzleSmoke: {
            count: 8,           
            lifetime: 0.2,      // Shorter fade (was 0.3)
            sizeStart: 0.05,    
            sizeEnd: 1.5,       
            velocity: 25.0,     // WAY faster expansion (was 12.0)
            forwardSpeed: 20.0, // WAY faster forward (was 8.0)
            opacityStart: 0.1, 
            opacityPeak: 0.45,  
            color: 0xaaaaaa     
        },
        
        // "Lingering Stream" - Rising fast
        BarrelSmoke: {
            lifetime: 4.0,      
            sizeStart: 0.02,    
            sizeEnd: 1.5,       
            speed: 4.0,         // Reduced by 50% (was 8.0)
            drift: 0.2,         
            opacity: 0.15,      
            color: 0xdddddd
        },
        
        ImpactDust: {
            count: 3,
            lifetime: 0.6,
            sizeStart: 0.1,
            sizeEnd: 0.4,
            speed: 1.5,
            opacity: 0.3,
            color: 0x777777
        }
    };
    
    console.log("Effects Data Loaded");
})();
