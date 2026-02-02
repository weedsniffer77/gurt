
// js/data/score_events.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || {};

    window.TacticalShooter.GameData.ScoreEvents = {
        // Base Events
        KILL: { score: 100, label: "KILL" },
        ASSIST: { score: 25, label: "ASSIST" },
        
        // Weapon Specific
        FRAG_KILL: { score: 125, label: "FRAG KILL" },
        MELEE_BONUS: { score: 35, label: "MELEE" },
        FPV_DRONE_KILL: { score: 150, label: "FPV DRONE KILL" }, 
        
        // --- NEW ---
        AIRSTRIKE_KILL: { score: 50, label: "GBU-12 KILL" },
        
        // Modifiers
        HEADSHOT: { score: 50, label: "HEADSHOT" },
        LONGSHOT: { score: 50, label: "LONGSHOT" },
        POINT_BLANK: { score: 25, label: "POINT BLANK" },
        ONE_SHOT: { score: 50, label: "ONE SHOT ONE KILL" },
        WALLBANG: { score: 25, label: "WALLBANG" },
        MIDAIR: { score: 50, label: "MIDAIR" },
        LAST_BULLET: { score: 50, label: "ONE IN THE CHAMBER" },
        ROCKET_DIRECT: { score: 50, label: "DIRECT HIT" },
        CLOSE_CALL: { score: 50, label: "CLOSE CALL" },
        
        // New Modifiers
        BULLSEYE: { score: 50, label: "BULLSEYE" }, 
        NO_SCOPE: { score: 25, label: "NO SCOPE" },
        SURVIVOR: { score: 50, label: "SURVIVOR" }, 
        MARTYRDOM: { score: 25, label: "MARTYRDOM" }, 
        HUMILIATION: { score: 100, label: "HUMILIATION" },
        SUICIDE_BOMBER: { score: 100, label: "SUICIDE BOMBER" }, 
        
        // Special
        FIRST_BLOOD: { score: 100, label: "FIRST BLOOD" },
        BUZZKILL: { score: 100, label: "BUZZKILL" },
        RAMPAGE: { score: 150, label: "RAMPAGE" }, 
        KINGSLAYER: { score: 50, label: "KINGSLAYER" },
        PAYBACK: { score: 25, label: "PAYBACK" },
        AVENGER: { score: 25, label: "AVENGER" },
        
        // Multikills
        DOUBLE_KILL: { score: 100, label: "DOUBLE KILL" },
        TRIPLE_KILL: { score: 150, label: "TRIPLE KILL" },
        MULTI_KILL: { score: 200, label: "MULTI KILL" },
        
        // Killstreaks
        STREAK_5: { score: 500, label: "5x KILLSTREAK" },
        STREAK_10: { score: 500, label: "10x KILLSTREAK" },
        STREAK_HIGH: { score: 1000, label: "KILLSTREAK" }
    };
    
    console.log("Score Events Loaded.");
})();
