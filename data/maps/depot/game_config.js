
// js/data/maps/depot/game_config.js
window.DEPOT_GAME_CONFIG = {
    id: "DEPOT_CONFIG",
    mapId: "DEPOT",
    maxTeams: 2, 
    
    // VISUALS
    lobbyVisuals: {
        filter: "contrast(1.0) saturate(1.0) brightness(0.9)" // Slightly grittier
    },
    
    // Default Spawn (Center)
    playerSpawn: {
        position: { x: 0, y: 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
    },
    
    // Team Spawns (North vs South ends of the 195m long hall)
    // Ends are +/- 97.5. Spawns pushed to +/- 85.
    teamSpawns: [
        // Team 0 (Blue): North End (-85)
        { 
            origin: { x: 0, y: 0.5, z: -85 }, 
            lookAt: { x: 0, y: 0.5, z: 0 },
            spreadAxis: 'x',
            spreadWidth: 80 
        },
        // Team 1 (Red): South End (85)
        { 
            origin: { x: 0, y: 0.5, z: 85 }, 
            lookAt: { x: 0, y: 0.5, z: 0 },
            spreadAxis: 'x',
            spreadWidth: 80 
        }
    ],
    
    // FFA Spawns - Scattered across the 100x195m floor
    ffaSpawns: [
        { x: -40, z: -80 }, { x: 0, z: -80 }, { x: 40, z: -80 },
        { x: -40, z: -40 }, { x: 40, z: -40 },
        { x: -20, z: 0 },   { x: 20, z: 0 },
        { x: -40, z: 40 },  { x: 40, z: 40 },
        { x: -40, z: 80 },  { x: 0, z: 80 },  { x: 40, z: 80 }
    ],
    
    objectives: []
};
console.log('Depot game config loaded');
