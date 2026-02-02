
// js/data/maps/warehouse/game_config.js
window.WAREHOUSE_GAME_CONFIG = {
    id: "WAREHOUSE_CONFIG",
    mapId: "WAREHOUSE",
    maxTeams: 2, 
    
    // VISUALS
    lobbyVisuals: {
        filter: "contrast(1.1) saturate(0.9)" // Matched to Testing map
    },
    
    // Default Spawn
    playerSpawn: {
        position: { x: 0, y: 0.5, z: -35 },
        rotation: { x: 0, y: 0, z: 0 }
    },
    
    // Team Spawns (North vs South)
    // Adjusted to +/- 35 to ensure they are well within the +/- 50m floor
    teamSpawns: [
        // Team 0 (Blue): North End (-35)
        { 
            origin: { x: 0, y: 0.5, z: -35 }, 
            lookAt: { x: 0, y: 0.5, z: 0 },
            spreadAxis: 'x',
            spreadWidth: 30 
        },
        // Team 1 (Red): South End (35)
        { 
            origin: { x: 0, y: 0.5, z: 35 }, 
            lookAt: { x: 0, y: 0.5, z: 0 },
            spreadAxis: 'x',
            spreadWidth: 30 
        }
    ],
    
    // FFA Spawns - Redistributed to be safe from walls and containers
    // Map width is 50 (X: -25 to 25). Spawns kept within X: -22 to 22.
    ffaSpawns: [
        { x: -20, z: -40 }, // NW Corner
        { x: 0, z: -42 },   // North End
        { x: 20, z: -40 },  // NE Corner
        
        { x: -22, z: -15 }, // West Mid-North
        { x: 22, z: -15 },  // East Mid-North
        
        { x: -10, z: -8 },  // Center North-West
        { x: 10, z: -8 },   // Center North-East
        
        { x: -20, z: 0 },   // Far West (Fixed from -30)
        { x: 20, z: 0 },    // Far East (Fixed from 30)
        
        { x: -10, z: 8 },   // Center South-West
        { x: 10, z: 8 },    // Center South-East
        
        { x: -22, z: 15 },  // West Mid-South
        { x: 22, z: 15 },   // East Mid-South
        
        { x: -20, z: 40 },  // SW Corner
        { x: 0, z: 42 },    // South End
        { x: 20, z: 40 }    // SE Corner
    ],
    
    objectives: []
};

// Night Variant (Reuses spawn points)
window.WAREHOUSE_NIGHT_GAME_CONFIG = {
    id: "WAREHOUSE_NIGHT_CONFIG",
    mapId: "WAREHOUSE_NIGHT",
    maxTeams: 2, 
    
    // Darker filter for lobby
    lobbyVisuals: {
        filter: "brightness(0.7) contrast(1.2) hue-rotate(10deg)"
    },
    
    // Inherit Spawns from Standard Warehouse
    playerSpawn: window.WAREHOUSE_GAME_CONFIG.playerSpawn,
    teamSpawns: window.WAREHOUSE_GAME_CONFIG.teamSpawns,
    ffaSpawns: window.WAREHOUSE_GAME_CONFIG.ffaSpawns,
    
    objectives: []
};

console.log('Warehouse game configs loaded (Day/Night)');
