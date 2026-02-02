
// js/ui/settings_manager.js
(function() {
    const SettingsManager = {
        // State
        settings: {
            sensitivity: 0.005, // Updated default
            casingsEnabled: true,
            muzzleFlashEnabled: true, 
            bodyEnabled: false, 
            showControls: false, 
            showNametags: true,  
            maxFPS: 250,
            renderScale: 1.0, 
            baseFOV: 90,
            
            // New Settings
            chromaticAberration: 0.0,
            chromaticAberrationEffects: true,
            hideChatClosed: false,
            
            // Gameplay
            grenadeThrowZoom: false,
            autoReload: true,
            grenadeUseADS: false,
            toggleCrouch: false,
            showTrajectory: true,
            
            // Drone
            spectateDrone: false,
            realisticDrone: false,
            droneSensitivity: 1.0,
            droneRollSensitivity: 1.0, // UPDATED: Default 1.0
            
            // Graphics Extras
            shadowQuality: 'high',
            simpleShadows: false, 
            reflectionsEnabled: true, 
            particleCount: 12,
            physicsStep: 1,
            shellShadows: true,
            useCannonShells: false 
        },
        bindings: {},
        listeningForKey: false,
        bindingAction: null,
        
        presets: {
            trackpad: { ADS: 'KeyV', Crouch: 'KeyC', FreeCursor: 'Semicolon' }, 
            mouse: { ADS: 'Mouse2', Crouch: 'ControlLeft', FreeCursor: 'Semicolon' }
        },

        init() {
            // Load Default Bindings from InputManager
            if (window.TacticalShooter.InputManager) {
                this.bindings = { ...window.TacticalShooter.InputManager.bindings };
            }
        },

        open() {
            // Apply current settings to UI elements
            const sensSlider = document.getElementById('sensitivity-slider'); if (sensSlider) sensSlider.value = this.settings.sensitivity;
            this.updateSensitivityUI(this.settings.sensitivity);
            
            const fpsSlider = document.getElementById('max-fps-slider'); if (fpsSlider) fpsSlider.value = this.settings.maxFPS;
            this.updateMaxFPSUI(this.settings.maxFPS);
            
            const rsSlider = document.getElementById('render-scale-slider'); 
            if (rsSlider) rsSlider.value = Math.round(this.settings.renderScale * 100);
            this.updateRenderScaleUI(this.settings.renderScale * 100);
            
            const fovSlider = document.getElementById('fov-slider');
            if (fovSlider) fovSlider.value = this.settings.baseFOV;
            this.updateFOVUI(this.settings.baseFOV);

            const caSlider = document.getElementById('ca-slider');
            if (caSlider) caSlider.value = this.settings.chromaticAberration;
            this.updateChromaticAberrationUI(this.settings.chromaticAberration);
            
            // Drone Sliders
            const dsSlider = document.getElementById('drone-sens-slider');
            if(dsSlider) dsSlider.value = this.settings.droneSensitivity;
            this.updateDroneSensitivityUI(this.settings.droneSensitivity);
            
            const drSlider = document.getElementById('drone-roll-slider');
            if(drSlider) drSlider.value = this.settings.droneRollSensitivity;
            this.updateDroneRollUI(this.settings.droneRollSensitivity);

            const map = {
                'casings-toggle': this.settings.casingsEnabled,
                'muzzleflash-toggle': this.settings.muzzleFlashEnabled,
                'body-toggle': this.settings.bodyEnabled,
                'controls-toggle': this.settings.showControls,
                'nametags-toggle': this.settings.showNametags,
                'grenade-zoom-toggle': this.settings.grenadeThrowZoom,
                'auto-reload-toggle': this.settings.autoReload,
                'grenade-ads-toggle': this.settings.grenadeUseADS,
                'crouch-toggle-setting': this.settings.toggleCrouch,
                'trajectory-toggle': this.settings.showTrajectory,
                'spectate-drone-toggle': this.settings.spectateDrone,
                'realistic-drone-toggle': this.settings.realisticDrone,
                'simple-shadows-toggle': this.settings.simpleShadows,
                'reflections-toggle': this.settings.reflectionsEnabled,
                'ca-fx-toggle': this.settings.chromaticAberrationEffects,
                'hide-chat-toggle': this.settings.hideChatClosed
            };

            for (const [id, val] of Object.entries(map)) {
                const el = document.getElementById(id);
                if (el) el.checked = val;
            }
            
            this.updateRealisticUI(this.settings.realisticDrone);
            this.renderKeybinds();
            this.generateConfigString();
            this.switchTab('controls');
            
            // Reset Submenus
            this.closeSubMenu();
        },

        // --- TABS & UI ---
        switchTab(tabName) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.getElementById(`tab-btn-${tabName}`);
            if (activeBtn) activeBtn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            const activeContent = document.getElementById(`tab-${tabName}`);
            if (activeContent) activeContent.classList.add('active');
            
            this.closeSubMenu();
        },
        
        openSubMenu(menuId) {
            document.getElementById('gameplay-main').style.display = 'none';
            document.querySelectorAll('.sub-menu-screen').forEach(el => el.style.display = 'none');
            const target = document.getElementById(menuId);
            if(target) target.style.display = 'block';
        },
        
        closeSubMenu() {
            document.querySelectorAll('.sub-menu-screen').forEach(el => el.style.display = 'none');
            const main = document.getElementById('gameplay-main');
            if(main) main.style.display = 'flex'; // FLEX for split view
        },

        // --- SETTINGS LOGIC ---
        updateSensitivity(val) { this.settings.sensitivity = parseFloat(val); this.updateSensitivityUI(this.settings.sensitivity); this.generateConfigString(); },
        updateSensitivityUI(val) { const display = document.getElementById('sens-value'); if (display) display.textContent = parseFloat(val).toFixed(4); },
        updateMaxFPS(val) { this.settings.maxFPS = parseInt(val); this.updateMaxFPSUI(this.settings.maxFPS); this.generateConfigString(); },
        updateMaxFPSUI(val) { const display = document.getElementById('max-fps-value'); if (display) { display.textContent = val > 240 ? "UNLIMITED" : val; } },
        updateRenderScale(val) { this.settings.renderScale = parseInt(val) / 100; this.updateRenderScaleUI(val); this.generateConfigString(); },
        updateRenderScaleUI(val) { const display = document.getElementById('render-scale-value'); if (display) display.textContent = val + "%"; },
        updateFOV(val) { this.settings.baseFOV = parseInt(val); this.updateFOVUI(val); this.generateConfigString(); },
        updateFOVUI(val) { const display = document.getElementById('fov-value'); if (display) display.textContent = val; },
        
        updateChromaticAberration(val) { this.settings.chromaticAberration = parseFloat(val); this.updateChromaticAberrationUI(val); this.generateConfigString(); },
        updateChromaticAberrationUI(val) { 
            const display = document.getElementById('ca-value'); 
            if (display) {
                const v = parseFloat(val);
                display.textContent = v <= 0.0001 ? "OFF" : (v * 1000).toFixed(1); 
            }
        },
        
        updateDroneSensitivity(val) { this.settings.droneSensitivity = parseFloat(val); this.updateDroneSensitivityUI(val); this.generateConfigString(); },
        updateDroneSensitivityUI(val) { const d = document.getElementById('drone-sens-value'); if(d) d.textContent = parseFloat(val).toFixed(1) + "x"; },
        
        updateDroneRoll(val) { this.settings.droneRollSensitivity = parseFloat(val); this.updateDroneRollUI(val); this.generateConfigString(); },
        updateDroneRollUI(val) { const d = document.getElementById('drone-roll-value'); if(d) d.textContent = parseFloat(val).toFixed(1) + "x"; },

        toggleSetting(key, value) { 
            this.settings[key] = value; 
            if (key === 'realisticDrone') {
                this.updateRealisticUI(value);
            }
            this.generateConfigString(); 
        },
        
        updateRealisticUI(isRealistic) {
            const realSection = document.getElementById('drone-realistic-controls');
            const stdSection = document.getElementById('drone-standard-controls');
            
            if (realSection) {
                if (isRealistic) realSection.classList.remove('dimmed');
                else realSection.classList.add('dimmed');
            }
            if (stdSection) {
                if (isRealistic) stdSection.classList.add('dimmed');
                else stdSection.classList.remove('dimmed');
            }
        },

        setGraphicsPreset(mode) {
            this.settings.bodyEnabled = false; 
            const enableCulling = (mode === 'low');
            if (window.TacticalShooter.RemotePlayerManager) {
                window.TacticalShooter.RemotePlayerManager.setCullingEnabled(enableCulling);
            }
            if (mode === 'low') {
                this.settings.casingsEnabled = false; 
                this.settings.muzzleFlashEnabled = false;
                this.settings.particleCount = 2; 
                this.settings.shadowQuality = 'low';
                this.settings.simpleShadows = true; 
                this.settings.physicsStep = 1; 
                this.settings.shellShadows = false; 
                this.settings.useCannonShells = false;
                this.settings.renderScale = 0.60;
                this.settings.reflectionsEnabled = false;
            } else if (mode === 'medium') {
                this.settings.casingsEnabled = true; 
                this.settings.muzzleFlashEnabled = true; 
                this.settings.particleCount = 3; 
                this.settings.shadowQuality = 'medium';
                this.settings.simpleShadows = false; 
                this.settings.physicsStep = 5; 
                this.settings.shellShadows = false; 
                this.settings.useCannonShells = false;
                this.settings.renderScale = 0.85;
                this.settings.reflectionsEnabled = true;
            } else { // high
                this.settings.casingsEnabled = true; 
                this.settings.muzzleFlashEnabled = true;
                this.settings.particleCount = 12; 
                this.settings.shadowQuality = 'high';
                this.settings.simpleShadows = false; 
                this.settings.physicsStep = 1; 
                this.settings.shellShadows = true; 
                this.settings.useCannonShells = true; 
                this.settings.renderScale = 1.0;
                this.settings.reflectionsEnabled = true;
            }
            
            const elC = document.getElementById('casings-toggle'); if (elC) elC.checked = this.settings.casingsEnabled;
            const elFlash = document.getElementById('muzzleflash-toggle'); if (elFlash) elFlash.checked = this.settings.muzzleFlashEnabled;
            const elBody = document.getElementById('body-toggle'); if (elBody) elBody.checked = this.settings.bodyEnabled;
            const elShadow = document.getElementById('simple-shadows-toggle'); if (elShadow) elShadow.checked = this.settings.simpleShadows;
            const elRefl = document.getElementById('reflections-toggle'); if (elRefl) elRefl.checked = this.settings.reflectionsEnabled;
            const elRS = document.getElementById('render-scale-slider'); if(elRS) elRS.value = Math.round(this.settings.renderScale * 100);
            this.updateRenderScaleUI(Math.round(this.settings.renderScale * 100));
            
            this.generateConfigString();
            if(window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification(`PRESET APPLIED: ${mode.toUpperCase()}`, 'blue');
        },

        reset() {
            if(window.TacticalShooter.InputManager) this.bindings = { ...window.TacticalShooter.InputManager.defaultBindings };
            this.setGraphicsPreset('high'); 
            
            this.settings.bodyEnabled = false;
            this.settings.simpleShadows = false;
            this.settings.sensitivity = 0.005;
            this.settings.showControls = false;
            this.settings.showNametags = true;
            this.settings.maxFPS = 250;
            this.settings.renderScale = 1.0;
            this.settings.baseFOV = 90;
            this.settings.grenadeThrowZoom = false; 
            this.settings.autoReload = true; 
            this.settings.grenadeUseADS = false; 
            this.settings.toggleCrouch = false;
            this.settings.showTrajectory = true;
            this.settings.reflectionsEnabled = true;
            this.settings.chromaticAberration = 0.0;
            this.settings.chromaticAberrationEffects = true;
            this.settings.hideChatClosed = false;
            this.settings.spectateDrone = false;
            this.settings.realisticDrone = false;
            this.settings.droneSensitivity = 1.0;
            this.settings.droneRollSensitivity = 1.0;

            this.open(); // Re-sync UI
            
            if(window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification("SETTINGS RESET (UNSAVED)", "blue");
        },

        save(silent = false) {
            // Apply Settings to subsystems
            if (window.TacticalShooter.PlayerCamera) {
                window.TacticalShooter.PlayerCamera.setSensitivity(this.settings.sensitivity);
                window.TacticalShooter.PlayerCamera.config.grenadeZoom = this.settings.grenadeThrowZoom;
            }
            
            if (window.TacticalShooter.ParticleManager) {
                window.TacticalShooter.ParticleManager.casingsEnabled = this.settings.casingsEnabled;
                window.TacticalShooter.ParticleManager.setLightingEnabled(this.settings.muzzleFlashEnabled);
                window.TacticalShooter.ParticleManager.setConfig({
                    impactCount: this.settings.particleCount,
                    physicsStep: this.settings.physicsStep,
                    shellShadows: this.settings.shellShadows,
                    useCannonShells: this.settings.useCannonShells
                });
            }
            
            if (window.TacticalShooter.ShadowManager) {
                const q = this.settings.shadowQuality === 'low' ? 'low' : 'high';
                window.TacticalShooter.ShadowManager.setShadowQuality(q);
                if (window.TacticalShooter.ShadowManager.setShadowType) {
                    window.TacticalShooter.ShadowManager.setShadowType(this.settings.simpleShadows ? 'basic' : 'soft');
                }
            }
            
            if (window.TacticalShooter.GunRenderer) {
                window.TacticalShooter.GunRenderer.muzzleFlashEnabled = this.settings.muzzleFlashEnabled;
                window.TacticalShooter.GunRenderer.setUseFullBody(this.settings.bodyEnabled);
            }
            
            if (window.TacticalShooter.SceneController) {
                window.TacticalShooter.SceneController.setRenderScale(this.settings.renderScale);
                window.TacticalShooter.SceneController.setReflectionsEnabled(this.settings.reflectionsEnabled);
            }
            
            if (window.TacticalShooter.RemotePlayerManager) {
                window.TacticalShooter.RemotePlayerManager.setCullingEnabled(this.settings.simpleShadows);
            }

            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.config) {
                window.TacticalShooter.GameManager.config.maxFPS = this.settings.maxFPS;
            }
            
            if (window.TacticalShooter.InputManager) window.TacticalShooter.InputManager.bindings = { ...this.bindings };
            
            if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.applySettingsToDOM(); 
            
            const configStr = this.generateConfigString();
            try {
                localStorage.setItem('ts_settings_string', configStr);
                if(!silent) console.log('SettingsManager: Settings saved to LocalStorage.');
            } catch(e) { console.error("Save failed", e); }

            if(!silent && window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.closeSettings();
        },

        // ... (Keybind code) ...
        applyPreset(presetName) { if (this.presets[presetName]) { Object.assign(this.bindings, this.presets[presetName]); this.renderKeybinds(); this.generateConfigString(); if(window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification(`KEYBIND PRESET: ${presetName.toUpperCase()}`, 'blue'); } },
        
        renderKeybinds() { 
            const container = document.getElementById('keybinds-list'); if (!container) return; container.innerHTML = '';
            
            const createBind = (act) => {
                const key = this.bindings[act];
                const btn = document.createElement('button'); btn.className = 'keybind-btn'; 
                if (key) btn.textContent = this.formatKeyName(key); else { btn.textContent = 'NONE'; btn.classList.add('unbound'); }
                btn.onclick = () => this.startRebind(act, btn);
                return btn;
            };

            const renderRow = (action) => { if (!this.bindings.hasOwnProperty(action)) return; const key = this.bindings[action]; const row = document.createElement('div'); row.className = 'keybind-row'; const label = document.createElement('span'); label.className = 'keybind-label'; label.textContent = action.replace(/([A-Z])/g, ' $1').trim().toUpperCase(); const controlsDiv = document.createElement('div'); controlsDiv.style.display = 'flex'; controlsDiv.style.alignItems = 'center'; const btn = createBind(action); const delBtn = document.createElement('button'); delBtn.className = 'delete-bind-btn'; delBtn.textContent = '-'; delBtn.onclick = (e) => { e.stopPropagation(); this.unbindAction(action); }; controlsDiv.appendChild(btn); controlsDiv.appendChild(delBtn); row.appendChild(label); row.appendChild(controlsDiv); container.appendChild(row); };
            
            renderRow('Forward'); renderRow('Backward'); renderRow('Left'); renderRow('Right'); renderRow('Jump'); renderRow('Crouch'); renderRow('Prone'); renderRow('Sprint'); renderRow('LeanLeft'); renderRow('LeanRight');
            renderRow('Shoot'); renderRow('ADS'); renderRow('Reload'); renderRow('QuickMelee'); renderRow('QuickGrenade'); renderRow('Interact'); renderRow('Inspect'); renderRow('AttachmentFunctionality');
            renderRow('CycleUp'); renderRow('CycleDown');
            renderRow('Slot1'); renderRow('Slot2'); renderRow('Slot3'); renderRow('Slot4'); renderRow('Slot5');
            renderRow('Scorestreak1'); renderRow('Scorestreak2'); renderRow('Scorestreak3');
            renderRow('Scoreboard'); renderRow('ToggleUI'); renderRow('FreeCursor');
            
            // Render Drone Binds
            const droneStd = document.getElementById('drone-binds-std');
            if (droneStd) {
                droneStd.innerHTML = '';
                const addD = (act, name, parent) => {
                    const row = document.createElement('div'); row.className = 'keybind-row';
                    row.innerHTML = `<span class="keybind-label">${name}</span>`;
                    const div = document.createElement('div'); div.appendChild(createBind(act)); row.appendChild(div);
                    parent.appendChild(row);
                };
                addD('DroneMoveForward', 'FORWARD', droneStd);
                addD('DroneMoveBackward', 'BACKWARD', droneStd);
                addD('DroneMoveLeft', 'LEFT', droneStd);
                addD('DroneMoveRight', 'RIGHT', droneStd);
                addD('DroneAscend', 'ASCEND', droneStd);
                addD('DroneDescend', 'DESCEND', droneStd);
            }
            
            const droneReal = document.getElementById('drone-binds-real');
            if (droneReal) {
                droneReal.innerHTML = '';
                const addD = (act, name, parent) => {
                    const row = document.createElement('div'); row.className = 'keybind-row';
                    row.innerHTML = `<span class="keybind-label">${name}</span>`;
                    const div = document.createElement('div'); div.appendChild(createBind(act)); row.appendChild(div);
                    parent.appendChild(row);
                };
                addD('DroneThrottleUp', 'THROTTLE UP', droneReal);
                addD('DroneThrottleDown', 'THROTTLE DOWN', droneReal);
                addD('DroneYawLeft', 'YAW LEFT', droneReal);
                addD('DroneYawRight', 'YAW RIGHT', droneReal);
                addD('DroneRollLeft', 'ROLL LEFT', droneReal);
                addD('DroneRollRight', 'ROLL RIGHT', droneReal);
                addD('DronePitchUp', 'PITCH UP (KEY)', droneReal);
                addD('DronePitchDown', 'PITCH DOWN (KEY)', droneReal);
            }
        },
        
        formatKeyName(code) { if (!code) return 'NONE'; if (code.startsWith('Key')) return code.replace('Key', ''); if (code.startsWith('Digit')) return code.replace('Digit', ''); if (code.startsWith('Mouse')) return code.replace('Mouse', 'M'); if (code === 'Space') return 'SPC'; if (code === 'ControlLeft') return 'CTRL'; if (code === 'ShiftLeft') return 'SHFT'; if (code === 'AltLeft') return 'ALT'; if (code === 'Escape') return 'ESC'; if (code === 'Tab') return 'TAB'; if (code === 'Semicolon') return ';'; if (code === 'Backslash') return '\\'; if (code.startsWith('Arrow')) return code.replace('Arrow', 'AR '); return code.toUpperCase(); },
        startRebind(action, btnElement) { if (this.listeningForKey) return; this.listeningForKey = true; this.bindingAction = action; btnElement.textContent = '...'; btnElement.classList.remove('unbound'); btnElement.classList.add('listening'); },
        handleRebind(keyCode) { if (!this.listeningForKey) return; if (keyCode === 'Escape') { this.listeningForKey = false; this.renderKeybinds(); return; } this.bindings[this.bindingAction] = keyCode; this.listeningForKey = false; this.renderKeybinds(); this.generateConfigString(); },
        unbindAction(action) { this.bindings[action] = null; this.renderKeybinds(); this.generateConfigString(); },

        generateConfigString() {
            const input = document.getElementById('config-string');
            if (!input) return;
            const s = this.settings;
            const b = this.bindings;
            let sq = 1; if(s.shadowQuality === 'low') sq=0; if(s.shadowQuality === 'high') sq=2;
            
            // Schema v2 (added drone sens)
            const gfx = [
                s.casingsEnabled?1:0, s.muzzleFlashEnabled?1:0, s.maxFPS, s.bodyEnabled?1:0, 
                s.grenadeThrowZoom?1:0, s.autoReload?1:0, s.grenadeUseADS?1:0,
                s.showControls?1:0, s.showNametags?1:0, sq, s.particleCount, s.physicsStep,
                s.shellShadows?1:0, s.useCannonShells?1:0, s.simpleShadows?1:0,
                Math.round(s.renderScale * 100), s.toggleCrouch?1:0, s.reflectionsEnabled?1:0, s.showTrajectory?1:0,
                s.baseFOV, Math.round(s.chromaticAberration * 1000), s.chromaticAberrationEffects?1:0,
                s.hideChatClosed?1:0, s.spectateDrone?1:0, s.realisticDrone?1:0,
                Math.round(s.droneSensitivity * 10), Math.round(s.droneRollSensitivity * 10)
            ].join(',');
            const keys = Object.values(b).map(k => k || '').join(',');
            const str = `[CFG]S:${s.sensitivity}|G:${gfx}|K:${keys}`;
            input.value = str;
            return str;
        },
        
        importSettingsString(str, autoApply = false) {
            if (!str.startsWith('[CFG]')) return;
            try {
                const parts = str.replace('[CFG]', '').split('|');
                const sensPart = parts.find(p => p.startsWith('S:'));
                if (sensPart) this.updateSensitivity(parseFloat(sensPart.split(':')[1]));
                const gfxPart = parts.find(p => p.startsWith('G:'));
                if (gfxPart) {
                    const vals = gfxPart.split(':')[1].split(',');
                    // ... (Restore previous mappings) ...
                    this.settings.casingsEnabled = (vals[0] === '1');
                    this.settings.muzzleFlashEnabled = (vals[1] === '1');
                    this.updateMaxFPS(parseInt(vals[2]));
                    if (vals.length > 3) this.settings.bodyEnabled = (vals[3] === '1');
                    if (vals.length > 4) this.settings.grenadeThrowZoom = (vals[4] === '1');
                    if (vals.length > 5) this.settings.autoReload = (vals[5] === '1');
                    if (vals.length > 6) this.settings.grenadeUseADS = (vals[6] === '1');
                    if (vals.length > 7) this.settings.showControls = (vals[7] === '1');
                    if (vals.length > 8) this.settings.showNametags = (vals[8] === '1');
                    if (vals.length > 13) { const sq = parseInt(vals[9]); if(sq===0) this.settings.shadowQuality='low'; else if(sq===1) this.settings.shadowQuality='medium'; else this.settings.shadowQuality='high'; this.settings.particleCount = parseInt(vals[10]); this.settings.physicsStep = parseInt(vals[11]); this.settings.shellShadows = (vals[12] === '1'); this.settings.useCannonShells = (vals[13] === '1'); if (vals.length > 14) this.settings.simpleShadows = (vals[14] === '1'); }
                    if (vals.length > 15) { const rs = parseInt(vals[15]); if (!isNaN(rs) && rs >= 10 && rs <= 100) this.settings.renderScale = rs / 100; }
                    if (vals.length > 16) { this.settings.toggleCrouch = (vals[16] === '1'); }
                    if (vals.length > 17) { this.settings.reflectionsEnabled = (vals[17] === '1'); }
                    if (vals.length > 18) { this.settings.showTrajectory = (vals[18] === '1'); }
                    if (vals.length > 19) { const fov = parseInt(vals[19]); if(!isNaN(fov) && fov >= 50 && fov <= 150) this.settings.baseFOV = fov; }
                    if (vals.length > 20) { const ca = parseInt(vals[20]); if (!isNaN(ca)) this.settings.chromaticAberration = ca / 1000; }
                    if (vals.length > 21) { this.settings.chromaticAberrationEffects = (vals[21] === '1'); }
                    if (vals.length > 22) { this.settings.hideChatClosed = (vals[22] === '1'); }
                    if (vals.length > 23) { this.settings.spectateDrone = (vals[23] === '1'); }
                    if (vals.length > 24) { this.settings.realisticDrone = (vals[24] === '1'); }
                    // New
                    if (vals.length > 25) { this.settings.droneSensitivity = parseInt(vals[25]) / 10; }
                    if (vals.length > 26) { this.settings.droneRollSensitivity = parseInt(vals[26]) / 10; }
                    
                    this.open(); // Refresh UI
                }
                const keysPart = parts.find(p => p.startsWith('K:'));
                if (keysPart) {
                    const keys = keysPart.split(':')[1].split(',');
                    const actions = Object.keys(this.bindings);
                    actions.forEach((act, i) => { if (i < keys.length) { const val = keys[i]; this.bindings[act] = (val === '' ? null : val); } });
                    this.renderKeybinds();
                }
                if (autoApply) { this.save(true); } else { if(window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification('SETTINGS IMPORTED (UNSAVED)', 'blue'); }
            } catch (e) { if(window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification('INVALID CONFIG STRING', 'red'); console.error(e); }
        },
        
        copyConfigString() { const input = document.getElementById('config-string'); if (input) { input.select(); document.execCommand('copy'); if(window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification('COPIED TO CLIPBOARD', 'blue'); } }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.SettingsManager = SettingsManager;
})();
