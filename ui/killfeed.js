
// js/ui/killfeed.js
(function() {
    const Killfeed = {
        container: null,
        
        init() {
            this.container = document.getElementById('killfeed-container');
        },
        
        // type: 'blue' (team), 'gold' (self), 'red' (enemy)
        // verb: Defaults to "KILLED", can be changed for suicides
        show(killerName, victimName, type, verb = "KILLED") {
            if (!this.container) this.init();
            if (!this.container) return;
            
            const el = document.createElement('div');
            el.className = `killfeed-entry kf-${type}`;
            
            // If victimName is empty (e.g. suicide), don't render the span to avoid weird spacing
            const victimHtml = victimName ? `<span class="kf-victim">${victimName}</span>` : '';
            
            el.innerHTML = `
                <span class="kf-killer">${killerName}</span>
                <span style="margin: 0 6px; font-size: 12px; color: #aaa;">${verb}</span>
                ${victimHtml}
            `;
            
            this.container.appendChild(el);
            
            // Auto remove
            setTimeout(() => {
                el.style.animation = 'kfFadeOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, 300);
            }, 5000);
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.Killfeed = Killfeed;
})();
