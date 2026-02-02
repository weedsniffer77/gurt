
// js/visuals/menu_renderer.js
(function() {
    const MenuRenderer = {
        scene: null,
        menuGroup: null, 
        gunMesh: null,
        camera: null,
        renderer: null, 
        
        active: false,
        
        // Viewer State
        cameraAngle: 0,
        cameraPitch: 0.3,
        radius: 0.6,
        
        // Target State
        targetAngle: 0,
        targetPitch: 0.3,
        targetRadius: 0.6,
        
        lookAtTarget: null,
        currentLookAt: null,
        isFocused: false, 
        
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
        
        targetElementId: null,
        
        init(unusedScene, unusedCamera) {
            // PREVENT RE-INIT TO STOP MEMORY LEAKS / LAG SPIKES
            if (this.renderer) {
                console.log("MenuRenderer: Already initialized, skipping.");
                return;
            }

            console.log("MenuRenderer: Initializing dedicated scene & renderer...");
            
            if (!window.THREE) {
                console.error("MenuRenderer: THREE.js not loaded!");
                return;
            }

            this.lookAtTarget = new THREE.Vector3(0, 0, 0);
            this.currentLookAt = new THREE.Vector3(0, 0, 0);
            
            this.scene = new THREE.Scene();
            this.scene.background = null; 
            
            this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
            
            this.menuGroup = new THREE.Group();
            this.scene.add(this.menuGroup);
            
            const canvas = document.getElementById('menu-canvas');
            if (canvas) {
                this.renderer = new THREE.WebGLRenderer({
                    canvas: canvas,
                    alpha: true, 
                    antialias: true
                });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            } else {
                console.error("MenuRenderer: #menu-canvas not found! Retrying deferred init...");
            }
            
            // --- LIGHTING FIXES ---
            const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
            keyLight.position.set(1, 2, 2);
            keyLight.castShadow = true; 
            keyLight.shadow.mapSize.width = 2048; // Increased Res
            keyLight.shadow.mapSize.height = 2048;
            // Bias tuning to remove ripples (acne)
            keyLight.shadow.bias = -0.0001; 
            keyLight.shadow.normalBias = 0.02;
            this.scene.add(keyLight);
            
            const rimLight = new THREE.SpotLight(0x4488ff, 7.0);
            rimLight.position.set(-2, 1, -2);
            rimLight.lookAt(0, 0, 0);
            this.scene.add(rimLight);
            
            const fillLight = new THREE.PointLight(0xffaa55, 2.0);
            fillLight.position.set(2, 0, -1);
            this.scene.add(fillLight);
            
            const ambient = new THREE.AmbientLight(0x444444);
            this.scene.add(ambient);
            
            this._onMouseDown = this._onMouseDown.bind(this);
            this._onMouseMove = this._onMouseMove.bind(this);
            this._onMouseUp = this._onMouseUp.bind(this);
            this._onWheel = this._onWheel.bind(this);
            this._onResize = this._onResize.bind(this);
            
            window.addEventListener('resize', this._onResize);
        },
        
        setTargetElement(elementId) {
            this.targetElementId = elementId;
            this.resetFocus();
        },
        
        focusOn(localTargetPos) {
            if (!this.gunMesh || !this.lookAtTarget) return;
            const worldTarget = localTargetPos.clone().applyMatrix4(this.gunMesh.matrixWorld);
            this.lookAtTarget.copy(worldTarget);
            this.targetRadius = 0.35; 
            this.isFocused = true;
        },
        
        resetFocus() {
            if (this.lookAtTarget) this.lookAtTarget.set(0, 0, 0);
            this.isFocused = false;
            
            if (this.targetElementId === 'ls-preview-container') { 
                this.targetRadius = 0.6;
                this.targetPitch = 0.3;
            } else { 
                this.targetRadius = 0.9;
                this.targetPitch = 0.15;
            }
        },
        
        start() {
            if (this.active) return;
            this.active = true;
            this.menuGroup.visible = true;
            const canvas = document.getElementById('menu-canvas');
            if (canvas) canvas.classList.add('active');
            document.addEventListener('mousedown', this._onMouseDown);
            document.addEventListener('mousemove', this._onMouseMove);
            document.addEventListener('mouseup', this._onMouseUp);
            document.addEventListener('wheel', this._onWheel, { passive: false });
        },
        
        stop() {
            if (!this.active) return;
            this.active = false;
            if (this.gunMesh) {
                this.menuGroup.remove(this.gunMesh);
                this.gunMesh = null;
            }
            const canvas = document.getElementById('menu-canvas');
            if (canvas) {
                canvas.classList.remove('active');
                if (this.renderer) this.renderer.clear();
            }
            this.targetElementId = null;
            document.removeEventListener('mousedown', this._onMouseDown);
            document.removeEventListener('mousemove', this._onMouseMove);
            document.removeEventListener('mouseup', this._onMouseUp);
            document.removeEventListener('wheel', this._onWheel);
        },
        
        spawnWeapon(weaponDef) {
            while(this.menuGroup.children.length > 0){ 
                this.menuGroup.remove(this.menuGroup.children[0]); 
            }
            this.gunMesh = null;
            if (!weaponDef || !weaponDef.buildMesh) return;
            const built = weaponDef.buildMesh.call(weaponDef);
            this.gunMesh = built.mesh;
            this.gunMesh.position.set(0, 0, 0);
            this.gunMesh.rotation.set(0, Math.PI / 2, 0);
            this.menuGroup.add(this.gunMesh);
            this.gunMesh.updateMatrixWorld();
        },
        
        update(dt) {
            if (!this.active) return;
            if (!this.lookAtTarget || !this.currentLookAt) return; 
            
            if (!this.isDragging && !this.isFocused && this.targetElementId === 'menu-weapon-preview') { 
                this.targetAngle += dt * 0.15; 
            }
            
            const smoothSpeed = dt * 8.0; 
            
            this.cameraAngle = THREE.MathUtils.lerp(this.cameraAngle, this.targetAngle, smoothSpeed);
            this.cameraPitch = THREE.MathUtils.lerp(this.cameraPitch, this.targetPitch, smoothSpeed);
            this.radius = THREE.MathUtils.lerp(this.radius, this.targetRadius, smoothSpeed);
            this.currentLookAt.lerp(this.lookAtTarget, smoothSpeed);
            
            const yOffset = Math.sin(this.cameraPitch) * this.radius;
            const hRadius = Math.cos(this.cameraPitch) * this.radius; 
            const xOffset = Math.sin(this.cameraAngle) * hRadius;
            const zOffset = Math.cos(this.cameraAngle) * hRadius;
            
            this.camera.position.set(
                this.currentLookAt.x + xOffset,
                this.currentLookAt.y + yOffset,
                this.currentLookAt.z + zOffset
            );
            this.camera.lookAt(this.currentLookAt);
            this.render(); 
        },
        
        render() {
            if (!this.active || !this.renderer) return;
            this.renderer.clear();

            if (!this.targetElementId) {
                this.renderer.render(this.scene, this.camera);
                return;
            }
            
            const element = document.getElementById(this.targetElementId);
            if (!element) return;
            
            const rect = element.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            
            const width = rect.width;
            const height = rect.height;
            const left = rect.left;
            const bottom = window.innerHeight - rect.bottom;
            
            this.renderer.setScissorTest(true);
            this.renderer.setViewport(left, bottom, width, height);
            this.renderer.setScissor(left, bottom, width, height);
            
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            
            this.renderer.render(this.scene, this.camera);
            this.renderer.setScissorTest(false);
        },
        
        _onResize() {
            if (this.renderer) {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        },

        _onMouseDown(e) {
            if (this.targetElementId) {
                const el = document.getElementById(this.targetElementId);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (e.clientX < rect.left || e.clientX > rect.right || 
                        e.clientY < rect.top || e.clientY > rect.bottom) {
                        return;
                    }
                }
            }
            if (e.button === 0) {
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        },
        
        _onMouseMove(e) {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                const sensitivity = 0.005;
                this.targetAngle -= dx * sensitivity;
                this.targetPitch += dy * sensitivity;
                this.targetPitch = Math.max(-1.0, Math.min(1.0, this.targetPitch));
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        },
        
        _onMouseUp() { this.isDragging = false; },
        
        _onWheel(e) {
             if (this.isFocused) return;
             if (e.target.closest('.settings-content') || e.target.closest('.team-list') || e.target.closest('.keybinds-container') || e.target.closest('.overlay-content')) { return; }

             if (this.targetElementId) {
                const el = document.getElementById(this.targetElementId);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (e.clientX >= rect.left && e.clientX <= rect.right && 
                        e.clientY >= rect.top && e.clientY <= rect.bottom) {
                         e.preventDefault();
                         const sensitivity = 0.001;
                         this.targetRadius += e.deltaY * sensitivity;
                         this.targetRadius = Math.max(0.2, Math.min(1.5, this.targetRadius));
                    }
                }
            }
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.MenuRenderer = MenuRenderer;
})();
