
// js/ui/ammo_feed_ui.js
(function() {
    const AmmoFeedUI = {
        container: null,
        
        init() {
            this.container = document.getElementById('ammo-feed-container');
        },
        
        show(amount, typeName) {
            if (!this.container) this.init();
            if (!this.container) return;
            
            const el = document.createElement('div');
            el.className = 'ammo-feed-entry';
            el.textContent = `+ ${amount} ${typeName}`;
            
            this.container.appendChild(el);
            
            // Auto remove is handled by CSS animation + timeout
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 2000); // 2s match CSS animation
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.AmmoFeedUI = AmmoFeedUI;
})();
