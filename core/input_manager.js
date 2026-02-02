
// js/core/input_manager.js
// --- ORCHESTRATOR ONLY: DO NOT ADD CORE FUNCTIONALITIES HERE ---
// This file handles raw DOM event listening and binding mapping only.
// Game logic (e.g. "Space to respawn") should reside in GameInputHandler or PlayerState.

(function() {
    const InputManager = {
        keys: {},
        justPressed: {}, 
        
        mouse: {
            movementX: 0,
            movementY: 0
        },
        
        _boundKeyDown: null,
        _boundKeyUp: null,
        _boundMouseMove: null,
        _boundMouseDown: null,
        _boundMouseUp: null,
        _boundContextMenu: null,
        _boundPointerLock: null,
        
        bindings: {
            Forward: 'KeyW', Backward: 'KeyS', Left: 'KeyA', Right: 'KeyD', Jump: 'Space', Crouch: 'KeyC', Prone: 'KeyP', Sprint: 'ShiftLeft',
            ADS: 'KeyV', Shoot: 'Mouse0', LeanLeft: 'KeyQ', LeanRight: 'KeyE', Reload: 'KeyR', Interact: 'KeyF', Inspect: 'KeyI', 
            AttachmentFunctionality: 'KeyL', FreeCursor: 'Semicolon', Scoreboard: 'Tab', Menu: 'Escape', ToggleUI: 'Backslash', 
            QuickMelee: 'KeyT', QuickGrenade: 'KeyG', Slot1: 'Digit1', Slot2: 'Digit2', Slot3: 'Digit3', Slot4: 'Digit4', Slot5: null, 
            CycleUp: 'KeyZ', CycleDown: 'KeyX', Scorestreak1: 'Digit7', Scorestreak2: 'Digit8', Scorestreak3: 'Digit9',
            
            // Drone Standard
            DroneMoveForward: 'KeyW', DroneMoveBackward: 'KeyS', DroneMoveLeft: 'KeyA', DroneMoveRight: 'KeyD',
            DroneAscend: 'Space', DroneDescend: 'ControlLeft',
            
            // Drone Realistic (Updated)
            DroneThrottleUp: 'KeyX', DroneThrottleDown: 'KeyZ',
            DroneYawLeft: 'KeyQ', DroneYawRight: 'KeyE',
            DroneRollLeft: 'KeyA', DroneRollRight: 'KeyD',
            DronePitchUp: 'KeyS', DronePitchDown: 'KeyW'
        },
        
        defaultBindings: null,

        init() {
            if (this._boundKeyDown) this.cleanup();
            console.log('InputManager: Initializing...');
            this.defaultBindings = { ...this.bindings };
            this._boundKeyDown = this._onKeyDown.bind(this);
            this._boundKeyUp = this._onKeyUp.bind(this);
            this._boundMouseMove = this._onMouseMove.bind(this);
            this._boundMouseDown = this._onMouseDown.bind(this);
            this._boundMouseUp = this._onMouseUp.bind(this);
            this._boundWheel = this._onWheel.bind(this);
            this._boundContextMenu = (e) => e.preventDefault();
            this._boundPointerLock = this._onPointerLockChange.bind(this);
            document.addEventListener('keydown', this._boundKeyDown);
            document.addEventListener('keyup', this._boundKeyUp);
            document.addEventListener('mousemove', this._boundMouseMove);
            document.addEventListener('mousedown', this._boundMouseDown);
            document.addEventListener('mouseup', this._boundMouseUp);
            document.addEventListener('wheel', this._boundWheel, { passive: false });
            document.addEventListener('contextmenu', this._boundContextMenu);
            const canvas = document.getElementById('game-canvas');
            const overlay = document.getElementById('pointer-lock-overlay');
            if (canvas && overlay) {
                overlay.onclick = () => { 
                    if (window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.isBlockingInput()) return;
                    canvas.requestPointerLock(); 
                };
            }
            document.addEventListener('pointerlockchange', this._boundPointerLock);
            console.log('InputManager: ✓ Ready');
        },
        
        cleanup() {
            if (this._boundKeyDown) {
                document.removeEventListener('keydown', this._boundKeyDown);
                document.removeEventListener('keyup', this._boundKeyUp);
                document.removeEventListener('mousemove', this._boundMouseMove);
                document.removeEventListener('mousedown', this._boundMouseDown);
                document.removeEventListener('mouseup', this._boundMouseUp);
                document.removeEventListener('wheel', this._boundWheel);
                document.removeEventListener('contextmenu', this._boundContextMenu);
                document.removeEventListener('pointerlockchange', this._boundPointerLock);
                this._boundKeyDown = null;
            }
        },
        
        _onKeyDown(e) {
            // 1. REBIND CHECK (Highest Priority - Ignore blocking)
            if (window.TacticalShooter.SettingsManager && window.TacticalShooter.SettingsManager.listeningForKey) {
                e.preventDefault();
                e.stopPropagation();
                window.TacticalShooter.SettingsManager.handleRebind(e.code);
                return;
            }

            // 2. GLOBAL TOGGLES (Menu, UI, Scoreboard) - Always allow unless specifically blocked by non-game logic
            
            // Scoreboard (Moved Up to bypass Block check)
            if (e.code === 'Tab') {
                e.preventDefault();
                // Ensure UI Manager can toggle scoreboard even in lobby
                if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.toggleScoreboard(true);
            }

            if ((this.bindings.Menu && e.code === this.bindings.Menu) || e.code === 'Escape') {
                const settingsEl = document.getElementById('settings-menu');
                if (settingsEl && settingsEl.classList.contains('active')) {
                    if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.closeSettings();
                    return;
                }
                const GM = window.TacticalShooter.GameManager;
                if (GM && GM.currentState === 'MENU') return;
                
                if (window.TacticalShooter.UIManager) {
                    window.TacticalShooter.UIManager.toggleMenu();
                }
                return; 
            }

            // 3. SYSTEM BLOCKERS
            if (window.TacticalShooter.ChatSystem && window.TacticalShooter.ChatSystem.isOpen) return;
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
            
            // 4. GAME INPUT BLOCKING (Menus open)
            // Note: We still track key states below even if blocked, to prevent sticky keys when closing menus.
            // But Action Checks (isActionActive) will return false if blocking.
            const isBlocked = (window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.isBlockingInput());

            // --- SPECTATOR EXIT HANDLING ---
            if (e.code === 'Space' && !isBlocked) {
                 // CRITICAL FIX: If in MENU (Lobby), Space is for Deploy. Do NOT intercept.
                 const GM = window.TacticalShooter.GameManager;
                 if (GM && GM.currentState !== 'MENU') {
                     const PS = window.TacticalShooter.PlayerState;
                     // Intercept ONLY if: Spectating AND Alive (Free Cam) AND Not Drone. 
                     // Dead players need space to Respawn.
                     if (PS && PS.isSpectating && !PS.isDead && !PS.isControllingDrone) {
                         e.preventDefault();
                         e.stopPropagation();
                         e.stopImmediatePropagation(); // Block UI from seeing it
                         if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.finalizeLeave();
                         return;
                     }
                 }
            }

            if (!this.keys[e.code]) this.justPressed[e.code] = true;
            this.keys[e.code] = true;
            
            if (isBlocked) return; // Stop processing game actions
            
            if (this.bindings.ToggleUI && e.code === this.bindings.ToggleUI) {
                e.preventDefault();
                if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.toggleUI();
                return; 
            }
        },
        
        _onKeyUp(e) {
            this.keys[e.code] = false;
            this.justPressed[e.code] = false;
            if (e.code === 'Tab') {
                if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.toggleScoreboard(false);
            }
        },
        
        _onMouseMove(e) {
            if (document.pointerLockElement === document.getElementById('game-canvas')) {
                this.mouse.movementX = e.movementX || 0;
                this.mouse.movementY = e.movementY || 0;
            }
        },
        
        _onMouseDown(e) {
            const code = `Mouse${e.button}`;
            
            // 1. REBIND CHECK
            if (window.TacticalShooter.SettingsManager && window.TacticalShooter.SettingsManager.listeningForKey) {
                e.preventDefault(); e.stopPropagation();
                window.TacticalShooter.SettingsManager.handleRebind(code);
                return;
            }

            if (window.TacticalShooter.ChatSystem && window.TacticalShooter.ChatSystem.isOpen) return;
            
            if (!this.keys[code]) this.justPressed[code] = true;
            this.keys[code] = true;
        },
        
        _onMouseUp(e) {
            const code = `Mouse${e.button}`;
            this.keys[code] = false;
            this.justPressed[code] = false;
        },
        
        _onWheel(e) {
            if (!document.pointerLockElement) return;
            this.scrollAccum += e.deltaY;
            const threshold = 50; 
            if (this.scrollAccum <= -threshold) {
                this.justPressed['WheelUp'] = true; this.keys['WheelUp'] = true; this.scrollAccum = 0; 
            } else if (this.scrollAccum >= threshold) {
                this.justPressed['WheelDown'] = true; this.keys['WheelDown'] = true; this.scrollAccum = 0; 
            }
        },
        
        _onPointerLockChange() {
            const canvas = document.getElementById('game-canvas');
            const overlay = document.getElementById('pointer-lock-overlay');
            if (window.TacticalShooter.ChatSystem && window.TacticalShooter.ChatSystem.isOpen) return;
            
            if (document.pointerLockElement === canvas) {
                if(overlay) overlay.classList.add('hidden');
                if (window.TacticalShooter.UIManager) window.TacticalShooter.UIManager.closeMenu();
            } else {
                const MS = window.TacticalShooter.MatchState;
                if (MS && MS.state.status === 'GAME_OVER') {
                    if (window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.cursorElement) {
                        window.TacticalShooter.UIManager.cursorElement.style.display = 'block';
                    }
                    return;
                }
                if (window.TacticalShooter.PlayerState && window.TacticalShooter.PlayerState.isDead) {
                    if (window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.cursorElement) {
                        window.TacticalShooter.UIManager.cursorElement.style.display = 'block';
                    }
                    return; 
                }
                // Only open menu if NOT using FreeCursor key
                const freeCursorKey = this.bindings.FreeCursor;
                if (!this.keys[freeCursorKey]) {
                    const GM = window.TacticalShooter.GameManager;
                    if (GM && GM.currentState === 'MENU') return;
                    if (window.TacticalShooter.UIManager) {
                         // Force open menu if lost focus
                         window.TacticalShooter.UIManager.openMenu();
                    } 
                }
            }
        },
        
        resetBindings() { if (this.defaultBindings) this.bindings = { ...this.defaultBindings }; },
        update() {
            this.mouse.movementX = 0; this.mouse.movementY = 0;
            for (const key in this.justPressed) this.justPressed[key] = false;
            this.keys['WheelUp'] = false; this.keys['WheelDown'] = false;
            const freeCode = this.bindings.FreeCursor;
            if (this.keys[freeCode]) { if (document.pointerLockElement) document.exitPointerLock(); }
        },
        isKeyPressed(code) {
            if (window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.isBlockingInput()) return false;
            if (window.TacticalShooter.ChatSystem && window.TacticalShooter.ChatSystem.isOpen) return false;
            return this.keys[code] || false;
        },
        isActionActive(actionName) {
            if (window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.isBlockingInput()) return false;
            if (window.TacticalShooter.ChatSystem && window.TacticalShooter.ChatSystem.isOpen) return false;
            const code = this.bindings[actionName];
            return code ? (this.keys[code] || false) : false;
        },
        wasActionJustPressed(actionName) {
            if (window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.isBlockingInput()) return false;
            if (window.TacticalShooter.ChatSystem && window.TacticalShooter.ChatSystem.isOpen) return false;
            const code = this.bindings[actionName];
            return code ? (this.justPressed[code] || false) : false;
        },
        getBinding(actionName) { return this.bindings[actionName] || '???'; },
        setBinding(actionName, code) { this.bindings[actionName] = code; },
        getMouseDelta() {
            if (window.TacticalShooter.UIManager && window.TacticalShooter.UIManager.isBlockingInput()) return { x: 0, y: 0 };
            if (window.TacticalShooter.ChatSystem && window.TacticalShooter.ChatSystem.isOpen) return { x: 0, y: 0 };
            return { x: this.mouse.movementX, y: this.mouse.movementY };
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.InputManager = InputManager;
})();
