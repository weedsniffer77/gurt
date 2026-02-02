
// js/data/weapons/rpg7/rpg7_model.js
(function() {
    const weaponDef = window.TacticalShooter.GameData.Weapons["RPG7"];
    if (!weaponDef) return;

    weaponDef.buildMesh = function() {
        if (!window.THREE) return null;
        const THREE = window.THREE;

        // Shared Materials
        const matTube = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5, metalness: 0.6, name: 'RPG_Steel' }); 
        const matWood = new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.4, metalness: 0.1, name: 'RPG_Wood' }); 
        const matBakelite = new THREE.MeshStandardMaterial({ color: 0x3d1c10, roughness: 0.4, metalness: 0.1, name: 'Bakelite' });
        const matChrome = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2, metalness: 0.9, name: 'Chrome' });
        
        // Warhead Materials
        const matWarheadGreen = new THREE.MeshStandardMaterial({ color: 0x3d4435, roughness: 0.7, metalness: 0.2 });
        const matWarheadGrey = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.3 });
        const matAlum = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });

        const atts = this.attachments || [];
        const isOGV = atts.includes('rpg_rocket_ogv7');
        const isAkimbo = atts.includes('rpg_akimbo');
        const mm = 0.001; 

        // Helper to build ONE complete RPG unit
        const buildOneRPG = () => {
            const group = new THREE.Group();
            group.userData.bulletTransparent = true;
            
            const addMesh = (mesh, parent = group) => {
                mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.bulletTransparent = true;
                parent.add(mesh); return mesh;
            };

            const Z_OFFSET = -0.135; 
            const tubeY = 0.12;
            
            const tubeGroup = new THREE.Group();
            tubeGroup.position.set(0, tubeY, 0); 
            group.add(tubeGroup);

            const buildTube = (startMm, endMm, startDia, endDia, mat, hollow = false, openEnded = false) => {
                const length = (endMm - startMm) * mm;
                const rFront = startDia * mm / 2;
                const rBack = endDia * mm / 2;
                const centerZ = ((startMm + endMm) / 2 * mm) + Z_OFFSET;
                
                let geo;
                if (hollow) {
                    geo = new THREE.CylinderGeometry(rBack, rFront, length, 32, 1, true);
                    mat.side = THREE.DoubleSide;
                } else {
                    geo = new THREE.CylinderGeometry(rBack, rFront, length, 32, 1, openEnded);
                }
                geo.rotateX(-Math.PI/2);
                
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, 0, centerZ);
                addMesh(mesh, tubeGroup);
                return mesh;
            };

            // --- TUBE SECTIONS ---
            buildTube(0, 210, 40, 40, matTube);
            buildTube(210, 240, 60, 40, matTube);
            buildTube(240, 360, 60, 60, matTube);
            buildTube(345, 360, 80, 80, matTube);
            buildTube(360, 540, 75, 75, matWood);
            
            const ringGeo = new THREE.CylinderGeometry(38.5*mm, 38.5*mm, 4*mm, 32); 
            ringGeo.rotateX(Math.PI/2);
            const r1 = new THREE.Mesh(ringGeo, matChrome); r1.position.z = (380*mm) + Z_OFFSET; addMesh(r1, tubeGroup);
            const r2 = new THREE.Mesh(ringGeo, matChrome); r2.position.z = (520*mm) + Z_OFFSET; addMesh(r2, tubeGroup);

            buildTube(540, 575, 45, 75, matWood);
            buildTube(575, 760, 45, 45, matWood);
            const r3 = new THREE.Mesh(new THREE.CylinderGeometry(23.5*mm, 23.5*mm, 4*mm, 32).rotateX(Math.PI/2), matChrome); 
            r3.position.z = (590*mm) + Z_OFFSET; addMesh(r3, tubeGroup);
            
            const r4 = new THREE.Mesh(new THREE.CylinderGeometry(23.5*mm, 23.5*mm, 4*mm, 32).rotateX(Math.PI/2), matChrome); 
            r4.position.z = (760*mm) + Z_OFFSET; 
            addMesh(r4, tubeGroup);

            // Bell
            const bellStartMm = 965; const bellEndMm = 1170; const bellLen = (bellEndMm - bellStartMm) * mm;
            const rWide = 85 * mm / 2; const rNarrow = 45 * mm / 2; 
            const bellPoints = [];
            for (let i = 0; i <= 12; i++) {
                const t = i / 12; const y = t * bellLen; const curve = Math.cos(t * Math.PI / 2); const r = rNarrow + (rWide - rNarrow) * curve;
                bellPoints.push(new THREE.Vector2(r, y));
            }
            const bellGeo = new THREE.LatheGeometry(bellPoints, 32);
            bellGeo.rotateX(-Math.PI/2); bellGeo.translate(0, 0, (bellStartMm*mm) + Z_OFFSET);
            const bell = new THREE.Mesh(bellGeo, matTube); bell.material.side = THREE.DoubleSide; 
            addMesh(bell, tubeGroup);

            const discThick = 5 * mm; 
            const discOD = 110 * mm / 2; 
            const discID = rWide; 
            
            const discShape = new THREE.Shape(); discShape.absarc(0, 0, discOD, 0, Math.PI * 2, false);
            const discHole = new THREE.Path(); discHole.absarc(0, 0, discID, 0, Math.PI * 2, true); discShape.holes.push(discHole);
            const discGeo = new THREE.ExtrudeGeometry(discShape, { depth: discThick, bevelEnabled: false });
            discGeo.translate(0, 0, -discThick); 
            
            const discZ = (bellStartMm*mm) + Z_OFFSET;
            
            const disc = new THREE.Mesh(discGeo, matTube); disc.position.set(0, 0, discZ + discThick); addMesh(disc, tubeGroup);

            // --- HANDLES ---
            const housingH = 75 * mm;
            const housingGeo = new THREE.BoxGeometry(30*mm, housingH, 60*mm);
            const housing = new THREE.Mesh(housingGeo, matTube);
            housing.position.set(0, tubeY - 0.02 - (housingH/2), 0); 
            addMesh(housing, group);
            
            const gripH = 95 * mm;
            const gripGeo = new THREE.BoxGeometry(25*mm, gripH, 40*mm);
            const grip = new THREE.Mesh(gripGeo, matBakelite);
            grip.position.set(0, tubeY - 0.02 - housingH - (gripH/2), 0.01);
            addMesh(grip, group);
            
            const trigY = tubeY - 0.025; const trigZ = -0.045;       
            const guardY = trigY + 0.007; 
            const guardShape = new THREE.Shape(); guardShape.moveTo(0,0); guardShape.lineTo(0, -0.05); guardShape.lineTo(0.06, -0.05); guardShape.lineTo(0.06, 0.0); guardShape.lineTo(0.055, 0.0); guardShape.lineTo(0.055, -0.045); guardShape.lineTo(0.005, -0.045); guardShape.lineTo(0.005, 0); guardShape.lineTo(0,0); 
            const gGeo = new THREE.ExtrudeGeometry(guardShape, { depth: 0.012, bevelEnabled: false }); gGeo.translate(0, 0, -0.006);
            const guard = new THREE.Mesh(gGeo, matTube); guard.rotation.y = -Math.PI/2; guard.position.set(0, guardY, trigZ - 0.04); addMesh(guard, group);
            
            const triggerY = trigY - 0.012 - 0.007; 
            const tShape = new THREE.Shape(); tShape.moveTo(0,0); tShape.quadraticCurveTo(0.005, -0.01, 0.0, -0.02); tShape.lineTo(-0.005, -0.02); tShape.quadraticCurveTo(-0.002, -0.01, -0.005, 0);
            const tGeo = new THREE.ExtrudeGeometry(tShape, { depth: 0.006, bevelEnabled: false }); tGeo.translate(0,0,-0.003);
            const trig = new THREE.Mesh(tGeo, matChrome); trig.rotation.y = -Math.PI/2; trig.scale.set(1, -1, 1); trig.position.set(0, triggerY, trigZ + 0.005); addMesh(trig, group);

            const rHandleZ = 170 * mm; const rHandleH = 95 * mm; const rTubeBottom = tubeY - 0.03; 
            const rHandleGeo = new THREE.BoxGeometry(25*mm, rHandleH, 40*mm);
            const rHandle = new THREE.Mesh(rHandleGeo, matWood); rHandle.position.set(0, rTubeBottom - (rHandleH/2), rHandleZ); addMesh(rHandle, group);
            const rBaseGeo = new THREE.BoxGeometry(30*mm, 20*mm, 50*mm);
            const rBase = new THREE.Mesh(rBaseGeo, matTube); rBase.position.set(0, rTubeBottom, rHandleZ); addMesh(rBase, group);

            // --- SIGHTS ---
            const sightY = tubeY + 0.02; 
            const fsZ = 10 * mm + Z_OFFSET; 
            const fsGroup = new THREE.Group(); fsGroup.position.set(0, sightY, fsZ); addMesh(fsGroup, group);
            const fsBase = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.03), matTube); fsBase.position.y = 0.005; addMesh(fsBase, fsGroup);
            const earShape = new THREE.Shape(); const earHeight = 0.07; earShape.moveTo(-0.012, 0.01); earShape.lineTo(-0.012, earHeight); earShape.quadraticCurveTo(0, earHeight + 0.01, 0.012, earHeight); earShape.lineTo(0.012, 0.01); earShape.lineTo(0.008, 0.01); earShape.lineTo(0.008, earHeight - 0.005); earShape.quadraticCurveTo(0, earHeight + 0.002, -0.008, earHeight - 0.005); earShape.lineTo(-0.008, 0.01); earShape.lineTo(-0.012, 0.01);
            const earGeo = new THREE.ExtrudeGeometry(earShape, { depth: 0.005, bevelEnabled: false }); earGeo.translate(0, 0, -0.0025); const ears = new THREE.Mesh(earGeo, matTube); addMesh(ears, fsGroup);
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.002, 0.042, 8), matTube); post.position.y = 0.022; addMesh(post, fsGroup);
            
            const rsZ = rHandleZ; // Align with Rear Handle (Backup state)
            const rsGroup = new THREE.Group(); rsGroup.position.set(0, sightY, rsZ); addMesh(rsGroup, group);
            const rsBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.04), matTube); rsBase.position.y = 0.006; addMesh(rsBase, rsGroup);
            const ladW = 0.028; const ladH = 0.06; const ladThick = 0.004; const ladShape = new THREE.Shape(); ladShape.moveTo(-ladW/2, 0); ladShape.lineTo(-ladW/2, ladH); ladShape.lineTo(ladW/2, ladH); ladShape.lineTo(ladW/2, 0); ladShape.lineTo(ladW/2 - 0.004, 0); ladShape.lineTo(ladW/2 - 0.004, ladH - 0.004); ladShape.lineTo(-ladW/2 + 0.004, ladH - 0.004); ladShape.lineTo(-ladW/2 + 0.004, 0); ladShape.lineTo(-ladW/2, 0);
            const ladGeo = new THREE.ExtrudeGeometry(ladShape, { depth: ladThick, bevelEnabled: false }); ladGeo.translate(0, 0.012, -ladThick/2); const ladder = new THREE.Mesh(ladGeo, matTube); addMesh(ladder, rsGroup);
            const slideH = 0.012; const slideY = 0.012 + (ladH * 0.4); const slideShape = new THREE.Shape(); slideShape.moveTo(-ladW/2, 0); slideShape.lineTo(ladW/2, 0); slideShape.lineTo(ladW/2, slideH); slideShape.lineTo(0.003, slideH); slideShape.lineTo(0, slideH - 0.004); slideShape.lineTo(-0.003, slideH); slideShape.lineTo(-ladW/2, slideH);
            const slideGeo = new THREE.ExtrudeGeometry(slideShape, { depth: 0.005, bevelEnabled: false }); slideGeo.translate(0, slideY, -0.0025); const slider = new THREE.Mesh(slideGeo, matTube); addMesh(slider, rsGroup);

            // --- ROCKETS (DUAL SETUP) ---
            const rocketGroup = new THREE.Group();
            rocketGroup.position.set(0, tubeY, Z_OFFSET); 
            group.add(rocketGroup);
            
            // --- 1. OGV-7 (Frag) ---
            const ogvGroup = new THREE.Group();
            ogvGroup.visible = isOGV;
            rocketGroup.add(ogvGroup);
            const ogvBody = new THREE.Mesh(new THREE.CylinderGeometry(19.5*mm, 19.5*mm, 0.35, 16).rotateX(-Math.PI/2), matWarheadGrey);
            ogvBody.position.z = 0.15; addMesh(ogvBody, ogvGroup);
            const ogvCap = new THREE.Mesh(new THREE.SphereGeometry(19.5*mm, 16, 16, 0, Math.PI*2, 0, Math.PI/2), matWarheadGrey);
            ogvCap.rotation.x = -Math.PI/2; ogvCap.position.z = -0.025; addMesh(ogvCap, ogvGroup);
            const ogvFuse = new THREE.Mesh(new THREE.CylinderGeometry(5*mm, 5*mm, 0.02).rotateX(-Math.PI/2), matAlum);
            ogvFuse.position.z = -0.04; addMesh(ogvFuse, ogvGroup);

            // --- 2. PG-7V (HEAT) ---
            const pg7Group = new THREE.Group();
            pg7Group.visible = !isOGV;
            rocketGroup.add(pg7Group);
            
            const noseLen = 0.10;
            const noseRad = 0.015;
            const nose = new THREE.Mesh(new THREE.CylinderGeometry(6*mm, noseRad, noseLen, 16).rotateX(-Math.PI/2), matWarheadGreen);
            nose.position.z = -0.30; 
            addMesh(nose, pg7Group);
            
            const fuse = new THREE.Mesh(new THREE.CylinderGeometry(4*mm, 4*mm, 0.02).rotateX(-Math.PI/2), matAlum);
            fuse.position.z = -0.36; 
            addMesh(fuse, pg7Group);
            
            const bulbLen = 0.15; 
            const bulbRad = 0.052; 
            const b1 = new THREE.Mesh(new THREE.CylinderGeometry(noseRad, bulbRad, bulbLen, 16).rotateX(-Math.PI/2), matWarheadGreen);
            b1.position.z = -0.175; 
            addMesh(b1, pg7Group);
            
            const b2Len = 0.08;
            const b2 = new THREE.Mesh(new THREE.CylinderGeometry(bulbRad, 18*mm, b2Len, 16).rotateX(-Math.PI/2), matWarheadGreen);
            b2.position.z = -0.06; 
            addMesh(b2, pg7Group);
            
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(18*mm, 18*mm, 0.2, 12).rotateX(-Math.PI/2), matWarheadGreen);
            stem.position.z = 0.03; 
            addMesh(stem, pg7Group);

            // --- RIGGING ---
            const muzzlePoint = new THREE.Object3D();
            muzzlePoint.position.set(0, tubeY, Z_OFFSET - 0.3); 
            group.add(muzzlePoint);
            const ejectionPoint = new THREE.Object3D();
            ejectionPoint.position.set(0, tubeY, discZ); 
            ejectionPoint.rotation.y = Math.PI; 
            group.add(ejectionPoint);
            
            const handR = new THREE.Object3D();
            // Right Hand: Moved UP (Y=0.01)
            handR.position.set(0, 0.01, -0.045); 
            group.add(handR);
            
            const handL = new THREE.Object3D();
            // Left Hand: Moved UP (Y=0.01)
            handL.position.set(0, 0.01, 0.17);
            handL.userData.restPos = handL.position.clone();
            group.add(handL);
            
            return {
                mesh: group,
                parts: {
                    muzzle: muzzlePoint,
                    ejection: ejectionPoint,
                    handRight: handR,
                    handLeft: handL,
                    magazine: rocketGroup,
                    rocketOGV: ogvGroup,
                    rocketHEAT: pg7Group,
                    slide: null,
                    trigger: trig
                }
            };
        };

        // --- AKIMBO LOGIC ---
        if (!isAkimbo) {
            return buildOneRPG();
        } else {
            const masterGroup = new THREE.Group();
            
            const rightInfo = buildOneRPG();
            const leftInfo = buildOneRPG();

            const offset = 0.3; // Offset distance
            
            // Position
            rightInfo.mesh.position.set(offset, 0, 0);
            leftInfo.mesh.position.set(-offset, 0, 0);
            
            masterGroup.add(rightInfo.mesh);
            masterGroup.add(leftInfo.mesh);
            
            // Map Parts
            // Right Hand holds Right Grip (Trigger)
            // Left Hand holds Left Grip (Trigger)
            // The model's 'handRight' is the trigger grip.
            
            // We need to return a structure GunRenderer understands
            return {
                mesh: masterGroup,
                parts: {
                    // Right Side (Primary)
                    muzzle: rightInfo.parts.muzzle,
                    ejection: rightInfo.parts.ejection,
                    handRight: rightInfo.parts.handRight, // Right Gun Grip
                    magazine: rightInfo.parts.magazine,
                    rocketOGV: rightInfo.parts.rocketOGV,
                    rocketHEAT: rightInfo.parts.rocketHEAT,
                    trigger: rightInfo.parts.trigger,
                    
                    // Left Side (Secondary)
                    muzzleLeft: leftInfo.parts.muzzle,
                    ejectionLeft: leftInfo.parts.ejection,
                    handLeft: leftInfo.parts.handRight, // Left Gun Grip (Uses HandR node of that gun)
                    magazineLeft: leftInfo.parts.magazine,
                    rocketOGVLeft: leftInfo.parts.rocketOGV,
                    rocketHEATLeft: leftInfo.parts.rocketHEAT,
                    triggerLeft: leftInfo.parts.trigger,
                    
                    // Roots for Animators
                    rightRoot: rightInfo.mesh,
                    leftRoot: leftInfo.mesh
                }
            };
        }
    };
})();
