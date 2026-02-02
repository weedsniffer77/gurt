
// js/data/maps/warehouse/lighting_night.js
window.WAREHOUSE_NIGHT_LIGHTING = {
    id: "WAREHOUSE_NIGHT_LIGHTING",
    name: "Night Operations",
    mapId: "WAREHOUSE", // Shared ID
    
    // Moon (Brighter, Bluer)
    sun: {
        type: "directional",
        position: { x: -60, y: 80, z: -40 }, 
        color: "#88bbff", // Stronger Blue
        intensity: 0.8,   // Brighter moon (was 0.6)
        
        visual: {
            distance: 400,
            coreSize: 60, 
            coreColor: "#ffffff",
            glowSize: 180, 
            glowColor: "#0044aa", // Deep blue glow
            isMoon: true
        }
    },
    
    // Star Field
    stars: {
        enabled: true,
        count: 2000,
        brightness: 1.0,
        color: "#ffffff"
    },
    
    // Atmosphere (Darker)
    atmosphere: {
        zenithColor: "#000205",      // Near pitch black zenith
        horizonColor: "#020610",     // Very dark navy horizon
        groundColor: "#000000"       
    },
    
    // Ambient (Reduced & Blue)
    ambient: {
        color: "#051025", // Deep dark blue
        intensity: 0.1    // Very low ambient (was 0.15)
    },
    
    // Hemisphere (Ground bounce removal)
    hemisphere: {
        skyColor: "#0a1a30",
        groundColor: "#000000",
        intensity: 0.15
    },
    
    // Fog
    fog: {
        enabled: true,
        color: "#020610", 
        density: 0.015 // Thicker fog to hide distance
    },
    
    // Post-processing
    postProcessing: {
        bloom: {
            strength: 1.5, 
            radius: 0.8, 
            threshold: 0.6 // Lower threshold to make lights pop in dark
        }
    }
};
console.log('Warehouse (Night) lighting config loaded');
