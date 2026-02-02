
// js/ui/damage_indicator.js
(function() {
    const DamageIndicatorSystem = {
        container: null,
        pool: [], // Fixed pool of DIVs
        poolSize: 10,
        activeIndex: 0,
        
        init() {
            this.container = document.getElementById('damage-indicator-container');
            if (this.container) {
                this.container.innerHTML = '';
            }
            
            // Pre-allocate pool
            this.pool = [];
            for(let i=0; i<this.poolSize; i++) {
                const el = document.createElement('div');
                el.className = 'damage-indicator';
                // Initially hidden and reset
                el.style.opacity = '0';
                el.style.transform = 'translate(-50%, -50%) translateY(-100px) rotate(0deg)';
                this.container.appendChild(el);
                
                this.pool.push({
                    element: el,
                    active: false,
                    worldAngle: 0,
                    life: 0,
                    maxLife: 1.5,
                    isStealth: false // Track state
                });
            }

            this.loop = this.loop.bind(this);
            requestAnimationFrame(this.loop);
        },
        
        show(damage, impulseVector, isStealth = false) {
            if (!this.container || !impulseVector) return;
            
            // 1. Find inactive or steal oldest (round-robin)
            const slotIndex = this.activeIndex;
            this.activeIndex = (this.activeIndex + 1) % this.poolSize;
            
            const indicator = this.pool[slotIndex];
            
            // 2. Setup Data
            const sourceDir = impulseVector.clone().normalize().negate();
            
            // Calculate accurate angle
            let worldAngle = Math.atan2(sourceDir.x, sourceDir.z);
            
            // If STEALTH: Randomize the angle significantly to confuse player
            if (isStealth) {
                // Add +/- 60 degrees random offset to make it vague
                const noise = (Math.random() - 0.5) * (Math.PI / 1.5); 
                worldAngle += noise;
            }
            
            const scale = Math.min(2.5, 1.0 + (damage / 40.0));
            const heightPx = 60 * scale; 
            
            indicator.active = true;
            indicator.life = 1.5;
            indicator.maxLife = 1.5;
            indicator.worldAngle = worldAngle;
            indicator.isStealth = isStealth;
            
            // 3. Apply CSS (Activate)
            indicator.element.style.height = `${heightPx}px`;
            indicator.element.style.opacity = '1';
            
            // STEALTH MODIFICATION (Apply class for visual change)
            if (isStealth) {
                indicator.element.className = 'damage-indicator stealth';
            } else {
                indicator.element.className = 'damage-indicator';
            }
            
            // Force initial position update immediately to prevent 1-frame jitter
            this.updateSingleIndicator(indicator, 0); 
        },
        
        updateSingleIndicator(ind, camYaw) {
            let diff = ind.worldAngle - camYaw;
            const deg = THREE.MathUtils.radToDeg(-diff) + 180;
            // Use transform template to reduce string garbage (modern browsers handle this okay)
            ind.element.style.transform = `translate(-50%, -50%) rotate(${deg}deg) translateY(-100px)`;
        },
        
        loop() {
            requestAnimationFrame(this.loop);
            
            if (!this.container) return;
            
            let camYaw = 0;
            if (window.TacticalShooter.PlayerCamera) {
                camYaw = window.TacticalShooter.PlayerCamera.yaw;
            }
            
            const dt = 0.016; 
            
            for (let i = 0; i < this.poolSize; i++) {
                const ind = this.pool[i];
                if (!ind.active) continue;
                
                ind.life -= dt;
                
                if (ind.life <= 0) {
                    ind.active = false;
                    ind.element.style.opacity = '0';
                    continue;
                }
                
                this.updateSingleIndicator(ind, camYaw);
                ind.element.style.opacity = (ind.life / ind.maxLife).toFixed(2); // Limit precision
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.DamageIndicatorSystem = DamageIndicatorSystem;
})();
