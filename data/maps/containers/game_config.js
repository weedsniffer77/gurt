

// js/data/maps/containers/game_config.js
window.CONTAINERS_GAME_CONFIG = {
    id: "CONTAINERS_CONFIG",
    mapId: "CONTAINERS",
    maxTeams: 2, 
    
    // VISUALS
    lobbyVisuals: {
        filter: "contrast(1.1) saturate(1.1) sepia(0.2)"
    },
    
    // Default Spawn (Center Sidewalk)
    playerSpawn: {
        position: { x: 0, y: 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
    },
    
    // Team Spawns: Placed safely on the central sidewalk axis (X=0)
    teamSpawns: [
        // Team 0 (Blue): North End
        { 
            origin: { x: 0, y: 0.5, z: -42 }, 
            lookAt: { x: 0, y: 0.5, z: 0 },
            spreadAxis: 'x',
            spreadWidth: 8 // Narrow spread to stay on sidewalk
        },
        // Team 1 (Red): South End
        { 
            origin: { x: 0, y: 0.5, z: 42 }, 
            lookAt: { x: 0, y: 0.5, z: 0 },
            spreadAxis: 'x',
            spreadWidth: 8 
        }
    ],
    
    // FFA Spawns: Explicit safe zones on sidewalks and west road
    // Central Sidewalk: X=0
    // West Road: X=-42.5
    // Corridors: X=-20 (between clusters)
    ffaSpawns: [
        // Center Sidewalk Spawns
        { x: 0, z: -40 }, 
        { x: 0, z: -20 }, 
        { x: 0, z: 0 },   
        { x: 0, z: 20 },  
        { x: 0, z: 40 },  
        
        // West Road Spawns
        { x: -42.5, z: -40 },
        { x: -42.5, z: -20 },
        { x: -42.5, z: 0 },
        { x: -42.5, z: 20 },
        { x: -42.5, z: 40 },
        
        // Mid-West Corridors (Avoiding static containers at -20,0 and -24)
        { x: -28, z: -40 },
        { x: -28, z: 40 },
        { x: -20, z: -15 },
        { x: -20, z: 15 }
    ],
    
    objectives: []
};
console.log('Containers game config loaded (Safe Spawns)');
