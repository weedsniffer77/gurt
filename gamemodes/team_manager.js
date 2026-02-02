
// js/gamemodes/team_manager.js
(function() {
    const TeamManager = {
        // Defines fixed teams (ID 0-1) with Hex Colors
        teams: [
            { id: 0, name: "TEAM 1", color: "#2277FF", players: [] },   // Blue -> Team 1
            { id: 1, name: "TEAM 2", color: "#cc3322", players: [] }    // Red -> Team 2
        ],

        init() {
            console.log("TeamManager: Initialized");
        },

        getTeam(id) {
            return this.teams[id] || this.teams[0];
        },
        
        resolveTeamNames(gamemode, mapId) {
            let names = ["TEAM 1", "TEAM 2"]; 
            for (let i = 0; i < this.teams.length; i++) {
                if (names[i]) this.teams[i].name = names[i];
            }
        },

        getPlayersOnTeam(teamId) {
            const players = [];
            const localId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : null;
            
            // Add Local
            if (localId) {
                const myTeam = this.getLocalTeamId();
                if (myTeam === teamId) {
                    players.push({ 
                        id: localId, 
                        name: window.TacticalShooter.PlayroomManager.localPlayerName
                    });
                }
            }

            // Add Remotes
            if (window.TacticalShooter.RemotePlayerManager) {
                const remotes = window.TacticalShooter.RemotePlayerManager.remotePlayers;
                for (const pid in remotes) {
                    const rp = remotes[pid];
                    const tid = rp.player.getState('teamId');
                    const finalTid = (typeof tid === 'number') ? tid : 0;
                    
                    if (finalTid === teamId) {
                        players.push({ id: pid, name: rp.name });
                    }
                }
            }
            return players;
        },

        getLocalTeamId() {
            if (!window.TacticalShooter.PlayroomManager.myPlayer) return 0;
            const tid = window.TacticalShooter.PlayroomManager.myPlayer.getState('teamId');
            return (typeof tid === 'number') ? tid : 0;
        },

        // VALIDATION ONLY: Prevents being on Team 3 if only 2 teams exist.
        ensureValidTeam(maxTeams) {
            const myId = this.getLocalTeamId();
            if (myId < 0 || myId >= maxTeams) {
                console.log(`TeamManager: Correcting invalid team index ${myId} (Max: ${maxTeams})`);
                this._forceJoinSmallest(maxTeams);
            }
        },

        // FULL BALANCE: Checks population counts. Call ONLY on initial join.
        initialAutoBalance(maxTeams) {
            // First ensure range validity
            this.ensureValidTeam(maxTeams);
            
            const myId = this.getLocalTeamId();
            
            // Threshold Imbalance Check
            // "getPlayersOnTeam" includes ME. 
            const counts = [];
            for(let i=0; i<maxTeams; i++) {
                counts.push(this.getPlayersOnTeam(i).length);
            }
            
            const myCount = counts[myId];
            const minCount = Math.min(...counts);
            
            // If my team is significantly larger than the smallest
            if (myCount > minCount + 1) {
                // Find candidates
                const candidates = [];
                for(let i=0; i<maxTeams; i++) {
                    if (counts[i] === minCount) candidates.push(i);
                }
                
                if (candidates.length > 0) {
                    // HIERARCHY RULE: Sort by ID (0, 1)
                    candidates.sort((a,b) => a - b);
                    const target = candidates[0];
                    
                    if (target !== myId) {
                        console.log(`TeamManager: Auto-Balance Moving T${myId}(${myCount}) -> T${target}(${minCount})`);
                        this.setLocalTeam(target);
                    }
                }
            }
        },
        
        balancePlayer(maxTeams) { this.initialAutoBalance(maxTeams); },
        autoBalance(maxTeams) { this.initialAutoBalance(maxTeams); },
        
        _forceJoinSmallest(maxTeams) {
            const counts = [];
            let minCount = 999;
            for(let i=0; i<maxTeams; i++) {
                const c = this.getPlayersOnTeam(i).length;
                counts.push({id: i, c: c});
                if(c < minCount) minCount = c;
            }
            const candidates = counts.filter(x => x.c === minCount);
            
            if (candidates.length > 0) {
                candidates.sort((a,b) => a.id - b.id);
                this.setLocalTeam(candidates[0].id);
            } else {
                this.setLocalTeam(0);
            }
        },
        
        verifyTeamAssignment(maxTeams) { this.ensureValidTeam(maxTeams); },

        setLocalTeam(id) {
            if (window.TacticalShooter.PlayroomManager.myPlayer) {
                window.TacticalShooter.PlayroomManager.myPlayer.setState('teamId', id, true);
                console.log(`TeamManager: Joined Team ${id}`);
                
                // --- CRITICAL FIX: FORCE BROADCAST IMMEDIATELY ---
                // This ensures all other clients receive the team change event now.
                if (window.TacticalShooter.PlayroomManager.broadcastPlayerData) {
                    window.TacticalShooter.PlayroomManager.broadcastPlayerData();
                }
            }
        },
        
        getTeamColorForPlayer(playerId) {
            if (window.TacticalShooter.PlayroomManager.myPlayer && playerId === window.TacticalShooter.PlayroomManager.myPlayer.id) {
                const tid = this.getLocalTeamId();
                return this.teams[tid] ? this.teams[tid].color : "#ffffff";
            }
            
            if (window.TacticalShooter.RemotePlayerManager && window.TacticalShooter.RemotePlayerManager.remotePlayers[playerId]) {
                const rp = window.TacticalShooter.RemotePlayerManager.remotePlayers[playerId];
                const tid = rp.player.getState('teamId');
                const validTid = (typeof tid === 'number') ? tid : 0;
                return this.teams[validTid] ? this.teams[validTid].color : "#ffffff";
            }
            
            return "#ffffff";
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.TeamManager = TeamManager;
})();
