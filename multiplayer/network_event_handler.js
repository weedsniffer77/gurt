
// js/multiplayer/network_event_handler.js
(function() {
    const NetworkEventHandler = {
        hitQueue: [],
        initialized: false,
        onChatReceived: null, 
        
        init() {
            if (this.initialized) return;
            console.log("NetworkEventHandler: Initializing RPCs...");
            
            if (!window.Playroom || !Playroom.RPC) return;

            // Register RPC Listeners
            Playroom.RPC.register('ON_DEATH', (data, sender) => {
                this._handleKillfeedEvent(data, sender);
            });
            
            Playroom.RPC.register('ON_THROW', (data, sender) => {
                const myId = window.TacticalShooter.PlayroomManager.myPlayer.id;
                if (sender.id === myId) return; 
                
                if (data.type === 'RPG7' || data.type === 'OGV7') {
                    if (window.TacticalShooter.ProjectileManager) {
                        window.TacticalShooter.ProjectileManager.spawnRemote(data.origin, data.velocity, data.type, sender.id);
                    }
                } 
                else if (window.TacticalShooter.ThrowableManager) {
                    window.TacticalShooter.ThrowableManager.spawnRemote(data.origin, data.velocity, data.type, sender.id);
                }
            });
            
            Playroom.RPC.register('ON_CHAT', (data, sender) => {
                if (sender.id === window.TacticalShooter.PlayroomManager.myPlayer.id) return;
                if (this.onChatReceived) {
                    this.onChatReceived(data);
                }
            });
            
            Playroom.RPC.register('REQUEST_IDENTITY', (data, sender) => {
                const PM = window.TacticalShooter.PlayroomManager;
                const myId = PM.myPlayer ? PM.myPlayer.id : null;
                if (sender.id === myId) return;
                console.log(`NetworkEventHandler: Identity Request from ${sender.id}. Broadcasting...`);
                PM.broadcastPlayerData();
            });
            
            Playroom.RPC.register('START_VERIFICATION', (data, sender) => {
                console.log("NetworkEventHandler: Verification Triggered. Running Round Robin check...");
                if (window.TacticalShooter.RemotePlayerManager) {
                    window.TacticalShooter.RemotePlayerManager.runVerificationSequence();
                }
            });
            
            Playroom.RPC.register('SPAWN_ENTITY', (data, sender) => {
                if (window.TacticalShooter.EntityManager) {
                    window.TacticalShooter.EntityManager.spawnRemote(data.type, data.pos, data.quat, data.vel, data.id);
                }
            });
            
            Playroom.RPC.register('ENTITY_USED', (data, sender) => {
                if (window.TacticalShooter.EntityManager) {
                    window.TacticalShooter.EntityManager.handleRemoteUsage(data.id);
                }
            });
            
            // --- KILL CONFIRMATION ---
            Playroom.RPC.register('KILL_CONFIRM', (data, sender) => {
                // If I am the victim, I MUST die.
                const myId = window.TacticalShooter.PlayroomManager.myPlayer.id;
                if (data.victimId === myId) {
                    console.warn(`NetworkEventHandler: RECEIVED KILL CONFIRM FROM ${sender.id}. FORCING DEATH.`);
                    if (window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.modules.health) {
                        window.TacticalShooter.PlayerState.modules.health.forceDeath(sender.id);
                    }
                }
            });
            
            // --- AIRSTRIKE ---
            Playroom.RPC.register('ON_AIRSTRIKE', (data, sender) => {
                if (window.TacticalShooter.ScorestreakManager) {
                    // targetPos arrives as simple object {x,y,z}, convert to Vector3
                    const pos = new window.THREE.Vector3(data.pos.x, data.pos.y, data.pos.z);
                    window.TacticalShooter.ScorestreakManager.handleAirstrikeEvent(sender.id, pos, data.teamId);
                }
            });
            
            this.initialized = true;
        },

        // --- BROADCASTS ---

        broadcastDeath(killerId, hitPart) {
            if (!window.Playroom || !Playroom.RPC) return;
            Playroom.RPC.call('ON_DEATH', { killerId: killerId, hitPart: hitPart }, Playroom.RPC.Mode.ALL);
        },
        
        broadcastThrow(origin, velocity, type) {
            if (!window.Playroom || !Playroom.RPC) return;
            Playroom.RPC.call('ON_THROW', { origin, velocity, type }, Playroom.RPC.Mode.OTHERS);
        },
        
        broadcastChat(messageData) {
            if (!window.Playroom || !Playroom.RPC) return;
            Playroom.RPC.call('ON_CHAT', messageData, Playroom.RPC.Mode.OTHERS);
        },
        
        broadcastIdentityRequest() {
            if (!window.Playroom || !Playroom.RPC) return;
            Playroom.RPC.call('REQUEST_IDENTITY', {}, Playroom.RPC.Mode.OTHERS);
        },
        
        broadcastVerification() {
            if (!window.Playroom || !Playroom.RPC) return;
            Playroom.RPC.call('START_VERIFICATION', {}, Playroom.RPC.Mode.ALL);
        },
        
        broadcastSpawnEntity(type, pos, quat, vel, id) {
            if (!window.Playroom || !Playroom.RPC) return;
            Playroom.RPC.call('SPAWN_ENTITY', { type, pos, quat, vel, id }, Playroom.RPC.Mode.OTHERS);
        },
        
        broadcastEntityUsed(id) {
            if (!window.Playroom || !Playroom.RPC) return;
            Playroom.RPC.call('ENTITY_USED', { id }, Playroom.RPC.Mode.OTHERS);
        },
        
        broadcastKillConfirm(victimId) {
            if (!window.Playroom || !Playroom.RPC) return;
            console.log(`NetworkEventHandler: Sending Kill Confirm to ${victimId}`);
            Playroom.RPC.call('KILL_CONFIRM', { victimId: victimId }, Playroom.RPC.Mode.ALL);
        },
        
        broadcastAirstrike(ownerId, targetPos, teamId) {
            if (!window.Playroom || !Playroom.RPC) return;
            Playroom.RPC.call('ON_AIRSTRIKE', { 
                pos: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
                teamId: teamId 
            }, Playroom.RPC.Mode.OTHERS);
        },
        
        broadcastBulletHit(position, normal, targetId, damage = 0, hitPart = null, ragdollImpulse = 2.0, isStealth = false, damageOrigin = null, hitDirection = null, damageType = 'gun') {
            const PM = window.TacticalShooter.PlayroomManager;
            if (!PM || !PM.myPlayer) return;

            // --- TRACK OUTGOING DAMAGE FOR ASSISTS & KILL TYPE ---
            // Pass damageType to ScoreSystem
            if (damage > 0 && targetId && window.TacticalShooter.ScoreSystem && hitPart !== 'Drone') {
                window.TacticalShooter.ScoreSystem.recordOutgoingDamage(targetId, damage, damageType);
            }

            const stealthVal = (typeof isStealth === 'object' && isStealth !== null) ? (isStealth.stealth ? true : undefined) : (isStealth === true ? true : undefined);

            const hitData = {
                id: Math.random().toString(36).substr(2, 9),
                x: Math.round(position.x * 100) / 100,
                y: Math.round(position.y * 100) / 100,
                z: Math.round(position.z * 100) / 100,
                nx: Math.round(normal.x * 1000) / 1000,
                ny: Math.round(normal.y * 1000) / 1000,
                nz: Math.round(normal.z * 1000) / 1000,
                targetId: targetId || null,
                dmg: damage,
                part: hitPart,
                imp: ragdollImpulse,
                stealth: stealthVal,
                t: Date.now()
            };

            if (damageOrigin) {
                hitData.ox = Math.round(damageOrigin.x * 100) / 100;
                hitData.oy = Math.round(damageOrigin.y * 100) / 100;
                hitData.oz = Math.round(damageOrigin.z * 100) / 100;
            }
            
            if (hitDirection) {
                hitData.dx = Math.round(hitDirection.x * 1000) / 1000;
                hitData.dy = Math.round(hitDirection.y * 1000) / 1000;
                hitData.dz = Math.round(hitDirection.z * 1000) / 1000;
            }

            this.hitQueue.push(hitData);
            if (this.hitQueue.length > 10) this.hitQueue.shift();
            PM.myPlayer.setState('hitQueue', [...this.hitQueue], true);
            
            // --- IMMEDIATE LOCAL PREDICTION (Anti-Duplicate) ---
            if (targetId && targetId !== PM.myPlayer.id && window.TacticalShooter.RemotePlayerManager) {
                const victim = window.TacticalShooter.RemotePlayerManager.remotePlayers[targetId];
                if (victim) {
                    if (hitPart !== 'Drone') {
                        if (victim.damageHealth > 0) {
                            victim.damageHealth = Math.max(0, victim.damageHealth - (damage || 0));
                        }
                        
                        // Flinch
                        if (victim.animator && victim.animator.triggerFlinch) {
                             const MS = window.TacticalShooter.MatchState;
                             const isFFA = MS && MS.state.gamemode === 'FFA';
                             let canFlinch = true;
                             if (!isFFA && !MS.state.friendlyFire && victim.teamId === window.TacticalShooter.TeamManager.getLocalTeamId()) canFlinch = false;
                             if (canFlinch) {
                                 victim.animator.triggerFlinch(hitPart || 'Torso', new THREE.Vector3(normal.x, normal.y, normal.z));
                             }
                        }
                    }
                }
            }
            
            // Local Self Damage
            if (targetId === PM.myPlayer.id) {
                if (window.TacticalShooter.PlayerState) {
                    let impulseOverride = null;
                    if (hitDirection) impulseOverride = new THREE.Vector3(hitDirection.x, hitDirection.y, hitDirection.z);
                    else impulseOverride = new THREE.Vector3(normal.x, normal.y, normal.z);
                    
                    if (hitPart === 'Drone') {
                        if (window.TacticalShooter.DroneController && window.TacticalShooter.DroneController.active) {
                            window.TacticalShooter.DroneController.takeDamage(damage || 0);
                        }
                    } else {
                        window.TacticalShooter.PlayerState.takeDamage(damage || 0, this.id, hitPart, ragdollImpulse, isStealth, damageOrigin, impulseOverride);
                    }
                }
            }
        },

        _handleKillfeedEvent(data, victimPlayer) {
            const PM = window.TacticalShooter.PlayroomManager;
            if (!PM || !PM.myPlayer) return;

            const victimName = victimPlayer.getState('name') || "Unknown";
            const killerId = data.killerId;
            let killerName = "Unknown";
            
            if (window.TacticalShooter.ScoreSystem) {
                window.TacticalShooter.ScoreSystem.onDeathEvent(victimPlayer.id, killerId, data.hitPart);
            }
            
            if (killerId === PM.myPlayer.id) {
                killerName = PM.localPlayerName;
                if (victimPlayer.id !== PM.myPlayer.id) {
                    const currentKills = PM.myPlayer.getState('kills') || 0;
                    PM.myPlayer.setState('kills', currentKills + 1, true);
                    if (window.TacticalShooter.HitmarkerSystem) window.TacticalShooter.HitmarkerSystem.show('kill');
                }
            } else {
                if (window.TacticalShooter.RemotePlayerManager && window.TacticalShooter.RemotePlayerManager.remotePlayers[killerId]) {
                    killerName = window.TacticalShooter.RemotePlayerManager.remotePlayers[killerId].name;
                }
            }
            
            if (window.TacticalShooter.Killfeed) {
                let type = 'red';
                const myId = PM.myPlayer.id;
                if (killerId === myId) type = 'gold'; 
                else if (victimPlayer.id === myId) type = 'red'; 
                else type = 'blue'; 
                
                const verb = (killerId === victimPlayer.id) ? "COMMITTED SUICIDE" : "KILLED";
                window.TacticalShooter.Killfeed.show(killerName, (killerId===victimPlayer.id ? "" : victimName), type, verb);
            }
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.NetworkEventHandler = NetworkEventHandler;
})();
