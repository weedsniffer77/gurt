
// js/core/background_service.js
(function() {
    const BackgroundService = {
        listeners: [],
        isActive: true,
        worker: null,
        
        init() {
            console.log("BackgroundService: Initializing");
            
            document.addEventListener('visibilitychange', () => {
                this.isActive = !document.hidden;
                this.handleVisibilityChange();
            });

            this.initWorker();
        },
        
        initWorker() {
            const workerCode = `
            self.interval = null;
            self.onmessage = function(e) {
                if (e.data === 'start') {
                    if (self.interval) clearInterval(self.interval);
                    self.interval = setInterval(() => {
                        self.postMessage('tick');
                    }, 16); // ~60hz
                } else if (e.data === 'stop') {
                    if (self.interval) clearInterval(self.interval);
                    self.interval = null;
                }
            };
            `;
            const blob = new Blob([workerCode], {type: 'application/javascript'});
            this.worker = new Worker(URL.createObjectURL(blob));
            
            this.worker.onmessage = () => {
                if (document.hidden) {
                    this.tick(0.016);
                }
            };
        },
        
        handleVisibilityChange() {
            if (document.hidden) {
                if (this.worker) this.worker.postMessage('start');
            } else {
                if (this.worker) this.worker.postMessage('stop');
                if (window.TacticalShooter.MatchState && typeof window.TacticalShooter.MatchState.syncMatchState === 'function') {
                    window.TacticalShooter.MatchState.syncMatchState();
                }
            }
        },
        
        subscribe(callback) {
            this.listeners.push(callback);
        },
        
        tick(dt) {
            this.listeners.forEach(cb => {
                try { cb(dt); } catch(e) { console.error(e); }
            });
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.BackgroundService = BackgroundService;
    BackgroundService.init();
})();
