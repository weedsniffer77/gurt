
// js/visual/vfx_config.js
window.VFX_CONFIG = {
    impactSparks: {
        particleCount: 12,
        lifetime: 0.4,
        speed: 5.0,
        speedVariance: 2.0,
        gravity: -12.0,
        color: 0xffeebb, // Bright Yellow Hex
        size: 0.1,
        sizeDecay: 0.92
    },
    
    muzzleFlash: {
        lifetime: 0.05,
        color: 0xffcc66,
        intensity: 4.0, // Boosted light
        size: 0.3
    },
    
    // "Blast" Smoke (Quick Puff)
    muzzleSmoke: {
        count: 2,
        size: 0.15,       // Smaller
        expandRate: 2.0,  // Fast expansion
        lifetime: 0.8,    // Short life
        velocity: 3.0,    // Fast forward
        riseSpeed: 0.2,
        opacity: 0.2,     // Very faint
        color: 0x999999   // Neutral grey
    },
    
    impactDust: {
        count: 2,
        size: 0.2,        // Smaller
        expandRate: 1.0,  // Slower growth
        lifetime: 0.6,
        speed: 1.0,
        opacity: 0.3,     // Fainter
        color: 0x777777   // Concrete color
    }
};

console.log('VFX config loaded');
