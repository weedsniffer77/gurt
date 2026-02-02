
// js/multiplayer/firebase_manager.js
(function() {
    console.log("FirebaseManager: Loading module (Lazy Init)...");

    const FirebaseManager = {
        db: null,
        lobbiesRef: null,
        activeLobbyRef: null,
        query: null, // Store active query for unsubscription
        
        // Local Cache for efficient updates
        lobbies: new Map(),
        subCallback: null,
        _listening: false,
        _debounceTimer: null,
        
        // --- USER CONFIGURATION ---
        firebaseConfig: {
            apiKey: "AIzaSyBp3acQwDOpGd5Y-M5L1gynYo0ilNIOfqk",
            authDomain: "browser-game-b397a.firebaseapp.com",
            databaseURL: "https://browser-game-b397a-default-rtdb.firebaseio.com",
            projectId: "browser-game-b397a",
            storageBucket: "browser-game-b397a.firebasestorage.app",
            messagingSenderId: "522887324800",
            appId: "1:522887324800:web:ae8373d22bb3fada8e7265",
            measurementId: "G-RS20P7SMYK"
        },

        init() {
            if (this.db) return; // Already initialized
            
            if (typeof firebase === 'undefined') {
                console.error("FirebaseManager: 'firebase' global not found. Check index.html imports.");
                return;
            }

            console.log("FirebaseManager: Initializing Connection...");
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(this.firebaseConfig);
                }
                this.db = firebase.database();
                this.lobbiesRef = this.db.ref('lobbies');
                console.log("FirebaseManager: Connected");
            } catch (e) {
                console.error("FirebaseManager: Init failed.", e);
            }
        },

        registerLobby(roomCode, hostName, map, mode, playerCount) {
            if (!this.db) this.init(); 
            if (!this.db) return;
            
            // Sanitize inputs to prevent rule rejection
            const safeHost = (hostName || "Unknown").substring(0, 16);
            const safeMap = map || "WAREHOUSE";
            const safeMode = mode || "TDM";
            const safePlayers = typeof playerCount === 'number' ? playerCount : 1;
            
            const lobbyData = {
                host: safeHost,
                map: safeMap,
                mode: safeMode,
                players: safePlayers,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            this.activeLobbyRef = this.db.ref('lobbies/' + roomCode);
            
            // Use set() to create the lobby
            this.activeLobbyRef.set(lobbyData).catch(err => {
                console.warn("FirebaseManager: registerLobby failed (Permission Denied?)", err);
            });
            
            // Attempt to remove on disconnect (Server-side trigger)
            this.activeLobbyRef.onDisconnect().remove().then(() => {
                console.log("FirebaseManager: onDisconnect handler attached.");
            }).catch(e => console.warn("FirebaseManager: Failed to attach onDisconnect", e));
            
            console.log(`FirebaseManager: Registered lobby ${roomCode}`);
        },

        updateLobby(roomCode, playerCount, map, mode) {
            if (!this.db) return; 
            
            // SECURITY CHECK: Only update if we have a valid reference to an active lobby we own.
            // If activeLobbyRef is null, it means we either haven't registered or we disconnected.
            if (!this.activeLobbyRef) return;
            
            // Verify path matches current room code to prevent stale updates
            if (this.activeLobbyRef.key !== roomCode) {
                // If mismatch, we might have switched rooms. Re-register or bail.
                console.warn("FirebaseManager: Room code mismatch during update. Re-registering...");
                this.activeLobbyRef = this.db.ref('lobbies/' + roomCode);
            }
            
            // Sanitize again for update
            const hostName = window.TacticalShooter.PlayroomManager ? window.TacticalShooter.PlayroomManager.localPlayerName : "Host";
            const safeHost = (hostName || "Unknown").substring(0, 16);
            const safeMap = map || "WAREHOUSE";
            const safeMode = mode || "TDM";
            const safePlayers = typeof playerCount === 'number' ? playerCount : 1;

            this.activeLobbyRef.set({
                host: safeHost,
                map: safeMap,
                mode: safeMode,
                players: safePlayers,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).catch(err => {
                // Silent fail if permission denied (e.g. lost host status)
                if (err.code === 'PERMISSION_DENIED') {
                    this.activeLobbyRef = null; // Stop trying
                } else {
                    console.warn("FirebaseManager: updateLobby failed", err);
                }
            });
        },

        removeLobby() {
            if (this.activeLobbyRef) {
                console.log("FirebaseManager: Removing lobby explicitly.");
                this.activeLobbyRef.remove().catch(() => {});
                this.activeLobbyRef.onDisconnect().cancel(); // Clear trigger
                this.activeLobbyRef = null;
            }
        },
        
        // Manual delete command (for external cleanup scripts if needed)
        deleteLobby(roomCode) {
            if (!this.db) return;
            this.db.ref('lobbies/' + roomCode).remove().catch(() => {});
        },

        subscribeToLobbies(callback) {
            if (!this.db) this.init();
            
            // Fail safe if DB init failed
            if (!this.db) {
                console.warn("FirebaseManager: DB init failed, returning empty list.");
                if (callback) callback([]);
                return;
            }
            
            this.subCallback = callback;
            
            if (this._listening) {
                // If already listening, just trigger a refresh with current cache
                this._notifySubscribers();
                return;
            }
            
            console.log("FirebaseManager: Subscribing to lobbies...");
            this._listening = true;
            this.lobbies.clear();
            
            // Limit to last 20 to prevent data overload
            this.query = this.lobbiesRef.orderByChild('timestamp').limitToLast(20);
            
            this.query.on('child_added', (snap) => {
                this.lobbies.set(snap.key, snap.val());
                this._debounceNotify();
            });
            
            this.query.on('child_changed', (snap) => {
                this.lobbies.set(snap.key, snap.val());
                this._debounceNotify();
            });
            
            this.query.on('child_removed', (snap) => {
                this.lobbies.delete(snap.key);
                this._debounceNotify();
            });

            // Check for empty state to ensure callback fires if no lobbies exist
            this.query.once('value', (snap) => {
                if (!snap.exists()) {
                    this._notifySubscribers();
                }
            });
        },
        
        unsubscribe() {
            if (this.query) {
                console.log("FirebaseManager: Unsubscribing from lobbies.");
                this.query.off(); // Detach listeners
                this.query = null;
            }
            this._listening = false;
            this.lobbies.clear();
        },
        
        _debounceNotify() {
            if (this._debounceTimer) clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(() => {
                this._notifySubscribers();
            }, 100); 
        },
        
        _notifySubscribers() {
            if (!this.subCallback) return;
            
            const list = [];
            const now = Date.now();
            
            this.lobbies.forEach((info, code) => {
                if (info) {
                    // Standard display logic. No auto-deletion.
                    list.push({ code, ...info });
                }
            });
            
            // Sort Descending Timestamp (Newest first)
            list.sort((a,b) => b.timestamp - a.timestamp);
            
            this.subCallback(list);
        }
    };

    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.FirebaseManager = FirebaseManager;
})();
