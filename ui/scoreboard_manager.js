
// js/ui/scoreboard_manager.js
(function() {
    const ScoreboardManager = {
        element: null,
        contentElement: null,
        
        columns: [
            { id: 'player', label: 'PLAYER', class: 'name-col' },
            { id: 'score', label: 'SCORE', class: 'stat-col' },
            { id: 'kills', label: 'KILLS', class: 'stat-col' },
            { id: 'deaths', label: 'DEATHS', class: 'stat-col' },
            { id: 'assists', label: 'ASSISTS', class: 'stat-col' }
        ],

        init() {
            console.log('ScoreboardManager: Initializing...');
            this.element = document.getElementById('scoreboard');
            this.contentElement = document.getElementById('scoreboard-content');
        },

        toggle(show) {
            if (!this.element) return;
            
            if (show) {
                this.update();
                this.element.classList.add('active');
                this.element.style.display = 'block'; 
            } else {
                this.element.classList.remove('active');
                this.element.style.display = 'none'; 
            }
        },

        update() {
            const list = this.contentElement;
            const modeEl = document.getElementById('sb-mode');
            const mapEl = document.getElementById('sb-map');
            
            let isFFA = false;
            let isPlaying = false;
            if (window.TacticalShooter.MatchState) {
                const state = window.TacticalShooter.MatchState.state;
                if (modeEl) modeEl.textContent = (state.gamemode === 'TDM') ? 'TEAM DEATHMATCH' : 'FREE FOR ALL';
                if (mapEl) {
                    const mapId = state.mapId;
                    let mapName = mapId;
                    if (window.TacticalShooter.MapRegistry) {
                        const mapDef = window.TacticalShooter.MapRegistry.get(mapId);
                        if (mapDef) mapName = mapDef.name;
                    }
                    mapEl.textContent = 'on ' + mapName;
                }
                isFFA = (state.gamemode === 'FFA');
                isPlaying = (state.status === 'PLAYING');
            }

            if (!list) return;
            list.innerHTML = '';
            
            // 1. Render Header Row
            const headerRow = document.createElement('div');
            headerRow.className = 'sb-row header';
            
            this.columns.forEach(col => {
                const cell = document.createElement('div');
                cell.className = `sb-cell ${col.class}`;
                cell.textContent = col.label;
                headerRow.appendChild(cell);
            });
            list.appendChild(headerRow);

            // 2. Collect Player Data
            const players = [];
            
            // Local
            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                const tm = window.TacticalShooter.TeamManager;
                const myPlayer = window.TacticalShooter.PlayroomManager.myPlayer;
                const myTeamId = tm ? tm.getLocalTeamId() : 0;
                
                // Check Dead Status for Local
                const isDead = isPlaying && window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.isDead;
                
                players.push({
                    name: window.TacticalShooter.PlayroomManager.localPlayerName,
                    teamId: myTeamId,
                    isLocal: true,
                    kills: myPlayer.getState('kills') || 0,
                    deaths: myPlayer.getState('deaths') || 0,
                    score: myPlayer.getState('score') || 0,
                    assists: 0,
                    isDead: isDead
                });
            }
            
            // Remote
            if (window.TacticalShooter.RemotePlayerManager) {
                const remotes = window.TacticalShooter.RemotePlayerManager.remotePlayers;
                for (const pid in remotes) {
                    const rp = remotes[pid];
                    let tid = 0;
                    let k = 0, d = 0, s = 0;
                    if (rp.player.getState) {
                        tid = rp.player.getState('teamId') || 0;
                        k = rp.player.getState('kills') || 0;
                        d = rp.player.getState('deaths') || 0;
                        s = rp.player.getState('score') || 0;
                    }
                    
                    // Check Dead Status for Remote
                    const isDead = isPlaying && (rp.player.getState('health') <= 0);

                    players.push({
                        name: rp.name,
                        teamId: tid,
                        isLocal: false,
                        kills: k,
                        deaths: d,
                        score: s,
                        assists: 0,
                        isDead: isDead
                    });
                }
            }
            
            if (isFFA) {
                // FFA: Sort by Score Desc, then Kills
                players.sort((a,b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return b.kills - a.kills;
                });

                players.forEach(p => {
                    this.renderRow(list, p, true);
                });

            } else {
                // TDM: Group by Team
                const teams = [[], [], [], []];
                players.forEach(p => {
                    if (teams[p.teamId]) teams[p.teamId].push(p);
                });
                
                // Sort within teams by Score
                teams.forEach(t => t.sort((a,b) => b.score - a.score));

                // Render Teams
                teams.forEach((teamPlayers, index) => {
                    if (teamPlayers.length === 0) return;
                    
                    if (list.children.length > 1) { // >1 because header is 0
                        const div = document.createElement('div');
                        div.className = 'sb-divider';
                        list.appendChild(div);
                    }
                    
                    teamPlayers.forEach(p => {
                        this.renderRow(list, p, false);
                    });
                });
            }
        },

        renderRow(container, p, isFFA) {
            const row = document.createElement('div');
            
            let teamClass = `team-${p.teamId}`;
            
            // FFA Override: 
            // Local Player = Team 0 color (Friendly Blue)
            // Everyone else = Team 1 color (Enemy Red)
            if (isFFA) {
                if (p.isLocal) teamClass = 'team-0';
                else teamClass = 'team-1';
            }
            
            const localClass = p.isLocal ? 'local' : '';
            const deadClass = p.isDead ? 'dead' : ''; // Add dead class
            
            row.className = `sb-row ${teamClass} ${localClass} ${deadClass}`;
            
            // Append Skull if dead
            const nameHtml = p.isDead ? 
                `${p.name} <span class="dead-skull" style="color:#ff3333; margin-left:6px; font-size:14px;">☠</span>` : 
                p.name;
            
            // Columns: Player, Score, Kills, Deaths, Assists
            row.innerHTML = `
                <div class="sb-cell name-col">${nameHtml}</div>
                <div class="sb-cell">${p.score}</div>
                <div class="sb-cell">${p.kills}</div>
                <div class="sb-cell">${p.deaths}</div>
                <div class="sb-cell">${p.assists}</div>
            `;
            container.appendChild(row);
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ScoreboardManager = ScoreboardManager;
})();