
// js/ui/prematch/team_selector.js
(function() {
    const TeamSelector = {
        container: null,
        
        init() {
            // No-op for init now, render() handles finding elements
        },

        render(containerIdOverride) {
            // Robust container finding logic
            if (containerIdOverride) {
                this.container = document.getElementById(containerIdOverride);
            } else {
                // Try MP container 
                this.container = document.getElementById('mp-teams-container');
            }

            if (!this.container) return;
            
            // Only render if container is actually visible/connected to DOM
            if (this.container.offsetParent === null && this.container.style.display === 'none') return;
            
            const MS = window.TacticalShooter.MatchState.state;
            const TM = window.TacticalShooter.TeamManager;
            const localId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : null;
            
            // Determine if players are dead (only if game is PLAYING)
            const isPlaying = (MS.status === 'PLAYING');
            
            // Helper to check health via RemotePlayerManager or Local
            const checkDead = (pid, isLocal) => {
                if (!isPlaying) return false;
                if (isLocal) {
                    return window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.isDead;
                } else if (window.TacticalShooter.RemotePlayerManager) {
                    const rp = window.TacticalShooter.RemotePlayerManager.remotePlayers[pid];
                    return rp && rp.player && (rp.player.getState('health') <= 0);
                }
                return false;
            };

            this.container.innerHTML = '';

            if (MS.gamemode === 'FFA') {
                const players = [];
                const localName = window.TacticalShooter.PlayroomManager.localPlayerName;
                
                players.push({ 
                    name: localName, 
                    isLocal: true, 
                    id: localId, 
                    isDead: checkDead(localId, true) 
                });
                
                if (window.TacticalShooter.RemotePlayerManager) {
                     for (let id in window.TacticalShooter.RemotePlayerManager.remotePlayers) {
                         const rp = window.TacticalShooter.RemotePlayerManager.remotePlayers[id];
                         players.push({ 
                             name: rp.name, 
                             isLocal: false, 
                             id: id,
                             isDead: checkDead(id, false)
                         });
                     }
                }
                this.renderBox(-1, "SOLO", "#555", players, false, true);
            } else {
                const count = MS.teamCount || 2;
                const myTeam = TM.getLocalTeamId();
                
                // UNLOCKED: Allow team switching even during game (for balancing/fun)
                const isLocked = false; 

                for (let i = 0; i < count; i++) {
                    const team = TM.getTeam(i);
                    const teamPlayers = TM.getPlayersOnTeam(i).map(p => ({
                        name: p.name,
                        isLocal: (p.id === localId),
                        id: p.id,
                        isDead: checkDead(p.id, (p.id === localId))
                    }));
                    
                    // Allow joining if not locked AND not currently on this team
                    const canJoin = !isLocked && (myTeam !== i);
                    this.renderBox(i, team.name, team.color, teamPlayers, canJoin, false);
                }
            }
        },

        renderBox(id, name, color, players, canJoin, isFFA) {
            const container = document.createElement('div');
            container.className = `team-container ${canJoin ? 'joinable' : ''}`;
            container.style.borderLeftColor = color;
            
            if (canJoin) {
                container.onclick = () => this.onJoin(id);
                container.style.cursor = 'pointer';
            }

            let cardHtml = `
                <div class="team-header" style="color: ${color}">
                    <span class="team-name">${name}</span>
                    <span class="team-count">${players.length}/16</span>
                </div>
                <!-- REMOVED INLINE STYLES -->
                <div class="team-list">
            `;
            
            players.forEach(p => {
                let rowClass = 'team-player-row';
                if (p.isLocal) rowClass += ' player-row-self';
                if (p.isDead) rowClass += ' dead';
                
                const symbol = this.getSymbol(p.id);
                // Add skull if dead
                const skullHtml = p.isDead ? `<span class="dead-skull" style="color:#ff3333; margin-left:8px; font-size:16px;">☠</span>` : '';
                
                cardHtml += `
                    <div class="${rowClass}">
                        <div class="player-symbol" style="color: ${color}">${symbol}</div>
                        ${p.name}
                        ${skullHtml}
                    </div>
                `;
            });
            
            cardHtml += `   </div>`; 
            container.innerHTML = cardHtml;
            
            this.container.appendChild(container);
        },
        
        onJoin(id) {
            console.log("TeamSelector: Switching to Team " + id);
            window.TacticalShooter.TeamManager.setLocalTeam(id);
            // Re-render immediately to reflect local change
            this.render();
        },
        
        getSymbol(id) {
            if (!id) return '◆';
            const SYMBOLS = ['◆', '●', '■', '▼', '▲', '♠'];
            let hash = 0;
            for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i) | 0;
            return SYMBOLS[Math.abs(hash) % 6];
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.TeamSelector = TeamSelector;
})();
