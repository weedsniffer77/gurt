

// js/multiplayer/multiplayer_ui.js
(function() {
    const MultiplayerUI = {
        overlayId: 'multiplayer-menu',
        unifiedBrowserId: 'unified-browser',
        
        isMatchmaking: false,
        joinAttemptInProgress: false, 
        isConnected: false,
        
        activeDropdown: null,
        customLobbySettings: {
            map: "WAREHOUSE",
            mode: "TDM",
            time: "10"
        },
        
        _matchmakeTimeout: null,
        _refreshInterval: null,

        init() {
            console.log('MultiplayerUI: Initializing Interface...');
            this.createOverlay();
            this.setHUDVisible(false);
            if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.setMenuMode(true);
            document.addEventListener('click', (e) => {
                const trigger = e.target.closest('.custom-select-trigger');
                const options = e.target.closest('.custom-options');
                if (!trigger && !options) this.closeAllDropdowns();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const overlay = document.getElementById(this.overlayId);
                    if (overlay && overlay.style.display !== 'none') {
                        const activeEl = document.activeElement;
                        const nameInput = document.getElementById('player-name-input');
                        const joinInput = document.getElementById('cl-join-code');
                        if (activeEl === nameInput) { nameInput.blur(); this.syncName(nameInput.value); return; }
                        if (activeEl === joinInput) { this.joinCustomMatch(); return; }
                    }
                }
                if (e.code === 'Space' || e.key === ' ') {
                    // BLOCK SPACEBAR DEPLOY IF BROWSER IS OPEN
                    const browser = document.getElementById(this.unifiedBrowserId);
                    if (browser && browser.style.display !== 'none') return;

                    const overlay = document.getElementById(this.overlayId);
                    if (overlay && overlay.style.display !== 'none') {
                        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
                        e.preventDefault(); this.handleDeploy();
                    }
                }
            });
            if (this._refreshInterval) clearInterval(this._refreshInterval);
            this._refreshInterval = setInterval(() => {
                const overlay = document.getElementById(this.overlayId);
                if (window.TacticalShooter.TeamSelector && overlay && overlay.style.display !== 'none') {
                    window.TacticalShooter.TeamSelector.render('mp-teams-container');
                }
            }, 500);
            
            const PM = window.TacticalShooter.PlayroomManager;
            const pendingHost = sessionStorage.getItem('ts_pending_host');
            
            if (PM && PM.requestedRoomCode) {
                this.updateLoadingText("JOINING ROOM...");
                const code = PM.requestedRoomCode;
                PM.requestedRoomCode = null;
                if (localStorage.getItem('ts_username')) {
                    const nameEl = document.getElementById('player-name-input');
                    if (nameEl) nameEl.value = localStorage.getItem('ts_username');
                }
                setTimeout(() => this.joinLobby(code), 10);
            }
            else if (pendingHost) {
                this.updateLoadingText("CREATING MATCH...");
                try {
                    const settings = JSON.parse(pendingHost);
                    sessionStorage.removeItem('ts_pending_host');
                    // Ensure local settings match pending
                    this.customLobbySettings = settings;
                    if (localStorage.getItem('ts_username')) {
                         const nameEl = document.getElementById('player-name-input');
                         if (nameEl) nameEl.value = localStorage.getItem('ts_username');
                    }
                    // Wait slightly for system init
                    setTimeout(() => this.hostCustomMatch(), 100);
                } catch(e) {
                    this.hideLoadingScreen();
                }
            } 
            else {
                setTimeout(() => this.autoMatchmake(), 10);
            }
        },

        updateLoadingText(text) {
            const el = document.getElementById('loading-screen');
            if (el) { el.style.transition = 'none'; el.style.opacity = '1'; el.style.display = 'flex'; el.textContent = text; }
        },

        hideLoadingScreen() {
            const el = document.getElementById('loading-screen');
            if (el) { el.style.transition = 'opacity 0.5s ease'; void el.offsetWidth; el.style.opacity = '0'; setTimeout(() => { el.style.display = 'none'; }, 500); }
        },

        createOverlay() {
            const existing = document.getElementById(this.overlayId);
            if (existing) existing.remove();
            const existingBrowser = document.getElementById(this.unifiedBrowserId);
            if (existingBrowser) existingBrowser.remove();
            const oldLS = document.getElementById('loadout-screen');
            if (oldLS) oldLS.remove();
            const savedName = localStorage.getItem('ts_username') || "";

            const overlay = document.createElement('div');
            overlay.id = this.overlayId;
            overlay.className = 'active'; 
            overlay.style.position = 'fixed'; overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100vw'; overlay.style.height = '100vh';
            overlay.style.zIndex = '3000'; overlay.style.background = 'transparent'; overlay.style.display = 'block'; 
            
            const rowHeight = '40px';
            const commonStyle = `height: ${rowHeight}; padding: 0 10px; font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 600; border: 1px solid #444; background: rgba(0,0,0,0.8); color: #fff; box-sizing: border-box; outline: none; visibility: visible; text-align: center;`;
            const deployBtnStyle = `height: 50px; border: 1px solid #444; cursor: pointer; text-transform: uppercase; font-family: 'Teko', sans-serif; font-weight: 400; font-size: 28px; letter-spacing: 2px; color: #ccc; transition: all 0.2s; background: linear-gradient(180deg, #333, #111); display: flex; align-items: center; justify-content: center; box-sizing: border-box; margin: 0; pointer-events: auto; clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);`;

            overlay.innerHTML = `
                <div id="mp-menu-layer" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;">
                    <div id="mp-teams-container" style="position: absolute; top: 270px; bottom: 220px; left: 20px; display: flex; flex-direction: column; justify-content: flex-start; gap: 15px; pointer-events: auto;"></div>
                </div>
                <div id="menu-loadout-quick-select" style="position: absolute; bottom: 30px; left: 30px; width: auto; min-width: 300px; display: flex; flex-direction: column; gap: 2px; z-index: 3005; transform: scale(0.7); transform-origin: bottom left;"></div>
                <div style="position: absolute; bottom: 30px; right: 30px; width: 300px; display: flex; flex-direction: column; gap: 10px; z-index: 3005; align-items: stretch;">
                    <input type="text" id="player-name-input" placeholder="USERNAME" value="${savedName}" maxlength="16" autocomplete="off" style="${commonStyle} border-bottom: 2px solid #fff; text-transform: none; color: #ccc; font-weight: 400;">
                    <button id="btn-deploy" style="${deployBtnStyle}" disabled>DEPLOY</button>
                </div>
                <div style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 3005; display: flex; gap: 15px; align-items: center;">
                    <button id="main-menu-settings-btn" class="holo-btn" style="width: 50px; height: 50px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 28px; line-height: 1; padding-top: 4px; padding-left: 3px; color: #ffffff; clip-path: none; border: 1px solid rgba(255,255,255,0.2);">⚙</button>
                    <button id="btn-open-lobbies" class="holo-btn" style="width: 200px; height: 50px; display: flex; align-items: center; justify-content: center;">LOBBIES</button>
                    <button onclick="window.TacticalShooter.LoadoutUI.open()" class="holo-btn" style="width: 200px; height: 50px; display: flex; align-items: center; justify-content: center;">LOADOUT</button>
                    <button id="btn-spectate" class="holo-btn" style="width: 200px; height: 50px; display: flex; align-items: center; justify-content: center;">SPECTATE</button>
                </div>
                <div id="${this.unifiedBrowserId}" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 3500; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px);">
                   <div class="browser-wrapper">
                        <div class="browser-list-section">
                            <div class="browser-list-controls">
                                <button class="ls-back-btn" id="btn-close-browser"><span class="ls-back-symbol">&#8592;</span> BACK</button>
                                <button class="browser-refresh-btn" id="btn-refresh-browser">REFRESH ⟳</button>
                            </div>
                            <div class="browser-list-header"><div>HOST</div><div>MAP</div><div>MODE</div><div>PLAYERS</div><div>CODE</div><div style="text-align:right"></div></div>
                            <div class="browser-list-body" id="lobby-list-content"><div style="text-align:center; color:#666; margin-top: 50px;">LOADING...</div></div>
                        </div>
                        <div class="browser-sidebar">
                            <div class="sidebar-section">
                                <div class="sidebar-title">CREATE LOBBY</div>
                                <div class="sidebar-control">
                                    <div class="sidebar-label">MAP</div>
                                    <div class="custom-select-container" id="cl-dd-map" style="width:100%;">
                                        <div class="custom-select-trigger" onclick="window.TacticalShooter.MultiplayerUI.toggleCLDropdown(event, 'cl-dd-map')">
                                            <span id="cl-display-map" data-val="WAREHOUSE">WAREHOUSE</span>
                                        </div>
                                        <div class="custom-options">
                                            <div class="custom-option selected" onclick="window.TacticalShooter.MultiplayerUI.selectCLOption('map', 'WAREHOUSE', 'WAREHOUSE')">WAREHOUSE</div>
                                            <div class="custom-option" onclick="window.TacticalShooter.MultiplayerUI.selectCLOption('map', 'WAREHOUSE_NIGHT', 'WAREHOUSE (NIGHT)')">WAREHOUSE (NIGHT)</div>
                                            <div class="custom-option" onclick="window.TacticalShooter.MultiplayerUI.selectCLOption('map', 'CONTAINERS', 'RECTANGLES')">RECTANGLES</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="sidebar-control"><div class="sidebar-label">MODE</div><div class="custom-select-container" id="cl-dd-mode" style="width:100%;"><div class="custom-select-trigger" onclick="window.TacticalShooter.MultiplayerUI.toggleCLDropdown(event, 'cl-dd-mode')"><span id="cl-display-mode" data-val="TDM">TEAM DEATHMATCH</span></div><div class="custom-options"><div class="custom-option selected" onclick="window.TacticalShooter.MultiplayerUI.selectCLOption('mode', 'TDM', 'TEAM DEATHMATCH')">TEAM DEATHMATCH</div><div class="custom-option" onclick="window.TacticalShooter.MultiplayerUI.selectCLOption('mode', 'FFA', 'FREE FOR ALL')">FREE FOR ALL</div></div></div></div>
                                <div class="sidebar-control"><div class="sidebar-label">TIME LIMIT</div><div class="custom-select-container" id="cl-dd-time" style="width:100%;"><div class="custom-select-trigger" onclick="window.TacticalShooter.MultiplayerUI.toggleCLDropdown(event, 'cl-dd-time')"><span id="cl-display-time" data-val="10">10 MINUTES</span></div><div class="custom-options"><div class="custom-option" onclick="window.TacticalShooter.MultiplayerUI.selectCLOption('time', '1', '1 MINUTE')">1 MINUTE</div><div class="custom-option" onclick="window.TacticalShooter.MultiplayerUI.selectCLOption('time', '5', '5 MINUTES')">5 MINUTES</div><div class="custom-option selected" onclick="window.TacticalShooter.MultiplayerUI.selectCLOption('time', '10', '10 MINUTES')">10 MINUTES</div><div class="custom-option" onclick="window.TacticalShooter.MultiplayerUI.selectCLOption('time', '20', '20 MINUTES')">20 MINUTES</div></div></div></div>
                                <button id="btn-custom-host" class="sidebar-btn primary" style="margin-top:10px;">CREATE MATCH</button>
                            </div>
                            <div class="sidebar-divider"></div>
                            <div class="sidebar-section">
                                <div class="sidebar-title">DIRECT CONNECT</div>
                                <div class="sidebar-control"><div class="sidebar-label">ROOM CODE</div><div style="display:flex; gap: 8px; width: 100%; box-sizing: border-box;"><input type="text" id="cl-join-code" class="sidebar-input" maxlength="4" style="flex:1; min-width: 0; text-transform: uppercase; text-align: center; letter-spacing: 2px; font-weight: bold;" placeholder="CODE"><button id="btn-custom-join" class="sidebar-btn" style="width:50px; font-weight: bold; font-size: 20px; line-height: 1;">→</button></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            const loadoutScreen = document.createElement('div');
            loadoutScreen.id = 'loadout-screen';
            document.body.appendChild(loadoutScreen);
            
            document.getElementById('main-menu-settings-btn').onclick = () => { if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.openSettings(); };
            document.getElementById('btn-deploy').onclick = () => this.handleDeploy();
            document.getElementById('btn-spectate').onclick = () => this.handleSpectate();
            const nameInput = document.getElementById('player-name-input');
            nameInput.addEventListener('blur', (e) => { this.syncName(e.target.value); });
            document.getElementById('btn-open-lobbies').onclick = () => this.openBrowser();
            document.getElementById('btn-close-browser').onclick = () => { document.getElementById(this.unifiedBrowserId).style.display = 'none'; if (window.TacticalShooter.FirebaseManager) window.TacticalShooter.FirebaseManager.unsubscribe(); };
            document.getElementById('btn-refresh-browser').onclick = () => this.refreshBrowser();
            document.getElementById('btn-custom-host').onclick = () => this.hostCustomMatch();
            document.getElementById('btn-custom-join').onclick = () => this.joinCustomMatch();
            const joinCodeInput = document.getElementById('cl-join-code');
            joinCodeInput.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().slice(0, 4); });
            
            if (window.TacticalShooter.LoadoutUI) window.TacticalShooter.LoadoutUI.init();
            if (window.TacticalShooter.PlayerState) window.TacticalShooter.PlayerState.renderLoadoutPicker('menu-loadout-quick-select');
            if (window.TacticalShooter.LobbyUI && window.TacticalShooter.TeamSelector) { window.TacticalShooter.TeamSelector.init(); window.TacticalShooter.TeamSelector.render('mp-teams-container'); }
        },
        
        syncName(val) {
            const name = val.trim();
            if (name) {
                localStorage.setItem('ts_username', name);
                if (window.TacticalShooter.PlayroomManager) {
                    window.TacticalShooter.PlayroomManager.localPlayerName = name;
                    if (window.TacticalShooter.PlayroomManager.myPlayer) {
                        window.TacticalShooter.PlayroomManager.myPlayer.setState('name', name, true);
                    }
                }
            }
        },
        
        handleDeploy() {
            if (!this.isConnected) return;
            if (window.TacticalShooter.MatchState && window.TacticalShooter.MatchState.state.status === 'GAME_OVER') { if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification("MATCH ENDED - WAIT FOR RESTART", "red"); return; }
            let nameInput = document.getElementById('player-name-input'); let name = nameInput.value.trim(); if (!name) { name = `unnamed [${Math.floor(Math.random() * 16) + 1}]`; nameInput.value = name; } this.syncName(name);
            if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.enterGame();
            if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.stop();
            const overlay = document.getElementById(this.overlayId); if (overlay) overlay.style.display = 'none';
            this.setHUDVisible(true); this.requestPointerLock();
        },
        
        handleSpectate() {
            if (!this.isConnected) return;
            let nameInput = document.getElementById('player-name-input'); let name = nameInput.value.trim(); if (!name) { name = `Spectator`; nameInput.value = name; } this.syncName(name);
            if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.enterSpectator();
            if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.stop();
            const overlay = document.getElementById(this.overlayId); if (overlay) overlay.style.display = 'none';
            this.setHUDVisible(false); this.requestPointerLock();
        },
        
        toggleCLDropdown(event, id) { 
            if (event) event.stopPropagation(); 
            const container = document.getElementById(id); 
            if (!container) return; 
            const options = container.querySelector('.custom-options'); 
            const wasOpen = options.classList.contains('open'); 
            this.closeAllDropdowns(); 
            if (!wasOpen) { options.classList.add('open'); container.classList.add('active'); this.activeDropdown = options; } 
        },

        closeAllDropdowns() { 
            document.querySelectorAll('.custom-options.open').forEach(el => el.classList.remove('open')); 
            document.querySelectorAll('.custom-select-container.active').forEach(el => el.classList.remove('active')); 
            this.activeDropdown = null; 
        },

        selectCLOption(setting, value, label) { 
            this.customLobbySettings[setting] = value; 
            const displayEl = document.getElementById(`cl-display-${setting}`); 
            if (displayEl) { displayEl.textContent = label; displayEl.dataset.val = value; } 
            const container = document.getElementById(`cl-dd-${setting}`); 
            if (container) { 
                container.querySelectorAll('.custom-option').forEach(opt => { 
                    opt.classList.remove('selected'); 
                    if (opt.textContent.trim() === label) opt.classList.add('selected'); 
                }); 
            } 
            if (setting === 'map' && !this.isConnected && window.TacticalShooter.GameManager) { 
                window.TacticalShooter.GameManager.loadMap(value); 
            } 
            this.closeAllDropdowns(); 
        },

        openBrowser() { 
            const el = document.getElementById(this.unifiedBrowserId); 
            if (el) { el.style.display = 'block'; this.refreshBrowser(); } 
        },

        openCustomLobby() { this.openBrowser(); },
        
        async hostCustomMatch() { 
            if (window.TacticalShooter.FirebaseManager) window.TacticalShooter.FirebaseManager.unsubscribe(); 
            
            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) { 
                window.TacticalShooter.PlayroomManager.disconnect(); 
                sessionStorage.setItem('ts_pending_host', JSON.stringify(this.customLobbySettings)); 
                window.location.href = window.location.origin + window.location.pathname; 
                return; 
            } 
            
            const map = this.customLobbySettings.map; 
            const mode = this.customLobbySettings.mode; 
            const time = parseInt(this.customLobbySettings.time); 
            const nameEl = document.getElementById('player-name-input');
            const name = nameEl ? nameEl.value.trim() : "Host"; 
            
            document.getElementById(this.unifiedBrowserId).style.display = 'none'; 
            this.updateLoadingText("LOADING..."); 
            
            try { 
                await window.TacticalShooter.PlayroomManager.createRoom(name); 
                
                if (window.TacticalShooter.MatchState) {
                    window.TacticalShooter.MatchState.resetToDefaults(); 
                }

                const MS = window.TacticalShooter.MatchState; 
                if (MS) { 
                    MS.setSetting('mapId', map); 
                    MS.setSetting('gamemode', mode); 
                    MS.setSetting('timeLimit', time); 
                    MS.setSetting('mapRotation', false); 
                    MS.setSetting('nightMode', (map === 'WAREHOUSE_NIGHT')); 
                    MS.setSetting('status', 'PLAYING');
                    MS.setSetting('matchEndTime', Date.now() + (time * 60000));
                    
                    if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.loadMap(map); 
                    if (window.TacticalShooter.FirebaseManager) { 
                        const displayMap = (map === 'DEPOT') ? 'LARGE WAREHOUSE' : (map === 'CONTAINERS' ? 'RECTANGLES' : map);
                        window.TacticalShooter.FirebaseManager.registerLobby(window.TacticalShooter.PlayroomManager.roomCode, name, displayMap, mode, 1); 
                    } 
                } 
                this.onConnectionSuccess(); 
            } catch (e) { 
                console.error("Custom Host Failed:", e); 
                this.updateLoadingText("HOSTING FAILED"); 
                this.isConnected = false; 
                setTimeout(() => this.hideLoadingScreen(), 2000); 
            } 
        },
        
        async joinCustomMatch() { const codeEl = document.getElementById('cl-join-code'); const code = codeEl ? codeEl.value.trim() : ""; if (!code) return; this.joinLobby(code); },
        autoMatchmake() { 
            if (this.isMatchmaking || this.isConnected || this.joinAttemptInProgress) return; 
            this.isMatchmaking = true; this.updateLoadingText("LOADING..."); 
            if (!window.TacticalShooter.FirebaseManager) { this.updateLoadingText("NETWORK OFFLINE"); return; } 
            if (this._matchmakeTimeout) clearTimeout(this._matchmakeTimeout); 
            this._matchmakeTimeout = setTimeout(() => { if (this.isMatchmaking && !this.isConnected && !this.joinAttemptInProgress) { console.warn("MultiplayerUI: Matchmaking timed out, forcing host."); if (window.TacticalShooter.FirebaseManager) window.TacticalShooter.FirebaseManager.unsubscribe(); let name = "Guest"; const nameEl = document.getElementById('player-name-input'); if (nameEl) name = nameEl.value.trim() || "Guest"; this.hostNewMatch(name); } }, 5000); 
            if (window.TacticalShooter.FirebaseManager) { window.TacticalShooter.FirebaseManager.unsubscribe(); setTimeout(() => { window.TacticalShooter.FirebaseManager.subscribeToLobbies((lobbies) => { if (this._matchmakeTimeout) clearTimeout(this._matchmakeTimeout); if (window.TacticalShooter.FirebaseManager) window.TacticalShooter.FirebaseManager.unsubscribe(); if (this.isConnected || this.joinAttemptInProgress) return; this.joinAttemptInProgress = true; this.processAutoJoin(lobbies); }); }, 50); } 
        },
        processAutoJoin: async function(lobbies) { this.updateLoadingText("LOADING..."); const validLobbies = lobbies.filter(l => l.players < 16); validLobbies.sort((a, b) => b.players - a.players); let name = "Guest"; const nameEl = document.getElementById('player-name-input'); if (nameEl) name = nameEl.value.trim() || "Guest"; for (const target of validLobbies) { this.updateLoadingText(`JOINING ${target.code}...`); try { await Promise.race([window.TacticalShooter.PlayroomManager.joinRoom(name, target.code), new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))]); this.onConnectionSuccess(); return; } catch (e) { console.warn(`Auto-Join failed for ${target.code}, trying next...`, e); if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.disconnect(); } } this.hostNewMatch(name); },
        hostNewMatch: async function(name) { this.updateLoadingText("LOADING..."); try { if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) { window.TacticalShooter.PlayroomManager.disconnect(); await new Promise(r => setTimeout(r, 10)); } await window.TacticalShooter.PlayroomManager.createRoom(name); if (window.TacticalShooter.MatchState) window.TacticalShooter.MatchState.resetToDefaults(); if (window.TacticalShooter.FirebaseManager) { window.TacticalShooter.FirebaseManager.registerLobby(window.TacticalShooter.PlayroomManager.roomCode, name, "WAREHOUSE", "TDM", 1); } this.onConnectionSuccess(); } catch (e) { console.error("Host Failed:", e); this.updateLoadingText("CONNECTION FAILED"); this.joinAttemptInProgress = false; this.isMatchmaking = false; this.isConnected = false; setTimeout(() => this.hideLoadingScreen(), 2000); } },
        onConnectionSuccess() { this.isConnected = true; this.isMatchmaking = false; this.joinAttemptInProgress = false; if (this._matchmakeTimeout) clearTimeout(this._matchmakeTimeout); const deployBtn = document.getElementById('btn-deploy'); if (deployBtn) { deployBtn.disabled = false; deployBtn.textContent = "DEPLOY"; deployBtn.style.color = "#aaffaa"; deployBtn.style.borderColor = "#44aa44"; deployBtn.style.boxShadow = "0 0 15px rgba(0, 255, 0, 0.3)"; deployBtn.animate([{ boxShadow: '0 0 0 rgba(0,255,0,0)' }, { boxShadow: '0 0 20px rgba(0,255,0,0.5)' }, { boxShadow: '0 0 0 rgba(0,255,0,0)' }], { duration: 2000, iterations: Infinity }); } this.hideLoadingScreen(); },
        onGameStarted(roomCode, isHost) { if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.closeMenu(); const rcDisplay = document.getElementById('room-code-display'); if (rcDisplay) { const val = document.getElementById('room-code-value'); if (val) val.textContent = roomCode; rcDisplay.style.display = 'flex'; rcDisplay.style.zIndex = '6000'; } this.isConnected = true; this.hideLoadingScreen(); const deployBtn = document.getElementById('btn-deploy'); if (deployBtn) { deployBtn.disabled = false; deployBtn.style.color = "#aaffaa"; deployBtn.style.borderColor = "#44aa44"; } },
        refreshBrowser() { const list = document.getElementById('lobby-list-content'); if (!list) return; list.innerHTML = '<div style="text-align:center; color:#666; margin-top: 50px;">REFRESHING...</div>'; if (window.TacticalShooter.FirebaseManager) { window.TacticalShooter.FirebaseManager.unsubscribe(); setTimeout(() => { window.TacticalShooter.FirebaseManager.subscribeToLobbies((lobbies) => { this.renderLobbyList(lobbies); }); }, 200); } else { list.innerHTML = '<div style="text-align:center; color:#cc4444; margin-top: 50px;">FIREBASE NOT CONNECTED</div>'; } },
        renderLobbyList(lobbies) { const list = document.getElementById('lobby-list-content'); if (!list) return; list.innerHTML = ''; const currentRoomCode = window.TacticalShooter.PlayroomManager ? window.TacticalShooter.PlayroomManager.roomCode : null; const isConnected = window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer && this.isConnected; if (currentRoomCode && isConnected) { const matchIndex = lobbies.findIndex(l => l.code === currentRoomCode); let liveCount = 1; if (window.TacticalShooter.RemotePlayerManager) { liveCount += Object.keys(window.TacticalShooter.RemotePlayerManager.remotePlayers).length; } if (matchIndex > -1) { const myLobby = lobbies.splice(matchIndex, 1)[0]; myLobby.players = liveCount; lobbies.unshift(myLobby); } else { const MS = window.TacticalShooter.MatchState ? window.TacticalShooter.MatchState.state : {}; const isHost = window.TacticalShooter.PlayroomManager.isHost; const hostName = isHost ? window.TacticalShooter.PlayroomManager.localPlayerName : "Current Lobby"; lobbies.unshift({ code: currentRoomCode, host: hostName, map: MS.mapId || "UNKNOWN", mode: MS.gamemode || "TDM", players: liveCount }); } } if (lobbies.length === 0) { list.innerHTML = '<div style="text-align:center; color:#666; margin-top: 50px;">NO ACTIVE LOBBIES FOUND</div>'; return; } lobbies.forEach(lobby => { const isMyLobby = (currentRoomCode && lobby.code === currentRoomCode && isConnected); const row = document.createElement('div'); row.className = 'browser-row'; if (isMyLobby) row.classList.add('my-lobby'); const mapName = lobby.map === 'DEPOT' ? 'LARGE WAREHOUSE' : (lobby.map === 'CONTAINERS' ? 'RECTANGLES' : lobby.map); let actionHtml = ''; if (!isMyLobby) { actionHtml = `<button class="browser-join-btn" onclick="window.TacticalShooter.MultiplayerUI.joinLobby('${lobby.code}')">JOIN</button>`; } else { actionHtml = `<span style="font-weight:600; color:#00ccaa;">CONNECTED</span>`; } row.innerHTML = `<div class="browser-row-host">${lobby.host}</div><div class="browser-row-map">${mapName}</div><div class="browser-row-mode">${lobby.mode}</div><div class="browser-row-count">${lobby.players} / 16</div><div class="browser-row-code">${lobby.code}</div><div style="text-align:right;">${actionHtml}</div>`; list.appendChild(row); }); },
        joinLobby(code) { if (this.isConnected && window.TacticalShooter.PlayroomManager.roomCode) { console.log(`MultiplayerUI: Switching rooms via Hard Redirect to ${code}`); this.updateLoadingText("SWITCHING LOBBY..."); window.TacticalShooter.PlayroomManager.disconnect(); const url = new URL(window.location.origin + window.location.pathname); url.searchParams.set('roomCode', code); window.location.href = url.toString(); return; } if (window.TacticalShooter.FirebaseManager) window.TacticalShooter.FirebaseManager.unsubscribe(); let name = document.getElementById('player-name-input').value.trim(); if (!name) name = `Guest`; localStorage.setItem('ts_username', name); document.getElementById(this.unifiedBrowserId).style.display = 'none'; if (window.TacticalShooter.PlayroomManager.myPlayer) { window.TacticalShooter.PlayroomManager.disconnect(); } this.updateLoadingText("LOADING..."); this.joinAttemptInProgress = true; Promise.race([window.TacticalShooter.PlayroomManager.joinRoom(name, code), new Promise((_, reject) => setTimeout(() => reject(new Error("Join Timed Out")), 8000))]).then(() => { this.onConnectionSuccess(); }).catch(e => { console.error("Join Failed:", e); this.updateLoadingText("JOIN FAILED"); this.joinAttemptInProgress = false; this.isConnected = false; if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.disconnect(); setTimeout(() => { this.hideLoadingScreen(); this.openBrowser(); this.refreshBrowser(); }, 2000); }); },
        showMainMenu() { const overlay = document.getElementById(this.overlayId); if (overlay) { overlay.style.display = 'block'; const deployBtn = document.getElementById('btn-deploy'); if (deployBtn) { deployBtn.textContent = "REDEPLOY"; deployBtn.disabled = false; deployBtn.style.color = "#aaffaa"; deployBtn.style.borderColor = "#44aa44"; deployBtn.style.boxShadow = "none"; const anims = deployBtn.getAnimations(); anims.forEach(anim => anim.cancel()); } } const canvas = document.getElementById('game-canvas'); if (canvas) canvas.classList.add('canvas-blur'); if (document.exitPointerLock) document.exitPointerLock(); },
        resetToTitle() { this.isConnected = false; this.isMatchmaking = false; this.joinAttemptInProgress = false; const overlay = document.getElementById(this.overlayId); if (overlay) overlay.style.display = 'block'; const deployBtn = document.getElementById('btn-deploy'); if (deployBtn) { deployBtn.disabled = true; deployBtn.textContent = "DEPLOY"; deployBtn.style.color = "#ccc"; deployBtn.style.borderColor = "#444"; deployBtn.style.boxShadow = "none"; const anims = deployBtn.getAnimations(); anims.forEach(anim => anim.cancel()); } const rcDisplay = document.getElementById('room-code-display'); if (rcDisplay) rcDisplay.style.display = 'none'; },
        setHUDVisible(visible) { 
            const display = visible ? 'block' : 'none'; 
            ['hud', 'instructions', 'crosshair'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = display; }); 
            const rc = document.getElementById('room-code-display'); 
            if (rc) { 
                // Always force display if connected, regardless of HUD toggle state (for room sharing)
                // If not connected, obey visible flag (likely false)
                if (this.isConnected) rc.style.display = 'flex';
                else rc.style.display = visible ? 'flex' : 'none'; 
            } 
            if (!visible) { const pl = document.getElementById('pointer-lock-overlay'); if (pl) pl.classList.add('hidden'); } 
        },
        showNotification(msg, type = 'blue') { if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.showNotification(msg, type); else alert(msg); },
        requestPointerLock() { const canvas = document.getElementById('game-canvas'); if (canvas) { canvas.requestPointerLock(); const clicker = () => { if (!document.pointerLockElement && document.getElementById(this.overlayId).style.display === 'none') { canvas.requestPointerLock(); } }; document.addEventListener('click', clicker, { once: true }); } }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.MultiplayerUI = MultiplayerUI;
})();
