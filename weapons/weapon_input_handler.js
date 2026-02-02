
// js/weapons/weapon_input_handler.js
(function() {
    const WeaponInputHandler = {
        // State for toggle checks
        fPressed: false,
        lPressed: false,

        processInput(dt, inputManager, playerState, weaponManager) {
            const currentWeapon = weaponManager.currentWeapon;
            if (!currentWeapon) return;

            // Block inputs during Pre-Round
            const isBlocked = (window.TacticalShooter.MatchState && window.TacticalShooter.MatchState.state.status === 'PRE_ROUND');
            if (isBlocked) {
                playerState.setADS(false);
                return;
            }

            // 1. Quick Actions
            if (inputManager.wasActionJustPressed('QuickMelee')) {
                if (currentWeapon.type !== 'melee') {
                    weaponManager.startQuickMelee();
                }
            }
            if (inputManager.wasActionJustPressed('QuickGrenade')) {
                weaponManager.startQuickGrenade();
            }

            // 2. Weapon Specific Inputs (Non-Throwable)
            if (currentWeapon.type !== 'throwable') {
                // Reload
                if (inputManager.wasActionJustPressed('Reload')) {
                    if (playerState.isReloading && currentWeapon.reloadType === 'incremental') {
                        playerState.cancelReload();
                    } else {
                        playerState.startReload();
                    }
                }

                // Inspect
                if (inputManager.isActionActive('Inspect')) {
                    if (!this.fPressed) {
                        playerState.toggleInspect();
                        this.fPressed = true;
                    }
                } else {
                    this.fPressed = false;
                }

                // Attachments (Laser/Flashlight toggle)
                if (inputManager.wasActionJustPressed('AttachmentFunctionality')) {
                    if (!this.lPressed) {
                        playerState.toggleAttachment();
                        this.lPressed = true;
                    }
                } else {
                    this.lPressed = false;
                }
            }

            // 3. ADS Logic
            let canADS = true;
            if (currentWeapon.type === 'melee' || currentWeapon.allowADS === false || currentWeapon.type === 'special') {
                canADS = false;
            }
            
            // Check barrel block via GunRenderer
            const isBlockedPhysically = window.TacticalShooter.GunRenderer && window.TacticalShooter.GunRenderer.isBarrelBlocked;
            
            let adsActive = inputManager.isActionActive('ADS') && canADS;
            if (isBlockedPhysically) adsActive = false;
            
            playerState.setADS(adsActive);

            // 4. Firing Logic
            let isShooting = currentWeapon.automatic ? inputManager.isActionActive('Shoot') : inputManager.wasActionJustPressed('Shoot');
            
            if (isShooting && !isBlockedPhysically) {
                // Special Weapons (Drone Remote, etc)
                if (currentWeapon.type === 'special' && currentWeapon.attackAction) {
                    if (playerState.currentAmmo > 0 && weaponManager.fireTimer <= 0 && weaponManager.drawTimer <= 0) {
                        currentWeapon.attackAction();
                        weaponManager.fireTimer = 1.0;
                        if (!currentWeapon.visuals || !currentWeapon.visuals.suppressMeleeAnim) {
                            if (window.TacticalShooter.GunRenderer) window.TacticalShooter.GunRenderer.triggerMeleeAnimation();
                        }
                    }
                } 
                // Pump Shotguns
                else if (playerState.needsPump) {
                    playerState.triggerPump();
                } 
                // Standard Fire (OR MELEE)
                else if (playerState.currentAmmo > 0 || currentWeapon.type === 'melee') {
                    if (playerState.isReloading && currentWeapon.reloadType === 'incremental') {
                        playerState.cancelReload();
                    }
                    weaponManager.attemptFire(playerState, window.TacticalShooter.PlayerCamera);
                }
                // Manual Click to Reload (If Empty)
                else if (playerState.currentAmmo === 0 && playerState.reserveAmmo > 0 && !playerState.isReloading) {
                     playerState.startReload();
                }
            } 
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.WeaponInputHandler = WeaponInputHandler;
})();