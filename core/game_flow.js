
// js/core/game_flow.js
(function() {
    const GameFlow = {
        enterMenu(scope) {
            scope.currentState = "MENU";
            scope.isMenuMode = true; 
            if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.setVisible(false);
            
            if (window.TacticalShooter.MenuRenderer) {
                window.TacticalShooter.MenuRenderer.stop();
            }
            
            if (scope.currentMap) {
                // Ensure map is visible
                scope.currentMap.setVisible(true);
            }
            
            // Re-apply lighting just in case map changed
            const WB = window.TacticalShooter.WorldBuilder;
            if (WB) {
                const lighting = WB.getActiveLighting();
                window.TacticalShooter.Raytracer.applyLighting(scope.scene, scope.renderer, lighting);
                window.TacticalShooter.SkyRenderer.init(scope.scene, lighting);
                
                // Show sky elements
                if (window.TacticalShooter.Raytracer.lights.sun) window.TacticalShooter.Raytracer.lights.sun.visible = true;
                if (window.TacticalShooter.SkyRenderer.skyMesh) window.TacticalShooter.SkyRenderer.skyMesh.visible = true;
                if (window.TacticalShooter.SkyRenderer.sunGroup) window.TacticalShooter.SkyRenderer.sunGroup.visible = true;
                if (window.TacticalShooter.SkyRenderer.starSystem) window.TacticalShooter.SkyRenderer.starSystem.visible = true;
            }

            const canvas = document.getElementById('game-canvas');
            if (canvas) canvas.classList.add('canvas-blur');
            
            if (window.TacticalShooter.MultiplayerUI) window.TacticalShooter.MultiplayerUI.setHUDVisible(false);
        },

        enterSpectator(scope) {
            if (document.hidden) { 
                this._enterGameInternal(scope, true); 
                return; 
            }
            this._enterGameInternal(scope, true);
        },
        
        enterGame(scope) {
            if (document.hidden) { 
                this._enterGameInternal(scope, false); 
                return; 
            }
            if (scope.currentState === 'TRANSITION' || scope.currentState === 'IN_GAME') return;
            this.startTransition(scope, false);
        },
        
        startTransition(scope, isSpectator = false) {
            scope.currentState = "TRANSITION";
            scope.transition.active = true;
            scope.transition.timer = 0;
            scope.transition.duration = 2.0; 
            scope.transition.blackoutTriggered = false;
            scope.pendingIsSpectator = isSpectator;
            
            scope.transition.startPos.copy(scope.camera.position);
            scope.transition.startRot.copy(scope.camera.quaternion);
            scope.transition.startFOV = 75; 
            scope.transition.endFOV = 75;
            
            // Calculate Spawn and cache it for the end of transition
            const spawnData = window.TacticalShooter.SpawnSystem.calculateSpawnPoint();
            window.TacticalShooter.SpawnSystem.cachedSpawnData = spawnData; 
            
            // Init controller at spawn point immediately to prevent falling during transition
            if (window.TacticalShooter.CharacterController) {
                window.TacticalShooter.CharacterController.init(spawnData.pos);
                if (window.TacticalShooter.PlayerCamera) {
                    window.TacticalShooter.PlayerCamera.yaw = spawnData.rot;
                    window.TacticalShooter.PlayerCamera.pitch = 0;
                }
            }

            scope.transition.endPos.set(spawnData.pos.x, spawnData.pos.y + 1.6, spawnData.pos.z);
            scope.transition.endRot.setFromEuler(new THREE.Euler(0, spawnData.rot, 0, 'YXZ'));
        },
        
        async _enterGameInternal(scope, isSpectatorMode = false) {
            scope.currentState = "LOADING";
            
            // Preload Weapons
            if (!isSpectatorMode && window.TacticalShooter.LoadoutManager) {
                const lm = window.TacticalShooter.LoadoutManager;
                const loadoutIdx = lm.currentLoadoutIndex; 
                if (loadoutIdx >= 0) {
                    try {
                        if (window.TacticalShooter.AssetLoader) {
                            const l = lm.getLoadout(loadoutIdx);
                            await Promise.all([
                                window.TacticalShooter.AssetLoader.loadWeapon(l.primary.id),
                                window.TacticalShooter.AssetLoader.loadWeapon(l.secondary.id),
                                window.TacticalShooter.AssetLoader.loadWeapon(l.melee.id)
                            ]);
                        }
                    } catch (e) { console.error(e); }
                }
            }
            
            await this.checkMapSync(scope);
            scope.isMenuMode = false;
            
            if (window.TacticalShooter.PlayerState) {
                if (isSpectatorMode) window.TacticalShooter.PlayerState.enterSpectatorMode();
                else window.TacticalShooter.PlayerState.respawn(); 
            }
            
            if (!isSpectatorMode && window.TacticalShooter.WeaponManager) {
                window.TacticalShooter.WeaponManager.reset();
            }
            
            if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.stop();
            
            const WB = window.TacticalShooter.WorldBuilder;
            if (WB) {
                const mapLighting = WB.getActiveLighting();
                window.TacticalShooter.Raytracer.applyLighting(scope.scene, scope.renderer, mapLighting);
                window.TacticalShooter.SkyRenderer.init(scope.scene, mapLighting);
                
                if (window.TacticalShooter.ShadowManager && window.TacticalShooter.Raytracer.lights.sun) {
                    window.TacticalShooter.ShadowManager.setupDirectionalLight(window.TacticalShooter.Raytracer.lights.sun, scope.camera);
                }

                if (mapLighting && mapLighting.atmosphere) {
                    window.TacticalShooter.SceneController.setBackground(mapLighting.atmosphere.horizonColor);
                }
                
                // Show Sky
                if (window.TacticalShooter.SkyRenderer.skyMesh) window.TacticalShooter.SkyRenderer.skyMesh.visible = true;
                if (window.TacticalShooter.SkyRenderer.sunGroup) window.TacticalShooter.SkyRenderer.sunGroup.visible = true;
                if (window.TacticalShooter.SkyRenderer.starSystem) window.TacticalShooter.SkyRenderer.starSystem.visible = true;
                
                // Show Game Meshes
                WB.updateMapVisuals(false); 
            }
            
            window.TacticalShooter.SceneController.updateReflections();
            
            if (window.TacticalShooter.MultiplayerUI) {
                if (isSpectatorMode) {
                    window.TacticalShooter.MultiplayerUI.setHUDVisible(false);
                    const roomCode = document.getElementById('room-code-display');
                    if (roomCode) roomCode.style.display = 'flex'; 
                } else {
                    window.TacticalShooter.MultiplayerUI.setHUDVisible(true);
                }
            }
            
            if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.applySettingsToDOM(); 
            
            if (isSpectatorMode) {
                const settings = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings : {};
                
                if (settings.spectateDrone) {
                    // FIX: If using drone, PlayerState.enterSpectatorMode already moved us to void.
                    // DO NOT RESET POSITION TO MAP CENTER.
                    // Ensure controller is active (even in void) so network syncs the "hidden" position.
                    if (window.TacticalShooter.CharacterController) {
                        window.TacticalShooter.CharacterController.init(new THREE.Vector3(0, -9000, 0));
                        window.TacticalShooter.CharacterController.isNoclip = true;
                    }
                    if (window.TacticalShooter.PlayerCamera) {
                        window.TacticalShooter.PlayerCamera.init(scope.camera, { x: 0, y: 0, z: 0 });
                    }
                } else {
                    // Regular Free Cam
                    if (window.TacticalShooter.CharacterController) {
                        window.TacticalShooter.CharacterController.init(new THREE.Vector3(0, 7.5, 0));
                        window.TacticalShooter.CharacterController.isNoclip = true;
                    }
                    if (window.TacticalShooter.PlayerCamera) {
                        window.TacticalShooter.PlayerCamera.init(scope.camera, { x: 0, y: 0, z: 0 });
                    }
                }
            } else {
                if (window.TacticalShooter.SpawnSystem) {
                    window.TacticalShooter.SpawnSystem.spawnPlayer(scope.camera); 
                }
            }
            
            if (window.TacticalShooter.GunRenderer) {
                window.TacticalShooter.GunRenderer.setVisible(!isSpectatorMode);
            }
            
            if (window.TacticalShooter.MatchState && window.TacticalShooter.MatchState.state.status === 'PRE_ROUND') {
                if (window.TacticalShooter.PlayerState && !isSpectatorMode) window.TacticalShooter.PlayerState.toggleInGameLoadoutPicker(true);
            }
            
            const canvas = document.getElementById('game-canvas');
            if (canvas) canvas.classList.remove('canvas-blur');
            
            scope.currentState = "IN_GAME";
        },
        
        async checkMapSync(scope) {
            const MS = window.TacticalShooter.MatchState ? window.TacticalShooter.MatchState.state : null;
            if (!MS) return;
            const targetMapId = MS.mapId;
            let needsLoad = false;
            
            if (!scope.currentMap) {
                needsLoad = true;
            } else if (scope.currentMap.id !== targetMapId) {
                if (targetMapId.includes(scope.currentMap.id) || scope.currentMap.id.includes(targetMapId)) {
                    // Warehouse Day/Night Toggle
                    if (scope.currentMap.id === 'WAREHOUSE' && targetMapId === 'WAREHOUSE_NIGHT') needsLoad = true;
                    else if (scope.currentMap.id === 'WAREHOUSE' && targetMapId === 'WAREHOUSE') needsLoad = false;
                    else needsLoad = true;
                } else {
                    needsLoad = true;
                }
            }
            
            if (needsLoad) {
                // Delegate to WorldBuilder via GameManager OR directly
                // GameManager currently delegates to WorldBuilder anyway.
                // We'll call scope.loadMap which delegates to WorldBuilder.
                if (scope.loadMap) await scope.loadMap(targetMapId);
            }
        },

        updateTransition(scope, dt) {
            if (!scope.transition.active) return;
            
            scope.transition.timer += dt;
            const progress = Math.min(1.0, scope.transition.timer / scope.transition.duration);
            const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            
            scope.camera.position.lerpVectors(scope.transition.startPos, scope.transition.endPos, ease);
            scope.camera.quaternion.slerpQuaternions(scope.transition.startRot, scope.transition.endRot, ease);
            
            scope.camera.fov = THREE.MathUtils.lerp(scope.transition.startFOV, scope.transition.endFOV, ease);
            scope.camera.updateProjectionMatrix();
            
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                const fadeProgress = Math.min(1.0, progress * 2.0); 
                if (fadeProgress < 1.0) {
                    canvas.style.filter = `blur(${5 * (1.0-fadeProgress)}px)`;
                } else {
                    canvas.style.filter = "none";
                    canvas.classList.remove('canvas-blur');
                }
            }

            const overlay = document.getElementById('transition-overlay');
            if (overlay && progress > 0.7) {
                const fadeProgress = (progress - 0.7) / 0.3; 
                overlay.style.opacity = fadeProgress;
            }
            
            if (progress >= 1.0 && !scope.transition.blackoutTriggered) {
                scope.transition.blackoutTriggered = true;
                if (overlay) overlay.style.opacity = 1;
                
                this._enterGameInternal(scope, scope.pendingIsSpectator);
                
                setTimeout(() => {
                    if (overlay) overlay.style.opacity = 0;
                }, 800);
                
                scope.transition.active = false;
            }
        },

        updateMenuCamera(scope, dt) {
            scope.menuRotationAngle += dt * 0.1;
            const center = new THREE.Vector3(0, 10, 0);
            let radius = 40.0;
            let targetY = 15.0;
            
            if (scope.currentMap && (scope.currentMap.id === 'WAREHOUSE' || scope.currentMap.id === 'WAREHOUSE_NIGHT')) {
                center.y = 7.5; 
                radius = 25.0;  
                targetY = 7.5;  
            }
            
            const camX = center.x + Math.sin(scope.menuRotationAngle) * radius;
            const camZ = center.z + Math.cos(scope.menuRotationAngle) * radius;
            
            scope.camera.position.set(camX, targetY, camZ);
            scope.camera.lookAt(center);
            scope.camera.updateMatrixWorld();
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameFlow = GameFlow;
})();
