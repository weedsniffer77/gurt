
// js/core/score_system.js
(function() {
    const ScoreSystem = {
        // State
        recentDamageEvents: new Map(), // Map<targetId, { time, amount, type }>
        incomingDamage: new Map(),
        
        multikillCount: 0,
        multikillTimer: 0,
        multikillWindow: 10000, 
        
        currentKillstreak: 0,
        
        lastKillerId: null, 
        
        // New Tracking
        lastKillTime: 0,
        rampageCount: 0,
        localFirstBlood: false, 

        init() {
            console.log("ScoreSystem: Initialized.");
            this.resetMatchData();
        },
        
        resetMatchData() {
            this.recentDamageEvents.clear();
            this.incomingDamage.clear();
            this.multikillCount = 0;
            this.currentKillstreak = 0;
            this.lastKillerId = null;
            this.lastKillTime = 0;
            this.rampageCount = 0;
            this.localFirstBlood = false;
        },
        
        recordIncomingDamage(attackerId, amount) {
            if (!this.incomingDamage.has(attackerId)) {
                this.incomingDamage.set(attackerId, 0);
            }
            this.incomingDamage.set(attackerId, this.incomingDamage.get(attackerId) + amount);
        },

        recordOutgoingDamage(targetId, amount, type = 'gun') {
            this.recentDamageEvents.set(targetId, { time: Date.now(), amount: amount, type: type });
            // Prune old
            const now = Date.now();
            for (const [tid, data] of this.recentDamageEvents) {
                if (now - data.time > 5000) this.recentDamageEvents.delete(tid);
            }
        },
        
        onDeathEvent(victimId, killerId, hitPart, damageVector) {
            const PM = window.TacticalShooter.PlayroomManager;
            if (!PM || !PM.myPlayer) return;
            const myId = PM.myPlayer.id;
            
            // 1. I DIED
            if (victimId === myId) {
                this.lastKillerId = killerId;
                this.multikillCount = 0;
                this.currentKillstreak = 0;
                this.rampageCount = 0;
                this.incomingDamage.clear();
                return;
            }
            
            // 2. I KILLED
            if (killerId === myId) {
                // If I am dead, it's Martyrdom OR Suicide Bomber (if drone)
                const isDead = window.TacticalShooter.PlayerState.isDead;
                this.processKill(victimId, hitPart, isDead);
                this.recentDamageEvents.delete(victimId);
                return;
            }
            
            // 3. I ASSISTED
            if (this.recentDamageEvents.has(victimId)) {
                const data = this.recentDamageEvents.get(victimId);
                if (Date.now() - data.time < 5000) {
                    this.triggerScore("ASSIST");
                }
                this.recentDamageEvents.delete(victimId);
            }
        },
        
        processKill(victimId, hitPart, isPostMortem) {
            const Events = window.TacticalShooter.GameData.ScoreEvents;
            const WM = window.TacticalShooter.WeaponManager;
            const CC = window.TacticalShooter.CharacterController;
            const PS = window.TacticalShooter.PlayerState;
            const now = Date.now();
            
            this.currentKillstreak++;

            let totalScore = 0;
            let labels = [];
            let mainLabel = Events.KILL.label;
            
            // Retrieve last damage source type
            let lethalType = 'gun';
            if (this.recentDamageEvents.has(victimId)) {
                lethalType = this.recentDamageEvents.get(victimId).type;
            }
            
            // Base Score Logic
            if (lethalType === 'airstrike') {
                // AIRSTRIKE KILL (50 PTS)
                totalScore += Events.AIRSTRIKE_KILL.score;
                mainLabel = Events.AIRSTRIKE_KILL.label;
            }
            else if (lethalType === 'drone_explosion') {
                totalScore += Events.FPV_DRONE_KILL.score;
                mainLabel = Events.FPV_DRONE_KILL.label;
                
                // SUICIDE BOMBER BONUS: If I am dead and got a drone kill
                if (isPostMortem) {
                    totalScore += Events.SUICIDE_BOMBER.score;
                    labels.push(Events.SUICIDE_BOMBER.label);
                }
            }
            else if (lethalType === 'FRAG') {
                totalScore += Events.FRAG_KILL.score;
                mainLabel = Events.FRAG_KILL.label;
            } 
            else if (lethalType === 'FLASH' || lethalType === 'impact') {
                totalScore += Events.HUMILIATION.score;
                mainLabel = Events.HUMILIATION.label;
            }
            else {
                totalScore += Events.KILL.score;
            }
            
            // --- BONUS POINTS ---
            
            if (lethalType === 'melee') {
                totalScore += Events.MELEE_BONUS.score;
                labels.push(Events.MELEE_BONUS.label);
            }

            // --- GLOBAL FIRST BLOOD ---
            if (window.Playroom) {
                 const fbClaimed = window.Playroom.getState("MATCH_firstBlood");
                 if (!fbClaimed) {
                     window.Playroom.setState("MATCH_firstBlood", true, true);
                     totalScore += Events.FIRST_BLOOD.score;
                     labels.push(Events.FIRST_BLOOD.label);
                 }
            }
            
            // --- VICTIM ANALYSIS ---
            if (window.TacticalShooter.RemotePlayerManager) {
                const victim = window.TacticalShooter.RemotePlayerManager.remotePlayers[victimId];
                if (victim && victim.player) {
                    const vicStreak = victim.player.getState('streak') || 0;
                    if (vicStreak >= 3) { 
                         totalScore += Events.BUZZKILL.score;
                         labels.push(Events.BUZZKILL.label);
                    }
                    
                    let maxScore = -1;
                    const remotes = window.TacticalShooter.RemotePlayerManager.remotePlayers;
                    for(let id in remotes) {
                        const s = remotes[id].player.getState('score') || 0;
                        if (s > maxScore) maxScore = s;
                    }
                    const vicScore = victim.player.getState('score') || 0;
                    if (vicScore >= maxScore && vicScore > 0) {
                        totalScore += Events.KINGSLAYER.score;
                        labels.push(Events.KINGSLAYER.label);
                    }
                }
            }
            
            // --- RAMPAGE ---
            if (now - this.lastKillTime < 4000 && this.lastKillTime !== 0) {
                this.rampageCount++;
                if (this.rampageCount >= 3) {
                    totalScore += Events.RAMPAGE.score;
                    labels.push(Events.RAMPAGE.label);
                }
            } else {
                this.rampageCount = 1;
            }
            this.lastKillTime = now;
            
            // --- MODIFIERS (Skip for indirect kills) ---
            const isIndirect = (lethalType === 'airstrike' || lethalType === 'drone_explosion' || lethalType === 'FRAG');

            if (hitPart === 'Head' && !isIndirect && lethalType !== 'melee') {
                totalScore += Events.HEADSHOT.score;
                labels.push(Events.HEADSHOT.label);
                
                // Bullseye Check (Headshot > 30m)
                if (WM && WM.currentWeapon) {
                     const victim = window.TacticalShooter.RemotePlayerManager.remotePlayers[victimId];
                     if (victim && victim.mesh) {
                         const dist = CC.position.distanceTo(victim.mesh.position);
                         if (dist > 30.0) {
                             totalScore += Events.BULLSEYE.score;
                             labels.push(Events.BULLSEYE.label);
                         }
                     }
                }
            }
            
            if (WM && WM.currentWeapon && lethalType === 'gun') {
                const wep = WM.currentWeapon;
                const victim = window.TacticalShooter.RemotePlayerManager.remotePlayers[victimId];
                
                if (victim && victim.mesh) {
                    const dist = CC.position.distanceTo(victim.mesh.position);
                    let isLongshot = false;
                    let isPointBlank = (dist < 3.0);
                    
                    if (wep.type === 'secondary' && dist > 35) isLongshot = true;
                    if (wep.id === 'SMG' && dist > 50) isLongshot = true;
                    if (wep.id === 'M24' && dist > 70) isLongshot = true; 
                    if (wep.id === 'RPG7' && dist > 50) isLongshot = true;

                    if (isLongshot) {
                        totalScore += Events.LONGSHOT.score;
                        labels.push(Events.LONGSHOT.label);
                    }
                    if (isPointBlank && wep.type !== 'melee') {
                        totalScore += Events.POINT_BLANK.score;
                        labels.push(Events.POINT_BLANK.label);
                    }
                    
                    // No Scope (Sniper + No ADS)
                    if (wep.id === 'M24' && !PS.isADS) {
                        totalScore += Events.NO_SCOPE.score;
                        labels.push(Events.NO_SCOPE.label);
                    }
                }
                
                if (PS && PS.currentAmmo === 0 && wep.magazineSize > 1) {
                    totalScore += Events.LAST_BULLET.score;
                    labels.push(Events.LAST_BULLET.label);
                }
            }
            
            if (!CC.isGrounded && !CC.isSliding && CC.position.y > 1.0) { 
                 totalScore += Events.MIDAIR.score;
                 labels.push(Events.MIDAIR.label);
            }
            
            if (this.lastKillerId === victimId) {
                totalScore += Events.PAYBACK.score;
                labels.push(Events.PAYBACK.label);
                this.lastKillerId = null; 
            }

            // Survivor (Low Health Kill)
            if (PS.health < 15) {
                totalScore += Events.SURVIVOR.score;
                labels.push(Events.SURVIVOR.label);
            }
            
            // Martyrdom (Post Mortem) - Exclude Drone/Suicide Bomber here
            if (isPostMortem && !isIndirect) {
                totalScore += Events.MARTYRDOM.score;
                labels.push(Events.MARTYRDOM.label);
            }

            if (this.incomingDamage.has(victimId)) {
                if (this.incomingDamage.get(victimId) >= 75) {
                    totalScore += Events.CLOSE_CALL.score;
                    labels.push(Events.CLOSE_CALL.label);
                }
            }

            // --- MULTIKILL ---
            if (now - this.multikillTimer < this.multikillWindow) {
                this.multikillCount++;
            } else {
                this.multikillCount = 1;
            }
            this.multikillTimer = now;
            
            let replacePrevious = false;
            
            if (this.multikillCount > 1) {
                replacePrevious = true;
                let mkBonus = 0;
                
                if (this.multikillCount === 2) { 
                    mkBonus = Events.DOUBLE_KILL.score; 
                    mainLabel = Events.DOUBLE_KILL.label;
                } else if (this.multikillCount === 3) { 
                    mkBonus = Events.TRIPLE_KILL.score; 
                    mainLabel = Events.TRIPLE_KILL.label;
                } else { 
                    mkBonus = Events.MULTI_KILL.score; 
                    mainLabel = Events.MULTI_KILL.label;
                }
                totalScore += mkBonus;
            }
            
            this.addScore(totalScore);

            if (window.TacticalShooter.ScoreFeedUI) {
                window.TacticalShooter.ScoreFeedUI.addEvent(totalScore, mainLabel, labels, false, replacePrevious);
            }
            
            // --- KILLSTREAK UI ---
            let streakEvent = null;
            let streakLabel = "";
            let streakScore = 0;
            
            if (this.currentKillstreak === 5) { streakEvent = Events.STREAK_5; streakLabel = "5x KILLSTREAK"; streakScore = Events.STREAK_5.score; }
            else if (this.currentKillstreak === 10) { streakEvent = Events.STREAK_10; streakLabel = "10x KILLSTREAK"; streakScore = Events.STREAK_10.score; }
            else if (this.currentKillstreak >= 15 && this.currentKillstreak % 5 === 0) { 
                streakEvent = Events.STREAK_HIGH; 
                streakLabel = `${this.currentKillstreak}x KILLSTREAK`; 
                streakScore = Events.STREAK_HIGH.score;
            }

            if (streakEvent) {
                setTimeout(() => {
                     this.addScore(streakScore);
                     if (window.TacticalShooter.ScoreFeedUI) {
                         const updated = window.TacticalShooter.ScoreFeedUI.updateLastEvent(streakScore, streakLabel);
                         if (!updated) {
                             window.TacticalShooter.ScoreFeedUI.addEvent(streakScore, streakLabel, [], true);
                         }
                     }
                }, 500);
            }
            
            // Scorestreak Manager Update
            if (window.TacticalShooter.ScorestreakManager) {
                window.TacticalShooter.ScorestreakManager.onKill();
            }
        },
        
        triggerScore(typeKey) {
            const Events = window.TacticalShooter.GameData.ScoreEvents;
            const ev = Events[typeKey];
            if (!ev) return;
            if (window.TacticalShooter.ScoreFeedUI) window.TacticalShooter.ScoreFeedUI.addEvent(ev.score, ev.label);
            this.addScore(ev.score);
        },

        addScore(amount) {
            // Apply Hardline Downside
            let finalAmount = amount;
            if (window.TacticalShooter.PerkSystem && window.TacticalShooter.PerkSystem.hasPerk('HARDLINE')) {
                finalAmount = Math.floor(amount * 0.85);
            }

            if (window.TacticalShooter.PlayroomManager && window.TacticalShooter.PlayroomManager.myPlayer) {
                const currentScore = window.TacticalShooter.PlayroomManager.myPlayer.getState('score') || 0;
                window.TacticalShooter.PlayroomManager.myPlayer.setState('score', currentScore + finalAmount, true);
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ScoreSystem = ScoreSystem;
})();
