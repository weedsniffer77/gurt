
// js/data/maps/warehouse/lighting.js
window.WAREHOUSE_LIGHTING = {
    id: "WAREHOUSE_LIGHTING",
    name: "Training Course",
    mapId: "WAREHOUSE",
    
    // Sun: High angle, crisp
    sun: {
        type: "directional",
        position: { x: 30, y: 80, z: -20 },
        color: "#fffde0", 
        intensity: 3.8, 
        
        // Disabled visual glow to remove the "second sun" effect
        visual: {
            distance: 400,
            coreSize: 60,  // Reduced slightly
            coreColor: "#ffffff",
            glowSize: 0,   // DISABLED GLOW
            glowColor: "#000000" 
        }
    },
    
    // Atmosphere
    atmosphere: {
        zenithColor: "#eef5f5",      
        horizonColor: "#cce0e0",     
        groundColor: "#808080"       
    },
    
    // Ambient
    ambient: {
        color: "#ddeeff", 
        intensity: 0.3 
    },
    
    // Hemisphere
    hemisphere: {
        skyColor: "#ffffff",
        groundColor: "#aaaaaa",
        intensity: 0.4
    },
    
    // Fog
    fog: {
        enabled: true,
        color: "#cce0e0", 
        density: 0.005
    },
    
    // Post-processing
    postProcessing: {
        bloom: {
            strength: 0.9,
            radius: 0.5,
            threshold: 0.85
        }
    }
};
console.log('Warehouse lighting config loaded (Training)');
