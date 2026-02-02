
// js/multiplayer/remote_player_animator.js
(function() {
    class RemotePlayerAnimator {
        constructor(mesh, parts, weaponParts, weaponMesh, weaponDef) {
            this.mesh = mesh; this.parts = parts; this.weaponParts = weaponParts; this.weaponMesh = weaponMesh; this.weaponDef = weaponDef; 
            this.animTime = 0; this.bobTime = 0;
            this.lastProcessedFired = 0; this.flashTimer = 0; this.slideOffset = -0.02; this.muzzleFlashGroup = null; this.muzzleFlashLight = null; this.currentWeaponId = null; this.targetFlashIntensity = 5.0;
            this.meleeAnim = { active: false, timer: 0, duration: 0.4 };
            this.flinch = { active: false, timer: 0, duration: 0.15, part: 'Torso', intensity: 0.0, randX: 0, randY: 0, dirZ: -1, dirX: 0 };
            this.upperArmLen = 0.35; this.lowerArmLen = 0.35;
            this.currentGunOffset = new THREE.Vector3(0.2, -0.25, 0.4); this.currentGunRotOffset = new THREE.Quaternion();
            this.targets = { bodyPos: new THREE.Vector3(), torsoRot: new THREE.Euler(), headRot: new THREE.Euler(), leftLeg: { rot: new THREE.Euler() }, rightLeg: { rot: new THREE.Euler() }, leftKnee: { rotX: 0 }, rightKnee:{ rotX: 0 }, leftFoot: { rotX: 0 }, rightFoot:{ rotX: 0 } };
            this._ik = { dir: new THREE.Vector3(), targetDir: new THREE.Vector3(), boneAxis: new THREE.Vector3(0, -1, 0), hintVec: new THREE.Vector3(), planeNormal: new THREE.Vector3(), axisX: new THREE.Vector3(), axisY: new THREE.Vector3(), axisZ: new THREE.Vector3(), qBase: new THREE.Quaternion(), qOrient: new THREE.Quaternion(), qBend: new THREE.Quaternion(), qUpper: new THREE.Quaternion(), qParentInv: new THREE.Quaternion(), mtx: new THREE.Matrix4() };
            this._upd = { headPos: new THREE.Vector3(), viewQuat: new THREE.Quaternion(), targetOffset: new THREE.Vector3(), targetRotOffset: new THREE.Quaternion(), worldGunPos: new THREE.Vector3(), worldGunRot: new THREE.Quaternion(), bodyYawQuat: new THREE.Quaternion(), rElbowDir: new THREE.Vector3(), lElbowDir: new THREE.Vector3(), worldRElbowHint: new THREE.Vector3(), worldLElbowHint: new THREE.Vector3(), rShoulderPos: new THREE.Vector3(), lShoulderPos: new THREE.Vector3(), leftHandTargetPos: new THREE.Vector3(), handGripOffset: new THREE.Vector3(), wristLocalPos: new THREE.Vector3(), elbowWorldQuat: new THREE.Quaternion(), elbowInvQuat: new THREE.Quaternion(), weaponLocalRot: new THREE.Quaternion(), rotatedGripOffset: new THREE.Vector3(), tempVec: new THREE.Vector3(), tempQuat: new THREE.Quaternion(), tempEuler: new THREE.Euler() };
        }
        
        setWeaponContext(weaponMesh, weaponParts, weaponDef, muzzleFlashGroup, initialLastFired = 0) {
            this.weaponMesh = weaponMesh; this.weaponParts = weaponParts; this.weaponDef = weaponDef; this.muzzleFlashGroup = muzzleFlashGroup;
            if (muzzleFlashGroup) this.muzzleFlashLight = muzzleFlashGroup.children.find(c => c.isPointLight);
            if (weaponDef) this.currentWeaponId = weaponDef.id;
            this.lastProcessedFired = initialLastFired;
            if (weaponDef && weaponDef.visuals) {
                if (weaponDef.visuals.muzzleFlashIntensity !== undefined) this.targetFlashIntensity = weaponDef.visuals.muzzleFlashIntensity * 5.0; else this.targetFlashIntensity = 5.0;
                if (weaponDef.visuals.muzzleFlashScale !== undefined && weaponDef.visuals.muzzleFlashScale < 0.1) this.targetFlashIntensity = 0;
                if (weaponDef.visuals.slideTravel !== undefined) this.slideOffset = weaponDef.visuals.slideTravel; else this.slideOffset = -0.02;
            }
        }
        
        updateWeaponMechanics(dt, lastFired) {
            const pm = window.TacticalShooter.ParticleManager; const parts = this.weaponParts; const def = this.weaponDef;
            if (lastFired > this.lastProcessedFired) {
                this.lastProcessedFired = lastFired;
                if (def && def.type === 'melee') this.triggerMelee(); else if (def && def.type === 'throwable') this.triggerMelee(); 
                else {
                    this.flashTimer = 0.05; if (this.muzzleFlashGroup && this.targetFlashIntensity > 0.1) { this.muzzleFlashGroup.visible = true; if (this.muzzleFlashLight) this.muzzleFlashLight.intensity = this.targetFlashIntensity; }
                    
                    if (parts && parts.ejection && pm && pm.casingsEnabled && def.effects) {
                        if (def.id === 'RPG7') {
                            const pos = new THREE.Vector3(); parts.ejection.getWorldPosition(pos);
                            const quat = new THREE.Quaternion(); parts.ejection.getWorldQuaternion(quat);
                            const dir = new THREE.Vector3(0,0,1).applyQuaternion(quat).normalize();
                            window.TacticalShooter.ParticlesVFX.createBackblast(pos, dir, pm);
                            if (parts.muzzle) {
                                const mPos = new THREE.Vector3(); parts.muzzle.getWorldPosition(mPos);
                                const mQuat = new THREE.Quaternion(); parts.muzzle.getWorldQuaternion(mQuat);
                                const mDir = new THREE.Vector3(0,0,-1).applyQuaternion(mQuat).normalize();
                                window.TacticalShooter.ParticlesVFX.createLingeringSmoke(mPos, mDir, pm);
                            }
                        } else {
                            window.TacticalShooter.ParticlesVFX.createShellCasing(parts.ejection.position, new THREE.Vector3(1, 0.5, 0.2), def.effects.shellType || 'pistol', pm);
                        }
                    }
                    if (def && def.visuals) this.slideOffset = 0.05; 
                }
            }
            if (parts && parts.slide && def && def.visuals) { let targetSlide = -0.02; if (def.visuals.slideTravel !== undefined) targetSlide = def.visuals.slideTravel; this.slideOffset = THREE.MathUtils.lerp(this.slideOffset, targetSlide, dt * 15.0); parts.slide.position.z = this.slideOffset; }
            if (this.flashTimer > 0) { this.flashTimer -= dt; if (this.flashTimer <= 0 && this.muzzleFlashGroup) { this.muzzleFlashGroup.visible = false; if (this.muzzleFlashLight) this.muzzleFlashLight.intensity = 0; } }
            if (this.muzzleFlashGroup && this.muzzleFlashGroup.visible) { const gameCamera = window.TacticalShooter.GameManager ? window.TacticalShooter.GameManager.camera : null; if (gameCamera) this.muzzleFlashGroup.lookAt(gameCamera.position); }
        }
        
        triggerMelee() { this.meleeAnim.active = true; this.meleeAnim.timer = 0; }
        triggerFlinch(part, normal) { this.flinch.active = true; this.flinch.duration = 0.2; this.flinch.timer = this.flinch.duration; this.flinch.part = part || 'Torso'; this.flinch.intensity = 4.0; this.flinch.randX = (Math.random() - 0.5) * 2; this.flinch.randY = (Math.random() - 0.5) * 2; if (normal && this.mesh) { const localNorm = normal.clone().applyQuaternion(this.mesh.quaternion.clone().invert()); this.flinch.dirZ = localNorm.z; this.flinch.dirX = localNorm.x; } else { this.flinch.dirZ = -1; this.flinch.dirX = 0; } }
        
        update(dt, state, derivedStats, manualGunOffset = null, manualGunRot = null, overrideWorldGunPos = null, overrideWorldGunRot = null) {
            if (!this.parts) return;
            const { isMoving, isSprinting, speed } = derivedStats; const animRate = isSprinting ? (speed * 0.8) : (speed * 1.4); this.animTime += dt * animRate;
            if (this.meleeAnim.active) { this.meleeAnim.timer += dt; if (this.meleeAnim.timer >= this.meleeAnim.duration) this.meleeAnim.active = false; }
            if (this.flinch.active) { this.flinch.timer -= dt; if (this.flinch.timer <= 0) { this.flinch.active = false; this.flinch.intensity = 0; } else { this.flinch.intensity = Math.pow(this.flinch.timer / this.flinch.duration, 2) * 4.0; } }

            window.TacticalShooter.AnimatorPoses.updateProceduralMovement(dt, state, derivedStats, this, this.mesh);
            
            const targetHeadPitch = state.lookPitch - this.targets.torsoRot.x; this.targets.headRot.set(targetHeadPitch, 0, 0);
            if (this.flinch.active) {
                const i = this.flinch.intensity; const p = this.flinch.part; const rx = this.flinch.randX; const dz = this.flinch.dirZ; const dx = this.flinch.dirX; let torqueDir = Math.sign(dx * dz); if (Math.abs(dx) < 0.1) torqueDir = Math.sign(rx); 
                if (p === 'Head') { const snapDir = (dz < 0) ? 1 : -1; this.targets.headRot.x += snapDir * 0.14 * i; this.targets.headRot.y += 0.12 * torqueDir * i; this.targets.torsoRot.x += snapDir * 0.06 * i; } 
                else if (p === 'Arm' || p === 'Hand') { this.targets.torsoRot.y += 0.6 * torqueDir * i; this.targets.torsoRot.z += 0.15 * Math.sign(dx) * i; } 
                else if (p === 'Leg') { this.targets.bodyPos.y -= 0.15 * i; this.targets.torsoRot.x += 0.3 * i; if (rx > 0) this.targets.rightLeg.rot.x -= 0.8 * i; else this.targets.leftLeg.rot.x -= 0.8 * i; } 
                else { this.targets.torsoRot.y += 0.7 * torqueDir * i; this.targets.torsoRot.x += 0.25 * i; this.targets.bodyPos.z -= 0.15 * i; }
            }

            window.TacticalShooter.AnimatorPoses.applyBaseTransforms(dt, isMoving, state.isSliding, this);
            this.mesh.updateMatrixWorld(true);
            this._updateIKArms(dt, state, derivedStats, manualGunOffset, manualGunRot, overrideWorldGunPos, overrideWorldGunRot);
        }

        _updateIKArms(dt, state, stats, manualGunOffset, manualGunRot, overrideWorldGunPos, overrideWorldGunRot) {
            const P = this.parts; const U = this._upd; U.headPos.set(0,0,0); P.head.getWorldPosition(U.headPos);
            
            if (overrideWorldGunPos && overrideWorldGunRot) {
                U.handGripOffset.set(0,0,0); if (this.weaponParts && this.weaponParts.handRight) U.handGripOffset.copy(this.weaponParts.handRight.position);
                U.rotatedGripOffset.copy(U.handGripOffset).applyQuaternion(overrideWorldGunRot); U.worldGunPos.copy(overrideWorldGunPos).add(U.rotatedGripOffset); U.worldGunRot.copy(overrideWorldGunRot);
            } else {
                let visualPitch = state.lookPitch; if (visualPitch > 1.4) visualPitch = 1.4; if (visualPitch < -1.5) visualPitch = -1.5; 
                U.tempEuler.set(visualPitch, state.lookYaw, 0, 'YXZ'); U.viewQuat.setFromEuler(U.tempEuler); U.targetOffset.set(0,0,0); U.targetRotOffset.set(0,0,0,1);

                if (manualGunOffset && manualGunRot) { this.currentGunOffset.lerp(manualGunOffset, dt * 25); this.currentGunRotOffset.slerp(manualGunRot, dt * 25); } 
                else {
                    const isBlocked = stats.wallDistance < 0.6; const weaponType = this.weaponDef ? this.weaponDef.id : "PISTOL"; const isKnife = (weaponType === 'KNIFE'); const isShotgun = (weaponType.includes('SHOTGUN')); const isGrenade = (this.weaponDef && this.weaponDef.type === 'throwable');
                    
                    const isRPG = (weaponType === 'RPG7');

                    if (isBlocked && !isGrenade) { U.targetOffset.set(0.15, -0.2, -0.25); U.targetRotOffset.setFromAxisAngle(U.tempVec.set(1,0,0), 1.0); } 
                    else if (state.isProne) { U.targetOffset.set(0.0, -0.08, -0.65); } 
                    else if (stats.isSprinting && !state.isADS && !stats.isSliding) {
                        if (isKnife) { U.targetOffset.set(0.2, -0.3, -0.2); U.targetRotOffset.setFromAxisAngle(U.tempVec.set(0,1,0), -0.5); } 
                        else if (isGrenade) { U.targetOffset.set(0.2, -0.25, -0.3); U.targetRotOffset.setFromAxisAngle(U.tempVec.set(0,1,0), -0.5); } 
                        else if (isRPG) { U.targetOffset.set(0.25, -0.1, -0.5); U.targetRotOffset.setFromAxisAngle(U.tempVec.set(0,1,0), -0.5); }
                        else { U.targetOffset.set(0.25, -0.35, -0.45); U.tempQuat.setFromAxisAngle(U.tempVec.set(1,0,0), -0.8); U.targetRotOffset.setFromAxisAngle(U.tempVec.set(0,1,0), -0.6); U.targetRotOffset.multiply(U.tempQuat); }
                    } 
                    else if (state.isADS || stats.isSliding) {
                        if (isGrenade) { U.targetOffset.set(0.25, 0.1, -0.3); U.targetRotOffset.setFromAxisAngle(U.tempVec.set(1, 0, 0), 0.5); } 
                        else if (isShotgun) { U.targetOffset.set(0.0, -0.19, -0.45); } 
                        else if (isRPG) { U.targetOffset.set(0.2, -0.1, -0.5); } 
                        else { U.targetOffset.set(0.0, -0.165, -0.70); }
                    } 
                    else {
                        if (isShotgun) { U.targetOffset.set(0.15, -0.18, -0.3); U.targetRotOffset.setFromAxisAngle(U.tempVec.set(1,0,0), 0.1); this.targets.torsoRot.x += 0.2; } 
                        else if (isKnife) { U.targetOffset.set(0.25, -0.35, -0.4); U.targetRotOffset.setFromAxisAngle(U.tempVec.set(0, 1, 0), -0.2); U.tempQuat.setFromAxisAngle(U.tempVec.set(1, 0, 0), 0.3); U.targetRotOffset.multiply(U.tempQuat); } 
                        else if (isGrenade) { U.targetOffset.set(0.2, -0.15, -0.35); U.targetRotOffset.setFromAxisAngle(U.tempVec.set(1,0,0), 0.2); } 
                        else if (isRPG) { U.targetOffset.set(0.2, -0.1, -0.5); } // Pushed Forward to -0.5
                        else { U.targetOffset.set(0.2, -0.25, -0.62); }
                    }

                    if (!isBlocked && !state.isProne) {
                        if (visualPitch > 0.5) { const lookDownIntensity = (visualPitch - 0.5); U.targetOffset.z -= lookDownIntensity * 0.2; U.targetOffset.y -= lookDownIntensity * 0.1; }
                        else if (visualPitch < -0.5) { const lookUpIntensity = (Math.abs(visualPitch) - 0.5); U.targetOffset.z -= lookUpIntensity * 0.2; U.targetOffset.y += lookUpIntensity * 0.05; }
                    }
                    
                    if (this.meleeAnim.active) {
                        const t = this.meleeAnim.timer / this.meleeAnim.duration; const animT = Math.sin(t * Math.PI);
                        if (isGrenade) { U.targetOffset.z -= animT * 0.6; U.targetOffset.y += animT * 0.3; U.tempQuat.setFromAxisAngle(U.tempVec.set(1, 0, 0), -animT * 1.0); U.targetRotOffset.multiply(U.tempQuat); } 
                        else { const stabAmt = animT * 0.4; U.targetOffset.z -= stabAmt; U.targetOffset.y += stabAmt * 0.1; U.tempQuat.setFromAxisAngle(U.tempVec.set(1, 0, 0), -stabAmt * 0.5); U.targetRotOffset.multiply(U.tempQuat); }
                    }

                    if (stats.isMoving && !isBlocked && !state.isADS) {
                        const visuals = this.weaponDef && this.weaponDef.visuals ? this.weaponDef.visuals : {};
                        let bobFreq = stats.isSprinting ? (visuals.sprintBobSpeed || 13.0) : (visuals.walkBobSpeed || 8.0);
                        let bobAmp = stats.isSprinting ? (visuals.sprintBobAmount || 0.025) : (visuals.walkBobAmount || 0.03);
                        if (stats.isSliding) { bobFreq = 18.0; bobAmp = 0.0015; } if (state.isProne) { bobFreq = 4.0; bobAmp = 0.04; }
                        this.bobTime = (this.bobTime || 0) + dt * bobFreq;
                        U.targetOffset.x += Math.cos(this.bobTime) * bobAmp * 0.5; U.targetOffset.y -= Math.abs(Math.sin(this.bobTime)) * bobAmp;
                        let rotBobZ = 0; let rotBobX = 0;
                        if (stats.isSprinting) { rotBobZ = Math.cos(this.bobTime) * 0.05; rotBobX = Math.sin(this.bobTime * 2) * 0.04; } else { rotBobZ = Math.cos(this.bobTime) * 0.02; }
                        U.tempEuler.set(rotBobX, 0, rotBobZ); U.tempQuat.setFromEuler(U.tempEuler); U.targetRotOffset.multiply(U.tempQuat);
                    } else {
                        this.bobTime = (this.bobTime || 0) + dt * 1.0; U.targetOffset.y += Math.sin(this.bobTime * 2.0) * 0.003; U.targetOffset.x += Math.cos(this.bobTime * 1.5) * 0.002;
                    }
                    this.currentGunOffset.lerp(U.targetOffset, dt * 10); this.currentGunRotOffset.slerp(U.targetRotOffset, dt * 10);
                }
                U.worldGunPos.copy(this.currentGunOffset).applyQuaternion(U.viewQuat).add(U.headPos); U.worldGunRot.copy(U.viewQuat).multiply(this.currentGunRotOffset);
                if (this.flinch.active && (this.flinch.part === 'Arm' || this.flinch.part === 'Hand')) { U.worldGunPos.y -= 0.6 * this.flinch.intensity; U.worldGunPos.x += 0.4 * this.flinch.randX * this.flinch.intensity; }
            }

            U.tempEuler.set(0, state.lookYaw, 0, 'YXZ'); U.bodyYawQuat.setFromEuler(U.tempEuler);
            const remoteIK = this.weaponDef && this.weaponDef.visuals && this.weaponDef.visuals.remoteIK; const isGrenade = (this.weaponDef && this.weaponDef.type === 'throwable');
            if (remoteIK && remoteIK.rightElbow) U.rElbowDir.copy(remoteIK.rightElbow).normalize(); else U.rElbowDir.set(0.5, -1.0, 0.2).normalize();
            if (remoteIK && remoteIK.leftElbow) U.lElbowDir.copy(remoteIK.leftElbow).normalize(); else U.lElbowDir.set(-0.5, -1.0, 0.2).normalize();
            if (state.isProne) { U.rElbowDir.set(0.8, -0.2, 0).normalize(); U.lElbowDir.set(-0.8, -0.2, 0).normalize(); }
            U.worldRElbowHint.copy(U.rElbowDir).applyQuaternion(U.bodyYawQuat).add(U.headPos); U.worldLElbowHint.copy(U.lElbowDir).applyQuaternion(U.bodyYawQuat).add(U.headPos);
            U.rShoulderPos.set(0,0,0); P.rightArm.getWorldPosition(U.rShoulderPos);
            window.TacticalShooter.AnimatorIK.solveTwoBoneIK(P.rightArm, P.rightArm.userData.elbow, U.rShoulderPos, U.worldGunPos, U.worldRElbowHint, this._ik, this.upperArmLen, this.lowerArmLen);
            P.rightArm.updateMatrixWorld(true);
            
            if (remoteIK && remoteIK.leftHandPos) { U.tempVec.set(remoteIK.leftHandPos.x, remoteIK.leftHandPos.y, remoteIK.leftHandPos.z).applyQuaternion(U.bodyYawQuat); U.leftHandTargetPos.copy(U.headPos).add(U.tempVec); } 
            else if (isGrenade) { U.tempVec.set(-0.25, -0.4, 0.1).applyQuaternion(U.bodyYawQuat); U.leftHandTargetPos.copy(U.headPos).add(U.tempVec); } 
            else { U.tempVec.set(0, 0.05, -0.25).applyQuaternion(U.worldGunRot); U.leftHandTargetPos.copy(U.worldGunPos).add(U.tempVec); }

            if (this.weaponMesh) {
                U.handGripOffset.set(0, 0, 0); if (this.weaponParts && this.weaponParts.handRight) U.handGripOffset.copy(this.weaponParts.handRight.position);
                U.wristLocalPos.set(0, -this.lowerArmLen, 0); P.rightArm.userData.elbow.getWorldQuaternion(U.elbowWorldQuat); U.elbowInvQuat.copy(U.elbowWorldQuat).invert();
                U.weaponLocalRot.copy(U.elbowInvQuat).multiply(U.worldGunRot); this.weaponMesh.quaternion.copy(U.weaponLocalRot);
                U.rotatedGripOffset.copy(U.handGripOffset).applyQuaternion(U.weaponLocalRot);
                this.weaponMesh.position.copy(U.wristLocalPos).sub(U.rotatedGripOffset); this.weaponMesh.updateMatrixWorld(true);
                if (this.weaponParts && this.weaponParts.handLeft && (!remoteIK || !remoteIK.leftHandPos) && !isGrenade) {
                    U.tempVec.set(0,0,0); this.weaponParts.handLeft.getWorldPosition(U.tempVec); U.leftHandTargetPos.copy(U.tempVec);
                    if (this.weaponDef && this.weaponDef.visuals && this.weaponDef.visuals.leftHandOffset) { const offsetConfig = this.weaponDef.visuals.leftHandOffset; U.tempVec.set(offsetConfig.x, offsetConfig.y, offsetConfig.z); U.tempVec.applyQuaternion(U.worldGunRot); U.leftHandTargetPos.add(U.tempVec); }
                }
            }
            U.lShoulderPos.set(0,0,0); P.leftArm.getWorldPosition(U.lShoulderPos);
            window.TacticalShooter.AnimatorIK.solveTwoBoneIK(P.leftArm, P.leftArm.userData.elbow, U.lShoulderPos, U.leftHandTargetPos, U.worldLElbowHint, this._ik, this.upperArmLen, this.lowerArmLen);
        }
    }
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.RemotePlayerAnimator = RemotePlayerAnimator;
})();
