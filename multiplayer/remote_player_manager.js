
// js/multiplayer/remote_player_manager.js
// --- ORCHESTRATOR ONLY: DO NOT ADD CORE FUNCTIONALITIES HERE ---
// Delegate Visuals to RemotePlayerVisuals.js
// Delegate Animation to RemotePlayerAnimator.js

(function() {
    const RemotePlayerManager = {
        remotePlayers: {},
        pendingPlayers: new Set(),
        SYMBOLS: ['◆', '●', '■', '▼', '▲', '♠'],
        frameCount: 0,
        
        frustum: null,
        projScreenMatrix: null,
        cullingEnabled: false, 

        addPlayer(player) {
            if (this.remotePlayers[player.id]) return;
            if (this.pendingPlayers.has(player)) return;
            
            const name = player.getState('name');
            const teamId = player.getState('teamId');
            
            if (!name || name === "" || name === "..." || teamId === undefined) {
                this.pendingPlayers.add(player);
                return;
            }
            
            this.initializeRemotePlayer(player, name, teamId);
        },
        
        initializeRemotePlayer(player, name, teamId) {
            if (!window.TacticalShooter.RemotePlayerVisuals) return;
            if (!window.TacticalShooter.RemotePlayer) return; 
            
            const finalName = name || "Unknown";
            const assignment = this._getAssignment(player, teamId);
            
            const visuals = window.TacticalShooter.RemotePlayerVisuals.createVisuals(player.id, finalName, assignment);
            if (!visuals) return;

            const rp = new window.TacticalShooter.RemotePlayer(player, {
                name: finalName,
                teamId: assignment.teamId,
                teamColor: assignment.teamColor,
                symbol: assignment.symbol,
                ...visuals
            });
            
            const weaponId = player.getState('weaponId') || "PISTOL"; 
            const attachments = player.getState('attachments') || [];
            window.TacticalShooter.RemotePlayerVisuals.equipWeapon(rp, weaponId, attachments);
            
            if (window.TacticalShooter.RemotePlayerAnimator) {
                rp.animator = new window.TacticalShooter.RemotePlayerAnimator(rp.mesh, rp.parts, rp.weaponParts, rp.weaponMesh, rp.weaponDef);
                const currentLastFired = player.getState('lastFired') || 0;
                rp.animator.setWeaponContext(rp.weaponMesh, rp.weaponParts, rp.weaponDef, rp.muzzleFlashGroup, currentLastFired);
            }
            
            this.remotePlayers[player.id] = rp;
            console.log(`RemotePlayerManager: Initialized ${finalName} (T${assignment.teamId})`);
        },

        removePlayer(playerId) {
            for (const p of this.pendingPlayers) {
                if (p.id === playerId) {
                    this.pendingPlayers.delete(p);
                    return;
                }
            }

            const rp = this.remotePlayers[playerId];
            if (!rp) return;
            
            // If ALIVE when disconnected, spawn crumple ragdoll
            if (rp.currentStatus === 'ALIVE' && !rp.isRagdolled && window.TacticalShooter.RagdollManager) {
                const crumpleImpulse = new THREE.Vector3((Math.random() - 0.5) * 1.5, -2.0, (Math.random() - 0.5) * 1.5);
                window.TacticalShooter.RagdollManager.spawn(rp.mesh, rp.teamColor, rp.mesh.position, rp.mesh.rotation.y, crumpleImpulse);
            }
            
            rp.cleanup();
            delete this.remotePlayers[playerId];
            console.log(`RemotePlayerManager: Removed ${rp.name}`);
        },

        removeAll() {
            for (const id in this.remotePlayers) {
                this.removePlayer(id);
            }
            this.pendingPlayers.clear();
        },
        
        setCullingEnabled(enabled) {
            this.cullingEnabled = enabled;
            console.log(`RemotePlayerManager: Off-screen culling ${enabled ? 'ENABLED' : 'DISABLED'}`);
        },

        getHitboxes() {
            const boxes = [];
            for (const id in this.remotePlayers) {
                const rp = this.remotePlayers[id];
                if (rp.mesh && rp.mesh.visible) {
                    boxes.push(rp.mesh);
                }
                // Add Remote Drones to hitboxes
                if (rp.droneMesh && rp.droneMesh.visible) {
                    boxes.push(rp.droneMesh);
                }
            }
            return boxes;
        },
        
        runVerificationSequence() {
            const ids = Object.keys(this.remotePlayers);
            const count = ids.length;
            if (count === 0) return;
            const interval = 5000 / Math.max(1, count);
            ids.forEach((id, index) => {
                setTimeout(() => {
                    this.verifyPlayerIdentity(id);
                }, index * interval);
            });
        },
        
        verifyPlayerIdentity(id) {
            const rp = this.remotePlayers[id];
            if (!rp || !rp.player) return;
            
            const realTeam = rp.player.getState('teamId');
            const realName = rp.player.getState('name');
            if (realTeam === undefined || !realName) return;
            
            let mismatch = false;
            if (rp.teamId !== realTeam) mismatch = true;
            if (rp.name !== realName) mismatch = true;
            
            if (mismatch) {
                const assignment = this._getAssignment(rp.player, realTeam);
                rp.teamId = assignment.teamId;
                rp.teamColor = assignment.teamColor;
                rp.symbol = assignment.symbol;
                rp.name = realName;
                if (window.TacticalShooter.RemotePlayerVisuals) {
                    window.TacticalShooter.RemotePlayerVisuals.updateVisualIdentity(rp, realName, assignment);
                }
            }
        },

        update(dt) {
            // 1. Process Pending
            if (this.pendingPlayers.size > 0) {
                const toInit = [];
                for (const player of this.pendingPlayers) {
                    const name = player.getState('name');
                    const teamId = player.getState('teamId');
                    if (name && name !== "" && name !== "..." && teamId !== undefined) {
                        toInit.push({ player, name, teamId });
                    }
                }
                toInit.forEach(item => {
                    this.pendingPlayers.delete(item.player);
                    this.initializeRemotePlayer(item.player, item.name, item.teamId);
                });
            }

            // 2. Setup Frustum & Context
            if (!this.frustum && window.THREE) {
                this.frustum = new THREE.Frustum();
                this.projScreenMatrix = new THREE.Matrix4();
            }

            this.frameCount++; 
            const Visuals = window.TacticalShooter.RemotePlayerVisuals;
            const MS = window.TacticalShooter.MatchState;
            const gameManager = window.TacticalShooter.GameManager;
            const gameCamera = gameManager ? gameManager.camera : null;
            
            if (gameCamera && this.frustum && this.projScreenMatrix) {
                this.projScreenMatrix.multiplyMatrices(gameCamera.projectionMatrix, gameCamera.matrixWorldInverse);
                this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
            }
            
            // Build Context for Visuals
            const lobbyUI = document.getElementById('lobby-ui-layer');
            const isLobby = (MS && MS.state.status === 'LOBBY') || (lobbyUI && lobbyUI.classList.contains('active'));
            let showNametags = !isLobby;
            if (window.TacticalShooter.config && !window.TacticalShooter.config.showNametags) showNametags = false;

            let staticCollider = null;
            if (window.TacticalShooter.GameManager) {
                staticCollider = window.TacticalShooter.GameManager.staticCollider;
            }
            else if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentMap) {
                staticCollider = window.TacticalShooter.GameManager.currentMap.geometry; // Array
            }
            
            const context = {
                camera: gameCamera,
                frustum: this.frustum,
                cullingEnabled: this.cullingEnabled,
                collidables: Array.isArray(staticCollider) ? staticCollider : [staticCollider],
                hitboxes: this.getHitboxes(), // Dynamic players
                showNametags: showNametags,
                isLobby: isLobby,
                isNightMap: (MS && MS.state.nightMode === true),
                localTeamId: window.TacticalShooter.TeamManager ? window.TacticalShooter.TeamManager.getLocalTeamId() : 0,
                isFFA: (MS && MS.state.gamemode === 'FFA')
            };

            // 3. Loop Remote Players
            for (const id in this.remotePlayers) {
                const rp = this.remotePlayers[id];
                if (!rp.player) continue;
                
                const worldVelocity = rp.update(dt);
                
                if (rp.updateDrone) {
                    rp.updateDrone(dt);
                }
                
                // Identity Check (Low Freq)
                const updateFreq = (rp.name === '...' || rp.name === 'Player') ? 5 : 60;
                if ((this.frameCount + rp.lodOffset) % updateFreq === 0) {
                    const newState = this._getAssignment(rp.player);
                    if (rp.teamId !== newState.teamId || rp.teamColor !== newState.teamColor) {
                        rp.teamId = newState.teamId; rp.teamColor = newState.teamColor; rp.symbol = newState.symbol;
                        Visuals.updateVisualIdentity(rp, rp.name, newState);
                    }
                    const remoteNameState = rp.player.getState('name');
                    if (remoteNameState && remoteNameState !== rp.name && remoteNameState.length > 0) {
                        rp.name = remoteNameState; 
                        Visuals.updateVisualIdentity(rp, remoteNameState, newState);
                    }
                }
                
                // --- RAGDOLL SYNC ---
                const ragdollData = rp.player.getState('ragdollData');
                const netStatus = rp.player.getState('status');

                if (ragdollData) {
                    // SERVER SAYS: DEAD
                    if (!rp.isRagdolled) {
                        const timeSince = Date.now() - rp.lastRagdollTime;
                        if (timeSince > 1000) { 
                            rp.triggerRagdoll(); 
                        } else {
                            rp.isRagdolled = true;
                            rp.mesh.visible = false;
                        }
                    }
                    if (rp.processHitQueue) rp.processHitQueue();
                    continue; 
                } 
                else {
                    // SERVER SAYS: NO RAGDOLL DATA
                    if (rp.isRagdolled && netStatus === 'ALIVE') { 
                        rp.isRagdolled = false; 
                        rp.mesh.visible = true; 
                        if(rp.tagGroup) rp.tagGroup.visible = true; 
                    }
                }

                rp.updateLogic(dt, this.frameCount);
                
                // Delegate Visual Update to Helper
                Visuals.updateFrame(rp, dt, this.frameCount, context);
                
                if (rp.mesh.visible) {
                    rp.updateAnim(dt, worldVelocity);
                }
            }
        },

        _getAssignment(player, overrideTeamId) {
            const id = player.id || player; 
            const teamId = (overrideTeamId !== undefined) ? overrideTeamId : (player.getState ? player.getState('teamId') : undefined);
            const validTid = (typeof teamId === 'number') ? teamId : 0;
            const TM = window.TacticalShooter.TeamManager;
            let color = "#ffffff"; 
            const MS = window.TacticalShooter.MatchState;
            const isFFA = (MS && MS.state.gamemode === 'FFA');
            if (isFFA) color = "#EE0000"; 
            else {
                if (TM && TM.teams[validTid]) {
                    if (validTid === 0) color = "#0077CC"; 
                    else if (validTid === 1) color = "#EE0000"; 
                    else color = TM.teams[validTid].color;
                } else color = "#00AAFF"; 
            }
            let hash = 0;
            for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i) | 0;
            const symbolIndex = Math.abs(hash) % this.SYMBOLS.length;
            return { teamId: validTid, teamColor: color, symbol: this.SYMBOLS[symbolIndex] };
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.RemotePlayerManager = RemotePlayerManager;
})();
