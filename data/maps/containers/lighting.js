
// js/data/maps/containers/lighting.js
window.CONTAINERS_LIGHTING = {
    id: "CONTAINERS_LIGHTING",
    name: "High Noon",
    mapId: "CONTAINERS",
    
    // Sun: High overhead, warm white
    sun: {
        type: "directional",
        position: { x: 50, y: 100, z: 20 },
        color: "#fff8e0", 
        intensity: 4.0, 
        
        visual: {
            distance: 400,
            // Restored Core & Glow
            coreSize: 80, 
            coreColor: "#ffffff", 
            glowSize: 600,
            glowColor: "#ffddaa" 
        }
    },
    
    // Atmosphere
    atmosphere: {
        zenithColor: "#66aadd",      
        // More neutral, less sandy
        horizonColor: "#a0a8b0",     
        groundColor: "#8c857b"       
    },
    
    // Ambient
    ambient: {
        color: "#aaccff", 
        intensity: 0.4 
    },
    
    // Hemisphere
    hemisphere: {
        skyColor: "#ffffff",
        groundColor: "#8c857b",
        intensity: 0.5
    },
    
    // Fog
    fog: {
        enabled: true,
        // Match horizon
        color: "#a0a8b0", 
        density: 0.003
    },
    
    // Post-processing
    postProcessing: {
        bloom: {
            strength: 0.6,
            radius: 0.4,
            threshold: 0.95
        }
    }
};
console.log('Containers lighting config loaded');
