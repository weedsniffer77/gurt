
// js/data/assets/asset_manager.js
(function() {
    // Defines the global MapAssets object and aggregates functions from sub-modules
    const MapAssets = {
        rng: Math.random,
        setRNG(fn) { this.rng = fn || Math.random; },
        
        // --- PROXIES ---
        // Assigned by sub-modules when they load
        
        createContainer: null,
        createContainer40: null,
        createBatchedContainer20: null,
        createBatchedContainer40: null,
        
        createStairs: null,
        createKillhouseWall: null,
        
        createBarrel: null,
        createIBCTote: null,
        createPalletStack: null,
        createLargePalletCube: null,
        createTallPalletStack: null,
        createConcreteBarrier: null,
        createPalletLong: null,
        createPlankStack: null,
        createPalletPyramid: null,
        
        // Utils
        scaleUVs(geometry, w, h, d) {
            const uvs = geometry.attributes.uv;
            for (let i = 0; i < uvs.count; i += 4) {
                let uScale = 1; let vScale = 1;
                const faceIndex = i / 4;
                if (faceIndex === 0 || faceIndex === 1) { uScale = d; vScale = h; }
                else if (faceIndex === 2 || faceIndex === 3) { uScale = w; vScale = d; }
                else { uScale = w; vScale = h; }
                for (let j = 0; j < 4; j++) {
                    uvs.setXY(i + j, uvs.getX(i + j) * uScale, uvs.getY(i + j) * vScale);
                }
            }
            uvs.needsUpdate = true;
        },
        
        createCorrugatedPlane(width, height, amplitude) {
            const pitch = 0.15;
            const segments = Math.max(2, Math.round(width / pitch)); 
            const geo = new THREE.PlaneGeometry(width, height, segments, 1);
            const pos = geo.attributes.position;
            for(let i = 0; i < pos.count; i++) {
                const col = i % (segments + 1);
                const zOffset = (col % 2 === 0) ? amplitude * 0.5 : -amplitude * 0.5;
                pos.setZ(i, zOffset);
            }
            geo.computeVertexNormals();
            return geo;
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.MapAssets = MapAssets;
})();
