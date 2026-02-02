
// js/core/scene_controller.js
(function() {
    const SceneController = {
        scene: null,
        camera: null,
        renderer: null,
        cubeCamera: null,
        cubeRenderTarget: null,
        currentRenderScale: 1.0,
        reflectionsEnabled: true,
        
        init() {
            console.log('SceneController: Initializing...');
            
            // 1. Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x111111);
            
            // 2. Camera
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.scene.add(this.camera);
            
            // 3. Renderer
            const canvas = document.getElementById('game-canvas');
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                powerPreference: 'high-performance'
            });
            
            // Initial Size (apply default scale of 1.0)
            const width = Math.floor(window.innerWidth * this.currentRenderScale);
            const height = Math.floor(window.innerHeight * this.currentRenderScale);
            this.renderer.setSize(width, height, false); // false = do not change CSS size
            
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.autoClear = false;
            
            this.initReflections();
            
            window.addEventListener('resize', () => this.onResize());
            console.log('SceneController: ✓ Ready');
        },
        
        initReflections() {
            this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128); 
            this.cubeRenderTarget.texture.type = THREE.HalfFloatType;
            this.cubeCamera = new THREE.CubeCamera(0.5, 1000, this.cubeRenderTarget);
            this.scene.add(this.cubeCamera);
            
            // Apply initial state based on default
            if (this.reflectionsEnabled) {
                this.scene.environment = this.cubeRenderTarget.texture;
            } else {
                this.scene.environment = null;
            }
        },
        
        setReflectionsEnabled(enabled) {
            this.reflectionsEnabled = enabled;
            if (this.scene && this.cubeRenderTarget) {
                if (enabled) {
                    // Enable: Attach texture and force one update immediately
                    this.scene.environment = this.cubeRenderTarget.texture;
                    this.updateReflections(); 
                } else {
                    // Disable: Detach texture to stop PBR sampling cost
                    this.scene.environment = null;
                }
            }
        },
        
        updateReflections() {
            if (!this.reflectionsEnabled) return;
            if (this.cubeCamera && this.renderer && this.scene) {
                this.cubeCamera.position.set(0, 10, 0);
                this.cubeCamera.update(this.renderer, this.scene);
            }
        },
        
        setRenderScale(scale) {
            if (Math.abs(this.currentRenderScale - scale) < 0.01) return;
            console.log(`SceneController: Render scale set to ${(scale * 100).toFixed(0)}%`);
            this.currentRenderScale = scale;
            this.onResize();
        },
        
        render(currentState) {
            this.renderer.clear();
            
            let activeCam = this.camera;
            
            // Handle Tactical Camera override
            if (currentState === 'TACVIEW' && window.TacticalShooter.TacticalCamera && window.TacticalShooter.TacticalCamera.isActive) {
                activeCam = window.TacticalShooter.TacticalCamera.camera;
            }
            
            const PP = window.TacticalShooter.PostProcessor;
            
            if (PP && PP.enabled) {
                // Post Processing path
                if (currentState === 'TACVIEW' || currentState === 'MENU' || currentState === 'TRANSITION') {
                    this.renderer.render(this.scene, activeCam);
                } else {
                    // In-Game with effects
                    this.renderer.render(this.scene, activeCam);
                }
            } else {
                // Standard path
                this.renderer.render(this.scene, activeCam);
            }
        },
        
        onResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Scaled Resolution for WebGL Buffer
            const renderWidth = Math.floor(width * this.currentRenderScale);
            const renderHeight = Math.floor(height * this.currentRenderScale);
            
            if (this.camera) {
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
            }
            if (this.renderer) {
                // Update internal size, do NOT update CSS size (keep it 100vw/100vh)
                this.renderer.setSize(renderWidth, renderHeight, false);
            }
            if (window.TacticalShooter.PostProcessor) {
                window.TacticalShooter.PostProcessor.resize(renderWidth, renderHeight);
            }
            if (window.TacticalShooter.TacticalCamera) {
                window.TacticalShooter.TacticalCamera.onResize();
            }
        },
        
        setBackground(colorHex) {
            if (this.scene) this.scene.background = new THREE.Color(colorHex);
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.SceneController = SceneController;
})();
