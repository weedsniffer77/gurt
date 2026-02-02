
// js/network/lobby_service.js
(function() {
    const LobbyService = {
        _matchmakeTimeout: null,
        
        async hostGame(settings, hostName) {
            if (window.TacticalShooter.FirebaseManager) window.TacticalShooter.FirebaseManager.unsubscribe();
            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                window.TacticalShooter.PlayroomManager.disconnect();
                // If restarting, we might need a small delay
                await new Promise(r => setTimeout(r, 50));
            }
            
            try {
                await window.TacticalShooter.PlayroomManager.createRoom(hostName);
                if (window.TacticalShooter.MatchState) window.TacticalShooter.MatchState.resetToDefaults();
                
                const MS = window.TacticalShooter.MatchState;
                if (MS) {
                    MS.setSetting('mapId', settings.map);
                    MS.setSetting('gamemode', settings.mode);
                    MS.setSetting('timeLimit', parseInt(settings.time));
                    MS.setSetting('nightMode', (settings.map === 'WAREHOUSE_NIGHT'));
                    MS.setSetting('status', 'PLAYING');
                    MS.setSetting('matchEndTime', Date.now() + (parseInt(settings.time) * 60000));
                    
                    if (window.TacticalShooter.GameManager) window.TacticalShooter.GameManager.loadMap(settings.map);
                    if (window.TacticalShooter.FirebaseManager) {
                        const displayMap = (settings.map === 'DEPOT') ? 'LARGE WAREHOUSE' : settings.map;
                        window.TacticalShooter.FirebaseManager.registerLobby(
                            window.TacticalShooter.PlayroomManager.roomCode, 
                            hostName, 
                            displayMap, 
                            settings.mode, 
                            1
                        );
                    }
                }
                return true;
            } catch (e) {
                console.error("LobbyService: Host Failed", e);
                return false;
            }
        },
        
        async joinGame(roomCode, playerName) {
            if (window.TacticalShooter.FirebaseManager) window.TacticalShooter.FirebaseManager.unsubscribe();
            if (window.TacticalShooter.PlayroomManager.myPlayer) {
                window.TacticalShooter.PlayroomManager.disconnect();
                await new Promise(r => setTimeout(r, 50));
            }
            
            try {
                await Promise.race([
                    window.TacticalShooter.PlayroomManager.joinRoom(playerName, roomCode),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
                ]);
                return true;
            } catch (e) {
                console.error("LobbyService: Join Failed", e);
                if (window.TacticalShooter.PlayroomManager) window.TacticalShooter.PlayroomManager.disconnect();
                return false;
            }
        },
        
        startAutoMatchmaking(playerName, statusCallback) {
            statusCallback("LOADING...");
            
            if (!window.TacticalShooter.FirebaseManager) {
                statusCallback("OFFLINE");
                return;
            }
            
            // Timeout Fallback
            if (this._matchmakeTimeout) clearTimeout(this._matchmakeTimeout);
            this._matchmakeTimeout = setTimeout(() => {
                console.warn("LobbyService: Matchmaking timed out, forcing host.");
                if (window.TacticalShooter.FirebaseManager) window.TacticalShooter.FirebaseManager.unsubscribe();
                this.hostGame({map: 'WAREHOUSE', mode: 'TDM', time: '10'}, playerName)
                    .then(success => {
                        if(success) statusCallback("HOSTED");
                        else statusCallback("FAILED");
                    });
            }, 5000);
            
            window.TacticalShooter.FirebaseManager.unsubscribe();
            
            setTimeout(() => {
                window.TacticalShooter.FirebaseManager.subscribeToLobbies((lobbies) => {
                    if (this._matchmakeTimeout) clearTimeout(this._matchmakeTimeout);
                    if (window.TacticalShooter.FirebaseManager) window.TacticalShooter.FirebaseManager.unsubscribe();
                    
                    this._processAutoJoin(lobbies, playerName, statusCallback);
                });
            }, 50);
        },
        
        async _processAutoJoin(lobbies, playerName, statusCallback) {
            const validLobbies = lobbies.filter(l => l.players < 16);
            validLobbies.sort((a, b) => b.players - a.players); // Most populated first
            
            for (const target of validLobbies) {
                statusCallback(`JOINING ${target.code}...`);
                try {
                    await this.joinGame(target.code, playerName);
                    statusCallback("CONNECTED");
                    return;
                } catch (e) {
                    console.warn(`LobbyService: Failed to join ${target.code}, trying next...`);
                }
            }
            
            // If no lobbies or all failed
            statusCallback("HOSTING...");
            this.hostGame({map: 'WAREHOUSE', mode: 'TDM', time: '10'}, playerName)
                .then(success => {
                    if(success) statusCallback("HOSTED");
                    else statusCallback("FAILED");
                });
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.LobbyService = LobbyService;
})();
