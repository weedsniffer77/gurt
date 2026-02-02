
// js/core/spawn_system.js
(function() {
    const SpawnSystem = {
        cachedSpawnData: null,

        calculateSpawnPoint() {
            const WB = window.TacticalShooter.WorldBuilder;
            if (!WB) return { pos: new THREE.Vector3(0, 5, 0), rot: 0 };

            const config = WB.getActiveGameConfig();
            const TM = window.TacticalShooter.TeamManager;
            const MS = window.TacticalShooter.MatchState ? window.TacticalShooter.MatchState.state : null;
            
            // Verify teams if needed
            if (TM && MS && MS.gamemode !== 'FFA' && !window.TacticalShooter.PlayroomManager.isHost) {
                TM.verifyTeamAssignment(MS.teamCount);
            }

            const myTeam = TM ? TM.getLocalTeamId() : 0;
            const teamData = config.teamSpawns ? config.teamSpawns[myTeam] : null;
            
            let spawnPos = new THREE.Vector3(0,0,0);
            let spawnRot = 0;
            const isFFA = MS && MS.gamemode === 'FFA';

            if (isFFA) {
                 const spawns = config.ffaSpawns || [];
                 if (spawns.length > 0) {
                     const idx = Math.floor(Math.random() * spawns.length);
                     const pt = spawns[idx];
                     spawnPos.set(pt.x, 0.5, pt.z); 
                     
                     // Look at center
                     const center = new THREE.Vector3(0,0,0);
                     const lookDir = center.sub(spawnPos).normalize();
                     spawnRot = Math.atan2(lookDir.x, lookDir.z) + Math.PI;
                 } else { 
                     spawnPos.set(0, 10, 0); 
                 }
            } else if (teamData) {
                spawnPos.set(teamData.origin.x, teamData.origin.y, teamData.origin.z);
                const offset = (Math.random() - 0.5) * (teamData.spreadWidth || 10);
                if (teamData.spreadAxis === 'x') spawnPos.x += offset; else spawnPos.z += offset; 
                
                const lookTarget = new THREE.Vector3(teamData.lookAt.x, teamData.lookAt.y, teamData.lookAt.z);
                const dir = lookTarget.sub(spawnPos).normalize();
                spawnRot = Math.atan2(dir.x, dir.z) + Math.PI;
            } else {
                spawnPos.set(config.playerSpawn.position.x, config.playerSpawn.position.y, config.playerSpawn.position.z);
                spawnRot = config.playerSpawn.rotation.y;
            }
            
            return { pos: spawnPos, rot: spawnRot };
        },
        
        cacheSpawn() {
            this.cachedSpawnData = this.calculateSpawnPoint();
        },

        spawnPlayer(camera) {
            let spawnData = this.cachedSpawnData;
            if (!spawnData) {
                spawnData = this.calculateSpawnPoint();
            }
            this.cachedSpawnData = null;

            if (window.TacticalShooter.CharacterController) {
                window.TacticalShooter.CharacterController.init(spawnData.pos);
                window.TacticalShooter.CharacterController.isNoclip = false;
            }
            
            if (window.TacticalShooter.PlayerCamera && camera) {
                window.TacticalShooter.PlayerCamera.init(camera, { x: 0, y: spawnData.rot, z: 0 });
            }
            
            if (window.TacticalShooter.PlayerState) {
                const wm = window.TacticalShooter.WeaponManager;
                if (wm && wm.currentWeapon) {
                    window.TacticalShooter.PlayerState.setWeapon(wm.currentWeapon);
                }
            }
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.SpawnSystem = SpawnSystem;
})();
