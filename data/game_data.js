
// js/data/game_data.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    
    // Initialize Registry Containers
    const GameData = {
        Weapons: {},     // Populated by individual weapon files
        Attachments: {}, // Populated by attachment files
        Throwables: {},  // Populated by throwable files
        
        Gamemodes: {
            "TDM": { name: "Team Deathmatch", scoreLimit: 50, timeLimit: 600 },
            "FFA": { name: "Free For All", scoreLimit: 30, timeLimit: 600 }
        }
    };

    window.TacticalShooter.GameData = GameData;
    console.log('GameData Initialized.');
})();
