
// js/data/maps/depot/lighting.js
window.DEPOT_LIGHTING = {
    id: "DEPOT_LIGHTING",
    name: "Industrial Sunset",
    mapId: "DEPOT",
    
    // Sun: Low, orange/gold, long shadows
    sun: {
        type: "directional",
        position: { x: -200, y: 60, z: 100 }, 
        color: "#ffaa66", 
        intensity: 3.5, 
        
        visual: {
            distance: 450,
            coreSize: 400, 
            coreColor: "#ffddaa",
            glowSize: 800, 
            glowColor: "#ff8844" 
        }
    },
    
    // Atmosphere: Hazy industrial
    atmosphere: {
        zenithColor: "#4a6b8c",      
        horizonColor: "#d4a076",     
        groundColor: "#222222"       
    },
    
    // Ambient
    ambient: {
        color: "#556677", 
        intensity: 1.0 
    },
    
    // Hemisphere
    hemisphere: {
        skyColor: "#8899aa",
        groundColor: "#222222",
        intensity: 0.6
    },
    
    // Fog
    fog: {
        enabled: true,
        color: "#d4a076", 
        density: 0.005 
    },
    
    // Post-processing
    postProcessing: {
        bloom: {
            strength: 0.7,
            radius: 0.5, 
            threshold: 0.9 
        }
    }
};
console.log('Depot lighting config loaded (Sunset)');
