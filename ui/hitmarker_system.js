
// js/ui/hitmarker_system.js
(function() {
    const HitmarkerSystem = {
        container: null,
        pool: [],
        poolSize: 20,
        activeIndex: 0,
        
        // Priority Lock
        lockedUntil: 0,
        
        init() {
            this.container = document.getElementById('hitmarker-container');
            if (!this.container) return;
            
            this.pool = [];
            this.container.innerHTML = ''; // Clear existing
            
            // Pre-fill pool
            for(let i=0; i<this.poolSize; i++) {
                const el = document.createElement('div');
                el.className = 'hitmarker'; // Base class only
                el.innerHTML = `
                    <div class="hm-line hm-line-1"></div>
                    <div class="hm-line hm-line-2"></div>
                    <div class="hm-line hm-line-3"></div>
                    <div class="hm-line hm-line-4"></div>
                `;
                el.style.opacity = '0'; // Hidden by default
                this.container.appendChild(el);
                this.pool.push(el);
            }
        },
        
        clear() {
            if (this.pool) {
                this.pool.forEach(el => {
                    el.className = 'hitmarker';
                    el.style.opacity = '0';
                });
            }
        },
        
        // type: 'normal' (white), 'headshot' (gold), 'kill' (red)
        show(type = 'normal') {
            if (!this.container || this.pool.length === 0) this.init();
            if (!this.container) return;
            
            const now = Date.now();
            
            // PRIORITY CHECK:
            // If we recently showed a KILL marker, ignore lesser markers to prevent overwriting visual
            if (now < this.lockedUntil && type !== 'kill') {
                return;
            }
            
            if (type === 'kill') {
                this.lockedUntil = now + 500; // Lock for 500ms
            }
            
            const el = this.pool[this.activeIndex];
            this.activeIndex = (this.activeIndex + 1) % this.poolSize;
            
            // Force Reflow to restart CSS animation
            el.className = 'hitmarker';
            void el.offsetWidth; // Trigger reflow
            
            let className = 'hitmarker';
            if (type === 'headshot') {
                className += ' animate-long gold';
            } else if (type === 'kill') {
                className += ' animate-long red';
            } else {
                className += ' animate white';
            }
            
            el.className = className;
            el.style.opacity = '1';
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.HitmarkerSystem = HitmarkerSystem;
})();
