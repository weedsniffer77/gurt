
// js/render/gun_fx_system.js
(function() {
    const GunFXSystem = {
        // Flash State
        muzzleFlashGroup: null, 
        muzzleFlashGroupLeft: null, 
        flashLight: null, 
        flashMesh: null, 
        flashMeshLeft: null, 
        flashMaterial: null, 
        flashTimer: 0,
        enabled: true,

        // Smoke State
        barrelHeat: 0,
        smokeAccumulator: 0,
        visualConfig: null, 

        // Geometry Refs (for ejection)
        ejectionPoint: null,
        ejectionPointLeft: null,
        fullBodyMesh: null,
        weaponContainer: null,
        currentWeaponDef: null,

        init() {
            if (!window.THREE) return;
            this.flashMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.0, 
                side: THREE.DoubleSide, 
                depthWrite: false, 
                blending: THREE.AdditiveBlending 
            });
        },

        reset() {
            this.muzzleFlashGroup = null; 
            this.muzzleFlashGroupLeft = null; 
            this.flashMesh = null; 
            this.flashMeshLeft = null;
            this.ejectionPoint = null;
            this.ejectionPointLeft = null;
            this.fullBodyMesh = null;
            this.weaponContainer = null;
            this.barrelHeat = 0;
            this.smokeAccumulator = 0;
        },

        setup(weaponDef, parts, containerRefs) {
            this.reset();
            this.currentWeaponDef = weaponDef;
            this.visualConfig = weaponDef.visuals;
            this.fullBodyMesh = containerRefs.fullBodyMesh;
            this.weaponContainer = containerRefs.weaponContainer;
            this.ejectionPoint = parts.ejection;
            this.ejectionPointLeft = parts.ejectionLeft;

            const THREE = window.THREE;

            const _buildMuzzleFlash = (point, isLeft) => {
                if (!point) return;
                const group = new THREE.Group(); point.add(group); group.visible = false;
                if (!isLeft) { 
                    this.flashLight = new THREE.PointLight(0xffaa33, 0, 10); 
                    group.add(this.flashLight); 
                }
                const geom = new THREE.PlaneGeometry(0.3, 0.3);
                const plane1 = new THREE.Mesh(geom, this.flashMaterial); 
                const plane2 = new THREE.Mesh(geom, this.flashMaterial); 
                plane2.rotation.z = Math.PI / 2;
                
                const flashMesh = new THREE.Group(); 
                flashMesh.add(plane1); 
                flashMesh.add(plane2); 
                group.add(flashMesh);
                
                if (isLeft) { 
                    this.muzzleFlashGroupLeft = group; 
                    this.flashMeshLeft = flashMesh; 
                } else { 
                    this.muzzleFlashGroup = group; 
                    this.flashMesh = flashMesh; 
                }
            };

            _buildMuzzleFlash(parts.muzzle, false);
            if (parts.muzzleLeft) _buildMuzzleFlash(parts.muzzleLeft, true);
        },

        triggerMuzzleFlash(weaponConfig, doEject = true) {
            // --- HACK FIX: Disable Flash for Rocket Sigma ---
            if (this.currentWeaponDef && this.currentWeaponDef.id === 'RPG_SIGMA') return;

            let heatAdd = 0.2; 
            const smokeCfg = (this.visualConfig && this.visualConfig.barrelSmoke) ? this.visualConfig.barrelSmoke : {};
            if (smokeCfg.rampUp) heatAdd = 0.08; 
            else heatAdd = 0.6; 
            
            this.barrelHeat = Math.min(1.0, this.barrelHeat + heatAdd);
            
            if (!weaponConfig.effects || !weaponConfig.effects.muzzle) return;
            if (doEject) this.ejectShell('both');
            
            // --- BACKBLAST & LINGERING SMOKE (RPG7) ---
            if (this.currentWeaponDef.id === 'RPG7' && window.TacticalShooter.ParticleManager) {
                // Ensure matrix sync
                if (this.fullBodyMesh && this.fullBodyMesh.visible) this.fullBodyMesh.updateMatrixWorld(true);
                else if (this.weaponContainer) this.weaponContainer.updateMatrixWorld(true);

                if (this.ejectionPoint) {
                    const pos = new THREE.Vector3(); this.ejectionPoint.getWorldPosition(pos);
                    const quat = new THREE.Quaternion(); this.ejectionPoint.getWorldQuaternion(quat);
                    // RPG ejection is rotated Y=180, so forward is back.
                    const dir = new THREE.Vector3(0,0,1).applyQuaternion(quat).normalize();
                    window.TacticalShooter.ParticleManager.createBackblast(pos, dir);
                }
                
                const muzzleState = this.getMuzzleState();
                if (muzzleState.primary) {
                     window.TacticalShooter.ParticleManager.createLingeringSmoke(muzzleState.primary.position, muzzleState.primary.direction);
                }
            }

            if (!this.muzzleFlashGroup) return;
            
            const baseIntensity = (this.visualConfig.muzzleFlashIntensity !== undefined) ? this.visualConfig.muzzleFlashIntensity : 1.0;
            const lightMult = this.enabled ? 1.0 : 0.0;
            const scale = (this.visualConfig.muzzleFlashScale !== undefined) ? this.visualConfig.muzzleFlashScale : 1.0;
            
            if (scale <= 0.01 || baseIntensity <= 0.01) {
                this.muzzleFlashGroup.visible = false;
                if (this.flashLight) this.flashLight.intensity = 0;
                return;
            }
            
            this.muzzleFlashGroup.visible = true;
            if (this.muzzleFlashGroupLeft) this.muzzleFlashGroupLeft.visible = true;
            
            if (this.flashLight) this.flashLight.intensity = 40.0 * baseIntensity * lightMult; 
            if (this.flashMaterial) {
                this.flashMaterial.opacity = 1.0;
                if (weaponConfig.effects.muzzle.color) {
                    this.flashMaterial.color.setHex(weaponConfig.effects.muzzle.color);
                }
            }
            
            const randRot = Math.random() * Math.PI * 2;
            if (this.flashMesh) { this.flashMesh.rotation.z = randRot; this.flashMesh.scale.set(scale, scale, scale); }
            if (this.flashMeshLeft) { this.flashMeshLeft.rotation.z = randRot; this.flashMeshLeft.scale.set(scale, scale, scale); }
            
            this.flashTimer = this.visualConfig.muzzleFlashDuration || 0.05;
            
            if (window.TacticalShooter.ParticleManager) {
                const primary = this.getMuzzleState(null).primary;
                if (primary) {
                    window.TacticalShooter.ParticleManager.createMuzzleSmoke(primary.position, primary.direction);
                }
                const secondary = this.getMuzzleState(null).secondary;
                if (secondary) {
                     window.TacticalShooter.ParticleManager.createMuzzleSmoke(secondary.position, secondary.direction);
                }
            }
        },

        ejectShell(side) {
            if (!this.ejectionPoint || !window.TacticalShooter.ParticleManager) return;
            if (this.currentWeaponDef.id === 'RPG7') return;

            if (this.fullBodyMesh && this.fullBodyMesh.visible) {
                this.fullBodyMesh.updateMatrixWorld(true);
            } else if (this.weaponContainer) {
                this.weaponContainer.updateMatrixWorld(true);
            }
            
            const pm = window.TacticalShooter.ParticleManager;
            const THREE = window.THREE;

            const doEject = (point) => {
                const position = new THREE.Vector3(); point.getWorldPosition(position);
                const quaternion = new THREE.Quaternion(); point.getWorldQuaternion(quaternion);
                const direction = new THREE.Vector3(1.0, 0.5, 0.2).applyQuaternion(quaternion).normalize();
                
                let type = 'pistol';
                if (this.currentWeaponDef.effects && this.currentWeaponDef.effects.shellType) {
                    type = this.currentWeaponDef.effects.shellType;
                }
                
                pm.createShellCasing(position, direction, type);
            };
            const ejectRight = !side || side === 'right' || side === 'both';
            const ejectLeft = (side === 'left' || side === 'both') && this.ejectionPointLeft;
            if (ejectRight) doEject(this.ejectionPoint);
            if (ejectLeft) doEject(this.ejectionPointLeft);
        },

        update(dt, isFiring, muzzlePoint, muzzlePointLeft) {
            if (this.flashTimer > 0) {
                this.flashTimer -= dt;
                if (this.flashTimer <= 0) {
                    if (this.muzzleFlashGroup) { this.muzzleFlashGroup.visible = false; if (this.flashLight) this.flashLight.intensity = 0; }
                    if (this.muzzleFlashGroupLeft) this.muzzleFlashGroupLeft.visible = false;
                }
            }

            const smokeCfg = (this.visualConfig && this.visualConfig.barrelSmoke) ? this.visualConfig.barrelSmoke : { density: 0.1, duration: 1.0 };
            const decayRate = 1.0 / (smokeCfg.duration || 1.5);
            
            if (!isFiring && this.barrelHeat > 0) {
                this.barrelHeat = Math.max(0, this.barrelHeat - (dt * decayRate));
            }
            
            if (this.barrelHeat > 0.2 && !isFiring) {
                if (window.TacticalShooter.ParticleManager && window.TacticalShooter.ParticleManager.impactParticleCount >= 12) {
                     const densityMult = smokeCfg.density || 1.0;
                     // Skip if density is effectively zero
                     if (densityMult > 0.01) {
                         const emissionRate = 180.0 * this.barrelHeat * densityMult;
                         this.smokeAccumulator += emissionRate * dt;
                         
                         const THREE = window.THREE;
                         
                         while(this.smokeAccumulator >= 1.0) {
                             const state = this.getMuzzleState(muzzlePoint, muzzlePointLeft);
                             const intensity = this.barrelHeat * this.barrelHeat;
                             if (state && state.primary) {
                                 const pos = state.primary.position.clone().add(new THREE.Vector3((Math.random()-0.5)*0.03, (Math.random()-0.5)*0.03, (Math.random()-0.5)*0.03));
                                 const dir = new THREE.Vector3(0, 1, 0).lerp(state.primary.direction, 0.1).normalize();
                                 window.TacticalShooter.ParticleManager.createBarrelWisp(pos, dir, intensity);
                             }
                             if (state && state.secondary) {
                                 const pos = state.secondary.position.clone().add(new THREE.Vector3((Math.random()-0.5)*0.03, (Math.random()-0.5)*0.03, (Math.random()-0.5)*0.03));
                                 const dir = new THREE.Vector3(0, 1, 0).lerp(state.secondary.direction, 0.1).normalize();
                                 window.TacticalShooter.ParticleManager.createBarrelWisp(pos, dir, intensity);
                             }
                             this.smokeAccumulator -= 1.0;
                         }
                     }
                }
            } else {
                this.smokeAccumulator = 0;
            }
        },

        getMuzzleState(mp1, mp2) {
            const p1 = mp1 || (this.muzzleFlashGroup ? this.muzzleFlashGroup.parent : null);
            const p2 = mp2 || (this.muzzleFlashGroupLeft ? this.muzzleFlashGroupLeft.parent : null);
            
            const THREE = window.THREE;
            
            if (!p1) return { position: new THREE.Vector3(), direction: new THREE.Vector3(0,0,-1) };
            
            if (this.fullBodyMesh && this.fullBodyMesh.visible) this.fullBodyMesh.updateMatrixWorld(true);
            else if (this.weaponContainer) this.weaponContainer.updateMatrixWorld(true);
            
            const getState = (point) => {
                const position = new THREE.Vector3(); point.getWorldPosition(position);
                const quaternion = new THREE.Quaternion(); point.getWorldQuaternion(quaternion);
                const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();
                return { position, direction };
            };
            const primary = getState(p1);
            const secondary = p2 ? getState(p2) : null;
            return { position: primary.position, direction: primary.direction, primary: primary, secondary: secondary };
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GunFXSystem = GunFXSystem;
})();
