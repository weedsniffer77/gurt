
// js/visuals/particles_vfx.js
(function() {
    const ParticlesVFX = {
        spawnParticles(mesh, data, max, attr, position, normal, config, scope) {
            if (!mesh || config.count <= 0) return; 
            const safeNormal = (normal && normal.clone) ? normal : new THREE.Vector3(0, 1, 0);
            const reflection = safeNormal.clone(); 
            const col = new THREE.Color(config.color);
            
            for (let i = 0; i < config.count; i++) {
                let currentIndex = 0;
                if (mesh === scope.sparkMesh) { currentIndex = scope.sparkIndex; scope.sparkIndex = (scope.sparkIndex + 1) % max; } 
                else { currentIndex = scope.debrisIndex; scope.debrisIndex = (scope.debrisIndex + 1) % max; }
                
                const p = data[currentIndex]; p.active = true; p.life = config.lifetime * (0.8 + Math.random() * 0.4); p.maxLife = p.life; p.pos.copy(position);
                const spreadFactor = 2.0; const randomDir = new THREE.Vector3((Math.random() - 0.5), Math.random(), (Math.random() - 0.5)).normalize().multiplyScalar(spreadFactor);
                const dir = randomDir.lerp(reflection, 0.5).normalize(); const speed = config.speed + (Math.random() - 0.5) * (config.speedVariance || 0);
                p.velocity.copy(dir.multiplyScalar(speed)); 
                p.gravity = config.gravity; p.currentSize = config.size * (0.8 + Math.random()*0.4); p.sizeDecay = config.sizeDecay; p.color.copy(col);
                
                scope.dummyObj.position.copy(p.pos); scope.dummyObj.rotation.set(i + p.pos.x, i*2 + p.pos.y, i*3); scope.dummyObj.scale.set(p.currentSize, p.currentSize, p.currentSize); scope.dummyObj.updateMatrix(); 
                mesh.setMatrixAt(currentIndex, scope.dummyObj.matrix); 
                if (mesh.setColorAt) mesh.setColorAt(currentIndex, p.color); 
                attr.setX(currentIndex, 1.0);
            }
            mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; attr.needsUpdate = true;
        },

        createImpactSparks(pos, normal, config, scope) {
            const defaults = { count: 8, color: 0xffffaa, size: 0.1, speed: 5.0, speedVariance: 2.0, gravity: -12.0, lifetime: 0.4, sizeDecay: 0.92, useDebris: false };
            const cfg = { ...defaults, ...(config || {}) };
            const safeNormal = (normal && normal.isVector3) ? normal : new THREE.Vector3(0,1,0);
            
            if (cfg.useDebris) this.spawnParticles(scope.debrisMesh, scope.debrisData, scope.maxDebris, scope.attrAlphaDebris, pos, safeNormal, cfg, scope);
            else this.spawnParticles(scope.sparkMesh, scope.sparkData, scope.maxSparks, scope.attrAlpha, pos, safeNormal, cfg, scope);
        },
        
        createSlashSparks(origin, forwardDir, scope) {
            const right = new THREE.Vector3(0,1,0).cross(forwardDir).normalize();
            const count = 10;
            for(let i=0; i<count; i++) {
                // Line of sparks
                const t = (i / count) - 0.5;
                const pos = origin.clone().add(right.clone().multiplyScalar(t * 0.8));
                const dir = forwardDir.clone().add(new THREE.Vector3((Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5)).normalize();
                
                this.spawnParticles(scope.sparkMesh, scope.sparkData, scope.maxSparks, scope.attrAlpha, pos, dir, {
                    count: 1,
                    color: 0xcccccc,
                    size: 0.05,
                    speed: 2.0,
                    gravity: -2.0,
                    lifetime: 0.15,
                    sizeDecay: 0.8
                }, scope);
            }
        },
        
        // ... (Remaining functions unchanged) ...
        createFlashbangEffect(pos, scope) {
             scope.spawnExplosionLight(pos, 0xffffff, 50.0, 40.0, 0.5);
             for(let i=0; i<3; i++) {
                 const s = scope.smokePool[scope.smokeIndex]; 
                 scope.smokeIndex = (scope.smokeIndex + 1) % scope.smokePoolSize;
                 s.active = true; s.life = 0.2; s.maxLife = 0.2; s.sprite.visible = true; s.sprite.position.copy(pos);
                 s.startScale = 2.0; s.endScale = 15.0; s.startOpacity = 1.0; s.opacityPeak = 1.0;
                 s.sprite.material.color.setHex(0xffffff); s.sprite.material.blending = THREE.AdditiveBlending; s.velocity.set(0,0,0);
             }
             for(let i=0; i<10; i++) {
                 const s = scope.smokePool[scope.smokeIndex]; scope.smokeIndex = (scope.smokeIndex + 1) % scope.smokePoolSize;
                 s.active = true; s.life = 1.0 + Math.random() * 1.5; s.maxLife = s.life; s.sprite.visible = true; s.sprite.position.copy(pos);
                 s.startScale = 0.5; s.endScale = 3.0 + Math.random(); s.startOpacity = 0.5; s.opacityPeak = 0.5; s.sprite.material.color.setHex(0xeeeeee); s.sprite.material.blending = THREE.NormalBlending; 
                 const dir = new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)).normalize(); s.velocity.copy(dir).multiplyScalar(5.0 * (0.5 + Math.random()));
             }
             this.createImpactSparks(pos, new THREE.Vector3(0,1,0), { count: 20, color: 0xffffff, speed: 15.0, speedVariance: 5.0, gravity: -5.0, lifetime: 2.0, size: 0.15, sizeDecay: 0.98 }, scope);
             if (window.TacticalShooter.PlayerCamera) { window.TacticalShooter.PlayerCamera.applyFlashShock(pos); }
        },
        
        createWallPenetration(pos, normal, scope) {
            const dir = (normal && normal.clone) ? normal.clone().normalize() : new THREE.Vector3(0,0,1);
            this.spawnParticles(scope.debrisMesh, scope.debrisData, scope.maxDebris, scope.attrAlphaDebris, pos, dir, { count: 15, color: 0x888888, size: 0.15, speed: 8.0, speedVariance: 4.0, gravity: -9.8, lifetime: 1.0, sizeDecay: 0.95 }, scope);
            this.spawnParticles(scope.sparkMesh, scope.sparkData, scope.maxSparks, scope.attrAlpha, pos, dir, { count: 10, color: 0xffaa00, size: 0.08, speed: 12.0, speedVariance: 3.0, gravity: -10.0, lifetime: 0.4, sizeDecay: 0.9 }, scope);
            this.createImpactDust(pos, dir, { count: 5, lifetime: 0.8, sizeStart: 0.2, sizeEnd: 1.0, speed: 4.0, opacity: 0.5, color: 0x999999 }, scope);
        },

        createBloodSparks(pos, normal, scope) {
            const bloodConfig = { count: 6, lifetime: 0.5, speed: 2.0, speedVariance: 1.0, gravity: -18.0, color: 0xaa0000, size: 0.12, sizeDecay: 0.98 };
            const safeNormal = (normal && normal.isVector3) ? normal : new THREE.Vector3(0,1,0);
            this.spawnParticles(scope.debrisMesh, scope.debrisData, scope.maxDebris, scope.attrAlphaDebris, pos, safeNormal, bloodConfig, scope);
        },

        createGrenadeExplosion(pos, normal, materialType, scope, scale = 1.0) {
            const safeNormal = (normal && normal.isVector3) ? normal : new THREE.Vector3(0,1,0);
            scope.spawnExplosionLight(pos, 0xffaa44, 20.0 * scale, 15.0 * scale, 0.4 * scale);
            this.createImpactDust(pos, safeNormal, { count: Math.ceil(4 * scale), lifetime: 0.4 * scale, sizeStart: 0.5 * scale, sizeEnd: 2.5 * scale, speed: 3.0 * scale, opacity: 0.8, color: 0xffaa33 }, scope);
            const smokeColor = 0x555555; const smokeCount = Math.ceil(6 * scale);
            for(let i=0; i<smokeCount; i++) {
                const s = scope.smokePool[scope.smokeIndex]; scope.smokeIndex = (scope.smokeIndex + 1) % scope.smokePoolSize;
                s.active = true; s.life = (2.0 + Math.random() * 1.5) * scale; s.maxLife = s.life; s.sprite.visible = true;
                s.sprite.position.copy(pos).add(new THREE.Vector3((Math.random()-0.5), 0.5, (Math.random()-0.5)).multiplyScalar(scale));
                s.startScale = 1.0 * scale; s.endScale = (4.0 + (Math.random() * 2.0)) * scale; s.startOpacity = 0.5; s.opacityPeak = 0.5;
                s.sprite.material.color.setHex(smokeColor); s.sprite.material.rotation = Math.random() * Math.PI * 2; s.sprite.material.blending = THREE.NormalBlending;
                const baseRise = (2.0 + Math.random() * 2.0) * 0.5 * scale; s.velocity.set((Math.random()-0.5) * 1.5 * scale, baseRise, (Math.random()-0.5) * 1.5 * scale);
            }
            const debrisCount = Math.ceil(20 * scale); const debrisSpeed = 10.0 * scale; const debrisSize = 0.15 * scale; const debrisLife = 1.5 * scale;
            if (materialType === 'metal') {
                this.createImpactSparks(pos, safeNormal, { count: Math.ceil(30 * scale), speed: 15.0 * scale, speedVariance: 5.0 * scale, lifetime: 0.8 * scale, color: 0xffcc33, size: 0.15 * scale, gravity: -15.0 }, scope);
            } else if (materialType === 'wood') {
                this.spawnParticles(scope.debrisMesh, scope.debrisData, scope.maxDebris, scope.attrAlphaDebris, pos, safeNormal, { count: Math.ceil(15 * scale), lifetime: debrisLife, speed: 8.0 * scale, speedVariance: 4.0 * scale, gravity: -9.8, color: 0x8b5a2b, size: 0.12 * scale, sizeDecay: 0.98 }, scope);
                this.createImpactDust(pos, safeNormal, { count: Math.ceil(8 * scale), lifetime: debrisLife, sizeStart: 1.0 * scale, sizeEnd: 3.0 * scale, speed: 3.0 * scale, color: 0x8b5a2b, opacity: 0.4 }, scope);
            } else {
                this.spawnParticles(scope.debrisMesh, scope.debrisData, scope.maxDebris, scope.attrAlphaDebris, pos, safeNormal, { count: debrisCount, lifetime: debrisLife, speed: debrisSpeed, speedVariance: 5.0 * scale, gravity: -9.8, color: 0x555555, size: debrisSize, sizeDecay: 0.98 }, scope);
                this.createImpactDust(pos, safeNormal, { count: Math.ceil(10 * scale), lifetime: 2.0 * scale, sizeStart: 1.0 * scale, sizeEnd: 4.0 * scale, speed: 4.0 * scale, color: 0x666666, opacity: 0.5 }, scope);
                this.createImpactSparks(pos, safeNormal, { count: Math.ceil(10 * scale), speed: 12.0 * scale, speedVariance: 4.0 * scale, lifetime: 0.5 * scale, color: 0xffaa00 }, scope);
            }
        },

        createMuzzleSmoke(pos, dir, scope) {
            if (scope.impactParticleCount < 12) return;
            const Effects = window.TacticalShooter.GameData.Effects || {};
            const cfg = Effects.MuzzleSmoke || { count: 6, lifetime: 0.35, sizeStart: 0.02, sizeEnd: 0.6, velocity: 6.0, forwardSpeed: 2.0, opacityStart: 0.05, opacityPeak: 0.3, color: 0x888888 };
            const axis = new THREE.Vector3(0, 1, 0); if (Math.abs(dir.y) > 0.9) axis.set(1, 0, 0);
            const right = new THREE.Vector3().crossVectors(dir, axis).normalize(); const up = new THREE.Vector3().crossVectors(right, dir).normalize();
            for(let i=0; i<cfg.count; i++) {
                const s = scope.smokePool[scope.smokeIndex]; scope.smokeIndex = (scope.smokeIndex + 1) % scope.smokePoolSize;
                const angle = Math.random() * Math.PI * 2; const speed = cfg.velocity * (0.8 + Math.random()*0.4);
                const radialDir = right.clone().multiplyScalar(Math.cos(angle)).add(up.clone().multiplyScalar(Math.sin(angle)));
                const vel = radialDir.multiplyScalar(speed).add(dir.clone().multiplyScalar(cfg.forwardSpeed));
                s.active = true; s.life = cfg.lifetime * (0.8 + Math.random()*0.4); s.maxLife = s.life; s.sprite.visible = true; s.sprite.position.copy(pos); 
                s.startScale = cfg.sizeStart; s.endScale = cfg.sizeEnd; s.startOpacity = cfg.opacityStart; s.opacityPeak = cfg.opacityPeak;
                s.sprite.material.color.setHex(cfg.color); s.sprite.material.rotation = Math.random() * Math.PI * 2; s.velocity.copy(vel);
                s.sprite.material.blending = THREE.NormalBlending;
            }
        },
        
        createLingeringSmoke(pos, dir, scope) {
             const count = 5; const spread = 0.5;
             for(let i=0; i<count; i++) {
                 const s = scope.smokePool[scope.smokeIndex]; scope.smokeIndex = (scope.smokeIndex + 1) % scope.smokePoolSize;
                 s.active = true; s.life = 2.5 + Math.random() * 1.5; s.maxLife = s.life; s.sprite.visible = true;
                 s.sprite.position.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread, (Math.random()-0.5)*spread, (Math.random()-0.5)*spread));
                 s.startScale = 0.5; s.endScale = 3.0 + Math.random(); s.startOpacity = 0.1; s.opacityPeak = 0.6; s.sprite.material.color.setHex(0xaaaaaa); s.sprite.material.rotation = Math.random() * Math.PI * 2; s.sprite.material.blending = THREE.NormalBlending;
                 const drift = dir.clone().multiplyScalar(1.0 + Math.random()); drift.y += 0.5; s.velocity.copy(drift);
             }
        },
        
        createBarrelWisp(pos, dir, intensity = 1.0, scope) {
            if (scope.impactParticleCount < 12) return;
            const Effects = window.TacticalShooter.GameData.Effects || {};
            const cfg = Effects.BarrelSmoke || { lifetime: 2.5, sizeStart: 0.03, sizeEnd: 0.4, speed: 0.4, drift: 0.1, opacity: 0.25, color: 0xcccccc };
            const s = scope.smokePool[scope.smokeIndex]; scope.smokeIndex = (scope.smokeIndex + 1) % scope.smokePoolSize;
            s.active = true; s.life = cfg.lifetime * intensity; s.maxLife = s.life; s.sprite.visible = true; s.sprite.position.copy(pos);
            s.startScale = cfg.sizeStart * intensity; s.endScale = cfg.sizeEnd * intensity; s.startOpacity = cfg.opacity * intensity; s.opacityPeak = s.startOpacity; s.sprite.material.color.setHex(cfg.color);
            s.sprite.material.blending = THREE.NormalBlending;
            const up = new THREE.Vector3(0, (cfg.speed * intensity) * 0.5, 0); const drift = new THREE.Vector3((Math.random()-0.5)*cfg.drift, 0, (Math.random()-0.5)*cfg.drift);
            s.velocity.copy(up).add(drift);
        },
        
        createImpactDust(pos, normal, config, scope) {
            if (scope.impactParticleCount < 12) return;
            const safeNormal = (normal && normal.isVector3) ? normal : new THREE.Vector3(0,1,0);
            const Effects = window.TacticalShooter.GameData.Effects || {};
            const cfg = config || Effects.ImpactDust || { count: 3, lifetime: 0.6, sizeStart: 0.1, sizeEnd: 0.4, speed: 1.5, opacity: 0.3, color: 0x777777 };
            for(let i=0; i<cfg.count; i++) {
                const s = scope.smokePool[scope.smokeIndex]; scope.smokeIndex = (scope.smokeIndex + 1) % scope.smokePoolSize;
                s.active = true; s.life = cfg.lifetime * (0.8 + Math.random()*0.4); s.maxLife = s.life; s.sprite.visible = true;
                s.sprite.position.copy(pos).add(safeNormal.clone().multiplyScalar(0.1));
                s.startScale = cfg.sizeStart; s.endScale = cfg.sizeEnd; s.startOpacity = cfg.opacity; s.opacityPeak = cfg.opacity;
                s.sprite.material.color.setHex(cfg.color); s.sprite.material.rotation = Math.random() * Math.PI * 2;
                s.sprite.material.blending = THREE.NormalBlending;
                const spreadDir = new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)).normalize();
                const moveDir = safeNormal.clone().lerp(spreadDir, 0.6).normalize();
                s.velocity.copy(moveDir).multiplyScalar(cfg.speed * (0.5 + Math.random()));
            }
        },

        createRocketFlame(pos, dir, scope) {
             const s = scope.smokePool[scope.smokeIndex]; scope.smokeIndex = (scope.smokeIndex + 1) % scope.smokePoolSize;
             s.active = true; s.life = 0.2; s.maxLife = 0.2; s.sprite.visible = true; s.sprite.position.copy(pos);
             s.startScale = 0.4; s.endScale = 0.1; s.startOpacity = 1.0; s.opacityPeak = 1.0;
             s.sprite.material.color.setHex(0xffaa00); s.sprite.material.blending = THREE.AdditiveBlending; s.velocity.copy(dir).multiplyScalar(0.5); 
        },
        
        createBackblast(pos, dir, scope) {
            this.createImpactDust(pos, dir, { count: 15, lifetime: 1.5, sizeStart: 0.5, sizeEnd: 4.0, speed: 12.0, opacity: 0.4, color: 0x888888 }, scope);
            for(let i=0; i<3; i++) {
                 const s = scope.smokePool[scope.smokeIndex]; scope.smokeIndex = (scope.smokeIndex + 1) % scope.smokePoolSize;
                 s.active = true; s.life = 0.15; s.maxLife = 0.15; s.sprite.visible = true;
                 s.sprite.position.copy(pos);
                 s.startScale = 0.5; s.endScale = 2.0; s.startOpacity = 0.8; s.opacityPeak = 0.8;
                 s.sprite.material.color.setHex(0xffaa33); s.sprite.material.blending = THREE.AdditiveBlending;
                 const spread = new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)).multiplyScalar(2.0);
                 s.velocity.copy(dir).multiplyScalar(15.0).add(spread);
            }
        },

        createShellCasing(position, direction, type, scope) {
            if (!scope.casingsEnabled || !scope.shellPool) return;
            const shell = scope.shellPool[scope.shellIndex]; scope.shellIndex = (scope.shellIndex + 1) % scope.shellPoolSize;
            shell.active = true; shell.life = 5.0; shell.isSleeping = false; shell.mode = 'simple';
            shell.mesh.position.copy(position); shell.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI); shell.mesh.visible = true;
            const speed = 2.0 + Math.random() * 1.5; shell.velocity.copy(direction).multiplyScalar(speed);
            shell.velocity.x += (Math.random() - 0.5) * 0.5; shell.velocity.y += (Math.random() * 0.5); shell.velocity.z += (Math.random() - 0.5) * 0.5;
            shell.rotVel.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
            if (shell.pistolMesh) shell.pistolMesh.visible = (type === 'pistol');
            if (shell.shotgunMesh) shell.shotgunMesh.visible = (type === 'shotgun');
            if (shell.rifleMesh) shell.rifleMesh.visible = (type === 'rifle' || type === 'sniper');
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ParticlesVFX = ParticlesVFX;
})();
