
// js/gamemodes/match_state.js
(function() {
    const MatchState = {
        state: {
            gamemode: "TDM", 
            mapId: "WAREHOUSE", 
            timeLimit: 10, 
            teamCount: 2, 
            friendlyFire: false, 
            nightMode: false, 
            status: "LOBBY", 
            launchTime: 0,   
            matchEndTime: 0 
        },
        
        postGameTriggered: false,
        restartMenuTriggered: false,
        
        init() {
            console.log("MatchState: Initialized");
            this.triggerUpdates();
        },
        
        resetToDefaults() {
            this.state.mapId = "WAREHOUSE";
            this.state.gamemode = "TDM";
            this.state.nightMode = false;
            this.state.status = "LOBBY";
            this.postGameTriggered = false;
            this.restartMenuTriggered = false;
        },

        setSetting(key, value) {
            if (!window.TacticalShooter.PlayroomManager.isHost) return;
            const oldStatus = this.state.status;
            this.state[key] = value;
            if (window.Playroom) window.Playroom.setState(`MATCH_${key}`, value, true);
            if (key === 'teamCount' || key === 'gamemode') this.checkLocalTeamValidity();
            if (key === 'status' && value !== oldStatus) this.handleStatusChange(oldStatus, value);
            if (key === 'timeLimit' && (this.state.status === 'PLAYING' || this.state.status === 'PRE_ROUND')) {
                const durationMs = value * 60 * 1000;
                this.setSetting('matchEndTime', Date.now() + durationMs);
            }
            this.triggerUpdates();
        },
        
        startPreRound(duration = 10000) {
            if (!window.TacticalShooter.PlayroomManager.isHost) return;
            const myPlayer = window.TacticalShooter.PlayroomManager.myPlayer;
            if (myPlayer) {
                 myPlayer.setState('kills', 0, true);
                 myPlayer.setState('deaths', 0, true);
                 myPlayer.setState('score', 0, true);
                 myPlayer.setState('health', 100, true);
            }
            const preRoundEnd = Date.now() + duration;
            this.setSetting('launchTime', preRoundEnd); 
            this.setSetting('status', 'PRE_ROUND');
        },

        startGame() {
             if (!window.TacticalShooter.PlayroomManager.isHost) return;
             const durationMs = this.state.timeLimit * 60 * 1000;
             const endTime = Date.now() + durationMs;
             this.setSetting('matchEndTime', endTime);
             this.setSetting('status', 'PLAYING');
        },
        
        leaveMatchAndReturnToLobby() {
            console.log("MatchState: Leaving match, returning to Deployment Menu...");
            const ids = ['post-game-screen', 'transition-overlay', 'loading-screen', 'death-cam-overlay', 'hud', 'game-timer', 'pre-round-timer', 'scoreboard'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if(el) { el.style.display = 'none'; el.classList.remove('active'); }
            });

            if (window.TacticalShooter.ScoreboardManager) window.TacticalShooter.ScoreboardManager.toggle(false);

            this.postGameTriggered = false;

            if (window.TacticalShooter.PlayerState) window.TacticalShooter.PlayerState.enterSpectatorMode();
            if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.enterMenu();
            if (window.TacticalShooter.MultiplayerUI) {
                window.TacticalShooter.MultiplayerUI.showMainMenu();
                window.TacticalShooter.MultiplayerUI.setHUDVisible(false);
            }
            if (document.exitPointerLock) document.exitPointerLock();
            const canvas = document.getElementById('game-canvas');
            if (canvas) canvas.classList.add('canvas-blur');
        },

        resetToLobby() {
            this.leaveMatchAndReturnToLobby();
        },

        hostUpdateLogic() {
            if (!window.TacticalShooter.PlayroomManager.isHost) return;
            const now = Date.now();
            if (this.state.status === 'PRE_ROUND') {
                if (now >= this.state.launchTime) {
                    console.log("Host: Starting Game...");
                    this.startGame();
                }
            }
            else if (this.state.status === 'PLAYING') {
                if (this.state.matchEndTime > 0 && now >= this.state.matchEndTime) {
                    console.log("Host: Match Ended.");
                    this.setSetting('status', 'GAME_OVER');
                    this.setSetting('launchTime', Date.now() + 12500); 
                }
            }
            else if (this.state.status === 'GAME_OVER') {
                if (now >= this.state.launchTime) {
                    console.log("Host: Auto-Restarting Match (Instant Pre-Round)...");
                    this.startPreRound(500); 
                }
            }
        },

        syncMatchState() {
            if (!window.Playroom) return;
            const keys = ['gamemode', 'mapId', 'timeLimit', 'teamCount', 'friendlyFire', 'nightMode', 'status', 'launchTime', 'matchEndTime'];
            let updated = false;
            let oldStatus = this.state.status;

            keys.forEach(k => {
                const val = window.Playroom.getState(`MATCH_${k}`);
                if (val !== undefined && val !== this.state[k]) {
                    this.state[k] = val;
                    updated = true;
                }
            });

            if (updated) {
                this.checkLocalTeamValidity();
                if (this.state.status !== oldStatus) {
                    this.handleStatusChange(oldStatus, this.state.status);
                }
                this.triggerUpdates();
            }
        },
        
        handleStatusChange(oldStatus, newStatus) {
            console.log(`MatchState: Status Changed from ${oldStatus} to ${newStatus}`);
            
            if (newStatus === 'PRE_ROUND' || newStatus === 'PLAYING') {
                 const strip = document.getElementById('lobby-countdown-strip');
                 if (strip) strip.style.display = 'none';
            }

            if (newStatus === 'PRE_ROUND') {
                 // --- CLEANUP RESET ---
                 if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.enterMenu();
                 if (window.TacticalShooter.EntityManager) window.TacticalShooter.EntityManager.reset();
                 if (window.TacticalShooter.ThrowableManager) {
                     // Clear local smoke and grenades
                     while(window.TacticalShooter.ThrowableManager.projectiles.length > 0) {
                         window.TacticalShooter.ThrowableManager.removeProjectile(0);
                     }
                     window.TacticalShooter.ThrowableManager.activeSmokes = [];
                 }
                 if (window.TacticalShooter.ParticleManager) window.TacticalShooter.ParticleManager.clear();
                 if (window.TacticalShooter.ScoreSystem) window.TacticalShooter.ScoreSystem.resetMatchData();
                 
                 const scr = document.getElementById('post-game-screen');
                 if (scr) { scr.style.display = 'none'; scr.classList.remove('active'); }
                 this.postGameTriggered = false;
                 
                 if (window.TacticalShooter.ScoreboardManager) window.TacticalShooter.ScoreboardManager.toggle(false);

                 const myPlayer = window.TacticalShooter.PlayroomManager.myPlayer;
                 if (myPlayer) {
                     myPlayer.setState('kills', 0, true);
                     myPlayer.setState('deaths', 0, true);
                     myPlayer.setState('score', 0, true);
                     myPlayer.setState('health', 100, true);
                 }
                 
                 if (window.TacticalShooter.PlayerState) {
                     window.TacticalShooter.PlayerState.resetSession();
                     window.TacticalShooter.PlayerState.isSpectating = true; 
                     window.TacticalShooter.PlayerState.isDead = false;
                 }
                 
                 if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.broadcastPlayerData();
                 
                 if (window.TacticalShooter.RemotePlayerManager) {
                     const rpm = window.TacticalShooter.RemotePlayerManager;
                     for(const id in rpm.remotePlayers) {
                         const rp = rpm.remotePlayers[id];
                         if (rp) {
                             rp.isRagdolled = false; 
                             if (rp.mesh) rp.mesh.visible = true; 
                             rp.snapToState(); 
                         }
                     }
                 }
                 
                 if (window.TacticalShooter.MultiplayerUI) {
                     window.TacticalShooter.MultiplayerUI.showMainMenu();
                     window.TacticalShooter.MultiplayerUI.setHUDVisible(false);
                 }
                 
                 if (document.exitPointerLock) document.exitPointerLock();
                 const canvas = document.getElementById('game-canvas');
                 if (canvas) canvas.classList.add('canvas-blur'); 
                 
                 const prTimer = document.getElementById('pre-round-timer');
                 if (prTimer) prTimer.style.display = 'none';
            }
            else if (newStatus === 'PLAYING') {
                 if (window.TacticalShooter.GameManager) {
                     window.TacticalShooter.GameManager.checkMapSync();
                 }
            } 
            else if (newStatus === 'LOBBY') {
                this.leaveMatchAndReturnToLobby();
            }
        },
        
        update(dt) {
            const isUIHidden = window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.uiHidden;
            const loadoutEl = document.getElementById('loadout-screen');
            const isLoadout = loadoutEl && loadoutEl.classList.contains('active');

            if (this.state.status === 'PRE_ROUND') {
                this.updatePreRoundTimer();
                const hudTimer = document.getElementById('game-timer');
                if (hudTimer) hudTimer.style.display = 'none';
            }
            else if (this.state.status === 'PLAYING') {
                this.updateTimers();
                const hudTimer = document.getElementById('game-timer');
                if (hudTimer) {
                    hudTimer.style.display = (isUIHidden || isLoadout) ? 'none' : 'block';
                }
                const prTimer = document.getElementById('pre-round-timer');
                if (prTimer) prTimer.style.display = 'none';
            } 
            else if (this.state.status === 'GAME_OVER') {
                const now = Date.now();
                const timeLeft = Math.max(0, this.state.launchTime - now);
                const canvas = document.getElementById('game-canvas');

                if (timeLeft > 10000) {
                    const freezeProgress = 1.0 - ((timeLeft - 10000) / 2500); 
                    if (canvas) {
                        const blurVal = freezeProgress * 6;
                        canvas.style.filter = `blur(${blurVal}px) brightness(${1.0 - (freezeProgress*0.3)})`;
                    }
                } else {
                    if (canvas && !this.postGameTriggered) {
                        canvas.classList.add('canvas-blur');
                        canvas.style.filter = ""; 
                    }
                    if (!this.postGameTriggered) {
                        this.showPostGameUI();
                        this.postGameTriggered = true;
                    }
                }

                const hudTimer = document.getElementById('game-timer');
                if (hudTimer) {
                    if (timeLeft > 10000) {
                        hudTimer.innerHTML = `<span style="color:#ff4444">MATCH ENDED</span>`;
                    } else {
                        const secs = Math.ceil(timeLeft / 1000); 
                        hudTimer.innerHTML = `
                            00:00<br>
                            <div style="width: 300px; margin-left: -150px; position: absolute; left: 50%; text-align: center; font-size: 0.4em; color: #ffaaaa; letter-spacing: 2px; margin-top: -5px; font-weight: 400; opacity: 0.9; white-space: nowrap;">
                               NEXT ROUND IN: ${secs}
                            </div>
                        `;
                    }
                    hudTimer.style.display = 'block';
                }
            } else {
                this.postGameTriggered = false;
                const hudTimer = document.getElementById('game-timer');
                if (hudTimer) hudTimer.style.display = 'none';
            }
        },
        
        updatePreRoundTimer() {
            const now = Date.now();
            let timeLeftMs = Math.max(0, this.state.launchTime - now);
            const seconds = Math.ceil(timeLeftMs / 1000);
            
            const timerEl = document.getElementById('pre-round-timer');
            if (timerEl) {
                if (seconds > 0 && timeLeftMs > 2000) {
                    timerEl.style.display = 'block';
                    timerEl.textContent = `${seconds}`;
                } else {
                    timerEl.style.display = 'none';
                }
            }
        },

        updateTimers() {
            const now = Date.now();
            let timeLeftMs = Math.max(0, this.state.matchEndTime - now);
            const totalSeconds = Math.ceil(timeLeftMs / 1000);
            const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
            const s = (totalSeconds % 60).toString().padStart(2, '0');
            const timeStr = `${m}:${s}`;
            const color = totalSeconds <= 60 ? "#ff4444" : "#ffffff";
            
            const hudTimer = document.getElementById('game-timer');
            if (hudTimer) {
                hudTimer.textContent = timeStr;
                hudTimer.style.color = color;
            }
            
            const tabTimer = document.getElementById('sb-timer');
            if (tabTimer) {
                tabTimer.textContent = timeStr;
                tabTimer.style.color = color;
            }
        },
        
        showPostGameUI() {
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.isMenuMode) return;
            const screen = document.getElementById('post-game-screen');
            if (screen) {
                screen.style.display = 'flex';
                screen.classList.add('active');
            }
            if (document.exitPointerLock) document.exitPointerLock();
            if (window.TacticalShooter.UIManager) {
                if (window.TacticalShooter.UIManager.cursorElement) window.TacticalShooter.UIManager.cursorElement.style.display = 'block';
                window.TacticalShooter.UIManager.closeMenu();
            }
            const canvas = document.getElementById('game-canvas');
            if (canvas) canvas.classList.add('canvas-blur');
            if (window.TacticalShooter.MultiplayerUI) window.TacticalShooter.MultiplayerUI.setHUDVisible(false);
        },
        
        checkLocalTeamValidity() {
             if (window.TacticalShooter.TeamManager && this.state.gamemode !== 'FFA') {
                 const myTeam = window.TacticalShooter.TeamManager.getLocalTeamId();
                 if (myTeam >= this.state.teamCount) window.TacticalShooter.TeamManager.ensureValidTeam(this.state.teamCount);
             }
        },
        
        triggerUpdates() {
            if (window.TacticalShooter.TeamManager) window.TacticalShooter.TeamManager.resolveTeamNames(this.state.gamemode, this.state.mapId);
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.MatchState = MatchState;
})();
