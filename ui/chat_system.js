
// js/ui/chat_system.js
(function() {
    const ChatSystem = {
        container: null,
        messageList: null,
        inputRow: null,
        input: null,
        label: null,
        
        isOpen: false,
        scope: 'ALL', // 'ALL' or 'TEAM'
        
        init() {
            this.container = document.getElementById('chat-container');
            this.messageList = document.getElementById('chat-messages');
            this.inputRow = document.getElementById('chat-input-row');
            this.input = document.getElementById('chat-input');
            this.label = document.getElementById('chat-channel-label');
            
            if (!this.container) return;
            
            this.scope = 'ALL';
            this.updateLabel();
            this.close(); // Set initial state
            
            // Listen for events from NetworkEventHandler
            if (window.TacticalShooter.NetworkEventHandler) {
                window.TacticalShooter.NetworkEventHandler.onChatReceived = (data) => this.receive(data);
            }
            
            // Bind global key listener to catch Enter when chat is closed
            document.addEventListener('keydown', (e) => this.onKeyDown(e));
            
            // Ensure initial visibility sync
            this.updateVisibility();
            
            // Periodically check visibility in case UI changes without event trigger
            setInterval(() => this.updateVisibility(), 500);
        },
        
        toggle() {
            if (this.isOpen) this.close();
            else this.open();
        },
        
        open() {
            if (!this.inputRow) return;
            
            // Prevent opening if lobby is visible
            const browser = document.getElementById('unified-browser');
            if (browser && browser.style.display !== 'none') return;

            this.isOpen = true;
            this.container.classList.add('active'); // Add active class for styling
            this.inputRow.classList.add('active');
            
            this.input.disabled = false;
            this.input.focus();
            
            this.updateVisibility();
            
            // Unlock pointer so they can type
            if (document.exitPointerLock) document.exitPointerLock();
        },
        
        close() {
            if (!this.inputRow) return;
            this.isOpen = false;
            this.container.classList.remove('active');
            this.inputRow.classList.remove('active');
            
            this.input.value = ''; // Clear input on close
            this.input.blur();
            this.input.disabled = true; // Disable interaction when closed
            
            this.updateVisibility();
            
            // Return focus to game if needed
            if (window.TacticalShooter.GameManager && window.TacticalShooter.GameManager.currentState === 'IN_GAME') {
                const canvas = document.getElementById('game-canvas');
                if (canvas) canvas.requestPointerLock();
            }
        },
        
        updateVisibility() {
            if (!this.container) return;
            
            const settings = window.TacticalShooter.SettingsManager ? window.TacticalShooter.SettingsManager.settings : {};
            const hideWhenClosed = settings.hideChatClosed === true;
            
            // LOGIC: Hide if Loadout, Settings, OR Lobby (Multiplayer Menu) is visible
            let forceHide = false;
            const loadout = document.getElementById('loadout-screen');
            const settingsMenu = document.getElementById('settings-menu');
            const browser = document.getElementById('unified-browser');
            
            if (loadout && loadout.classList.contains('active')) forceHide = true;
            if (settingsMenu && settingsMenu.classList.contains('active')) forceHide = true;
            
            // Check if Unified Browser (Lobby List) is visible
            if (browser && browser.style.display !== 'none') forceHide = true;
            
            if (forceHide) {
                this.container.style.display = 'none';
                if (this.isOpen) this.close(); // Force close logic state
            } else {
                this.container.style.display = 'flex';
                // If hiding is enabled AND chat is closed, hide container opacity
                if (hideWhenClosed && !this.isOpen) {
                    this.container.style.opacity = '0';
                    this.container.style.pointerEvents = 'none';
                } else {
                    this.container.style.opacity = '1';
                    this.container.style.pointerEvents = 'auto'; // allow interaction if visible
                }
            }
        },
        
        cycleScope() {
            // Toggle between ALL and TEAM
            if (this.scope === 'ALL') this.scope = 'TEAM';
            else this.scope = 'ALL';
            this.updateLabel();
        },
        
        updateLabel() {
            if (!this.label) return;
            if (this.scope === 'ALL') {
                this.label.textContent = '[ALL]';
                this.label.style.color = '#ccc'; // Neutral grey
            } else {
                this.label.textContent = '[TEAM]';
                // Get Team Color
                const TM = window.TacticalShooter.TeamManager;
                const tid = TM ? TM.getLocalTeamId() : 0;
                const color = (TM && TM.teams[tid]) ? TM.teams[tid].color : '#00ccff';
                this.label.style.color = color;
            }
        },
        
        send() {
            const text = this.input.value.trim();
            if (!text) {
                this.close();
                return;
            }
            
            const PM = window.TacticalShooter.PlayroomManager;
            const myName = PM ? PM.localPlayerName : "Me";
            const myId = PM && PM.myPlayer ? PM.myPlayer.id : "SELF";
            const TM = window.TacticalShooter.TeamManager;
            const myTeamId = TM ? TM.getLocalTeamId() : 0;
            
            const messageData = {
                senderId: myId,
                name: myName,
                text: text,
                scope: this.scope, // 'ALL' or 'TEAM'
                teamId: myTeamId
            };
            
            // Broadcast via RPC
            if (window.TacticalShooter.NetworkEventHandler) {
                window.TacticalShooter.NetworkEventHandler.broadcastChat(messageData);
            }
            
            // Render locally immediately
            this.receive(messageData);
            
            this.close();
        },
        
        receive(data) {
            if (!this.messageList) return;
            
            // Check Scope
            const TM = window.TacticalShooter.TeamManager;
            const myTeamId = TM ? TM.getLocalTeamId() : 0;
            
            if (data.scope === 'TEAM') {
                if (data.teamId !== myTeamId) return; // Ignore enemy team chat
            }
            
            const el = document.createElement('div');
            el.className = 'chat-message';
            
            let scopeHtml = '';
            let nameColor = '#fff';
            
            if (data.scope === 'TEAM') {
                scopeHtml = `<span class="chat-scope team">[TEAM]</span>`;
                nameColor = (TM && TM.teams[data.teamId]) ? TM.teams[data.teamId].color : '#00ccff';
            } else {
                // If ALL chat, color name by team anyway
                const senderTeam = data.teamId;
                if (TM && TM.teams[senderTeam]) nameColor = TM.teams[senderTeam].color;
            }
            
            // Sanitize text
            const safeText = data.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeName = data.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            el.innerHTML = `${scopeHtml}<span class="chat-name" style="color:${nameColor}">${safeName}:</span> <span class="chat-text">${safeText}</span>`;
            
            this.messageList.appendChild(el);
            
            // Auto scroll
            this.messageList.scrollTop = this.messageList.scrollHeight;
            
            // Prune old
            if (this.messageList.children.length > 20) {
                this.messageList.removeChild(this.messageList.children[0]);
            }
        },
        
        onKeyDown(e) {
            const isEnter = (e.key === 'Enter' || e.code === 'Enter');

            // If user is focused on another input (e.g. name field), do NOT intercept Enter
            if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement !== this.input) {
                return;
            }

            if (this.isOpen) {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.cycleScope();
                } else if (isEnter) {
                    e.preventDefault();
                    this.send();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.input.value = ''; // Force clear
                    this.close();
                }
                // Stop other game inputs
                e.stopPropagation();
            } else {
                if (isEnter) {
                    // Prevent default to avoid side effects (like form submission if any)
                    e.preventDefault();
                    this.open();
                }
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.ChatSystem = ChatSystem;
})();
