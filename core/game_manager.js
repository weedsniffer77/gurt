
// js/core/game_manager.js
// --- ORCHESTRATOR ONLY: DO NOT ADD CORE FUNCTIONALITIES HERE ---
// Delegate Map to WorldBuilder
// Delegate Physics to PhysicsEngine
// Delegate Loop Logic to LoopController (Future) or inline Subsystem calls

(function() {
    const GameManager = {
        scene: null,
        camera: null,
        renderer: null,
        cubeCamera: null,
        
        currentState: "INIT", 
        isMenuMode: true, 
        
        lastTime: 0,
        lastRenderTime: 0,
        fpsTime: 0,
        fpsFrames: 0,
        
        transition: {
            active: false,
            timer: 0,
            duration: 2.0, 
            startPos: null,
            startRot: null,
            startFOV: 50,
            endPos: null,
            endRot: null,
            endFOV: 75,
            blackoutTriggered: false
        },
        
        menuRotationAngle: 0,
        config: { maxFPS: 250 },
        bgWorker: null,
        
        // Proxies to WorldBuilder for compatibility
        get currentMap() { return window.TacticalShooter.WorldBuilder.currentMap; },
        get staticCollider() { return window.TacticalShooter.WorldBuilder.staticCollider; },
        
        async init() {
            if (!window.THREE || !window.RAPIER) {
                if (window.THREE_READY) { } else { setTimeout(() => this.init(), 100); return; }
            }
            if (this.scene) return; 

            console.log('GameManager: Initializing...');
            const SC = window.TacticalShooter.SceneController;
            SC.init();
            this.scene = SC.scene;
            this.camera = SC.camera;
            this.renderer = SC.renderer;
            this.cubeCamera = SC.cubeCamera;
            
            this.transition.startPos = new THREE.Vector3();
            this.transition.startRot = new THREE.Quaternion();
            this.transition.endPos = new THREE.Vector3();
            this.transition.endRot = new THREE.Quaternion();

            if (window.TacticalShooter.AssetLoader) await window.TacticalShooter.AssetLoader.loadCommon();
            window.TacticalShooter.GameSetup.initSubsystems(this);
            
            await this.loadMap("WAREHOUSE");
            
            if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.init(this.scene, this.camera);
            this.initBackgroundWorker();
            if (window.TacticalShooter.BackgroundService) window.TacticalShooter.BackgroundService.subscribe(this.onBackgroundTick.bind(this));
            
            console.log('GameManager: ✓ Ready');
            if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.init();

            this.setSystemsActive(false);
            this.enterMenu();
            this.startLoop();
        },
        
        initBackgroundWorker() {
            const blob = new Blob([`self.interval = null; self.onmessage = function(e) { if (e.data === 'start') { if (self.interval) clearInterval(self.interval); self.interval = setInterval(() => { self.postMessage('tick'); }, 16); } else if (e.data === 'stop') { if (self.interval) clearInterval(self.interval); self.interval = null; } };`], {type: 'application/javascript'});
            this.bgWorker = new Worker(URL.createObjectURL(blob));
            this.bgWorker.onmessage = () => { if (document.hidden) this.onBackgroundTick(0.016); };
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) { this.bgWorker.postMessage('start'); } 
                else { this.bgWorker.postMessage('stop'); if (window.TacticalShooter.MatchState) window.TacticalShooter.MatchState.syncMatchState(); }
            });
        },
        
        onBackgroundTick(dt) {
            const MS = window.TacticalShooter.MatchState;
            if (MS) MS.update(dt);
            if (!document.hidden) return;
            if (this.currentState === 'IN_GAME') {
                if (window.TacticalShooter.PhysicsEngine) window.TacticalShooter.PhysicsEngine.step(dt);
                if (window.TacticalShooter.RagdollManager) window.TacticalShooter.RagdollManager.update(dt);
                if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.update(dt);
                if (window.TacticalShooter.ProjectileManager) window.TacticalShooter.ProjectileManager.update(dt);
                
                // CRITICAL: Keep drone logic alive so it hovers/consumes fuel
                if (window.TacticalShooter.DroneController) window.TacticalShooter.DroneController.update(dt, null);
                
                if (window.TacticalShooter.EntityManager) {
                    const pPos = window.TacticalShooter.CharacterController ? window.TacticalShooter.CharacterController.position : null;
                    window.TacticalShooter.EntityManager.update(dt, pPos);
                }
                if (window.TacticalShooter.PlayerState) {
                    const PS = window.TacticalShooter.PlayerState;
                    if (PS.modules.ammo) PS.modules.ammo.update(dt);
                    if (PS.modules.health) PS.modules.health.update(dt);
                }
            }
            if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.update(dt);
        },
        
        async loadMap(mapId = "WAREHOUSE") {
            // Pause physics to prevent stepping during geometry rebuild
            if (window.TacticalShooter.PhysicsEngine) window.TacticalShooter.PhysicsEngine.setPaused(true);
            
            // Delegated to WorldBuilder
            const WB = window.TacticalShooter.WorldBuilder;
            await WB.loadMapFull(mapId, this.scene, window.TacticalShooter.MaterialLibrary);
            
            const lighting = WB.getActiveLighting(mapId); 
            window.TacticalShooter.Raytracer.applyLighting(this.scene, this.renderer, lighting);
            window.TacticalShooter.SkyRenderer.init(this.scene, lighting);
            window.TacticalShooter.PostProcessor.init(this.renderer, this.scene, this.camera, lighting);
            window.TacticalShooter.SceneController.updateReflections();
            
            // Clear Entities
            if (window.TacticalShooter.EntityManager) window.TacticalShooter.EntityManager.reset();
            
            // Resume physics
            if (window.TacticalShooter.PhysicsEngine) window.TacticalShooter.PhysicsEngine.setPaused(false);
        },
        
        // State Transitions (Delegated to GameFlow)
        enterMenu() { window.TacticalShooter.GameFlow.enterMenu(this); const pgs = document.getElementById('post-game-screen'); if(pgs) { pgs.style.display = 'none'; pgs.classList.remove('active'); } if (this.renderer) { this.renderer.clear(); } },
        enterSpectator() { window.TacticalShooter.GameFlow.enterSpectator(this); },
        enterGame() { window.TacticalShooter.GameFlow.enterGame(this); },
        startTransition(isSpectator) { window.TacticalShooter.GameFlow.startTransition(this, isSpectator); },
        checkMapSync() { window.TacticalShooter.GameFlow.checkMapSync(this); },
        
        spawnPlayer() { window.TacticalShooter.SpawnSystem.spawnPlayer(this.camera); },
        setSystemsActive(active) { if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.setVisible(active); },
        setMenuMode(enabled) { this.isMenuMode = enabled; },
        
        startLoop() { this.lastTime = performance.now(); this.lastRenderTime = this.lastTime; this.fpsTime = this.lastTime; this.gameLoop(); },
        gameLoop() { 
            requestAnimationFrame(() => this.gameLoop()); 
            const currentTime = performance.now(); 
            if (this.config.maxFPS < 241) { 
                const interval = 1000 / this.config.maxFPS; 
                const elapsed = currentTime - this.lastRenderTime; 
                if (elapsed < interval) return; 
                this.lastRenderTime = currentTime - (elapsed % interval); 
            } else { this.lastRenderTime = currentTime; } 
            
            const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); 
            this.lastTime = currentTime; 
            this.fpsFrames++; 
            if (currentTime >= this.fpsTime + 1000) { 
                const fpsDisplay = document.getElementById('fps-display'); 
                if (fpsDisplay && fpsDisplay.style.display !== 'none') fpsDisplay.textContent = `FPS: ${this.fpsFrames}`; 
                this.fpsTime = currentTime; this.fpsFrames = 0; 
            } 
            this.update(deltaTime); 
            this.render(deltaTime); 
        },
        
        update(dt) {
            if (this.currentState === 'LOADING') return;
            if (window.TacticalShooter.MatchState) window.TacticalShooter.MatchState.update(dt);
            
            if (this.currentState === 'TRANSITION') { 
                window.TacticalShooter.GameFlow.updateTransition(this, dt); 
                if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.update(dt); 
                return; 
            }
            if (this.currentState === 'MENU') { 
                window.TacticalShooter.GameFlow.updateMenuCamera(this, dt); 
                if (window.TacticalShooter.MenuRenderer && window.TacticalShooter.MenuRenderer.active) window.TacticalShooter.MenuRenderer.update(dt); 
                if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.update(dt); 
                
                // Keep updating PlayerState in menu if dead so timer proceeds
                if (window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.isDead) {
                    window.TacticalShooter.PlayerState.update(dt);
                }
                return; 
            }
            
            if (window.TacticalShooter.MatchState && window.TacticalShooter.MatchState.state.status !== 'GAME_OVER' && !this.isMenuMode) {
                // Update Inputs & Inventory
                if (window.TacticalShooter.InventoryController) window.TacticalShooter.InventoryController.update(window.TacticalShooter.InputManager, window.TacticalShooter.PlayerState);
                if (window.TacticalShooter.PhysicsEngine) window.TacticalShooter.PhysicsEngine.step(dt);
                
                // Update Player
                window.TacticalShooter.CharacterController.update(dt, window.TacticalShooter.InputManager, window.TacticalShooter.PlayerState, this.scene);
                
                // Update Interactables
                if (window.TacticalShooter.EntityManager) {
                    window.TacticalShooter.EntityManager.update(dt, window.TacticalShooter.CharacterController.position);
                }

                // Update Camera & Weapons
                window.TacticalShooter.PlayerCamera.update(dt, window.TacticalShooter.InputManager, window.TacticalShooter.CharacterController, window.TacticalShooter.PlayerState);
                window.TacticalShooter.WeaponManager.update(dt, window.TacticalShooter.InputManager, window.TacticalShooter.PlayerState, window.TacticalShooter.PlayerCamera);
                window.TacticalShooter.PlayerState.update(dt);
                
                // Update World & Physics Objects
                if (window.TacticalShooter.ParticleManager) window.TacticalShooter.ParticleManager.update(dt);
                if (window.TacticalShooter.ThrowableManager) window.TacticalShooter.ThrowableManager.update(dt);
                if (window.TacticalShooter.ProjectileManager) window.TacticalShooter.ProjectileManager.update(dt);
                if (window.TacticalShooter.RagdollManager) window.TacticalShooter.RagdollManager.update(dt);
                
                // Update FPV Drone Physics
                if (window.TacticalShooter.DroneController) {
                    window.TacticalShooter.DroneController.update(dt, window.TacticalShooter.InputManager);
                }
            }
            
            if (window.TacticalShooter.SkyRenderer.update) window.TacticalShooter.SkyRenderer.update(this.camera);
            window.TacticalShooter.InputManager.update();
            if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.update(dt);
        },
        
        render(dt) {
            if (this.currentState === 'LOADING') return;
            const PP = window.TacticalShooter.PostProcessor;
            // Let WorldBuilder handle visibility updates
            const WB = window.TacticalShooter.WorldBuilder;
            if (WB) WB.updateMapVisuals(this.currentState === 'TACVIEW');
            
            let activeCam = this.camera;
            
            if (PP && PP.enabled) {
                // Post Processing path
                // FIX: Added 'this.' to currentState to fix ReferenceError
                if (this.currentState === 'TACVIEW' || this.currentState === 'MENU' || this.currentState === 'TRANSITION') {
                    this.renderer.render(this.scene, activeCam);
                } else {
                    // In-Game with effects
                    PP.render(dt, this.scene, activeCam);
                }
            } else {
                // Standard path
                this.renderer.render(this.scene, activeCam);
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameManager = GameManager;
})();
