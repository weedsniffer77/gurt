
// js/multiplayer/network_state.js
(function() {
    const NetworkState = {
        getLocalPacket() {
            const charController = window.TacticalShooter.CharacterController;
            const playerState = window.TacticalShooter.PlayerState;
            const playerCamera = window.TacticalShooter.PlayerCamera;
            const gunRenderer = window.TacticalShooter.GunRenderer;
            const weaponManager = window.TacticalShooter.WeaponManager;
            const scoreSystem = window.TacticalShooter.ScoreSystem;
            
            if (!charController || !playerState || !playerCamera) {
                return null;
            }
            
            const currentWep = weaponManager && weaponManager.currentWeapon ? weaponManager.currentWeapon : null;

            // --- GOLDEN STATE STATUS ---
            // This single string determines visibility on all clients.
            let status = 'SPECTATING';
            if (!playerState.isSpectating) {
                if (playerState.isDead) status = 'DEAD';
                else status = 'ALIVE';
            }

            return {
                // Authoritative Visibility
                status: status,
                
                // Physics (Quantized to 2 decimal places = cm precision)
                position: {
                    x: Math.round(charController.position.x * 100) / 100,
                    y: Math.round(charController.position.y * 100) / 100,
                    z: Math.round(charController.position.z * 100) / 100
                },
                rotation: {
                    x: Math.round(playerCamera.pitch * 100) / 100,
                    y: Math.round(playerCamera.yaw * 100) / 100,
                    z: 0
                },
                lean: Math.round(charController.effectiveLean * 100) / 100, 
                
                // Animation Flags
                isADS: playerState.isADS,
                isCrouching: charController.isCrouching,
                isSliding: charController.isSliding,
                isProne: charController.isProne, 
                isSprinting: charController.isSprinting, 
                isControllingDrone: playerState.isControllingDrone, // ADDED
                
                // Weapon State
                isAttachmentOn: playerState.isAttachmentOn, 
                isGunBlocked: gunRenderer ? gunRenderer.isBarrelBlocked : false, 
                weaponId: currentWep ? currentWep.id : "PISTOL",
                attachments: currentWep ? currentWep.attachments : [],
                
                // Events & Stats
                currentAmmo: playerState.currentAmmo, // Synced for killcam UI mostly
                health: playerState.health,
                maxHealth: playerState.maxHealth, // ADDED: Max Health for correct bar scaling
                streak: scoreSystem ? scoreSystem.currentKillstreak : 0, // Synced for Buzzkill
                
                // Identity
                teamId: window.TacticalShooter.TeamManager ? window.TacticalShooter.TeamManager.getLocalTeamId() : 0,
                name: window.TacticalShooter.PlayroomManager ? window.TacticalShooter.PlayroomManager.localPlayerName : "Player"
            };
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.NetworkState = NetworkState;
})();
