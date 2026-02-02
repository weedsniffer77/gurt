
// js/ui/score_feed_ui.js
(function() {
    const ScoreFeedUI = {
        container: null,
        lastWrapper: null,
        lastData: null, // { score, label, subs } to track accumulation
        
        init() {
            this.container = document.getElementById('score-feed-container');
        },
        
        // New Method: Allows updating the last entry if it's still fresh
        updateLastEvent(scoreToAdd, newMainLabel) {
            if (!this.lastWrapper || !this.lastData) return false;
            
            // Check if last wrapper is still in DOM and not fading out
            if (!this.lastWrapper.parentNode || this.lastWrapper.classList.contains('score-fade-out')) return false;
            
            const newScore = this.lastData.score + scoreToAdd;
            this.lastData.score = newScore;
            
            // Update Visuals
            const scoreDiv = this.lastWrapper.querySelector('.score-entry-main');
            const labelDiv = this.lastWrapper.querySelector('.score-entry-sub-main'); // Specific class for main label
            
            if (scoreDiv) {
                // Force remove animation class to restart it
                scoreDiv.classList.remove('score-flash-anim');
                void scoreDiv.offsetWidth; /* trigger reflow */
                
                scoreDiv.textContent = `+${newScore}`;
                scoreDiv.classList.remove('score-color-assist');
                scoreDiv.classList.add('score-color-kill');
                scoreDiv.classList.add('score-flash-anim');
            }
            
            if (labelDiv && newMainLabel) {
                // Update text and flash
                labelDiv.textContent = newMainLabel;
                labelDiv.classList.remove('sub-slide-anim');
                void labelDiv.offsetWidth;
                labelDiv.classList.add('sub-slide-anim');
                labelDiv.style.color = '#ffd700'; // Gold for streaks
            }
            
            // Reset fade timer (extend life)
            clearTimeout(this.lastWrapper.removeTimeout);
            this.lastWrapper.removeTimeout = setTimeout(() => {
                if (this.lastWrapper && this.lastWrapper.parentNode) {
                    this.lastWrapper.classList.add('score-fade-out');
                    setTimeout(() => {
                        if (this.lastWrapper && this.lastWrapper.parentNode) this.lastWrapper.parentNode.removeChild(this.lastWrapper);
                        if (this.lastWrapper === this.lastWrapper) { this.lastWrapper = null; this.lastData = null; }
                    }, 300);
                }
            }, 3000);
            
            return true;
        },
        
        addEvent(score, mainLabel, subLabels = [], isBonus = false, replaceLast = false) {
            if (!this.container) this.init();
            if (!this.container) return;
            
            // If replacing, remove the previous element if it still exists
            if (replaceLast && this.lastWrapper && this.lastWrapper.parentNode) {
                this.lastWrapper.remove();
            }
            
            // Create a wrapper for this event group
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = "15px"; // Space between separate events
            
            // 1. The Number
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'score-entry-main score-flash-anim';
            if (isBonus) scoreDiv.classList.add('score-color-bonus');
            else if (score < 50) scoreDiv.classList.add('score-color-assist');
            else scoreDiv.classList.add('score-color-kill');
            
            scoreDiv.textContent = `+${score}`;
            wrapper.appendChild(scoreDiv);
            
            // 2. The Main Label (e.g. ELIMINATED)
            const labelDiv = document.createElement('div');
            labelDiv.className = 'score-entry-sub score-entry-sub-main sub-slide-anim'; // Add specific class
            labelDiv.textContent = mainLabel;
            wrapper.appendChild(labelDiv);
            
            // 3. Sub Labels (Headshot, etc)
            subLabels.forEach((lbl, index) => {
                const subDiv = document.createElement('div');
                subDiv.className = 'score-entry-sub sub-slide-anim';
                subDiv.textContent = lbl;
                // Add slight delay per line
                subDiv.style.animationDelay = `${0.1 + (index * 0.05)}s`;
                wrapper.appendChild(subDiv);
            });
            
            // Append
            this.container.appendChild(wrapper);
            this.lastWrapper = wrapper;
            this.lastData = { score: score, label: mainLabel, subs: subLabels };
            
            // Auto remove after 3s
            wrapper.removeTimeout = setTimeout(() => {
                if (wrapper.parentNode) {
                    wrapper.classList.add('score-fade-out');
                    setTimeout(() => {
                        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
                        if (this.lastWrapper === wrapper) { this.lastWrapper = null; this.lastData = null; }
                    }, 300); // Match animation duration
                }
            }, 3000);
            
            // Limit total items
            if (this.container.children.length > 5) {
                const first = this.container.children[0];
                if (first) this.container.removeChild(first);
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ScoreFeedUI = ScoreFeedUI;
})();
