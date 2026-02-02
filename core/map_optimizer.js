
// js/core/map_optimizer.js
(function() {
    const MapOptimizer = {
        optimize(mapGroup, chunkSize = 200) {
            if (!mapGroup) return;
            console.log("MapOptimizer: Optimizing mesh batches...");
            
            const meshesByKey = new Map();
            const meshesToRemove = [];
            
            mapGroup.children.forEach(child => {
                // ADDED: !child.userData.skipMerge check
                if (child.isMesh && child.visible && !child.userData.dynamic && !child.userData.isSpawnZone && !child.userData.skipMerge) {
                    const mat = child.material;
                    if (mat && mat.isMaterial) {
                        child.updateMatrixWorld();
                        
                        // Calculate Chunk ID
                        const cx = Math.floor(child.position.x / chunkSize);
                        const cz = Math.floor(child.position.z / chunkSize);
                        const chunkKey = `${cx}_${cz}`;
                        
                        const isProp = !!child.userData.isProp;
                        const isBorder = !!child.userData.isBorder;
                        
                        // Key: Chunk + Material + Flags
                        const key = `${chunkKey}_${mat.uuid}_${isProp}_${isBorder}`;
                        
                        if (!meshesByKey.has(key)) {
                            meshesByKey.set(key, { material: mat, geometries: [], isProp: isProp, isBorder: isBorder });
                        }
                        
                        let geo = child.geometry.clone();
                        geo.applyMatrix4(child.matrixWorld);
                        
                        if (geo.index) geo = geo.toNonIndexed();
                        delete geo.attributes.color;
                        delete geo.attributes.tangent;
                        if (!geo.attributes.uv) {
                             const count = geo.attributes.position.count;
                             geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
                        }
                        if (!geo.attributes.normal) geo.computeVertexNormals();
                        
                        meshesByKey.get(key).geometries.push(geo);
                        meshesToRemove.push(child);
                    }
                }
            });
            
            meshesByKey.forEach((data, key) => {
                if (data.geometries.length > 0) {
                    try {
                        const mergedGeo = window.BufferGeometryUtils.mergeGeometries(data.geometries, false);
                        if (mergedGeo) {
                            const mergedMesh = new THREE.Mesh(mergedGeo, data.material);
                            mergedMesh.castShadow = true; 
                            mergedMesh.receiveShadow = true; 
                            mergedMesh.userData.collidable = true;
                            if (data.isProp) mergedMesh.userData.isProp = true;
                            if (data.isBorder) mergedMesh.userData.isBorder = true;
                            
                            // Enable Frustum Culling for chunks
                            mergedMesh.frustumCulled = true; 
                            
                            mergedMesh.name = "BATCHED_CHUNK_" + key;
                            mapGroup.add(mergedMesh);
                        } else { data.geometries.forEach(g => g.dispose()); }
                    } catch(e) { 
                        console.error("MapOptimizer: Merge failed", e);
                        data.geometries.forEach(g => g.dispose()); 
                    }
                }
            });
            
            meshesToRemove.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose(); 
                if (mesh.parent) mesh.parent.remove(mesh);
            });
            
            console.log(`MapOptimizer: Merged into ${meshesByKey.size} batches.`);
        },

        generateStaticCollider(mapGroup) {
            if (!mapGroup) return null;
            console.log("MapOptimizer: Generating BVH collider & Rapier Static Body...");
            
            // 1. CLEAR OLD PHYSICS
            if (window.TacticalShooter.PhysicsEngine) {
                window.TacticalShooter.PhysicsEngine.resetStaticGeometry();
            }
            
            const geometries = [];
            const PE = window.TacticalShooter.PhysicsEngine;
            
            mapGroup.traverse(child => {
                if (child.isMesh && child.userData.collidable && !child.userData.dynamic) {
                    // For BVH (Visual Raycasts): Clone and bake transform
                    let geo = child.geometry.clone();
                    child.updateMatrixWorld();
                    geo.applyMatrix4(child.matrixWorld);
                    for (const key in geo.attributes) { if (key !== 'position') geo.deleteAttribute(key); }
                    if (geo.index) { const temp = geo.toNonIndexed(); geo.dispose(); geo = temp; }
                    geometries.push(geo);

                    // For Rapier (Physics): Add directly
                    if (PE) {
                        // Optimization: Use Cuboid if BoxGeometry
                        if (child.geometry.type === 'BoxGeometry') {
                            const scale = child.scale;
                            // BoxGeometry params are width, height, depth. 
                            // Actual dimensions = param * scale.
                            // We need to inspect parameters if accessible, or bounding box.
                            child.geometry.computeBoundingBox();
                            const bbox = child.geometry.boundingBox;
                            const size = new THREE.Vector3();
                            bbox.getSize(size);
                            size.multiply(scale); // Apply world scale
                            
                            const center = new THREE.Vector3();
                            bbox.getCenter(center);
                            center.applyMatrix4(child.matrixWorld); // World center
                            
                            const quat = new THREE.Quaternion();
                            child.getWorldQuaternion(quat);
                            
                            PE.addStaticCuboid(size, center, quat);
                        } else {
                            // Trimesh fall back
                            const pos = new THREE.Vector3();
                            const quat = new THREE.Quaternion();
                            const scale = new THREE.Vector3();
                            child.matrixWorld.decompose(pos, quat, scale);
                            PE.addStaticTrimesh(child.geometry, pos, quat, scale);
                        }
                    }
                }
            });
            
            // Build BVH for Raycasts (Bullet/Player Movement)
            if (geometries.length > 0) {
                let mergedGeo = window.BufferGeometryUtils.mergeGeometries(geometries, false);
                mergedGeo = window.BufferGeometryUtils.mergeVertices(mergedGeo);
                mergedGeo.computeBoundsTree();
                
                const collider = new THREE.Mesh(mergedGeo, new THREE.MeshBasicMaterial({ wireframe: true, visible: false, side: THREE.DoubleSide }));
                collider.name = "STATIC_COLLIDER_BVH";
                
                geometries.forEach(g => g.dispose());
                return collider;
            }
            return null;
        }
    };
    
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.MapOptimizer = MapOptimizer;
})();
