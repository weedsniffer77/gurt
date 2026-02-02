

// js/data/scorestreaks/airstrike.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || { Scorestreaks: {}, Weapons: {} };
    
    // --- 1. LASER DESIGNATOR WEAPON ---
    const LASER_DESIGNATOR_DEF = {
        id: "LASER_DESIGNATOR",
        name: "DESIGNATOR",
        type: "special",
        magazineSize: 1,
        reserveAmmo: 0,
        fireRate: 2.0, 
        drawTime: 0.5,
        holsterTime: 0.5,
        sprintMultiplier: 0.9,
        
        visuals: {
            hipPosition: { x: 0.15, y: -0.15, z: -0.3 },
            adsPosition: { x: 0.0, y: -0.05, z: -0.25 }, 
            
            // Adjusted Sprint Position: Higher and less rotated to keep in view
            sprintPosition: { x: 0.1, y: -0.1, z: -0.25 },
            sprintRotation: { x: -0.2, y: 0.3, z: -0.2 },
            
            blockedPosition: { x: 0.1, y: -0.2, z: -0.2 },
            blockedRotation: { x: 0.5, y: -0.2, z: -0.1 },
            
            adsInSpeed: 12.0,
            adsOutSpeed: 10.0,
            walkBobAmount: 0.015, walkBobSpeed: 5.0,
            sprintBobAmount: 0.02, sprintBobSpeed: 8.0, // Added sprint bob settings
            
            remoteIK: { rightElbow: { x: 0.5, y: -1.0, z: 0.2 }, leftElbow: { x: -0.5, y: -1.0, z: 0.2 }, leftHandPos: { x: -0.05, y: -0.1, z: -0.25 } },
            
            suppressMeleeAnim: true 
        },
        
        buildMesh: function() {
            if (!window.THREE) return null;
            const THREE = window.THREE;
            const group = new THREE.Group();
            group.userData.bulletTransparent = true;
            
            const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.2 });
            const matLens = new THREE.MeshStandardMaterial({ color: 0x004400, roughness: 0.1, metalness: 0.9 });
            const matRubber = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9, metalness: 0.0 });
            
            const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 16).rotateX(Math.PI/2), matBlack);
            group.add(tube);
            const head = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.015, 0.04, 16).rotateX(Math.PI/2), matBlack);
            head.position.z = -0.095; group.add(head);
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 16).rotateX(Math.PI/2), matBlack);
            cap.position.z = -0.12; group.add(cap);
            const lens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), matLens);
            lens.position.z = -0.126; group.add(lens);
            for(let i=0; i<3; i++) {
                const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.005, 16).rotateX(Math.PI/2), matRubber);
                ring.position.z = 0.02 + (i * 0.015); group.add(ring);
            }
            const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), matBlack);
            clamp.position.set(0.02, 0, 0); group.add(clamp);

            const laserGroup = new THREE.Group();
            group.add(laserGroup);
            
            const beamGeo = new THREE.CylinderGeometry(0.004, 0.004, 100, 8).rotateX(Math.PI/2); 
            beamGeo.translate(0, 0, -50);
            const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.z = -0.13; 
            laserGroup.add(beam);
            
            const light = new THREE.PointLight(0x00ff00, 3.0, 8.0);
            light.visible = false;
            
            const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); grad.addColorStop(0.3, 'rgba(0, 255, 0, 1)'); grad.addColorStop(1, 'rgba(0, 255, 0, 0)');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);
            const dotTex = new THREE.CanvasTexture(canvas);
            const dotMat = new THREE.SpriteMaterial({ map: dotTex, color: 0x88ff88, blending: THREE.AdditiveBlending, depthTest: false });
            const dot = new THREE.Sprite(dotMat);
            dot.scale.set(0.3, 0.3, 1);
            dot.visible = false;

            group.userData.laserParts = { beam, light, dot };
            group.userData.raycaster = new THREE.Raycaster();

            const handR = new THREE.Object3D(); handR.position.set(0, -0.05, 0.05); group.add(handR);
            const handL = new THREE.Object3D(); handL.position.set(0, -0.1, -100); group.add(handL);
            
            return { mesh: group, parts: { muzzle: new THREE.Object3D(), handRight: handR, handLeft: handL } };
        }
    };
    
    LASER_DESIGNATOR_DEF.animationLogic = {
        updateParts(dt, playerState, parts, weaponDef) {
            const mesh = parts.rightRoot; 
            if (!mesh || !mesh.userData.laserParts) return;
            const { beam, light, dot } = mesh.userData.laserParts;
            const raycaster = mesh.userData.raycaster;
            if (light.parent !== window.TacticalShooter.GameManager.scene) { window.TacticalShooter.GameManager.scene.add(light); window.TacticalShooter.GameManager.scene.add(dot); }
            const isFiring = window.TacticalShooter.InputManager.isActionActive('Shoot');
            const origin = new window.THREE.Vector3(); const direction = new window.THREE.Vector3();
            beam.getWorldPosition(origin); const q = new window.THREE.Quaternion(); beam.getWorldQuaternion(q);
            direction.set(0,0,-1).applyQuaternion(q).normalize();
            raycaster.set(origin, direction); raycaster.far = 500;
            const collidables = window.TacticalShooter.PhysicsController.getCollidables(window.TacticalShooter.GameManager.scene);
            const hits = raycaster.intersectObjects(collidables, true);
            if (hits.length > 0) {
                const hit = hits[0]; const dist = hit.distance;
                beam.scale.set(1, 1, dist / 100); beam.visible = true;
                const pos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.05));
                light.position.copy(pos); dot.position.copy(pos); light.visible = true; dot.visible = true;
                if (isFiring) { beam.material.opacity = 0.8; beam.scale.x = 6.0; beam.scale.y = 6.0; light.intensity = 5.0; dot.scale.set(0.6, 0.6, 1); } 
                else { beam.material.opacity = 0.3; beam.scale.x = 1.0; beam.scale.y = 1.0; light.intensity = 2.0; dot.scale.set(0.3, 0.3, 1); }
            } else { beam.visible = true; beam.scale.set(1, 1, 5); light.visible = false; dot.visible = false; }
        },
        getOffsets() { return { pos: new window.THREE.Vector3(0,0,0), rot: new window.THREE.Euler(0,0,0) }; }
    };

    window.TacticalShooter.GameData.Weapons["LASER_DESIGNATOR"] = LASER_DESIGNATOR_DEF;
    
    // --- 2. GBU-12 PAVEWAY II MODEL ---
    const buildGBUMesh = () => {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        const group = new THREE.Group();
        
        const matOlive = new THREE.MeshStandardMaterial({ color: 0x363b30, roughness: 0.7, metalness: 0.2 }); 
        const matSteel = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.7 });
        const matSensor = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 });
        const matFin = new THREE.MeshStandardMaterial({ color: 0x363b30, roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide });
        const matBand = new THREE.MeshStandardMaterial({ color: 0xcc9900, roughness: 0.8, metalness: 0.0 });
        const S = 1.0;

        const noseLen = 0.35 * S;
        const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.08*S, 0.04*S, noseLen, 16).rotateX(Math.PI/2), matSensor);
        nose.position.z = -1.6 * S; group.add(nose);
        const sensorTip = new THREE.Mesh(new THREE.SphereGeometry(0.04*S, 16, 16, 0, Math.PI*2, 0, Math.PI/2), matSensor);
        sensorTip.rotation.x = -Math.PI/2; sensorTip.position.z = -1.6 * S - (noseLen/2); group.add(sensorTip);
        
        const ccgLen = 0.4 * S;
        const ccg = new THREE.Mesh(new THREE.CylinderGeometry(0.12*S, 0.12*S, ccgLen, 16).rotateX(Math.PI/2), matOlive);
        ccg.position.z = -1.25 * S; group.add(ccg);
        
        const canardGeo = new THREE.BoxGeometry(0.01*S, 0.35*S, 0.25*S);
        for(let i=0; i<4; i++) {
            const c = new THREE.Mesh(canardGeo, matSteel); c.rotation.z = (Math.PI/2) * i; c.position.z = -1.25 * S;
            c.position.add(new THREE.Vector3(0, 0.15*S, 0).applyAxisAngle(new THREE.Vector3(0,0,1), c.rotation.z));
            group.add(c);
        }

        const bodyLen = 1.3 * S; const bodyRad = 0.14 * S;
        const taperF = new THREE.Mesh(new THREE.CylinderGeometry(0.14*S, 0.12*S, 0.2*S, 24).rotateX(Math.PI/2), matOlive); taperF.position.z = -0.95 * S; group.add(taperF);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(bodyRad, bodyRad, bodyLen, 24).rotateX(Math.PI/2), matOlive); body.position.z = -0.2 * S; group.add(body);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(bodyRad*1.005, bodyRad*1.005, 0.1*S, 24).rotateX(Math.PI/2), matBand); band.position.z = -0.7 * S; group.add(band);
        const taperR = new THREE.Mesh(new THREE.CylinderGeometry(0.10*S, 0.14*S, 0.3*S, 24).rotateX(Math.PI/2), matOlive); taperR.position.z = 0.6 * S; group.add(taperR);
        const ductGeo = new THREE.BoxGeometry(0.04*S, 0.03*S, 2.0*S); const duct = new THREE.Mesh(ductGeo, matSteel); duct.position.set(0, bodyRad, -0.2 * S); group.add(duct);

        const tailLen = 0.6 * S;
        const tailTube = new THREE.Mesh(new THREE.CylinderGeometry(0.10*S, 0.10*S, tailLen, 16).rotateX(Math.PI/2), matOlive); tailTube.position.z = 1.05 * S; group.add(tailTube);
        const finW = 0.02 * S; const finH = 0.5 * S; const finL = 0.55 * S; const finGeo = new THREE.BoxGeometry(finW, finH, finL);
        for(let i=0; i<4; i++) {
            const f = new THREE.Mesh(finGeo, matFin); f.rotation.z = (Math.PI/2) * i; f.position.z = 1.05 * S;
            const off = new THREE.Vector3(0, 0.3*S, 0).applyAxisAngle(new THREE.Vector3(0,0,1), f.rotation.z);
            f.position.add(off); group.add(f);
        }
        group.rotation.x = -Math.PI / 2; group.scale.set(0.6, 0.6, 0.6); 
        return group;
    };

    // --- 3. SCORESTREAK LOGIC ---
    const AirstrikeLogic = {
        
        createInstance(ownerId, targetPos, teamId) {
            return {
                id: Math.random().toString(36).substr(2,9),
                ownerId: ownerId,
                targetPos: targetPos.clone(),
                teamId: teamId,
                endTime: Date.now() + 8000, 
                phase: 'incoming',
                duration: 8.0
            };
        },
        
        update(instance, dt) {
            const now = Date.now();
            const timeLeft = (instance.endTime - now) / 1000;
            
            if (timeLeft <= 0 && instance.phase !== 'done') {
                this.executeExplosion(instance.targetPos, instance.ownerId);
                instance.phase = 'done';
            }
            
            if (instance.phase === 'done' && timeLeft < -2.0) {
                return false; 
            }
            
            return true; 
        },
        
        executeExplosion(targetPos, ownerId) {
             const PM = window.TacticalShooter.ParticleManager;
             const THREE = window.THREE;
             
             // --- PENETRATION LOGIC ---
             const skyY = 100.0;
             const skyOrigin = new THREE.Vector3(targetPos.x, skyY, targetPos.z);
             const downDir = new THREE.Vector3(0, -1, 0);
             
             let collidables = [];
             if (window.TacticalShooter.GameManager.staticCollider) { collidables = [window.TacticalShooter.GameManager.staticCollider]; } 
             else if (window.TacticalShooter.GameManager.currentMap) { collidables = window.TacticalShooter.GameManager.currentMap.geometry; }
             
             const raycaster = new THREE.Raycaster(skyOrigin, downDir, 0, 200);
             let hits = raycaster.intersectObjects(collidables, true);
             hits = hits.filter(h => {
                 if (h.object.isSprite) return false;
                 if (h.object.userData.bulletTransparent && !h.object.userData.collidable) return false;
                 if (h.object.material && h.object.material.visible === false) return false;
                 return true;
             });
             
             let explosionPos = targetPos.clone();
             if (hits.length > 0) {
                 const firstHit = hits[0]; const firstY = firstHit.point.y; const targetY = targetPos.y;
                 if (Math.abs(firstY - targetY) > 3.0) {
                     if (PM) PM.createWallPenetration(firstHit.point, downDir);
                     if (hits.length > 1) explosionPos.copy(hits[1].point); else explosionPos.copy(targetPos);
                 } else {
                     explosionPos.copy(firstHit.point);
                 }
             }
             if (explosionPos.y < -50) explosionPos.y = 0;

             // VFX
             if (PM) {
                 PM.createGrenadeExplosion(explosionPos, new THREE.Vector3(0,1,0), 'concrete', 4.0); 
                 PM.spawnExplosionLight(explosionPos, 0xffaa00, 200.0, 100.0, 3.0);
                 PM.createAirstrikeSmoke(explosionPos); 
                 for(let i=0; i<15; i++) {
                     const offset = new THREE.Vector3((Math.random()-0.5)*18, 1, (Math.random()-0.5)*18); const firePos = explosionPos.clone().add(offset);
                     PM.createImpactSparks(firePos, new THREE.Vector3(0,1,0), { count: 5, speed: 2.0, gravity: 1.0, color: 0xff4400, lifetime: 2.5, size: 0.3 });
                     PM.createImpactDust(firePos, new THREE.Vector3(0,1,0), { count: 3, sizeStart: 2.0, sizeEnd: 5.0, lifetime: 8.0, opacity: 0.5, color: 0x444444 });
                 }
             }
             
             const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
             if (ownerId === myId || ownerId === "SELF") {
                 // UPDATED: Lethal Radius 12m, Damage Radius 20m
                 this.dealAirstrikeDamage(explosionPos, 20.0, 800, 100.0, 12.0);
             }
             if (window.TacticalShooter.PlayerCamera) {
                 const camPos = window.TacticalShooter.PlayerCamera.camera.position;
                 const dist = camPos.distanceTo(explosionPos);
                 if (dist < 150) { const shake = 4.0 * (1.0 - (dist/150)); window.TacticalShooter.PlayerCamera.applyExplosionShake(shake); }
             }
        },

        dealAirstrikeDamage(origin, maxRadius, maxDmg, maxImp, lethalRadius) {
            if (window.TacticalShooter.PlayerState) {
                 this._checkTarget(window.TacticalShooter.CharacterController.position, origin, maxRadius, maxDmg, maxImp, lethalRadius, (dmg, imp) => {
                     const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF"; 
                     const biasedOrigin = origin.clone(); biasedOrigin.y -= 5.0; 
                     window.TacticalShooter.PlayerState.takeDamage(dmg, myId, 'Torso', imp, false, biasedOrigin, null);
                 });
            }
            if (window.TacticalShooter.RemotePlayerManager && window.TacticalShooter.PlayroomManager) {
                const remotes = window.TacticalShooter.RemotePlayerManager.remotePlayers;
                for (const id in remotes) {
                    const rp = remotes[id]; if (!rp.mesh) continue;
                    this._checkTarget(rp.mesh.position, origin, maxRadius, maxDmg, maxImp, lethalRadius, (dmg, imp) => {
                        const blastDir = new THREE.Vector3().subVectors(rp.mesh.position, origin).normalize(); blastDir.y = Math.abs(blastDir.y) + 1.5; blastDir.normalize();
                        window.TacticalShooter.PlayroomManager.broadcastBulletHit(rp.mesh.position, blastDir, id, dmg, "Torso", imp, false, origin, null, 'airstrike');
                    });
                }
            }
            if (window.TacticalShooter.HitmarkerSystem) { window.TacticalShooter.HitmarkerSystem.show('normal'); }
        },
        
        _checkTarget(targetPos, origin, maxRadius, maxDmg, maxImp, lethalRadius, applyCallback) {
            const dist = targetPos.distanceTo(origin);
            if (dist < maxRadius) {
                let damage = 0; let coverMult = 1.0;
                if (dist > 3.0) {
                    const centerPos = targetPos.clone().add(new THREE.Vector3(0, 1.0, 0)); const checkOrigin = origin.clone(); 
                    if (window.TacticalShooter.ThrowableManager.isBlocked(checkOrigin, centerPos)) { coverMult = 0.0; }
                }
                if (coverMult > 0) {
                    let rawDmg = 0;
                    if (lethalRadius > 0 && dist <= lethalRadius) { rawDmg = maxDmg; } 
                    else { const linearFalloff = 1.0 - (dist / maxRadius); rawDmg = maxDmg * linearFalloff; }
                    damage = Math.floor(rawDmg * coverMult);
                    const impulse = maxImp * (1.0 - (dist/maxRadius));
                    if (damage > 0) applyCallback(damage, impulse);
                }
            }
        },
        
        // --- UI SYNC ---
        updateGlobalUI(instances) {
            const alertBox = document.getElementById('airstrike-alert');
            const contentEl = document.getElementById('as-content');
            if (contentEl) contentEl.classList.remove('as-timer');
            if (instances.length === 0) { if (alertBox) alertBox.classList.remove('active'); return; }

            const now = Date.now();
            let priorityStrike = null;
            let minDist = Infinity;
            const myPos = (window.TacticalShooter.CharacterController) ? window.TacticalShooter.CharacterController.position : new THREE.Vector3(0,0,0);
            
            instances.forEach(inst => {
                if (inst.phase === 'done') return;
                const d = myPos.distanceTo(inst.targetPos);
                if (d < minDist) { minDist = d; priorityStrike = inst; }
            });

            if (!priorityStrike) { if (alertBox) alertBox.classList.remove('active'); return; }
            if (alertBox && !alertBox.classList.contains('active')) { alertBox.style.display = 'flex'; requestAnimationFrame(() => alertBox.classList.add('active')); }
            
            if (contentEl) {
                const timeLeft = Math.max(0, (priorityStrike.endTime - now) / 1000);
                const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                
                if (timeLeft > 5.0) {
                    if (priorityStrike.ownerId === myId || priorityStrike.ownerId === "SELF") {
                        contentEl.textContent = "AIRSTRIKE INBOUND";
                    } else {
                        const myTeam = window.TacticalShooter.TeamManager.getLocalTeamId();
                        const isFriendly = (priorityStrike.teamId === myTeam);
                        if (window.TacticalShooter.MatchState.state.gamemode !== 'FFA' && isFriendly) {
                             contentEl.textContent = "TEAMMATE CALLED IN AIRSTRIKE";
                        } else {
                             contentEl.textContent = "ENEMY AIRSTRIKE INBOUND";
                        }
                    }
                    contentEl.style.color = "#ffffff"; 
                } 
                else {
                    contentEl.textContent = timeLeft.toFixed(2);
                    if (timeLeft <= 2.0) {
                        contentEl.style.color = "#ff3333";
                        contentEl.classList.add('as-timer');
                    } else {
                        contentEl.style.color = "#ffffff";
                    }
                }
            }
        },
        
        clearUI() { const alertBox = document.getElementById('airstrike-alert'); if (alertBox) alertBox.classList.remove('active'); }
    };

    window.TacticalShooter.GameData.Scorestreaks["AIRSTRIKE"] = {
        id: "AIRSTRIKE",
        name: "AIRSTRIKE",
        killsRequired: 9,
        description: "Laser guided bomb. Massive damage.",
        icon: "✈️", 
        logic: AirstrikeLogic, 
        statsViewer: {
            labels: { damage: "DAMAGE", blastRadius: "BLAST RADIUS", lethalRadius: "LETHAL RADIUS" },
            overrides: { damage: 200, rawDamage: 800, blastRadius: 200, rawBlast: "20m", lethalRadius: 120, rawLethal: "12m", mobility: 80 }
        },
        buildMesh: function() { return { mesh: buildGBUMesh(), parts: {} }; },
        onActivate: function(playerState) {
             const WM = window.TacticalShooter.WeaponManager;
             const desigDef = window.TacticalShooter.GameData.Weapons["LASER_DESIGNATOR"];
             desigDef.magazineSize = 1; playerState.currentAmmo = 1; playerState.reserveAmmo = 0;
             desigDef.attackAction = () => {
                 playerState.currentAmmo = 0;
                 if (!window.TacticalShooter.PlayerCamera) return;
                 const target = window.TacticalShooter.Ballistics.getCrosshairTarget(window.TacticalShooter.PlayerCamera.camera, 500);
                 setTimeout(() => {
                     if (window.TacticalShooter.ScorestreakManager) {
                         const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                         const myTeam = window.TacticalShooter.TeamManager.getLocalTeamId();
                         window.TacticalShooter.ScorestreakManager.triggerAirstrike(myId, target, myTeam);
                     }
                     const LM = window.TacticalShooter.LoadoutManager; LM.activeSlot = 'primary'; WM.completeSwitch(LM.getActiveWeaponDef());
                     if (WM.currentWeapon && WM.currentWeapon.userData && WM.currentWeapon.userData.laserParts) {
                         const lp = WM.currentWeapon.userData.laserParts;
                         if (lp.light.parent) lp.light.parent.remove(lp.light); if (lp.dot.parent) lp.dot.parent.remove(lp.dot);
                     }
                 }, 500); 
             };
             playerState.setWeapon(desigDef); WM.currentWeapon = desigDef; WM.drawTimer = 0.5;
             if (window.TacticalShooter.GunRenderer) { window.TacticalShooter.GunRenderer.loadWeapon(desigDef); }
        }
    };
    console.log("Scorestreak Loaded: Airstrike (Radii 12m/20m)");
})();
