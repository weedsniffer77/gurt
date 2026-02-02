
// js/render/shader/shadow_manager.js
(function() {
    const ShadowManager = {
        renderer: null,
        directionalLight: null,
        
        // CSM configuration
        useCascades: true,
        cascadeCount: 3,
        shadowMapSize: 2048,
        
        // Shadow quality settings - TUNED TO ELIMINATE RIPPLING
        config: {
            bias: -0.0005,      
            normalBias: 0.05,   
            radius: 2.5         
        },
        
        init(renderer) {
            console.log('ShadowManager: Initializing improved shadow system...');
            this.renderer = renderer;
            
            // Enable high-quality shadows
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.shadowMap.autoUpdate = true;
            
            console.log('ShadowManager: ✓ Ready');
        },
        
        setupDirectionalLight(light, camera) {
            this.directionalLight = light;
            light.castShadow = true;
            
            const d = 120; 
            light.shadow.camera.left = -d;
            light.shadow.camera.right = d;
            light.shadow.camera.top = d;
            light.shadow.camera.bottom = -d;
            light.shadow.camera.near = 0.5;
            light.shadow.camera.far = 500; 
            
            light.shadow.mapSize.width = this.shadowMapSize;
            light.shadow.mapSize.height = this.shadowMapSize;
            
            light.shadow.bias = this.config.bias;
            light.shadow.normalBias = this.config.normalBias;
            light.shadow.radius = this.config.radius;
            
            light.shadow.camera.updateProjectionMatrix();
        },
        
        updateShadowCamera(playerPosition) {
            if (!this.directionalLight) return;
            const shadowCam = this.directionalLight.shadow.camera;
            const lightPos = this.directionalLight.position.clone().normalize();
            const centerOffset = playerPosition.clone();
            centerOffset.y = 0; 
            const dist = 80;
            this.directionalLight.position.copy(lightPos.multiplyScalar(dist).add(centerOffset));
            shadowCam.position.copy(this.directionalLight.position);
            shadowCam.lookAt(centerOffset);
            shadowCam.updateMatrixWorld(true);
        },
        
        setShadowQuality(quality) {
            if (!this.directionalLight) return;
            
            const settings = {
                low: {
                    mapSize: 1024,
                    radius: 3.0,
                    bias: -0.001
                },
                medium: {
                    mapSize: 2048,
                    radius: 2.5,
                    bias: -0.0005
                },
                high: {
                    mapSize: 4096,
                    radius: 2.0,
                    bias: -0.0002
                }
            };
            
            const config = settings[quality] || settings.medium;
            
            this.shadowMapSize = config.mapSize;
            this.directionalLight.shadow.mapSize.width = config.mapSize;
            this.directionalLight.shadow.mapSize.height = config.mapSize;
            this.directionalLight.shadow.radius = config.radius;
            this.directionalLight.shadow.bias = config.bias;
            
            if (this.directionalLight.shadow.map) {
                this.directionalLight.shadow.map.dispose();
                this.directionalLight.shadow.map = null;
            }
            this.directionalLight.shadow.needsUpdate = true;
            
            console.log(`ShadowManager: Quality set to ${quality} (${config.mapSize}x${config.mapSize})`);
        },
        
        setShadowType(type) {
            if (!this.renderer) return;
            
            const oldType = this.renderer.shadowMap.type;
            let newType = THREE.PCFSoftShadowMap;
            
            if (type === 'basic') {
                newType = THREE.BasicShadowMap;
                console.log('ShadowManager: Switching to BasicShadowMap');
            } else {
                newType = THREE.PCFSoftShadowMap;
                console.log('ShadowManager: Switching to PCFSoftShadowMap');
            }
            
            if (oldType !== newType) {
                this.renderer.shadowMap.type = newType;
                this.renderer.shadowMap.needsUpdate = true;
                
                // Switching shadow type requires material recompilation in Three.js
                if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.scene) {
                    window.TacticalShooter.GameManager.scene.traverse(obj => {
                        if (obj.material) {
                            obj.material.needsUpdate = true;
                        }
                    });
                }
            }
        },
        
        setShadowsEnabled(enabled) {
            if (this.renderer) {
                this.renderer.shadowMap.enabled = enabled;
                this.renderer.shadowMap.needsUpdate = true;
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ShadowManager = ShadowManager;
})();
