
// js/ui/nametag_system.js
(function() {
    const NametagSystem = {
        _nameTextureCache: {}, 
        _symbolTextureCache: {},
        _healthBarTextures: {}, 
        
        _tempVec: null,
        _camPos: null,
        
        init() {
            if (!window.THREE) return;
            this._tempVec = new THREE.Vector3();
            this._camPos = new THREE.Vector3();
            
            // Pre-generate standard health bar textures
            this._healthBarTextures.bg = this._createHealthBarTexture("#000000", false);
            this._healthBarTextures.damage = this._createHealthBarTexture("#aaaaaa", false);
        },

        createTag(name, teamColor, symbol) {
            if (!this._tempVec) this.init();
            
            const group = new THREE.Group();
            group.position.y = 2.1;

            // 1. Name Sprite
            const nameTex = this._getNameTexture(name, teamColor);
            const nameMat = new THREE.SpriteMaterial({ 
                map: nameTex, 
                depthTest: true, 
                depthWrite: false, 
                transparent: true 
            });
            const nameSprite = new THREE.Sprite(nameMat);
            nameSprite.userData.bulletTransparent = true;
            group.add(nameSprite);

            // 2. Symbol Sprite
            const symTex = this._getSymbolTexture(symbol, teamColor);
            const symMat = new THREE.SpriteMaterial({ 
                map: symTex, 
                depthTest: true, 
                depthWrite: false, 
                transparent: true 
            });
            const markerSprite = new THREE.Sprite(symMat);
            markerSprite.userData.bulletTransparent = true;
            group.add(markerSprite);

            // 3. Health Bars
            const hpWidthBase = 1.3;
            const hpHeightBase = 0.15;
            
            const createBar = (tex, colorIfNeeded, isGlow) => {
                let mat;
                if (tex) {
                    mat = new THREE.SpriteMaterial({ 
                        map: tex, 
                        depthTest: true, 
                        depthWrite: false, 
                        transparent: true, 
                        opacity: isGlow ? 1.0 : 0.6 
                    });
                    if (isGlow) mat.blending = THREE.AdditiveBlending;
                } else {
                    // Dynamic color texture (Fill)
                    const dTex = this._createHealthBarTexture(colorIfNeeded, isGlow);
                    mat = new THREE.SpriteMaterial({ 
                        map: dTex, 
                        depthTest: true, 
                        depthWrite: false, 
                        transparent: true, 
                        opacity: 1.0, 
                        blending: isGlow ? THREE.AdditiveBlending : THREE.NormalBlending 
                    });
                }
                const s = new THREE.Sprite(mat);
                s.center.set(0.0, 0.5);
                s.userData.bulletTransparent = true;
                return s;
            };

            const hpBgSprite = createBar(this._healthBarTextures.bg, null, false);
            const hpDamageSprite = createBar(this._healthBarTextures.damage, null, false);
            const hpFillSprite = createBar(null, teamColor, true);

            group.add(hpBgSprite);
            group.add(hpDamageSprite);
            group.add(hpFillSprite);

            return {
                group,
                nameSprite,
                markerSprite,
                hpBgSprite,
                hpDamageSprite,
                hpFillSprite,
                hpWidthBase,
                hpHeightBase
            };
        },
        
        updateIdentity(tagRefs, name, teamColor, symbol) {
            tagRefs.nameSprite.material.map = this._getNameTexture(name, teamColor);
            tagRefs.markerSprite.material.map = this._getSymbolTexture(symbol, teamColor);
            tagRefs.hpFillSprite.material.map.dispose();
            tagRefs.hpFillSprite.material.map = this._createHealthBarTexture(teamColor, true);
        },

        updateTag(rp, camera, dt, showNametags, isNightMap, state, isEnemy, health, isSuppressed) {
            if (!camera || !rp.tagGroup) return;
            
            const refs = {
                nameSprite: rp.nameSprite,
                markerSprite: rp.markerSprite,
                hpBgSprite: rp.hpBgSprite,
                hpDamageSprite: rp.hpDamageSprite,
                hpFillSprite: rp.hpFillSprite
            };

            const spriteCounterRot = -camera.rotation.z;
            refs.nameSprite.material.rotation = spriteCounterRot;
            refs.markerSprite.material.rotation = spriteCounterRot;
            refs.hpBgSprite.material.rotation = spriteCounterRot;
            refs.hpDamageSprite.material.rotation = spriteCounterRot;
            refs.hpFillSprite.material.rotation = spriteCounterRot;

            rp.tagGroup.lookAt(camera.position);
            rp.tagGroup.visible = true;
            
            const dist = camera.position.distanceTo(rp.mesh.position);
            const scaleDist = Math.max(dist, 4.0);
            const screenScale = scaleDist / 8.0; 
            const symbolScale = Math.min(screenScale, 2.5);
            const textScale = Math.min(screenScale, 5.0); 

            refs.markerSprite.scale.set(0.4 * symbolScale, 0.4 * symbolScale, 1);
            refs.nameSprite.scale.set(2.16 * textScale, 0.18 * textScale, 1);

            const baseHpW = rp.hpWidthBase * textScale;
            const baseHpH = rp.hpHeightBase * textScale;
            
            // V59: Scale based on 100 max
            const fillPct = Math.max(0, health) / 100;
            const damPct = Math.max(0, rp.damageHealth) / 100;
            
            // Fill Bar
            refs.hpFillSprite.scale.set(baseHpW * fillPct, baseHpH, 1);
            refs.hpFillSprite.position.set(-baseHpW/2, 0, 0.02);
            
            // Damage Bar
            refs.hpDamageSprite.scale.set(baseHpW * damPct, baseHpH, 1);
            refs.hpDamageSprite.position.set(-baseHpW/2, 0, 0.01);
            
            // Background
            refs.hpBgSprite.scale.set(baseHpW, baseHpH, 1);
            refs.hpBgSprite.position.set(-baseHpW/2, 0, 0);

            const hpY = 0.05 * textScale;
            refs.hpBgSprite.position.y = hpY;
            refs.hpDamageSprite.position.y = hpY;
            refs.hpFillSprite.position.y = hpY;
            
            const nameY = hpY + (baseHpH/2) + (0.18 * textScale / 2) + (0.02 * textScale);
            refs.nameSprite.position.y = nameY;
            refs.markerSprite.position.y = 0.1 * symbolScale;

            if (showNametags) {
                let masterOpacity = 1.0;
                let fadeStart = 100.0;
                let fadeEnd = 150.0;
                
                if (isNightMap) {
                    fadeStart = 4.0; fadeEnd = 5.0;
                } else if (isSuppressed && isEnemy) {
                    fadeStart = 20.0; fadeEnd = 25.0;
                }

                if (dist < fadeStart) masterOpacity = 1.0;
                else if (dist < fadeEnd) masterOpacity = 1.0 - (dist - fadeStart) / (fadeEnd - fadeStart);
                else masterOpacity = 0.0;

                if (isEnemy && (state.isCrouching || state.isProne)) {
                    masterOpacity = 0.0;
                }
                
                // --- SMOKE OCCLUSION CHECK ---
                if (window.TacticalShooter.ParticleManager && window.TacticalShooter.ParticleManager.activeSmokeCenters) {
                    const smokes = window.TacticalShooter.ParticleManager.activeSmokeCenters;
                    if (smokes.length > 0) {
                        rp.tagGroup.getWorldPosition(this._tempVec);
                        this._camPos.copy(camera.position);
                        
                        const ab = this._tempVec.clone().sub(this._camPos);
                        const abSq = ab.lengthSq();
                        
                        for (const smokePos of smokes) {
                            const ap = smokePos.clone().sub(this._camPos);
                            const t = Math.max(0, Math.min(1, ap.dot(ab) / abSq));
                            const closest = this._camPos.clone().add(ab.multiplyScalar(t));
                            const distToSmoke = closest.distanceTo(smokePos);
                            
                            if (distToSmoke < 4.0) {
                                masterOpacity = 0.0;
                                break;
                            }
                        }
                    }
                }
                
                let proximityFactor = 0.0;
                if (dist < 2.0) { proximityFactor = 1.0; masterOpacity = 1.0; } 
                else if (dist < 3.0) { proximityFactor = 1.0 - (dist - 2.0); if (masterOpacity < proximityFactor) masterOpacity = proximityFactor; }

                const camDir = new THREE.Vector3();
                camera.getWorldDirection(camDir);
                rp.tagGroup.getWorldPosition(this._tempVec);
                const playerDir = this._tempVec.sub(camera.position).normalize();
                const angle = camDir.angleTo(playerDir);
                
                let angleFactor = 1.0; 
                if (angle > 0.8) angleFactor = 0.0;
                else if (angle > 0.6) angleFactor = 1.0 - ((angle - 0.6) / 0.2);
                
                let distFactor = 1.0;
                const textFadeStart = Math.min(15.0, fadeStart * 0.5); 
                const textFadeEnd = Math.min(22.0, fadeEnd * 0.6);
                
                if (dist > textFadeEnd) distFactor = 0.0;
                else if (dist > textFadeStart) distFactor = 1.0 - ((dist - textFadeStart) / (textFadeEnd - textFadeStart));
                
                let baseNameAlpha = distFactor * angleFactor * masterOpacity;
                let baseSymbolAlpha = (1.0 - (distFactor * angleFactor)) * masterOpacity;

                let finalNameAlpha = Math.max(baseNameAlpha, proximityFactor * masterOpacity); 
                let finalSymbolAlpha = baseSymbolAlpha * (1.0 - proximityFactor);

                refs.markerSprite.material.opacity = THREE.MathUtils.lerp(refs.markerSprite.material.opacity, finalSymbolAlpha, dt * 10);
                refs.markerSprite.visible = refs.markerSprite.material.opacity > 0.05;
                
                refs.nameSprite.material.opacity = THREE.MathUtils.lerp(refs.nameSprite.material.opacity, finalNameAlpha, dt * 10);
                refs.nameSprite.visible = refs.nameSprite.material.opacity > 0.05;
                
                refs.hpBgSprite.material.opacity = 0.5 * refs.nameSprite.material.opacity;
                refs.hpBgSprite.visible = refs.nameSprite.visible;
                
                refs.hpDamageSprite.material.opacity = 0.8 * refs.nameSprite.material.opacity;
                refs.hpDamageSprite.visible = refs.nameSprite.visible;
                
                refs.hpFillSprite.material.opacity = refs.nameSprite.material.opacity;
                refs.hpFillSprite.visible = refs.nameSprite.visible;
                
            } else {
                refs.nameSprite.visible = false;
                refs.hpBgSprite.visible = false;
                refs.hpDamageSprite.visible = false;
                refs.hpFillSprite.visible = false;
                refs.markerSprite.visible = false;
            }
        },

        _getNameTexture(text, color) {
            const key = text + color;
            if (this._nameTextureCache[key]) return this._nameTextureCache[key];
            const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            let fillStyle = color;
            if (color === "#0077CC") fillStyle = "#0099FF"; 
            else { const baseC = new THREE.Color(color); const lighterC = baseC.clone().lerp(new THREE.Color(0xffffff), 0.1); fillStyle = lighterC.getStyle(); }
            ctx.font = 'bold 36px Arial, sans-serif'; ctx.letterSpacing = '4px'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
            ctx.fillStyle = fillStyle; ctx.fillText(text, 384, 55);
            const tex = new THREE.CanvasTexture(canvas);
            this._nameTextureCache[key] = tex; return tex;
        },

        _getSymbolTexture(symbol, color) {
            const key = symbol + color;
            if (this._symbolTextureCache[key]) return this._symbolTextureCache[key];
            const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.fillStyle = color; ctx.font = 'bold 75px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(symbol, 64, 64);
            const tex = new THREE.CanvasTexture(canvas);
            this._symbolTextureCache[key] = tex; return tex;
        },

        _createHealthBarTexture(color, isGlowing) {
            const w = 128; const h = 32;
            const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            const barH = 5; const padding = 10; const barW = w - (padding * 2); const barY = (h - barH) / 2;
            
            if (isGlowing) {
                const baseC = new THREE.Color(color);
                const style = baseC.getStyle();
                ctx.shadowColor = style; ctx.shadowBlur = 8; ctx.fillStyle = style;
            } else {
                if (color === "#aaaaaa") ctx.fillStyle = "rgba(170, 170, 170, 0.8)";
                else ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; 
            }
            
            ctx.fillRect(padding, barY, barW, barH);
            const tex = new THREE.CanvasTexture(canvas);
            tex.minFilter = THREE.LinearFilter;
            return tex;
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.NametagSystem = NametagSystem;
})();
