
// js/core/stat_system.js
(function() {
    const StatSystem = {
        // Deep clone helper to prevent attachments from permanently altering the base weapon data
        cloneWeaponDefinition(baseDef) {
            if (!baseDef) return null;
            const newDef = { ...baseDef };
            if (baseDef.visuals) newDef.visuals = JSON.parse(JSON.stringify(baseDef.visuals));
            if (baseDef.ballistics) newDef.ballistics = JSON.parse(JSON.stringify(baseDef.ballistics));
            if (baseDef.effects) newDef.effects = JSON.parse(JSON.stringify(baseDef.effects));
            if (baseDef.damageFalloff) newDef.damageFalloff = JSON.parse(JSON.stringify(baseDef.damageFalloff));
            if (baseDef.attachmentSlots) newDef.attachmentSlots = JSON.parse(JSON.stringify(baseDef.attachmentSlots));
            newDef.attachments = [];
            
            // Copy Stats Config if present
            if (baseDef.statsViewer) newDef.statsViewer = JSON.parse(JSON.stringify(baseDef.statsViewer));
            
            return newDef;
        },

        getAllAttachmentsForWeapon(weaponId, gameData) {
            const globalAtts = gameData.Attachments || {};
            const weaponDef = gameData.Weapons[weaponId];
            const localAtts = (weaponDef && weaponDef.localAttachments) ? weaponDef.localAttachments : {};
            return { ...globalAtts, ...localAtts };
        },
        
        getCompatibleAttachments(weaponId, slotType, currentAttachments) {
            const GameData = window.TacticalShooter.GameData;
            const allAtts = this.getAllAttachmentsForWeapon(weaponId, GameData);
            
            const list = [];
            
            if (!(weaponId === 'RPG7' && slotType === 'rocket')) {
                 list.push({ id: null, name: "NONE", locked: false, failureReasons: [] });
            }

            for (const id in allAtts) {
                const att = allAtts[id];
                if (att.type !== slotType) continue;
                
                if (weaponId === 'M24') {
                    if (id.includes('optic_')) continue; 
                    if (att.name.toLowerCase().includes('suppressor')) continue; 
                }
                
                if (weaponId === 'RPG7') {
                    if (!id.startsWith('rpg_')) continue;
                } else {
                    if (id.startsWith('rpg_')) continue;
                }
                
                if (id.startsWith('smg_') && weaponId !== 'SMG') continue;
                if (id.startsWith('pistol_') && weaponId !== 'PISTOL') continue;
                if (id.startsWith('shotgun_') && !weaponId.includes('SHOTGUN')) continue;
                if (id.startsWith('type92_') && weaponId !== 'TYPE92') continue;
                
                let isLocked = false;
                let failureReasons = [];
                
                if (att.requirements) {
                    att.requirements.forEach(req => {
                        if (!currentAttachments.includes(req)) {
                            const reqName = allAtts[req] ? allAtts[req].name : req;
                            isLocked = true;
                            failureReasons.push({type:'req', text: `REQUIRES ${reqName}`});
                        }
                    });
                }
                
                if (att.excludes) {
                    att.excludes.forEach(ex => {
                        if (currentAttachments.includes(ex)) {
                             const exName = allAtts[ex] ? allAtts[ex].name : ex;
                             isLocked = true;
                             failureReasons.push({type:'conflict', text: `INCOMPATIBLE WITH ${exName}`});
                        }
                    });
                }
                
                currentAttachments.forEach(equipped => {
                    const eDef = allAtts[equipped];
                    if (eDef && eDef.excludes && eDef.excludes.includes(id)) {
                        isLocked = true;
                        failureReasons.push({type:'conflict', text: `INCOMPATIBLE WITH ${eDef.name}`});
                    }
                });
                
                if (weaponId === 'PISTOL' && currentAttachments.includes('pistol_akimbo') && slotType === 'optic') {
                     isLocked = true;
                     failureReasons.push({type:'conflict', text: "CANNOT USE WITH AKIMBO"});
                }
                
                list.push({ id: id, name: att.name, description: att.description, locked: isLocked, failureReasons: failureReasons });
            }
            return list;
        },

        calculateWeaponStats(baseId, attachmentIds, gameData) {
            const baseDef = gameData.Weapons[baseId];
            if (!baseDef) {
                if (gameData.Throwables[baseId]) return gameData.Throwables[baseId];
                if (gameData.Scorestreaks[baseId]) return gameData.Scorestreaks[baseId];
                return null;
            }
            
            const finalDef = this.cloneWeaponDefinition(baseDef);
            const allAttachments = this.getAllAttachmentsForWeapon(baseId, gameData);
            const appliedIds = [];
            (attachmentIds || []).forEach(attId => {
                const attData = allAttachments[attId];
                if (attData && typeof attData.apply === 'function') {
                    try { attData.apply(finalDef); appliedIds.push(attId); } 
                    catch (e) { console.error(`StatSystem: Error applying attachment ${attId}`, e); }
                }
            });
            finalDef.attachments = appliedIds;
            return finalDef;
        },

        getDisplayStats(def) {
            // Basic Safe Return
            if (!def) return { damage: 0, range: 0, accuracy: 0, control: 0, mobility: 0, reload: 0, fireRate: 0 };
            
            // --- APPLY GLOBAL PERK MODIFIERS TO STATS ---
            // Create a temp copy so we don't mutate the passed definition if it's cached
            // However, getDisplayStats usually receives a fresh calculated def from LoadoutStats
            
            // Apply Quick Reload Logic for display
            if (window.TacticalShooter.PerkSystem && def.reloadTime) {
                def.reloadTime = window.TacticalShooter.PerkSystem.modifyReloadSpeed(def.reloadTime);
            }
            
            // Apply Stopping Power to Damage for display
            // This is complex because damage is often calculated inside.
            // We apply it after base calc.

            let stats = {};

            // --- 1. DETERMINE TYPE & BASE STATS ---

            if (def.killsRequired !== undefined || def.id === 'AMMO_BOX') {
                // SCORESTREAK
                stats.isScorestreak = true;
                stats.mobility = 100; // Default
            } 
            else if (def.id === 'RPG7') {
                // RPG
                const rad = def.explosive ? def.explosive.radius : 4.0;
                let dmg = def.explosive ? def.explosive.damage : 200;
                
                // Perk Dmg
                if (window.TacticalShooter.PerkSystem) dmg = window.TacticalShooter.PerkSystem.modifyOutgoingDamage(dmg);

                const sprint = def.sprintMultiplier || 0.7;
                const mobScore = Math.round(sprint * 100);
                const relTime = def.reloadTime || 3.0;
                const relScore = Math.min(200, 400 / Math.max(0.5, relTime));

                stats.damage = Math.round(dmg);
                stats.blastRadius = Math.min(200, rad * 10.0);
                stats.mobility = mobScore;
                stats.reload = Math.round(relScore);
                
                stats.rawBlast = rad + "m";
                stats.rawDamage = Math.round(dmg);
                stats.rawReload = relTime;
                stats.isRPG = true;
            }
            else if (def.type === 'throwable') {
                // THROWABLE
                const exp = def.explosion || {};
                let dmg = exp.maxDamage || 0;
                
                // Perk Dmg
                if (window.TacticalShooter.PerkSystem) dmg = window.TacticalShooter.PerkSystem.modifyOutgoingDamage(dmg);
                
                const rad = exp.radius || 0;
                
                let damScore = dmg;
                if (dmg > 10) damScore = dmg * 1.2;
                
                const radScore = Math.min(200, (rad / 20) * 200);
                
                stats.damage = Math.round(damScore);
                stats.radius = Math.round(radScore);
                stats.mobility = 105;
                stats.isThrowable = true;
                stats.rawDamage = Math.round(dmg);
                stats.rawRadius = rad;
            }
            else if (def.type === 'melee') {
                // MELEE
                let dmg = def.damage || 50;
                // Perk Dmg
                if (window.TacticalShooter.PerkSystem) dmg = window.TacticalShooter.PerkSystem.modifyOutgoingDamage(dmg);

                const damScore = dmg * 2;
                const sprint = def.sprintMultiplier || 1.3;
                const mobScore = Math.round(sprint * 100);
                const rate = def.fireRate || 1.0;
                const speedScore = Math.max(0, 200 * (1.0 - (rate / 5.0)));
                
                stats.damage = Math.round(damScore);
                stats.mobility = mobScore;
                stats.attackSpeed = Math.round(speedScore);
                stats.isMelee = true;
                stats.rawSpeed = rate;
            }
            else {
                // GUNS (Default)
                const shots = def.projectilesPerShot || 1;
                let totalDmg = def.damage || 0;
                
                // Perk Dmg
                if (window.TacticalShooter.PerkSystem) totalDmg = window.TacticalShooter.PerkSystem.modifyOutgoingDamage(totalDmg);
                
                if (shots > 1 && totalDmg < 50) totalDmg *= shots; 
                
                let damageScore = 0;
                if (shots > 1) damageScore = totalDmg * 0.833;
                else damageScore = totalDmg * 2.0;

                let maxEffectiveRange = def.range || 50;
                if (def.damageFalloff && def.damageFalloff.base && def.damageFalloff.base.length > 0) {
                    maxEffectiveRange = def.damageFalloff.base[0].maxDist;
                }
                const rangeScore = Math.min(200, maxEffectiveRange * 2.5);

                const spread = def.hipfireSpread !== undefined ? def.hipfireSpread : 0.05;
                const accScore = Math.max(0, 200 * (1.0 - (spread / 0.1)));

                const pitch = def.recoilPitch || 0;
                const yaw = def.recoilYaw || 0;
                let visualMultiplier = 1.0;
                if (def.visuals && def.visuals.statRecoilMultiplier) visualMultiplier = def.visuals.statRecoilMultiplier;
                
                let totalRecoil = (pitch + yaw) * visualMultiplier;
                if (!def.automatic) totalRecoil /= 2;

                const recoilScore = Math.max(0, 200 * (1.0 - (totalRecoil / 0.1)));

                const sprint = def.sprintMultiplier || 1.0;
                const adsSpeed = (def.visuals && def.visuals.adsInSpeed) ? def.visuals.adsInSpeed : 10;
                const drawTime = def.drawTime || 0.5;
                
                const mobScore = (sprint * 100) + (adsSpeed * 2.0) + (1.0 / drawTime * 15.0) - 50; 
                const finalMobScore = Math.min(200, Math.max(0, mobScore));

                let relTime = def.reloadTime || 3.0;
                if (def.reloadType === 'incremental') {
                    relTime = (def.reloadStart || 1.0) + ((def.reloadLoop || 0.5) * (def.magazineSize || 1));
                }
                const relScore = Math.min(200, 400 / Math.max(0.5, relTime));
                
                const rpm = (1.0 / (def.fireRate || 0.1)) * 60;
                let rofScore = rpm / 10; 
                if (!def.automatic) rofScore /= 2;

                stats.damage = Math.round(damageScore);
                stats.range = Math.round(rangeScore);
                stats.accuracy = Math.round(accScore);
                stats.control = Math.round(recoilScore);
                stats.mobility = Math.round(finalMobScore);
                stats.reload = Math.round(relScore);
                stats.fireRate = Math.round(rofScore);
                
                stats.rawDamage = Math.round(totalDmg); // ROUNDED HERE
                stats.rawRange = maxEffectiveRange;
                stats.rawReload = relTime;
                stats.rawSprint = Math.round(sprint * 100);
            }

            // --- 2. APPLY OVERRIDES (Shared Logic) ---
            
            // Apply statsViewer config (Labels & Overrides)
            if (def.statsViewer) {
                stats.viewerConfig = def.statsViewer;
                if (def.statsViewer.overrides) {
                    for (const key in def.statsViewer.overrides) {
                        stats[key] = def.statsViewer.overrides[key];
                    }
                }
            }
            
            // Legacy visuals overrides
            if (def.visuals && def.visuals.customStats) {
                const overrides = def.visuals.customStats;
                for (const key in overrides) {
                    if (overrides[key] === null) {
                        delete stats[key];
                    } else {
                        stats[key] = overrides[key];
                    }
                }
            }

            return stats;
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.StatSystem = StatSystem;
})();
