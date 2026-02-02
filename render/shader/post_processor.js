
// js/render/shader/post_processor.js
(function() {
    const PostProcessor = {
        // ... (Existing variables) ...
        renderer: null,
        scene: null,
        camera: null,
        composer: null,
        
        renderPass: null,
        ssaoPass: null,
        bloomPass: null,
        damagePass: null,
        
        bokehPass: null,
        vignettePass: null,
        chromaticPass: null,
        motionBlurPass: null,
        
        outputPass: null,
        enabled: true,
        
        damageIntensity: 0.0,
        vignetteState: 'clear', 
        severeDamageTimer: 0,
        
        // Flash State
        flashWhiteoutTimer: 0,
        flashBlurTimer: 0,
        flashBlindnessLevel: 0, 
        
        // Sprint Blur State
        sprintBlurFactor: 0,
        
        // Golden Flash State
        goldenFlashIntensity: 0.0,
        shockIntensity: 0.0,

        settings: {
            ssao: { enabled: false, kernelRadius: 16, minDistance: 0.005, maxDistance: 0.1 },
            bloom: { enabled: true, strength: 0.8, radius: 0.4, threshold: 0.9 },
            bokeh: { enabled: false, focus: 10.0, aperture: 0.0001, maxblur: 0.01 }, 
            toneMapping: { enabled: true, exposure: 1.0 }
        },
        
        init(renderer, scene, camera, lightingData) {
            this.renderer = renderer;
            this.scene = scene;
            this.camera = camera;
            
            if (!renderer || !scene || !camera) {
                console.warn('PostProcessor: Invalid init params');
                return;
            }
            
            this.composer = new window.EffectComposer(renderer);
            
            this.renderPass = new window.RenderPass(scene, camera);
            this.composer.addPass(this.renderPass);
            
            if (window.SSAOPass && this.settings.ssao.enabled) {
                try { this.initSSAO(); } catch (e) { console.warn('SSAO Failed', e); }
            }
            
            const bConfig = (lightingData && lightingData.postProcessing && lightingData.postProcessing.bloom) 
                ? lightingData.postProcessing.bloom : this.settings.bloom;
            this.initBloom(bConfig);
            
            this.initBokeh(this.settings.bokeh);
            this.initEffectsLibrary();
            this.initDamagePass();
            this.initToneMapping();
            
            this.outputPass = new window.OutputPass();
            this.composer.addPass(this.outputPass);
        },
        
        initSSAO() {
            this.ssaoPass = new window.SSAOPass(this.scene, this.camera);
            this.ssaoPass.kernelRadius = this.settings.ssao.kernelRadius;
            this.ssaoPass.minDistance = this.settings.ssao.minDistance;
            this.ssaoPass.maxDistance = this.settings.ssao.maxDistance;
            this.ssaoPass.enabled = this.settings.ssao.enabled;
            this.composer.addPass(this.ssaoPass);
        },
        
        initBloom(settings) {
            const width = Math.floor(window.innerWidth / 2);
            const height = Math.floor(window.innerHeight / 2);
            this.bloomPass = new window.UnrealBloomPass(new THREE.Vector2(width, height), settings.strength, settings.radius, settings.threshold);
            if (this.settings.bloom.enabled) this.composer.addPass(this.bloomPass);
        },
        
        initBokeh(settings) {
            if (!window.BokehPass) return;
            const width = window.innerWidth;
            const height = window.innerHeight;
            this.bokehPass = new window.BokehPass(this.scene, this.camera, {
                focus: settings.focus, aperture: settings.aperture, maxblur: settings.maxblur, width: width, height: height
            });
            this.bokehPass.enabled = settings.enabled;
            this.composer.addPass(this.bokehPass);
        },
        
        initEffectsLibrary() {
            if (!window.TacticalShooter.Shaders) return;
            if (window.TacticalShooter.Shaders.Vignette) { this.vignettePass = new window.ShaderPass(window.TacticalShooter.Shaders.Vignette); this.vignettePass.enabled = false; this.composer.addPass(this.vignettePass); }
            if (window.TacticalShooter.Shaders.ChromaticAberration) { this.chromaticPass = new window.ShaderPass(window.TacticalShooter.Shaders.ChromaticAberration); this.chromaticPass.enabled = false; this.composer.addPass(this.chromaticPass); }
            if (window.TacticalShooter.Shaders.MotionBlur) { this.motionBlurPass = new window.ShaderPass(window.TacticalShooter.Shaders.MotionBlur); this.motionBlurPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight); this.motionBlurPass.uniforms['velocity'].value = new THREE.Vector2(0, 0); this.motionBlurPass.enabled = false; this.composer.addPass(this.motionBlurPass); }
        },
        
        initDamagePass() {
            if (window.TacticalShooter.Shaders && window.TacticalShooter.Shaders.DamageShader) {
                this.damagePass = new window.ShaderPass(window.TacticalShooter.Shaders.DamageShader);
                this.damagePass.uniforms['intensity'].value = 0.0;
                this.damagePass.uniforms['flashIntensity'].value = 0.0;
                this.damagePass.uniforms['blurStrength'].value = 0.0; 
                this.composer.addPass(this.damagePass);
            }
        },
        
        initToneMapping() {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = this.settings.toneMapping.exposure;
        },
        
        addDamageImpulse(amount) {
            const impulse = amount / 60.0;
            this.damageIntensity = Math.min(1.0, this.damageIntensity + impulse);
            if (amount > 50) this.severeDamageTimer = 1.5;
        },
        
        triggerFlashBlindness(intensity, duration = 2.5) {
            this.flashBlindnessLevel = Math.min(1.0, intensity);
            this.flashWhiteoutTimer = 0.2; 
            this.flashBlurTimer = duration; // Use custom duration
        },
        
        triggerShock() {
            this.shockIntensity = 1.0;
        },

        triggerGoldenFlash() {
            this.goldenFlashIntensity = 1.0;
        },
        
        setVignetteState(state) {
            this.vignetteState = state;
        },
        
        reset() {
            this.damageIntensity = 0.0;
            this.goldenFlashIntensity = 0.0;
            this.shockIntensity = 0.0;
            this.severeDamageTimer = 0;
            this.flashWhiteoutTimer = 0;
            this.flashBlurTimer = 0;
            this.flashBlindnessLevel = 0;
            this.vignetteState = 'clear';
            this.sprintBlurFactor = 0;
            if (this.damagePass) {
                this.damagePass.uniforms['intensity'].value = 0.0;
                this.damagePass.uniforms['flashIntensity'].value = 0.0;
                this.damagePass.uniforms['blurStrength'].value = 0.0;
            }
            if (this.chromaticPass) {
                this.chromaticPass.uniforms['amount'].value = 0;
                this.chromaticPass.enabled = false;
            }
        },

        render(dt, activeScene, activeCamera) {
            if (activeScene && activeCamera) {
                if (this.renderPass) { this.renderPass.scene = activeScene; this.renderPass.camera = activeCamera; }
                if (this.bokehPass && this.bokehPass.enabled) { this.bokehPass.scene = activeScene; this.bokehPass.camera = activeCamera; }
            }

            if (!this.enabled || !this.composer) {
                if (this.renderer && activeScene && activeCamera) { this.renderer.render(activeScene, activeCamera); }
                return;
            }
            
            // --- SHOCK DECAY ---
            if (this.shockIntensity > 0) {
                this.shockIntensity = Math.max(0, this.shockIntensity - dt * 2.5); // Fast fade (~0.4s)
            }
            
            // --- SPRINT EFFECT LOGIC ---
            let isSprintingFast = false;
            const CC = window.TacticalShooter.CharacterController;
            const WM = window.TacticalShooter.WeaponManager;
            const PS = window.TacticalShooter.PlayerState;

            if (CC && WM && PS && !PS.isSpectating) {
                const hSpeed = new THREE.Vector3(CC.velocity.x, 0, CC.velocity.z).length();
                let mobility = 1.0;
                if (WM.currentWeapon && WM.currentWeapon.sprintMultiplier) {
                    mobility = WM.currentWeapon.sprintMultiplier;
                }
                let perkSpeed = 1.0;
                if (window.TacticalShooter.PerkSystem) {
                    perkSpeed = window.TacticalShooter.PerkSystem.getMovementMultiplier();
                }
                const baseWalk = (CC.config && CC.config.walkSpeed) ? CC.config.walkSpeed : 5.4;
                const currentWalkSpeed = baseWalk * mobility * perkSpeed;
                const threshold = currentWalkSpeed + 1.0;
                
                if (hSpeed > threshold) {
                    isSprintingFast = true;
                }
            }
            
            this.sprintBlurFactor = THREE.MathUtils.lerp(this.sprintBlurFactor, isSprintingFast ? 1.0 : 0.0, dt * 5.0);
            
            // --- DAMAGE/VIGNETTE OVERLAY LOGIC ---
            let targetColor = new THREE.Color(0.8, 0.0, 0.0); // Default Red
            let targetIntensity = 0;
            
            // Check Adrenaline
            let isAdrenaline = false;
            if (window.TacticalShooter.PerkSystem && window.TacticalShooter.PerkSystem.hasPerk('ADRENALINE')) {
                const PS = window.TacticalShooter.PlayerState;
                if (PS && PS.modules.health && !PS.isSpectating) {
                     if (Date.now() < PS.modules.health.adrenalineActiveUntil) {
                         isAdrenaline = true;
                     }
                }
            }

            // Decay Golden Flash
            if (this.goldenFlashIntensity > 0) {
                this.goldenFlashIntensity = Math.max(0, this.goldenFlashIntensity - dt * 3.0);
            }

            if (this.goldenFlashIntensity > 0) {
                 // Priority: Golden Flash
                 this.damageIntensity = this.goldenFlashIntensity * 0.4;
                 targetColor.setHex(0xffaa00);
            }
            else if (this.shockIntensity > 0.05) {
                 // Priority: Shock (Dark Vignette + Blur)
                 // Dark Grey Vignette
                 targetColor.setHex(0x222222); 
                 this.damageIntensity = this.shockIntensity * 0.6; // Heavy vignette
            }
            else if (this.vignetteState === 'protection') {
                const pulse = (Math.sin(performance.now() * 0.003) + 1) * 0.05;
                targetIntensity = 0.15 + pulse;
                this.damageIntensity = THREE.MathUtils.lerp(this.damageIntensity, targetIntensity, dt * 3.0);
                targetColor.setHex(0xffaa00); 
            }
            else if (this.vignetteState === 'damaged') {
                if (this.damageIntensity < 0.3) this.damageIntensity = 0.3; 
                this.damageIntensity = THREE.MathUtils.lerp(this.damageIntensity, 0.3, dt * 1.5);
                targetColor.setRGB(0.8, 0.0, 0.0); 
            } 
            else if (this.vignetteState === 'healing') {
                const pulse = (Math.sin(performance.now() * 0.005) + 1) * 0.05; 
                this.damageIntensity = THREE.MathUtils.lerp(this.damageIntensity, 0.1 + pulse, dt * 2.0);
                targetColor.setRGB(0.9, 0.7, 0.7); 
            }
            else {
                let decayTarget = 0;
                
                // Adrenaline Vignette (Cyan/Blue)
                if (isAdrenaline) {
                    decayTarget = 0.2; 
                    targetColor.setHex(0x00ccff); 
                }

                if (this.severeDamageTimer > 0) {
                    this.severeDamageTimer -= dt;
                    decayTarget = 0.7; 
                    targetColor.setRGB(0.6, 0.0, 0.0); // Red overrides blue
                }
                
                this.damageIntensity = THREE.MathUtils.lerp(this.damageIntensity, decayTarget, dt * 2.0);
            }

            // --- FLASHBANG LOGIC ---
            let currentWhiteout = 0;
            let currentBlur = 0;
            
            if (this.flashWhiteoutTimer > 0) {
                this.flashWhiteoutTimer -= dt;
                currentWhiteout = this.flashBlindnessLevel;
            }
            
            if (this.flashBlurTimer > 0) {
                this.flashBlurTimer -= dt;
                const p = this.flashBlurTimer / 2.5; 
                currentBlur = p * this.flashBlindnessLevel;
                
                if (currentWhiteout < 0.1 && p > 0.01) {
                    targetColor.setHex(0x000000); 
                    const flashVignette = 0.4 * p; 
                    if (flashVignette > this.damageIntensity) {
                         this.damageIntensity = flashVignette;
                         if (this.damagePass) this.damagePass.uniforms['vColor'].value.lerp(targetColor, dt * 10.0);
                    }
                }
            }

            if (this.damagePass) {
                this.damagePass.uniforms['intensity'].value = this.damageIntensity;
                if (this.flashBlurTimer <= 0) {
                     this.damagePass.uniforms['vColor'].value.lerp(targetColor, dt * 5.0); 
                }
                this.damagePass.uniforms['flashIntensity'].value = currentWhiteout;
                
                const adrenalineBlur = isAdrenaline ? 0.2 : 0.0;
                const sprintBlur = this.sprintBlurFactor * 0.5;
                const shockBlur = this.shockIntensity * 0.8; 
                
                const totalBlur = Math.max(currentBlur, sprintBlur, adrenalineBlur, shockBlur); 
                
                this.damagePass.uniforms['blurStrength'].value = totalBlur;
            }

            // --- CHROMATIC ABERRATION LOGIC ---
            const settings = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings : {};
            
            // Base setting
            let caAmount = settings.chromaticAberration || 0.0;
            const caEffectsEnabled = (settings.chromaticAberrationEffects !== false);

            // 1. ADDITIVE GAMEPLAY EFFECTS (Obey Setting)
            if (caEffectsEnabled) {
                if (this.sprintBlurFactor > 0.1) {
                    caAmount += this.sprintBlurFactor * 0.002; 
                }
                if (isAdrenaline) {
                    caAmount += 0.004;
                }
                if (window.TacticalShooter.PlayerState) {
                     const hp = window.TacticalShooter.PlayerState.health;
                     if (hp < 25 && hp > 0 && !window.TacticalShooter.PlayerState.isSpectating) {
                         const pulse = (Math.sin(performance.now() * 0.008) + 1.0) * 0.5; 
                         caAmount += 0.004 + (pulse * 0.006);
                     }
                }
            }
            
            // 2. FORCED COMBAT EFFECTS (Ignore Setting)
            // Shock, Flashbang, Heavy Damage should always render
            
            if (this.shockIntensity > 0) {
                caAmount += this.shockIntensity * 0.015; // Strong glitch
            }
            
            if (this.damageIntensity > 0.4 && targetColor.r > 0.5) { 
                // Heavy red damage
                caAmount += (this.damageIntensity - 0.4) * 0.03;
            }
            
            if (currentBlur > 0.0) {
                // Flashbang blur effect
                caAmount += currentBlur * 0.04; 
            }
            
            if (this.chromaticPass) {
                this.chromaticPass.uniforms['amount'].value = caAmount;
                this.chromaticPass.enabled = (caAmount > 0.0005);
            }
            
            this.composer.render(dt);
        },
        
        resize(width, height) {
            if (this.composer) { this.composer.setSize(width, height); }
            if (this.ssaoPass) this.ssaoPass.setSize(width, height);
            if (this.bloomPass) { this.bloomPass.resolution.set(Math.floor(width/2), Math.floor(height/2)); }
            if (this.bokehPass) { this.bokehPass.setSize(width, height); if (this.bokehPass.uniforms['aspect']) { this.bokehPass.uniforms['aspect'].value = width / height; } }
            if (this.motionBlurPass) { this.motionBlurPass.uniforms['resolution'].value.set(width, height); }
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.PostProcessor = PostProcessor;
})();
