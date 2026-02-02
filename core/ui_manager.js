
// js/core/ui_manager.js
(function() {
    const UIManager = {
        isMenuOpen: false, // Tracks ESC Menu specifically
        uiHidden: false,
        
        menuElement: null,
        settingsElement: null,
        confirmElement: null,
        cursorElement: null,
        tooltipElement: null,
        scoreboardElement: null,
        
        init() {
            console.log('UIManager: Initializing...');
            
            // Inject UI HTML
            if (window.TacticalShooter.UIElements) {
                const uiContainer = document.createElement('div');
                uiContainer.id = 'ui-container';
                uiContainer.innerHTML = window.TacticalShooter.UIElements.getHTML();
                document.body.appendChild(uiContainer);
            }
            
            this.menuElement = document.getElementById('esc-menu');
            this.settingsElement = document.getElementById('settings-menu');
            this.confirmElement = document.getElementById('confirm-modal');
            this.cursorElement = document.getElementById('custom-cursor');
            this.tooltipElement = document.getElementById('ui-tooltip');
            this.scoreboardElement = document.getElementById('scoreboard');
            
            if (window.TacticalShooter.ScoreboardManager) {
                window.TacticalShooter.ScoreboardManager.init();
            }
            
            this.isMenuOpen = false;
            this.uiHidden = false;
            
            this.initCursor();
            this.injectNewSettingsUI();
            
            if (window.TacticalShooter.SettingsManager) {
                window.TacticalShooter.SettingsManager.init();
                
                // Load Saved Settings via Manager
                const savedStr = localStorage.getItem('ts_settings_string');
                if (savedStr) {
                    console.log("UIManager: Loading saved settings...");
                    window.TacticalShooter.SettingsManager.importSettingsString(savedStr, true);
                } else {
                    this.updateInstructionsDisplay(); 
                    this.applySettingsToDOM(); 
                }
            }
        },
        
        // --- PROXIES FOR SETTINGS MANAGER (Preserves existing API for HTML onclicks) ---
        get tempSettings() { return window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings : {}; },
        get listeningForKey() { return window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.listeningForKey : false; },
        
        switchTab(tab) { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.switchTab(tab); },
        applyPreset(p) { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.applyPreset(p); },
        updateSensitivity(v) { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.updateSensitivity(v); },
        toggleSetting(k, v) { 
            if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.toggleSetting(k, v); 
            this.applySettingsToDOM();
        },
        updateMaxFPS(v) { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.updateMaxFPS(v); },
        updateRenderScale(v) { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.updateRenderScale(v); },
        setGraphicsPreset(m) { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.setGraphicsPreset(m); },
        copyConfigString() { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.copyConfigString(); },
        importSettingsString(s) { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.importSettingsString(s); },
        saveSettings() { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.save(); },
        resetAllSettings() { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.reset(); },
        handleRebind(code) { if(window.TacticalShooter.SettingsManager) window.TacticalShooter.SettingsManager.handleRebind(code); },
        formatKeyName(code) { return window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.formatKeyName(code) : code; },

        injectNewSettingsUI() {
            // ... (Same as before) ...
            // 1. Add Gameplay Tab Button
            const tabHeader = document.querySelector('.settings-tabs');
            if (tabHeader && !document.getElementById('tab-btn-gameplay')) {
                const btn = document.createElement('button');
                btn.id = 'tab-btn-gameplay';
                btn.className = 'tab-btn';
                btn.textContent = 'GAMEPLAY';
                btn.onclick = () => this.switchTab('gameplay');
                tabHeader.appendChild(btn);
            }
            
            // 2. Add Gameplay Content
            const contentArea = document.querySelector('.settings-content');
            if (contentArea && !document.getElementById('tab-gameplay')) {
                const div = document.createElement('div');
                div.id = 'tab-gameplay';
                div.className = 'tab-content';
                div.innerHTML = `
                    <div class="split-view">
                        <div class="split-left">
                            <div class="control-group toggle-row"><span class="setting-label">AUTO RELOAD</span><label class="toggle-switch"><input type="checkbox" id="auto-reload-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('autoReload', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row" data-tooltip="Zoom in while priming grenade"><span class="setting-label">GRENADE THROW ZOOM</span><label class="toggle-switch"><input type="checkbox" id="grenade-zoom-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('grenadeThrowZoom', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row" data-tooltip="Use ADS key to prime grenade. Default: Hold Fire Key"><span class="setting-label">GRENADE USES ADS KEY</span><label class="toggle-switch"><input type="checkbox" id="grenade-ads-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('grenadeUseADS', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row" data-tooltip="Press C to toggle crouch instead of holding"><span class="setting-label">CROUCH TOGGLE</span><label class="toggle-switch"><input type="checkbox" id="crouch-toggle-setting" onchange="window.TacticalShooter.UIManager.toggleSetting('toggleCrouch', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row" data-tooltip="Show predicted grenade path"><span class="setting-label">GRENADE TRAJECTORY</span><label class="toggle-switch"><input type="checkbox" id="trajectory-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('showTrajectory', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row" data-tooltip="Fly an invisible drone instead of noclip"><span class="setting-label">SPECTATE AS FPV DRONE</span><label class="toggle-switch"><input type="checkbox" id="spectate-drone-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('spectateDrone', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row" data-tooltip="A/D Bank, Q/E Yaw, No Self-Level"><span class="setting-label">REALISTIC DRONE CONTROLS</span><label class="toggle-switch"><input type="checkbox" id="realistic-drone-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('realisticDrone', this.checked)"><span class="toggle-slider"></span></label></div>
                        </div>
                    </div>
                `;
                contentArea.appendChild(div);
            }

            // 3. Inject Graphics Presets and Shadow Toggle
            const gfxTab = document.getElementById('tab-graphics');
            if (gfxTab) {
                const leftCol = gfxTab.querySelector('.split-left');
                if (leftCol) {
                    if (!leftCol.querySelector('.presets-row')) {
                        const container = document.createElement('div');
                        container.innerHTML = `
                            <div class="keybinds-header">GRAPHICS PRESETS</div>
                            <div class="presets-row">
                                <button class="preset-btn" onclick="window.TacticalShooter.UIManager.setGraphicsPreset('low')">LOW</button>
                                <button class="preset-btn" onclick="window.TacticalShooter.UIManager.setGraphicsPreset('medium')">MED</button>
                                <button class="preset-btn" onclick="window.TacticalShooter.UIManager.setGraphicsPreset('high')">HIGH</button>
                            </div>
                            <div style="height: 20px; border-bottom: 1px solid #333; margin-bottom: 20px;"></div>
                        `;
                        if (leftCol.firstChild) leftCol.insertBefore(container, leftCol.firstChild);
                        else leftCol.appendChild(container);
                    }
                    if (!document.getElementById('simple-shadows-toggle')) {
                        const shadowRow = document.createElement('div');
                        shadowRow.className = 'control-group toggle-row';
                        shadowRow.setAttribute('data-tooltip', 'Use faster, unfiltered shadows');
                        shadowRow.innerHTML = `<span class="setting-label">SIMPLE SHADOWS (FAST)</span><label class="toggle-switch"><input type="checkbox" id="simple-shadows-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('simpleShadows', this.checked)"><span class="toggle-slider"></span></label>`;
                        leftCol.appendChild(shadowRow);
                    }
                    if (!document.getElementById('reflections-toggle')) {
                        const row = document.createElement('div');
                        row.className = 'control-group toggle-row';
                        row.setAttribute('data-tooltip', 'Real-time reflections (Expensive)');
                        row.innerHTML = `<span class="setting-label">REAL-TIME REFLECTIONS</span><label class="toggle-switch"><input type="checkbox" id="reflections-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('reflectionsEnabled', this.checked)"><span class="toggle-slider"></span></label>`;
                        leftCol.appendChild(row);
                    }
                }
            }
        },
        
        toggleUI() {
            const GM = window.TacticalShooter.GameManager;
            if (!GM || GM.currentState !== 'IN_GAME') return;
            
            // BLOCK IF DRONE ACTIVE
            if (window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.isControllingDrone) return;

            this.uiHidden = !this.uiHidden;
            const warningEl = document.getElementById('ui-hidden-warning');
            const targets = [
                { id: 'hud', display: 'block' },                 
                { id: 'room-code-display', display: 'flex' },    
                { id: 'instructions', display: 'block', checkSetting: true },
                { id: 'game-timer', display: 'block' }
            ];
            targets.forEach(t => {
                const el = document.getElementById(t.id);
                if (!el) return;
                if (this.uiHidden) { el.style.display = 'none'; } 
                else {
                    if (t.checkSetting && this.tempSettings && !this.tempSettings.showControls) { el.style.display = 'none'; } 
                    else { el.style.display = t.display; }
                }
            });
            if (this.uiHidden) {
                if (warningEl) {
                    warningEl.style.display = 'block';
                    const key = window.TacticalShooter.InputManager.getBinding('ToggleUI');
                    const keyName = this.formatKeyName(key);
                    warningEl.textContent = `UI HIDDEN. [${keyName}] TO RESTORE`;
                }
            } else { if (warningEl) warningEl.style.display = 'none'; }
        },
        
        initCursor() {
            document.addEventListener('mousemove', (e) => {
                // Update cursor position regardless of visibility
                if (this.cursorElement) {
                    this.cursorElement.style.left = `${e.clientX}px`;
                    this.cursorElement.style.top = `${e.clientY}px`;
                }
                if (this.tooltipElement && this.tooltipElement.style.display === 'block') {
                    this.tooltipElement.style.left = `${e.clientX}px`;
                    this.tooltipElement.style.top = `${e.clientY}px`;
                }
            });

            document.addEventListener('mouseover', (e) => {
                if (this.cursorElement && e.target.closest('button, input, .toggle-switch, .slider, .keybind-btn')) { 
                    this.cursorElement.classList.add('hover'); 
                }
                const tooltipTarget = e.target.closest('[data-tooltip]');
                if (tooltipTarget && this.tooltipElement) {
                    const text = tooltipTarget.getAttribute('data-tooltip');
                    if (text) { 
                        this.tooltipElement.textContent = text; 
                        this.tooltipElement.style.display = 'block'; 
                    }
                }
            });

            document.addEventListener('mouseout', (e) => {
                if (this.cursorElement && e.target.closest('button, input, .toggle-switch, .slider, .keybind-btn')) { 
                    this.cursorElement.classList.remove('hover'); 
                }
                if (this.tooltipElement) { 
                    this.tooltipElement.style.display = 'none'; 
                }
            });

            document.addEventListener('pointerlockchange', () => {
                this.updateCursorVisibility();
            });
            
            // Check visibility immediately
            this.updateCursorVisibility();
        },
        
        updateCursorVisibility() {
            if (!this.cursorElement) return;
            
            if (document.pointerLockElement) {
                // If locked, hide our fake cursor
                this.cursorElement.style.display = 'none';
                if (this.tooltipElement) this.tooltipElement.style.display = 'none';
            } else {
                // If not locked, show cursor
                // Note: We always show it if not locked, because menus or chat might be open
                // or we are just in the lobby.
                this.cursorElement.style.display = 'block';
            }
        },
        
        // GLOBAL CHECK FOR UI BLOCKING INPUT
        isBlockingInput() {
            if (this.isMenuOpen) return true;
            if (this.settingsElement && this.settingsElement.classList.contains('active')) return true;
            if (this.confirmElement && this.confirmElement.classList.contains('active')) return true;
            const ls = document.getElementById('loadout-screen');
            if (ls && ls.classList.contains('active')) return true;
            const mm = document.getElementById('multiplayer-menu');
            if (mm && mm.style.display !== 'none') return true;
            
            return false;
        },
        
        toggleMenu() { if (this.isMenuOpen) this.closeMenu(); else this.openMenu(); },
        toggleScoreboard(show) { if (window.TacticalShooter.ScoreboardManager) { window.TacticalShooter.ScoreboardManager.toggle(show); } },
        
        openMenu() { 
            if (!this.menuElement) return; 
            
            // Close settings if open to return to main menu
            if (this.settingsElement && this.settingsElement.classList.contains('active')) {
                this.settingsElement.classList.remove('active');
            }

            this.isMenuOpen = true; 
            this.menuElement.classList.add('active'); 
            
            // CUSTOMIZE MENU FOR SPECTATOR vs PLAYER
            const isSpectator = window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.isSpectating;
            const content = this.menuElement.querySelector('.overlay-content');
            if (content) {
                // Clear existing
                content.innerHTML = '';
                
                // 1. BACK TO GAME
                const backBtn = document.createElement('button');
                backBtn.className = 'menu-btn';
                backBtn.textContent = "BACK TO GAME"; 
                backBtn.onclick = () => window.TacticalShooter.UIManager.closeMenu();
                content.appendChild(backBtn);
                
                // 2. SETTINGS
                const setBtn = document.createElement('button');
                setBtn.className = 'menu-btn';
                setBtn.textContent = "SETTINGS";
                setBtn.onclick = () => window.TacticalShooter.UIManager.openSettings();
                content.appendChild(setBtn);
                
                // 3. ACTION BUTTON (Spectator Exit or Player Suicide)
                const actionBtn = document.createElement('button');
                actionBtn.className = 'menu-btn';
                
                if (isSpectator) {
                    // SPECTATOR: EXIT TO MAIN MENU (NO DISCONNECT)
                    actionBtn.textContent = "EXIT SPECTATOR";
                    actionBtn.onclick = () => {
                        window.TacticalShooter.UIManager.closeMenu(true); 
                        
                        // Switch to Menu View (Lobby)
                        if (window.TacticalShooter.GameManager) {
                            window.TacticalShooter.GameManager.enterMenu();
                        }
                        
                        // Show Main Menu UI (Connected State)
                        if (window.TacticalShooter.MultiplayerUI) {
                            window.TacticalShooter.MultiplayerUI.showMainMenu();
                        }
                        
                        if (document.exitPointerLock) document.exitPointerLock();
                    };
                } else {
                    // PLAYER: RETURN TO MENU (Confirm Suicide -> Death Screen -> Main Menu)
                    actionBtn.textContent = "RETURN TO MENU";
                    actionBtn.onclick = () => window.TacticalShooter.UIManager.confirmLeave();
                }
                content.appendChild(actionBtn);
            }

            this.updateCursorVisibility();
            if (document.pointerLockElement) document.exitPointerLock(); 
        },
        
        closeMenu(stayUnlocked = false) { 
            if (!this.menuElement) return; 
            this.isMenuOpen = false; 
            this.menuElement.classList.remove('active'); 
            this.settingsElement.classList.remove('active'); 
            this.confirmElement.classList.remove('active'); 
            const mm = document.getElementById('multiplayer-menu'); 
            if (mm) mm.classList.remove('blurred'); 
            if (this.tooltipElement) this.tooltipElement.style.display = 'none'; 
            
            // Only relock if requested and CHAT IS NOT OPEN and NO OTHER UI BLOCKS
            const isChatOpen = window.TacticalShooter.ChatSystem && window.TacticalShooter.ChatSystem.isOpen;
            if (!stayUnlocked && !isChatOpen && !this.isBlockingInput()) {
                const canvas = document.getElementById('game-canvas'); 
                if (canvas) { 
                    const isMenuMode = window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.isMenuMode; 
                    if (!isMenuMode) canvas.requestPointerLock(); 
                } 
            }
            
            // Sync Chat
            if (window.TacticalShooter.ChatSystem) window.TacticalShooter.ChatSystem.updateVisibility();
        },
        
        confirmLeave() { if (this.confirmElement) { this.menuElement.classList.remove('active'); this.confirmElement.classList.add('active'); } },
        closeConfirm() { if (this.confirmElement) { this.confirmElement.classList.remove('active'); this.menuElement.classList.add('active'); } },
        
        finalizeLeave() { 
            const PS = window.TacticalShooter.PlayerState;
            // Spectator: Instant exit to menu
            if (PS && PS.isSpectating) {
                this.closeConfirm();
                this.closeMenu(true);
                if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.enterMenu();
                if (window.TacticalShooter.MultiplayerUI) window.TacticalShooter.MultiplayerUI.showMainMenu();
                if (document.exitPointerLock) document.exitPointerLock();
                return;
            }
            
            // Player: Suicide Action (Resets to Main Menu eventually via death cam)
            if (PS) {
                const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                // Force fatal damage, pass own ID as source to tag as suicide
                PS.takeDamage(10000, myId, 'Torso');
                // Short death cam for manual exit
                PS.deathTimer = 0.5;
            }
            this.closeConfirm();
            this.closeMenu();
        },
        
        showNotification(message, type = 'blue') { const container = document.getElementById('notification-area'); if (!container) return; const toast = document.createElement('div'); let className = `notification-toast`; if (type === 'blue' || type === 'red') className += ` ${type}`; toast.className = className; if (type.startsWith('#')) toast.style.borderLeftColor = type; toast.innerHTML = `<span style="letter-spacing: 1px;">${message}</span><button onclick="this.parentElement.remove()" style="background:none; border:none; color:#666; cursor:none; font-weight:bold; font-size:14px;">×</button>`; container.appendChild(toast); setTimeout(() => { if (toast.parentElement) { toast.style.transition = 'opacity 0.5s'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); } }, 4000); },
        
        openSettings() {
            if (!this.settingsElement) return;
            const mm = document.getElementById('multiplayer-menu');
            if (mm && mm.style.display !== 'none') mm.classList.add('blurred');
            
            // Close ESC menu if it was open to avoid double overlay
            this.menuElement.classList.remove('active');
            
            this.settingsElement.classList.add('active');
            this.isMenuOpen = true; // Still conceptually in a menu state

            this.updateCursorVisibility();
            if (document.pointerLockElement) document.exitPointerLock();
            
            // Sync Chat
            if (window.TacticalShooter.ChatSystem) window.TacticalShooter.ChatSystem.updateVisibility();
            
            if (window.TacticalShooter.SettingsManager) {
                window.TacticalShooter.SettingsManager.open();
            }
        },
        
        navigateBack() {
            if (!this.settingsElement) return;
            this.settingsElement.classList.remove('active');
            
            // Sync Chat
            if (window.TacticalShooter.ChatSystem) window.TacticalShooter.ChatSystem.updateVisibility();

            const gm = window.TacticalShooter.GameManager;
            if (gm && gm.currentState === 'MENU') {
                // If in Lobby, just close settings and remove blur
                const mm = document.getElementById('multiplayer-menu');
                if (mm) mm.classList.remove('blurred');
                this.isMenuOpen = false;
            } else {
                // If in game, go back to main ESC menu
                this.openMenu();
            }
        },
        
        closeSettings() {
            // Same as navigateBack but forces closure
            if (!this.settingsElement) return;
            this.settingsElement.classList.remove('active');
            const mm = document.getElementById('multiplayer-menu');
            if (mm) mm.classList.remove('blurred');
            this.closeMenu(); 
        },

        applySettingsToDOM() {
            if (!this.tempSettings) return;
            const instructions = document.getElementById('instructions');
            if (instructions) instructions.style.display = this.tempSettings.showControls ? 'block' : 'none';
            const fpsDisplay = document.getElementById('fps-display');
            if (fpsDisplay) fpsDisplay.style.display = 'block';
            if (window.TacticalShooter.config) window.TacticalShooter.config.showNametags = this.tempSettings.showNametags;
            
            // Sync Chat Visibility
            if (window.TacticalShooter.ChatSystem) {
                window.TacticalShooter.ChatSystem.updateVisibility();
            }

            this.updateInstructionsDisplay();
        },
        
        updateInstructionsDisplay() {
            if (!this.tempSettings) return;
            const el = document.getElementById('instructions');
            if (!el) return;
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.isMenuMode) { el.style.display = 'none'; return; }
            if (!this.tempSettings.showControls) { el.style.display = 'none'; return; } else { el.style.display = 'block'; }
            const b = window.TacticalShooter.InputManager.bindings;
            const fmt = this.formatKeyName;
            const k = (code) => code ? fmt(code) : '?';
            el.innerHTML = `${k(b.Forward)}${k(b.Left)}${k(b.Backward)}${k(b.Right)} - MOVE | ${k(b.Jump)} - JUMP | ${k(b.Crouch)} - CROUCH | ${k(b.Prone)} - PRONE<br>${k(b.Sprint)} - SPRINT | ${k(b.ADS)} - ADS<br>${k(b.LeanLeft)} / ${k(b.LeanRight)} - LEAN | ${k(b.FreeCursor)} - FREE CURSOR<br>${k(b.Reload)} - RELOAD | ${k(b.Shoot)} - SHOOT | ${k(b.Inspect)} - INSPECT<br>ESC - MENU | TAB - SCOREBOARD`;
        },
        
        isUIActive() { return this.isMenuOpen; }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.UIManager = UIManager;
})();
