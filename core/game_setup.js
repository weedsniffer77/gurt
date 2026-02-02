
// js/core/game_setup.js
(function() {
    const GameSetup = {
        initSubsystems(scope) {
            const TS = window.TacticalShooter;
            
            // A. Base Logic
            if (TS.WorldBuilder) TS.WorldBuilder.init();
            if (TS.InputManager) TS.InputManager.init();
            
            // B. UI Construction (MUST BE BEFORE PLAYER STATE)
            if (TS.Shaders && TS.Shaders.init) TS.Shaders.init();
            if (TS.UIManager) TS.UIManager.init();
            if (TS.LobbyUI) TS.LobbyUI.init();
            if (TS.HitmarkerSystem) TS.HitmarkerSystem.init();
            if (TS.ChatSystem) TS.ChatSystem.init();
            if (TS.ScoreFeedUI) TS.ScoreFeedUI.init(); // Init Score Feed

            // C. Player & Logic (Depends on DOM)
            if (TS.PlayerState) TS.PlayerState.init();
            if (TS.InventoryController) TS.InventoryController.init();
            if (TS.ScorestreakManager) TS.ScorestreakManager.init();
            if (TS.ScoreSystem) TS.ScoreSystem.init(); // Init Score Logic
            
            // D. Renderers
            if (TS.GunRenderer) TS.GunRenderer.init(scope.camera);
            if (TS.MenuRenderer) TS.MenuRenderer.init(scope.scene, scope.camera);
            
            // E. Physics / Gameplay
            if (TS.MaterialLibrary) TS.MaterialLibrary.init();
            if (TS.Raytracer) TS.Raytracer.init(scope.renderer);
            
            // --- PHYSICS ENGINE INIT ---
            if (TS.PhysicsEngine) TS.PhysicsEngine.init();
            if (TS.EntityManager) TS.EntityManager.init(scope.scene);
            
            if (TS.PhysicsController) TS.PhysicsController.init();
            if (TS.CharacterController) TS.CharacterController.init(new THREE.Vector3(0,10,0));
            if (TS.PlayerCamera) TS.PlayerCamera.init(scope.camera, {x:0, y:0});
            if (TS.WeaponManager) TS.WeaponManager.init();
            
            // Projectiles split
            if (TS.ThrowableManager) TS.ThrowableManager.init(scope.scene);
            if (TS.ProjectileManager) TS.ProjectileManager.init(scope.scene);
            
            if (TS.Ballistics) TS.Ballistics.init(scope.scene);
            if (TS.RagdollManager) TS.RagdollManager.init(scope.scene);
            if (TS.ParticleManager) TS.ParticleManager.init(scope.scene);
            
            // Register Background Service
            if (TS.BackgroundService) TS.BackgroundService.subscribe(scope.onBackgroundTick.bind(scope));
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameSetup = GameSetup;
})();
