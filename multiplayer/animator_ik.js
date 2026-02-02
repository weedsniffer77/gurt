
// js/multiplayer/animator_ik.js
(function() {
    const AnimatorIK = {
        solveTwoBoneIK(bone1, bone2, rootPos, targetPos, hintPos, pool, upperLen, lowerLen) {
            const K = pool;
            const l1 = upperLen;
            const l2 = lowerLen;
            
            K.dir.subVectors(targetPos, rootPos);
            const dist = K.dir.length();
            const maxReach = (l1 + l2) * 0.999;
            if (dist > maxReach) K.dir.normalize().multiplyScalar(maxReach);
            
            const distSq = K.dir.lengthSq();
            const cos1 = (distSq + l1*l1 - l2*l2) / (2 * Math.sqrt(distSq) * l1);
            const angle1 = Math.acos(Math.min(1, Math.max(-1, cos1)));
            const cos2 = (l1*l1 + l2*l2 - distSq) / (2 * l1 * l2);
            const angle2 = Math.acos(Math.min(1, Math.max(-1, cos2)));
            
            K.targetDir.copy(K.dir).normalize();
            K.qBase.setFromUnitVectors(K.boneAxis, K.targetDir);
            
            K.hintVec.subVectors(hintPos, rootPos);
            K.planeNormal.crossVectors(K.targetDir, K.hintVec).normalize();
            
            K.axisY.copy(K.targetDir).negate(); 
            K.axisX.copy(K.planeNormal); 
            K.axisZ.crossVectors(K.axisX, K.axisY).normalize();
            K.mtx.makeBasis(K.axisX, K.axisY, K.axisZ);
            K.qOrient.setFromRotationMatrix(K.mtx);
            
            K.qBend.setFromAxisAngle(K.axisX, angle1);
            K.qUpper.copy(K.qBend).multiply(K.qOrient);
            
            if (bone1.parent) {
                K.qParentInv.set(0,0,0,1);
                bone1.parent.getWorldQuaternion(K.qParentInv);
                K.qParentInv.invert();
                bone1.quaternion.copy(K.qParentInv).multiply(K.qUpper);
            } else {
                bone1.quaternion.copy(K.qUpper);
            }
            
            const bendAngle = -(Math.PI - angle2);
            bone2.quaternion.setFromAxisAngle(K.axisX.set(1, 0, 0), bendAngle);
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.AnimatorIK = AnimatorIK;
})();
