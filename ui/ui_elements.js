
// js/ui/ui_elements.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.UIElements = {
        getHTML() {
            return `
    <!-- Transition Overlay (Fade to Black) -->
    <div id="transition-overlay"></div>
    
    <div id="custom-cursor"></div>
    <div id="ui-tooltip"></div>
    
    <div id="ui-hidden-warning" style="display:none; position:fixed; top:10px; left:10px; font-family:'Rajdhani',sans-serif; color:rgba(255,255,255,0.4); font-size:12px; font-weight:600; text-transform:uppercase; z-index:9000; pointer-events:none;"></div>
    
    <!-- AIRSTRIKE ALERT (Red Hazard Stripes Only - REDUCED HEIGHT, NO BORDER) -->
    <div id="airstrike-alert">
         <div id="as-content"></div>
    </div>
    
    <style>
        #airstrike-alert {
            display: none; /* Flex when active */
            position: fixed;
            top: 20%;
            left: 0;
            width: 100%;
            height: 40px; /* Reduced Height */
            z-index: 5500;
            pointer-events: none;
            justify-content: center;
            align-items: center;
            
            /* Thinner, lighter stripes */
            background: repeating-linear-gradient(
                -45deg,
                rgba(200, 0, 0, 0.3),
                rgba(200, 0, 0, 0.3) 10px,
                transparent 10px,
                transparent 20px
            );
            
            border: none; 
            
            /* Fast Scroll Animation */
            background-size: 200% 100%;
            animation: stripeScroll 2s linear infinite;
            
            /* Sudden Appearance */
            opacity: 0;
            transform: scaleY(0);
            transition: opacity 0.1s, transform 0.1s;
            
            /* Removed Box Shadow */
            box-shadow: none; 
        }
        
        #airstrike-alert.active {
            opacity: 1;
            transform: scaleY(1);
        }

        @keyframes stripeScroll {
            0% { background-position: 0 0; }
            100% { background-position: 28px 0; } /* Adjusted for new stripe width */
        }

        #as-content {
            font-family: 'Teko', sans-serif;
            font-size: 32px; /* Smaller Text */
            font-weight: 500 !important; /* Enforce consistent weight */
            color: #fff;
            letter-spacing: 4px;
            text-transform: uppercase;
            line-height: 1;
            /* Consistent subtle glow for all states */
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }
        
        /* Timer Style override (When RED) */
        #as-content.as-timer {
            color: #ff3333 !important; 
            /* Identical weight to white text to prevent jumping */
            font-weight: 500 !important; 
            /* Red glow, same intensity */
            text-shadow: 0 0 10px rgba(255, 50, 50, 0.4);
        }
    </style>

    <!-- DRONE HUD -->
    <div id="drone-hud">
        <div id="drone-overlay-static"></div>
        <div id="drone-horizon-container">
            <div class="drone-horizon-line"></div>
        </div>
        <div id="drone-reticle-group">
            <div class="drone-corner tl"></div>
            <div class="drone-corner tr"></div>
            <div class="drone-corner bl"></div>
            <div class="drone-corner br"></div>
        </div>
        <div id="drone-crosshair"></div>
        <div id="drone-fpv-marker"></div> 
        <div id="drone-bar-fuel" class="drone-telemetry-bar">
            <div class="drone-bar-fill" id="drone-fuel-fill" style="height: 100%;"></div>
            <div class="drone-bar-label">BATT</div>
        </div>
        <div id="drone-bar-hp" class="drone-telemetry-bar">
            <div class="drone-bar-fill" id="drone-hp-fill" style="height: 100%;"></div>
            <div class="drone-bar-label">HP</div>
        </div>
        <div id="drone-controls-prompt">[SPACEBAR] to manually detonate</div>
        <div id="drone-sub-prompt" style="display:none; position: absolute; bottom: 22%; left: 50%; transform: translateX(-50%); font-size: 10px; color: #888; letter-spacing: 1px; text-shadow: 0 0 2px rgba(0,0,0,0.8);">Spectate as FPV drone on in settings</div>
    </div>

    <div id="game-timer">00:00</div>
    <div id="pre-round-timer" style="display:none;">MATCH STARTS IN 10</div>
    <div id="killfeed-container"></div>
    <div id="hitmarker-container"></div>
    <div id="damage-indicator-container"></div>
    <div id="score-feed-container"></div>
    <div id="ammo-feed-container"></div>
    <div id="scorestreak-banner">
        <div class="ss-banner-bg">
            <div class="ss-banner-text" id="ss-text">SCORESTREAK READY</div>
        </div>
        <div class="ss-banner-sub" id="ss-sub">PRESS [7]</div>
    </div>
    <div id="interaction-prompt">
        <div class="progress-circle-container">
             <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="18" fill="none" stroke="#333" stroke-width="3"/>
                <circle id="interact-progress" cx="20" cy="20" r="18" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="113" stroke-dashoffset="113" transform="rotate(-90 20 20)"/>
             </svg>
             <span id="interact-key" class="key">F</span>
        </div>
        <span id="interact-action" class="action">INTERACT</span>
    </div>
    <div id="chat-container">
        <div id="chat-messages"></div>
        <div id="chat-divider"></div>
        <div id="chat-input-row">
            <span id="chat-channel-label">[ALL]</span>
            <input type="text" id="chat-input" maxlength="128" autocomplete="off" spellcheck="false" placeholder="> ENTER to chat">
        </div>
    </div>
    <div id="crosshair">
        <div class="crosshair-line crosshair-h"></div>
        <div class="crosshair-line crosshair-v"></div>
    </div>
    <div id="grenade-charge-container" style="position: fixed; top: 55%; left: 50%; transform: translate(-50%, -50%); width: 100px; height: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); border-radius: 3px; display: none; pointer-events: none; z-index: 12;">
        <div id="grenade-charge-fill" style="width: 0%; height: 100%; background: #ffaa00; box-shadow: 0 0 5px rgba(255, 170, 0, 0.8); transition: width 0.05s linear;"></div>
    </div>
    <div id="hud">
        <div id="ammo-display">15 <span class="ammo-reserve">/ 90</span></div>
        <div id="player-status">
            <div id="player-name-display" style="display:none;">OPERATOR</div>
            <div id="health-track">
                <div id="health-damage"></div>
                <div id="health-fill"></div>
                <div class="health-segment" style="left: 25%"></div>
                <div class="health-segment" style="left: 50%"></div>
                <div class="health-segment" style="left: 75%"></div>
            </div>
        </div>
        <div id="ingame-loadout-picker">
            <div style="font-family: 'Rajdhani', sans-serif; font-size: 12px; color: #888; text-align: left; margin-bottom: 5px; letter-spacing: 1px; padding-left: 5px;">SWITCH LOADOUT WITH KEYS 1-5</div>
            <div id="ilp-list"></div>
        </div>
    </div>
    <div id="room-code-display" style="display:none;">
        <span class="code-label">CODE:</span> <span class="code-value" id="room-code-value">----</span>
    </div>
    <div id="scoreboard">
        <div class="scoreboard-info">
            <div id="sb-mode">GAME MODE</div>
            <div id="sb-timer">00:00</div>
            <div id="sb-map">on MAP NAME</div>
        </div>
        <div id="sb-status-container"></div>
        <div id="scoreboard-content"></div>
    </div>
    <div id="fps-display">FPS: 0</div>
    <div id="notification-area"></div>
    <div id="instructions"></div>
    <div id="pointer-lock-overlay"></div>
    <div id="death-cam-overlay" class="overlay-nobg" style="display:none; pointer-events:none; flex-direction:column; justify-content:flex-end; padding-bottom: 100px; z-index: 6000;">
        <div class="kia-title" style="font-size: 80px; color: #ff3333; margin-bottom: 5px; font-family: 'Teko', sans-serif; letter-spacing: 5px; text-shadow: 0 0 30px rgba(255,0,0,0.4);">KIA</div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px;">
            <span id="death-label" style="font-family: 'Rajdhani', sans-serif; font-size: 24px; color: #888; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">KILLED BY:</span>
            <span id="death-killer-name" style="font-family: 'Teko', sans-serif; font-size: 56px; color: #fff; text-transform: uppercase; line-height: 1; text-shadow: 0 0 10px rgba(255,255,255,0.2);">UNKNOWN</span>
        </div>
        <div style="font-family: 'Rajdhani', sans-serif; font-size: 18px; color: #aaa; margin-top: 10px; letter-spacing: 2px;">[SPACE] TO SKIP</div>
    </div>
    <div id="deployment-loadout-container" style="display:none;"></div>
    <div id="post-game-screen" class="deployment-overlay" style="z-index: 6500; display: none;">
        <div class="deployment-info" style="font-family: 'Teko', sans-serif; font-size: 64px; color: #fff; letter-spacing: 4px; margin-bottom: 20px;">
            MATCH ENDED
        </div> 
        <div class="deployment-controls">
            <button id="btn-return-lobby" class="btn-endgame" style="background: linear-gradient(180deg, #444, #222); border: 1px solid #888; color: #fff; padding: 15px 50px; font-size: 28px; letter-spacing: 2px; font-family: 'Teko', sans-serif; cursor: pointer; text-transform: uppercase;" onclick="window.TacticalShooter.MatchState.resetToLobby()">BACK TO MENU</button>
        </div>
    </div>
    <div id="esc-menu" class="overlay" style="z-index: 6000;">
        <div class="overlay-panel">
            <div class="overlay-header"><span class="overlay-title">MENU</span></div>
            <div class="overlay-content"></div>
        </div>
    </div>
    <div id="confirm-modal" class="overlay" style="z-index: 7000;">
        <div class="confirm-ribbon-panel">
            <div class="confirm-text">DIE AND RETURN TO MENU?</div>
            <div class="confirm-actions">
                <button class="menu-btn small" onclick="window.TacticalShooter.UIManager.closeConfirm()">CANCEL</button>
                <button class="menu-btn small danger" onclick="window.TacticalShooter.UIManager.finalizeLeave()">DIE</button>
            </div>
        </div>
    </div>

    <!-- SETTINGS MENU -->
    <div id="settings-menu" class="overlay" style="z-index: 6000;">
        <div class="settings-panel">
            <div class="settings-header">
                <div class="back-arrow" onclick="window.TacticalShooter.UIManager.navigateBack()">&#8592;</div>
                <div class="settings-tabs">
                    <button id="tab-btn-controls" class="tab-btn active" onclick="window.TacticalShooter.UIManager.switchTab('controls')">CONTROLS</button>
                    <button id="tab-btn-graphics" class="tab-btn" onclick="window.TacticalShooter.UIManager.switchTab('graphics')">GRAPHICS</button>
                    <button id="tab-btn-hud" class="tab-btn" onclick="window.TacticalShooter.UIManager.switchTab('hud')">HUD</button>
                    <button id="tab-btn-gameplay" class="tab-btn" onclick="window.TacticalShooter.UIManager.switchTab('gameplay')">GAMEPLAY</button>
                </div>
                <button class="reset-settings-btn" onclick="window.TacticalShooter.UIManager.resetAllSettings()">RESET DEFAULTS</button>
            </div>
            <div class="settings-content">
                
                <!-- 1. CONTROLS TAB -->
                <div id="tab-controls" class="tab-content active" style="height:100%;">
                    <div class="split-view">
                        <div class="split-left">
                             <div class="keybinds-header">CONTROL PRESETS</div>
                             <div class="presets-row">
                                 <button class="preset-btn" onclick="window.TacticalShooter.UIManager.applyPreset('trackpad')">TRACKPAD</button>
                                 <button class="preset-btn" onclick="window.TacticalShooter.UIManager.applyPreset('mouse')">MOUSE</button>
                             </div>
                             <div style="height: 20px; border-bottom: 1px solid #333; margin-bottom: 20px;"></div>
                             <div class="control-group slider-container">
                                 <div class="slider-header"><span class="setting-label">MOUSE SENSITIVITY</span><span class="setting-value" id="sens-value">0.005</span></div>
                                 <input type="range" min="0.0001" max="0.01" step="0.0001" id="sensitivity-slider" class="slider" oninput="window.TacticalShooter.UIManager.updateSensitivity(this.value)">
                             </div>
                        </div>
                        <div class="split-divider"></div>
                        <div class="split-right">
                            <div class="keybinds-header">KEYBINDS</div>
                            <div id="keybinds-list" class="keybinds-container"></div>
                        </div>
                    </div>
                </div>

                <!-- 2. GRAPHICS TAB -->
                <div id="tab-graphics" class="tab-content">
                    <div class="split-view">
                        <div class="split-left">
                            <div class="keybinds-header">GRAPHICS PRESETS</div>
                            <div class="presets-row">
                                <button class="preset-btn" onclick="window.TacticalShooter.UIManager.setGraphicsPreset('low')">LOW</button>
                                <button class="preset-btn" onclick="window.TacticalShooter.UIManager.setGraphicsPreset('medium')">MED</button>
                                <button class="preset-btn" onclick="window.TacticalShooter.UIManager.setGraphicsPreset('high')">HIGH</button>
                            </div>
                            <div style="height: 20px; border-bottom: 1px solid #333; margin-bottom: 20px;"></div>
                            
                            <div class="control-group toggle-row" data-tooltip="affects magazines and bullet casings"><span class="setting-label">GUN PARTICLES</span><label class="toggle-switch"><input type="checkbox" id="casings-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('casingsEnabled', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row" data-tooltip="affects muzzle flash and hit particles"><span class="setting-label">DYNAMIC WEAPON LIGHTING</span><label class="toggle-switch"><input type="checkbox" id="muzzleflash-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('muzzleFlashEnabled', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row" data-tooltip="(experimental)"><span class="setting-label">PLAYER MODEL</span><label class="toggle-switch"><input type="checkbox" id="body-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('bodyEnabled', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row"><span class="setting-label">SIMPLE SHADOWS (FAST)</span><label class="toggle-switch"><input type="checkbox" id="simple-shadows-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('simpleShadows', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row"><span class="setting-label">REAL-TIME REFLECTIONS</span><label class="toggle-switch"><input type="checkbox" id="reflections-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('reflectionsEnabled', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row"><span class="setting-label">ENV. ABERRATION</span><label class="toggle-switch"><input type="checkbox" id="ca-fx-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('chromaticAberrationEffects', this.checked)"><span class="toggle-slider"></span></label></div>
                        </div>
                        <div class="split-divider"></div>
                        <div class="split-right">
                             <div class="control-group slider-container" id="max-fps-container" data-tooltip="limited by browser refresh rate">
                                <div class="slider-header"><span><span class="setting-label">MAX FRAMERATE</span><span style="font-size: 10px; color: #555; margin-left: 5px; text-transform: none;">(refresh rate dependent)</span></span><span id="max-fps-value" class="setting-value">UNLIMITED</span></div>
                                <input type="range" min="30" max="250" step="10" value="250" class="slider" id="max-fps-slider" oninput="window.TacticalShooter.UIManager.updateMaxFPS(this.value)">
                            </div>
                            <div class="control-group slider-container" id="render-scale-container" data-tooltip="Lower for better performance on slow devices">
                                <div class="slider-header">
                                    <span class="setting-label">RENDER SCALE</span>
                                    <span id="render-scale-value" class="setting-value">100%</span>
                                </div>
                                <input type="range" min="10" max="100" step="5" value="100" class="slider" id="render-scale-slider" oninput="window.TacticalShooter.UIManager.updateRenderScale(this.value)">
                            </div>
                            <div class="control-group slider-container">
                                <div class="slider-header"><span class="setting-label">BASE ABERRATION</span><span class="setting-value" id="ca-value">0</span></div>
                                <input type="range" min="0" max="0.01" step="0.0005" id="ca-slider" class="slider" oninput="window.TacticalShooter.UIManager.updateChromaticAberration(this.value)">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. GAMEPLAY TAB (VERTICAL SPLIT) -->
                <div id="tab-gameplay" class="tab-content">
                    
                    <!-- MAIN VIEW -->
                    <div id="gameplay-main" class="split-view">
                        <div class="split-left" style="display:flex; flex-direction:column; gap:10px;">
                            <button class="preset-btn" onclick="window.TacticalShooter.SettingsManager.openSubMenu('sub-menu-grenade')" style="padding: 8px 5px; flex: initial;">GRENADE SETTINGS</button>
                            <button class="preset-btn" onclick="window.TacticalShooter.SettingsManager.openSubMenu('sub-menu-drone')" style="padding: 8px 5px; flex: initial;">DRONE SETTINGS</button>
                        </div>
                        <div class="split-divider"></div>
                        <div class="split-right">
                             <div class="control-group toggle-row"><span class="setting-label">AUTO RELOAD</span><label class="toggle-switch"><input type="checkbox" id="auto-reload-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('autoReload', this.checked)"><span class="toggle-slider"></span></label></div>
                            <div class="control-group toggle-row" data-tooltip="Press C to toggle crouch instead of holding"><span class="setting-label">CROUCH TOGGLE</span><label class="toggle-switch"><input type="checkbox" id="crouch-toggle-setting" onchange="window.TacticalShooter.UIManager.toggleSetting('toggleCrouch', this.checked)"><span class="toggle-slider"></span></label></div>
                        </div>
                    </div>

                    <!-- GRENADE SUBMENU -->
                    <div id="sub-menu-grenade" class="sub-menu-screen" style="display:none; height:100%;">
                        <button class="ls-back-btn" onclick="window.TacticalShooter.SettingsManager.closeSubMenu()" style="margin-bottom:20px;">&#8592; BACK</button>
                        <div class="control-group toggle-row" data-tooltip="Zoom in while priming grenade"><span class="setting-label">GRENADE THROW ZOOM</span><label class="toggle-switch"><input type="checkbox" id="grenade-zoom-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('grenadeThrowZoom', this.checked)"><span class="toggle-slider"></span></label></div>
                        <div class="control-group toggle-row" data-tooltip="Use ADS key to prime grenade. Default: Hold Fire Key"><span class="setting-label">GRENADE USES ADS KEY</span><label class="toggle-switch"><input type="checkbox" id="grenade-ads-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('grenadeUseADS', this.checked)"><span class="toggle-slider"></span></label></div>
                        <div class="control-group toggle-row" data-tooltip="Show predicted grenade path"><span class="setting-label">GRENADE TRAJECTORY</span><label class="toggle-switch"><input type="checkbox" id="trajectory-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('showTrajectory', this.checked)"><span class="toggle-slider"></span></label></div>
                    </div>

                    <!-- DRONE SUBMENU -->
                    <div id="sub-menu-drone" class="sub-menu-screen" style="display:none; height:100%; overflow-y:auto;">
                        <button class="ls-back-btn" onclick="window.TacticalShooter.SettingsManager.closeSubMenu()" style="margin-bottom:20px;">&#8592; BACK</button>
                        
                        <div class="control-group toggle-row" data-tooltip="Fly an invisible drone instead of noclip"><span class="setting-label">SPECTATE AS FPV DRONE</span><label class="toggle-switch"><input type="checkbox" id="spectate-drone-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('spectateDrone', this.checked)"><span class="toggle-slider"></span></label></div>
                        <div class="control-group toggle-row" data-tooltip="Manual Pitch/Roll control. Disables auto-level."><span class="setting-label">REALISTIC DRONE CONTROLS</span><label class="toggle-switch"><input type="checkbox" id="realistic-drone-toggle" onchange="window.TacticalShooter.UIManager.toggleSetting('realisticDrone', this.checked)"><span class="toggle-slider"></span></label></div>
                        
                        <div class="control-group slider-container" style="margin-top:10px;">
                            <div class="slider-header"><span class="setting-label">DRONE MOUSE SENSITIVITY</span><span class="setting-value" id="drone-sens-value">1.0x</span></div>
                            <input type="range" min="0.1" max="5.0" step="0.1" id="drone-sens-slider" class="slider" oninput="window.TacticalShooter.SettingsManager.updateDroneSensitivity(this.value)">
                        </div>
                        
                        <style> .dimmed { opacity: 0.3; pointer-events: none; filter: grayscale(1); } </style>

                        <div class="split-view" style="margin-top:20px;">
                            <div class="split-left" id="drone-standard-controls">
                                <div class="keybinds-header">STANDARD CONTROLS</div>
                                <div id="drone-binds-std" class="keybinds-container"></div>
                            </div>
                            <div class="split-divider"></div>
                            <div class="split-right dimmed" id="drone-realistic-controls">
                                <div class="keybinds-header">REALISTIC CONTROLS</div>
                                <div class="control-group slider-container" style="margin-bottom:10px;">
                                    <div class="slider-header"><span class="setting-label">ROLL SENSITIVITY</span><span class="setting-value" id="drone-roll-value">1.0x</span></div>
                                    <input type="range" min="0.1" max="5.0" step="0.1" id="drone-roll-slider" class="slider" oninput="window.TacticalShooter.SettingsManager.updateDroneRoll(this.value)">
                                </div>
                                <div id="drone-binds-real" class="keybinds-container"></div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
            <div class="settings-footer">
                <div class="config-io-container">
                    <input type="text" id="config-string" readonly placeholder="CONFIG STRING WILL APPEAR HERE" onclick="this.select()">
                    <button class="footer-btn" onclick="window.TacticalShooter.UIManager.copyConfigString()">COPY</button>
                    <button class="footer-btn" onclick="window.TacticalShooter.UIManager.importSettingsString(document.getElementById('config-string').value)">IMPORT</button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="footer-btn" onclick="window.TacticalShooter.UIManager.closeSettings()">CANCEL</button>
                    <button class="footer-btn save-btn" onclick="window.TacticalShooter.UIManager.saveSettings()">APPLY & SAVE</button>
                </div>
            </div>
        </div>
    </div>
            `;
        }
    };
})();
