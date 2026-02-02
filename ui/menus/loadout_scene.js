
// js/ui/menus/loadout_scene.js
(function() {
    const LoadoutScene = {
        updateAttachmentNodes(controller) {
            const container = document.getElementById('ls-attachment-overlay');
            if (!container) return;
            container.innerHTML = '';
            
            // Clean up any lingering tooltips from previous renders
            document.querySelectorAll('.att-custom-tooltip').forEach(el => el.remove());
            
            if (window.TacticalShooter.GameData.Throwables[controller.currentWeaponId]) return;
            const LM = window.TacticalShooter.LoadoutManager;
            const def = LM.generateModifiedDef(controller.currentWeaponId, controller.currentAttachments);
            if (!def || !def.attachmentSlots) return;
            
            def.attachmentSlots.forEach(slot => {
                if (['rail_left', 'rail_right', 'rail_bottom'].includes(slot.type)) {
                    if (controller.currentWeaponId === 'SMG' && !controller.currentAttachments.includes('smg_hg_rail')) return;
                }
                
                // REMOVED: Previous check that hid optic node when akimbo was selected.
                // Now we let the node generate so it can show as locked.

                const node = document.createElement('div');
                node.className = 'att-node';
                node.dataset.slotType = slot.type;
                const dot = document.createElement('div'); dot.className = 'att-dot'; node.appendChild(dot);
                const label = document.createElement('div'); label.className = 'att-label'; label.textContent = slot.name; node.appendChild(label);
                
                const dd = document.createElement('div'); dd.className = 'att-dropdown';
                const options = controller.getAttachmentsForSlot(slot.type);
                options.forEach(opt => {
                    const row = document.createElement('div');
                    row.className = `att-option ${controller.currentAttachments.includes(opt.id) ? 'selected' : ''}`;
                    if (opt.locked) row.className += ' locked';
                    
                    row.textContent = opt.name;
                    
                    // Build Rich Tooltip
                    let tooltipText = "";
                    if (opt.locked && opt.failureReasons) {
                        let htmlContent = "";
                        opt.failureReasons.forEach(reason => {
                             const color = reason.type === 'conflict' ? '#ff5555' : '#aaaaaa';
                             const icon = reason.type === 'conflict' ? '-' : '•';
                             htmlContent += `<div style="color:${color}; font-size:10px; margin-bottom:2px;"><span style="margin-right:4px;">${icon}</span>${reason.text}</div>`;
                        });
                        if (opt.description) htmlContent += `<div style="color:#888; font-size:10px; margin-top:4px; font-style:italic;">${opt.description}</div>`;
                        
                        const tt = document.createElement('div');
                        tt.className = 'att-custom-tooltip';
                        tt.innerHTML = htmlContent;
                        row.appendChild(tt);
                    } else if (opt.description) {
                         const tt = document.createElement('div');
                         tt.className = 'att-custom-tooltip';
                         tt.innerHTML = `<div style="color:#ccc; font-size:10px;">${opt.description}</div>`;
                         row.appendChild(tt);
                    }

                    row.onclick = (e) => { 
                        e.stopPropagation();
                        controller.toggleAttachment(opt.id, slot.type); 
                        if (!opt.locked) {
                             node.classList.remove('active'); 
                             if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.resetFocus(); 
                        }
                    };
                    dd.appendChild(row);
                });
                node.appendChild(dd);

                dot.onclick = (e) => { 
                    e.stopPropagation(); 
                    const wasActive = node.classList.contains('active'); 
                    document.querySelectorAll('.att-node').forEach(n => n.classList.remove('active')); 
                    if (!wasActive) { 
                        node.classList.add('active'); 
                        if (window.TacticalShooter.MenuRenderer) { 
                            const pos = { ...slot.pos }; 
                            const localPos = new window.THREE.Vector3(pos.x, pos.y, pos.z); 
                            window.TacticalShooter.MenuRenderer.focusOn(localPos); 
                        } 
                    } else { 
                        if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.resetFocus(); 
                    } 
                };
                container.appendChild(node);
            });
            
            const closeHandler = (e) => { 
                if (!e.target.closest('.att-node')) { 
                    document.querySelectorAll('.att-node.active').forEach(n => n.classList.remove('active')); 
                    if (window.TacticalShooter.MenuRenderer) window.TacticalShooter.MenuRenderer.resetFocus(); 
                } 
            };
            if (controller._boundCloseHandler) document.removeEventListener('click', controller._boundCloseHandler);
            controller._boundCloseHandler = closeHandler;
            document.addEventListener('click', controller._boundCloseHandler);
        },

        updateNodePositions(controller) {
            if (window.TacticalShooter.GameData.Throwables[controller.currentWeaponId]) return;
            const renderer = window.TacticalShooter.MenuRenderer;
            if (!renderer || !renderer.active) return;
            const camera = renderer.camera;
            const weaponMesh = renderer.gunMesh;
            const LM = window.TacticalShooter.LoadoutManager;
            const def = LM.generateModifiedDef(controller.currentWeaponId, controller.currentAttachments);
            if (!weaponMesh || !camera || !def || !def.attachmentSlots) return;
            
            const container = document.getElementById('ls-attachment-overlay');
            const width = container.clientWidth;
            const height = container.clientHeight;
            const nodes = Array.from(container.querySelectorAll('.att-node'));
            if (!controller._tempPos) controller._tempPos = new window.THREE.Vector3();
            
            const hasTriRail = controller.currentAttachments.includes('smg_hg_rail');
            
            const validSlots = def.attachmentSlots.filter(s => {
                if (['rail_left', 'rail_right', 'rail_bottom'].includes(s.type)) {
                    if (controller.currentWeaponId === 'SMG' && !hasTriRail) return false;
                }
                // REMOVED: Previous check hiding optic node for akimbo
                return true;
            });

            validSlots.forEach((slotConfig, i) => {
                const node = nodes[i];
                if (!node) return;
                controller._tempPos.set(slotConfig.pos.x, slotConfig.pos.y, slotConfig.pos.z);
                weaponMesh.updateMatrixWorld();
                controller._tempPos.applyMatrix4(weaponMesh.matrixWorld);
                controller._tempPos.project(camera);
                const x = (controller._tempPos.x * .5 + .5) * width;
                const y = (controller._tempPos.y * -.5 + .5) * height;
                if (controller._tempPos.z > 1) { node.style.display = 'none'; } 
                else { node.style.display = 'flex'; node.style.left = `${x}px`; node.style.top = `${y}px`; }
            });
        }
    };
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.LoadoutScene = LoadoutScene;
})();
