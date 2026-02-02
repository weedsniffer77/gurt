
// js/multiplayer/animator_poses.js
(function() {
    const AnimatorPoses = {
        updateProceduralMovement(dt, state, stats, animator, mesh) {
            const T = animator.targets;
            const t = animator.animTime;
            
            T.bodyPos.set(state.lean * 0.25, 0, 0);
            T.torsoRot.set(0, 0, -state.lean * 0.65);
            
            T.leftLeg.rot.set(0,0,0); T.rightLeg.rot.set(0,0,0);
            T.leftKnee.rotX = 0; T.rightKnee.rotX = 0;
            T.leftFoot.rotX = 0; T.rightFoot.rotX = 0;

            if (state.isProne) {
                T.bodyPos.y = -0.9; T.bodyPos.z = 0.55;   
                T.torsoRot.x = -1.2; T.headRot.x = 1.2; 
                T.leftLeg.rot.x = -1.7; T.rightLeg.rot.x = -1.7;
                T.leftFoot.rotX = 0.5; T.rightFoot.rotX = 0.5;

                if (stats.isMoving) {
                    const crawlSpeed = t * 1.5;
                    T.bodyPos.x += Math.sin(crawlSpeed) * 0.1;
                    T.torsoRot.z += Math.cos(crawlSpeed) * 0.1;
                    T.leftKnee.rotX = Math.max(0, Math.sin(crawlSpeed)) * 1.5;
                    T.rightKnee.rotX = Math.max(0, Math.sin(crawlSpeed + Math.PI)) * 1.5;
                } else {
                    T.leftLeg.rot.y = -0.15; T.rightLeg.rot.y = 0.15;
                }

            } else if (stats.isSliding) {
                T.bodyPos.y = -0.8; T.bodyPos.z = 0.2; T.torsoRot.x = 0.5; 
                let yawDiff = state.lookYaw - mesh.rotation.y;
                while (yawDiff > Math.PI) yawDiff -= Math.PI * 2; while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
                T.headRot.y = yawDiff; 
                T.leftLeg.rot.x = 1.57; T.rightLeg.rot.x = 1.9; T.rightKnee.rotX = -1.7; 

            } else if (stats.isCrouching) {
                if (stats.isMoving) {
                    T.bodyPos.y = -0.25; T.torsoRot.x = -0.6; 
                    const strideAmp = 0.6;
                    T.leftLeg.rot.x = 1.1 + Math.sin(t * 1.5) * strideAmp;
                    T.leftKnee.rotX = -1.9 + Math.sin(t * 1.5 - 0.5) * 0.4;
                    T.rightLeg.rot.x = 1.1 + Math.sin(t * 1.5 + Math.PI) * strideAmp;
                    T.rightKnee.rotX = -1.9 + Math.sin(t * 1.5 + Math.PI - 0.5) * 0.4;
                } else {
                    T.bodyPos.y = -0.48; T.torsoRot.x = -0.3;
                    T.leftLeg.rot.x = 1.6; T.leftKnee.rotX = -1.6;
                    T.rightLeg.rot.y = -0.5; T.rightLeg.rot.x = 0.2; T.rightKnee.rotX = -2.0;
                }
            } else if (stats.isMoving) {
                if (stats.isSprinting) {
                    T.torsoRot.x = -0.3; const spT = animator.animTime * 1.5;
                    T.leftLeg.rot.x = Math.sin(spT) * 1.2; T.rightLeg.rot.x = Math.sin(spT + Math.PI) * 1.2;
                    T.leftKnee.rotX = -Math.max(0, Math.sin(spT)*2); T.rightKnee.rotX = -Math.max(0, Math.sin(spT + Math.PI)*2);
                } else {
                    T.leftLeg.rot.x = Math.sin(t) * 0.9; T.rightLeg.rot.x = Math.sin(t + Math.PI) * 0.9;
                    T.leftKnee.rotX = -Math.max(0, Math.sin(t + 0.5)) * 1.2; T.rightKnee.rotX = -Math.max(0, Math.sin(t + 0.5 + Math.PI)) * 1.2;
                }
            } else {
                T.bodyPos.y = Math.sin(animator.animTime * 1.5) * 0.005;
                T.leftKnee.rotX = -0.05; T.rightKnee.rotX = -0.05;
            }

            if (state.isADS && !stats.isCrouching && !stats.isSliding && !state.isProne) {
                T.torsoRot.x -= 0.3;
            }
        },

        applyBaseTransforms(dt, isMoving, isSliding, animator) {
            const P = animator.parts; const T = animator.targets;
            let smooth = isMoving ? (dt * 25.0) : (dt * 20.0);
            if (Math.abs(P.torso.rotation.x - T.torsoRot.x) > 0.5) smooth = dt * 3.0; 
            if (isSliding) smooth = dt * 40.0;

            const applyRot = (obj, target) => { obj.rotation.x = THREE.MathUtils.lerp(obj.rotation.x, target.x, smooth); obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, target.y, smooth); obj.rotation.z = THREE.MathUtils.lerp(obj.rotation.z, target.z, smooth); };

            P.bodyGroup.position.x = THREE.MathUtils.lerp(P.bodyGroup.position.x, T.bodyPos.x, smooth);
            P.bodyGroup.position.y = THREE.MathUtils.lerp(P.bodyGroup.position.y, T.bodyPos.y, smooth);
            P.bodyGroup.position.z = THREE.MathUtils.lerp(P.bodyGroup.position.z, T.bodyPos.z, smooth);
            P.bodyGroup.rotation.y = THREE.MathUtils.lerp(P.bodyGroup.rotation.y, T.torsoRot.y, smooth);
            
            applyRot(P.torso, T.torsoRot); applyRot(P.head, T.headRot); applyRot(P.leftLeg, T.leftLeg.rot); applyRot(P.rightLeg, T.rightLeg.rot);
            P.leftLeg.userData.knee.rotation.x = THREE.MathUtils.lerp(P.leftLeg.userData.knee.rotation.x, T.leftKnee.rotX, smooth);
            P.rightLeg.userData.knee.rotation.x = THREE.MathUtils.lerp(P.rightLeg.userData.knee.rotation.x, T.rightKnee.rotX, smooth);
            if (P.leftLeg.userData.knee.userData.foot) P.leftLeg.userData.knee.userData.foot.rotation.x = THREE.MathUtils.lerp(P.leftLeg.userData.knee.userData.foot.rotation.x, T.leftFoot.rotX, smooth);
            if (P.rightLeg.userData.knee.userData.foot) P.rightLeg.userData.knee.userData.foot.rotation.x = THREE.MathUtils.lerp(P.rightLeg.userData.knee.userData.foot.rotation.x, T.rightFoot.rotX, smooth);
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.AnimatorPoses = AnimatorPoses;
})();
