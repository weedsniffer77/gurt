
// js/data/perk_behaviors.js
(function() {
    const PerkSystem = {
        
        hasPerk(perkId) {
            const LM = window.TacticalShooter.LoadoutManager;
            if (!LM || !LM.activeLoadout) return false;
            return LM.activeLoadout.perks.includes(perkId);
        },
        
        // --- WEAPON MODIFICATION INJECTION (Used in LoadoutManager) ---
        applyWeaponModifications(def) {
            // SUBSONIC AMMO (Damage Perk)
            if (this.hasPerk("SUBSONIC_AMMO") && def.id === "TYPE92") {
                this._applySubsonic(def);
            }
            
            // AKIMBO (Damage Perk)
            if (this.hasPerk("AKIMBO_PISTOLS") && def.id === "PISTOL") {
                this._applyAkimbo(def);
            }
            
            // SHOTGUN JUMP (Debuff)
            if (this.hasPerk("SHOTGUN_JUMP") && def.id === "SHOTGUN") {
                def.damage *= 0.50; // -50% Damage (Reduced from 65%)
            }
        },
        
        _applySubsonic(def) {
            def.isSubsonic = true;
            def.ballistics.muzzleVelocity = 320;
            def.damage = 17.5;
            def.ragdollImpulse = 1.0;
            def.range *= 0.7;
            def.recoilPitch *= 0.85;
            def.recoilYaw *= 0.85;
            
            // AMMO TYPE SWITCH
            def.ammoType = '9mm_sub';
            
            // Ammo Count Override
            def.magazineSize = 15;
            def.reserveAmmo = 60; // 15 + 60
            
            if (def.automatic || def.isMatchTrigger) {
                def.fireRate = 0.2; // 300 RPM
                if (!def.visuals) def.visuals = {};
                def.visuals.customStats = { fireRate: 30 };
            }
            
            if (!def.effects) def.effects = {};
            def.effects.impact = {
                useDebris: true, color: 0x888888, opacity: 0.6,
                size: 0.06, speed: 3.0, gravity: -9.8, particleCount: 6, lifetime: 0.5
            };
            
            if (!def.visuals) def.visuals = {};
            def.visuals.muzzleFlashIntensity = 0;
            def.visuals.muzzleFlashScale = 0;

            if (!def.damageFalloff) def.damageFalloff = {};
            def.damageFalloff.head = [
                { maxDist: 5, dmg: 100 }, 
                { maxDist: 20, dmg: 40 }, 
                { maxDist: Infinity, dmg: 20 }
            ];
            
            if (!def.attachments.includes('type92_suppressor')) {
                def.attachments.push('type92_suppressor');
            }
        },
        
        _applyAkimbo(def) {
            const hasOptic = def.attachments.some(a => a === "optic_reddot" || a === "optic_holo");
            if (hasOptic) return; 

            def.allowADS = false; 
            def.ammoPerShot = 2; 
            def.reloadTime = (def.reloadTime || 1.8) * 2.0; 
            def.magazineSize *= 2; 
            def.reserveAmmo *= 2;  
            def.projectilesPerShot = 2; 
            def.sprintMultiplier = (def.sprintMultiplier || 1.2) * 0.97;

            if (def.visuals && def.visuals.hipPosition) def.visuals.hipPosition.x = 0.0; 
            if (def.visuals) {
                def.visuals.sprintRotation = { x: 0, y: 0, z: 0 };
                def.visuals.sprintPosition = { x: 0, y: -0.1, z: -0.2 };
            }
            if (def.visuals && def.visuals.ikStats) {
                def.visuals.leftHandOffset = { x: 0, y: 0, z: 0 }; 
                def.visuals.ikStats.leftHandMode = 'grip';
            }
            let spreadFactor = 2.5; 
            if (def.automatic) spreadFactor *= 0.7; 
            def.hipfireSpread = (def.hipfireSpread || 0.03) * spreadFactor;
            
            if (!def.attachments.includes('pistol_akimbo')) {
                def.attachments.push('pistol_akimbo');
            }
        },

        getMovementMultiplier() {
            let mod = 1.0;
            if (this.hasPerk("SCOUT")) mod *= 1.2; 
            if (this.hasPerk("STOPPING_POWER")) mod *= 0.95;
            if (this.hasPerk("BANDOLIER")) mod *= 0.95;
            if (this.hasPerk("FLAK_JACKET")) mod *= 0.925;
            if (this.hasPerk("PLATE_CARRIER")) mod *= 0.85;
            if (this.hasPerk("ADRENALINE")) {
                const PS = window.TacticalShooter.PlayerState;
                if (PS && PS.modules.health && !PS.isSpectating) {
                     if (Date.now() - PS.modules.health.lastHitTime < 3000) {
                         mod *= 1.15;
                     }
                }
            }
            return mod;
        },

        modifyMaxHealth(baseHealth) {
            return baseHealth;
        },

        modifyIncomingDamage(amount, damageOrigin) {
            let final = amount;
            if (damageOrigin && this.hasPerk("FLAK_JACKET")) final *= 0.6; 
            if (this.hasPerk("PLATE_CARRIER")) final *= 0.8; 
            if (this.hasPerk("SCOUT")) final *= 1.33; 
            if (this.hasPerk("STEALTH")) final *= 1.33; 
            return final;
        },

        modifyOutgoingDamage(amount) {
            let dmg = amount;
            if (this.hasPerk("STOPPING_POWER")) dmg *= 1.15;
            if (this.hasPerk("LAST_STAND")) {
                const PS = window.TacticalShooter.PlayerState;
                if (PS && PS.health <= 15) dmg *= 2.0;
            }
            return dmg;
        },
        
        modifyHealingParams() {
            let delay = 10000;
            let rate = 15;
            if (this.hasPerk("QUICK_HEAL")) {
                delay = 5000; 
                const PS = window.TacticalShooter.PlayerState;
                if (PS && PS.health < 50) rate = 30; 
            }
            return { delay, rate };
        },

        modifyReserveAmmo(amount) {
            let val = amount;
            if (this.hasPerk("BANDOLIER")) val = Math.floor(val * 1.3);
            if (this.hasPerk("QUICK_RELOAD")) val = Math.floor(val * 0.7); 
            // Subsonic cap handled in attributes/apply logic
            return val;
        },
        
        modifyReloadSpeed(baseTime, weaponId) {
            let time = baseTime;
            if (this.hasPerk("QUICK_RELOAD")) time *= 0.7; 
            if (weaponId && weaponId.includes('RPG') && this.hasPerk("ROCKET_JUMP")) time *= 0.7;
            return time;
        },
        
        modifyPumpTime(baseTime, weaponId) {
            let time = baseTime;
            if (weaponId && weaponId.includes('SHOTGUN') && this.hasPerk("SHOTGUN_JUMP")) time *= 0.7;
            return time;
        },

        onBulletImpact(weaponId, hitResult) {
            if (!weaponId) return; // Prevent crash on undefined weaponId (Melee, etc)

            if (this.hasPerk("SHOTGUN_JUMP")) {
                const CC = window.TacticalShooter.CharacterController;
                if (weaponId.includes('SHOTGUN')) {
                    const point = hitResult.point;
                    const distToFeet = CC.position.distanceTo(point);
                    if (distToFeet < 3.5) {
                        const forceDir = hitResult.normal.clone().normalize();
                        // NERF: Reduced to 0.64 (20% reduction from 0.8)
                        const forceMagnitude = 0.64; 
                        CC.velocity.x += forceDir.x * forceMagnitude;
                        CC.velocity.y += forceDir.y * forceMagnitude;
                        CC.velocity.z += forceDir.z * forceMagnitude;
                        if (forceDir.y > 0.1) CC.isGrounded = false;
                    }
                }
            }
        },

        onRocketExplosion(rocket, distToPlayer) {
            if (this.hasPerk("ROCKET_JUMP") && rocket.warhead === 'PG7V') {
                const CC = window.TacticalShooter.CharacterController;
                if (distToPlayer < 6.0) {
                    const playerCenter = CC.position.clone().add(new THREE.Vector3(0, 0.9, 0));
                    const explosionCenter = rocket.pos.clone();
                    const blastDir = new THREE.Vector3().subVectors(playerCenter, explosionCenter).normalize();
                    if (blastDir.lengthSq() < 0.01) blastDir.set(0, 1, 0);
                    
                    const force = 33.0; 
                    
                    CC.velocity.x += blastDir.x * force;
                    CC.velocity.y += (blastDir.y * force) * 0.7; 
                    CC.velocity.z += blastDir.z * force;
                    CC.isGrounded = false;
                    return 20; 
                }
            }
            return null; 
        },

        onDeath(position) {
            if (this.hasPerk("MARTYRDOM")) {
                if (window.TacticalShooter.ThrowableManager) {
                    setTimeout(() => {
                        const myId = window.TacticalShooter.PlayroomManager.myPlayer ? window.TacticalShooter.PlayroomManager.myPlayer.id : "SELF";
                        const dropPos = position.clone().add(new THREE.Vector3(0,0.5,0));
                        const vel = window.TacticalShooter.ThrowableManager.throwItem(dropPos, new THREE.Vector3(0,-1,0), 'FRAG', 0.1, myId);
                        const list = window.TacticalShooter.ThrowableManager.projectiles;
                        if (list.length > 0) list[list.length-1].timer = 2.5; 
                        if (window.TacticalShooter.NetworkEventHandler) {
                            window.TacticalShooter.NetworkEventHandler.broadcastThrow(dropPos, vel, 'FRAG');
                        }
                    }, 1000);
                }
            }
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.PerkSystem = PerkSystem;
})();
