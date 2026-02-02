
// js/data/weapons/pistol/pistol_model.js
(function() {
    const weaponDef = window.TacticalShooter.GameData.Weapons["PISTOL"];
    if (!weaponDef) return;

    weaponDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;
        const group = new THREE.Group();
        const CommonParts = window.TacticalShooter.CommonParts;
        
        const atts = this.attachments || [];
        const isAkimbo = atts.includes('pistol_akimbo');
        const hasFlashHider = atts.includes('att_flashhider');
        
        // Materials
        const matMetal = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.8 });
        const matFrame = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.2 }); 
        const matGrip = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 });
        const matBarrel = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.9 });
        const matGlow = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 4.0 });
        const matChamber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }); 
        const matMag = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7, metalness: 0.3 });

        // Custom Slide Material for Auto
        let slideMat = matMetal;
        if (atts.includes('pistol_auto')) {
            slideMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.4, metalness: 0.5 }); 
        }

        // Helper to build a complete gun instance
        const buildGunInstance = () => {
            const gunGroup = new THREE.Group();
            
            // --- FRAME ---
            const frameGeo = new THREE.BoxGeometry(0.026, 0.018, 0.22);
            const frame = new THREE.Mesh(frameGeo, matFrame);
            frame.position.set(0, 0, -0.02); frame.castShadow = true; gunGroup.add(frame);
            
            // Grip
            const gripGeo = new THREE.BoxGeometry(0.03, 0.1, 0.06075);
            const grip = new THREE.Mesh(gripGeo, matGrip);
            grip.position.set(0, -0.05, 0.067875);
            grip.rotation.x = -0.25; grip.castShadow = true; frame.add(grip);
            
            // --- MAGAZINE ---
            const magGroup = new THREE.Group();
            magGroup.position.set(0, -0.05, 0.067875); 
            magGroup.rotation.x = -0.25;
            frame.add(magGroup);
            
            const isExtended = atts.includes('pistol_mag_ext');
            const magLen = isExtended ? 0.28 : 0.105;
            const magVis = new THREE.Mesh(new THREE.BoxGeometry(0.022, magLen, 0.04), matMag);
            magVis.position.y = 0.05 - (magLen / 2); 
            magVis.castShadow = true; magGroup.add(magVis);
            const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.01, 0.045), matMag);
            basePlate.position.y = magVis.position.y - magLen/2 - 0.005; magGroup.add(basePlate);

            // Trigger Guard
            const gFront = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.005), matFrame);
            gFront.position.set(0, -0.025, -0.035); gFront.rotation.x = 0.3; frame.add(gFront);
            const gBot = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.005, 0.08), matFrame);
            gBot.position.set(0, -0.05, 0.0); frame.add(gBot);
            
            const triggerPivot = new THREE.Group();
            triggerPivot.position.set(0, -0.015, 0.025); frame.add(triggerPivot);
            const tMesh = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.025, 0.008), matGrip);
            tMesh.position.set(0, -0.012, 0); tMesh.rotation.x = 0.2; triggerPivot.add(tMesh);
            
            // Barrel
            const isAuto = atts.includes('pistol_auto');
            const bLen = isAuto ? 0.3 : 0.225;
            const bPos = isAuto ? -0.07 : -0.0325;
            
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, bLen, 12).rotateX(Math.PI/2), matBarrel);
            barrel.position.set(0, 0.02, bPos); gunGroup.add(barrel);

            const bore = new THREE.Mesh(new THREE.CircleGeometry(0.007, 12), new THREE.MeshBasicMaterial({color: 0x000000}));
            bore.position.set(0, 0.02, isAuto ? -0.22 : -0.1455); 
            bore.rotation.y = Math.PI; 
            gunGroup.add(bore);
            
            // --- FLASH HIDER ---
            let muzzleZ = isAuto ? -0.22 : -0.1455; // Base muzzle position
            
            if (hasFlashHider && CommonParts) {
                const fh = CommonParts.buildFlashHider().mesh;
                // Pos: Adjusted +0.03 to move closer to gun body
                fh.position.set(0, 0.02, muzzleZ + 0.005);
                fh.scale.set(0.8, 0.8, 0.8); 
                gunGroup.add(fh);
                muzzleZ -= 0.03; 
            }

            // --- SLIDE ---
            const slideMesh = new THREE.Group();
            slideMesh.position.set(0, 0.02, -0.02); 
            
            const slideGeo = new THREE.BoxGeometry(0.028, 0.028, 0.2325);
            const slideBody = new THREE.Mesh(slideGeo, slideMat);
            slideBody.position.z = -0.00375; 
            slideMesh.add(slideBody);
            
            const portMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.01), matChamber);
            portMesh.position.set(0.0141, 0.005, 0.015); portMesh.rotation.y = Math.PI / 2; slideMesh.add(portMesh);
            
            if (isAuto) {
                const swBox = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), new THREE.MeshStandardMaterial({color:0x222222}));
                swBox.position.set(0, 0, 0.12); slideMesh.add(swBox);
            }

            const hasOptic = atts.includes('optic_reddot') || atts.includes('optic_holo');
            
            // Iron Sights (Only if not using optic)
            if (!hasOptic && !isAkimbo) { 
                const rsL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.01), slideMat); rsL.position.set(-0.006, 0.0165, 0.095); slideMesh.add(rsL);
                const rsR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.01), slideMat); rsR.position.set(0.006, 0.0165, 0.095); slideMesh.add(rsR);
                const fs = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.008, 0.01), slideMat); fs.position.set(0, 0.0165, -0.105); slideMesh.add(fs);
                const d1 = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.0015, 0.001), matGlow); d1.position.set(-0.006, 0.0165, 0.1005); slideMesh.add(d1);
                const d2 = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.0015, 0.001), matGlow); d2.position.set(0.006, 0.0165, 0.1005); slideMesh.add(d2);
                const d3 = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.0015, 0.001), matGlow); d3.position.set(0, 0.0165, -0.104); slideMesh.add(d3);
            }

            slideMesh.castShadow = true;
            gunGroup.add(slideMesh);
            
            // Optics Rail 
            if (hasOptic && CommonParts && !isAkimbo) {
                const mountGroup = new THREE.Group();
                gunGroup.add(mountGroup);
                const armH = 0.05; const armY = 0.025; 
                const armL = new THREE.Mesh(new THREE.BoxGeometry(0.004, armH, 0.06), matFrame); armL.position.set(-0.016, armY, -0.02); mountGroup.add(armL);
                const armR = new THREE.Mesh(new THREE.BoxGeometry(0.004, armH, 0.06), matFrame); armR.position.set(0.016, armY, -0.02); mountGroup.add(armR);
                const rail = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.005, 0.08), matFrame); rail.position.set(0, 0.045, -0.02); mountGroup.add(rail); 
                
                if (atts.includes('optic_reddot')) {
                    const sight = CommonParts.buildRedDot();
                    sight.mesh.position.set(0, 0.045, -0.02); mountGroup.add(sight.mesh);
                } else if (atts.includes('optic_holo')) {
                    const sight = CommonParts.buildHolo();
                    sight.mesh.position.set(0, 0.045, -0.02); mountGroup.add(sight.mesh);
                }
            }
            
            // Underbarrel Rail
            if (atts.includes('pistol_flash') || atts.includes('pistol_laser')) {
                const railGeo = new THREE.BoxGeometry(0.02, 0.005, 0.04);
                const rail = new THREE.Mesh(railGeo, matFrame);
                rail.position.set(0, -0.012, -0.12);
                gunGroup.add(rail);
                
                let attachObj = null;
                if (atts.includes('pistol_flash')) {
                    attachObj = CommonParts.buildFlashlight().mesh;
                } else if (atts.includes('pistol_laser')) {
                    attachObj = CommonParts.buildGreenLaser().mesh;
                }
                
                if (attachObj) {
                    attachObj.position.set(0, -0.025, -0.12);
                    if (atts.includes('pistol_flash')) {
                        const lens = attachObj.children.find(c => c.name === "ATTACHMENT_FLASHLIGHT_LENS");
                        if (!lens) { 
                             attachObj.children.forEach(c => { if(c.geometry && c.geometry.type === 'CircleGeometry') c.name = "ATTACHMENT_FLASHLIGHT_LENS"; });
                        }
                    }
                    if (atts.includes('pistol_laser')) {
                         const emit = attachObj.children.find(c => c.name === "ATTACHMENT_LASER_EMITTER");
                         if (!emit) {
                             attachObj.children.forEach(c => { if(c.geometry && c.geometry.type === 'CircleGeometry') c.name = "ATTACHMENT_LASER_EMITTER"; });
                         }
                    }
                    gunGroup.add(attachObj);
                }
            }
            
            return {
                root: gunGroup,
                slide: slideMesh,
                trigger: triggerPivot,
                mag: magGroup,
                muzzleZ: muzzleZ
            };
        };

        // --- AKIMBO SETUP ---
        const rightOffset = isAkimbo ? 0.2 : 0;
        
        const rightGun = buildGunInstance();
        rightGun.root.position.x = rightOffset;
        group.add(rightGun.root);

        // ATTACH MUZZLE POINTS TO GUN ROOTS SO THEY ROTATE WITH SPRINT ANIMATION
        const muzzlePoint = new THREE.Object3D();
        muzzlePoint.position.set(0, 0.02, rightGun.muzzleZ); // Local to Right Gun
        rightGun.root.add(muzzlePoint);
        
        const ejectionPoint = new THREE.Object3D();
        ejectionPoint.position.set(rightOffset + 0.015, 0.025, 0.02); 
        group.add(ejectionPoint);
        
        const handR = new THREE.Object3D(); 
        handR.position.set(rightOffset, -0.06, 0.06); 
        handR.rotation.x = -0.25; 
        group.add(handR);
        
        const handL = new THREE.Object3D(); 
        let leftGun = null;
        let muzzlePointLeft = null;
        let ejectionPointLeft = null;

        if (isAkimbo) {
            leftGun = buildGunInstance();
            leftGun.root.position.x = -rightOffset; 
            group.add(leftGun.root);
            
            handL.position.set(-rightOffset, -0.06, 0.06);
            handL.rotation.x = -0.25; 
            
            muzzlePointLeft = new THREE.Object3D();
            muzzlePointLeft.position.set(0, 0.02, leftGun.muzzleZ); // Local to Left Gun
            leftGun.root.add(muzzlePointLeft); 
            
            ejectionPointLeft = new THREE.Object3D();
            ejectionPointLeft.position.set(-rightOffset - 0.015, 0.025, 0.02); 
            ejectionPointLeft.rotation.set(0, 0.5, 0);
            group.add(ejectionPointLeft);
        } else {
            handL.position.set(0, -0.06, 0.06); handL.rotation.x = -0.25; 
        }
        
        handL.userData.restPos = handL.position.clone();
        
        group.add(handL);

        return {
            mesh: group,
            parts: {
                trigger: rightGun.trigger,
                slide: rightGun.slide,
                muzzle: muzzlePoint,
                ejection: ejectionPoint,
                handRight: handR,
                handLeft: handL,
                magazine: rightGun.mag,
                rightRoot: rightGun.root,
                leftRoot: leftGun ? leftGun.root : null,
                slideLeft: leftGun ? leftGun.slide : null,
                triggerLeft: leftGun ? leftGun.trigger : null,
                muzzleLeft: muzzlePointLeft,
                ejectionLeft: ejectionPointLeft,
                magazineLeft: leftGun ? leftGun.mag : null
            }
        };
    };
})();
