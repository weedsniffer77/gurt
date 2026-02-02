
// js/render/shader/custom_shaders.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.Shaders = {
        init: function() {
            if (!window.THREE) return;
            const THREE = window.THREE;

            this.DamageShader = {
                uniforms: {
                    "tDiffuse": { value: null },
                    "intensity": { value: 0.0 }, // Vignette/Damage Red
                    "flashIntensity": { value: 0.0 }, // Full Screen Whiteout (Additive)
                    "blurStrength": { value: 0.0 }, // Blur Strength
                    "vColor": { value: new THREE.Color(0.8, 0.0, 0.0) } // Vignette Color
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform float intensity;
                    uniform float flashIntensity;
                    uniform float blurStrength;
                    uniform vec3 vColor;
                    varying vec2 vUv;

                    void main() {
                        vec2 center = vec2(0.5, 0.5);
                        vec2 toCenter = center - vUv;
                        float dist = length(toCenter);
                        
                        vec3 color = vec3(0.0);
                        
                        // Circular Edge Blur: Mask center, ramp up at edges
                        // smoothstep(0.2, 0.6, dist) creates a safe zone in the center (0 to 0.2) 
                        // and transitions to full blur at edges (0.6+)
                        float edgeMask = smoothstep(0.2, 0.6, dist);
                        
                        // Combine damage blur (linear with intensity) and explicit blurStrength (masked for edges)
                        // This ensures sprint blur is only on edges (tunnel effect)
                        float blurAmount = (intensity * 0.3 * dist) + (blurStrength * edgeMask * 0.15); 
                        
                        if (blurAmount > 0.001) {
                            float total = 0.0;
                            // Simple radial blur sample
                            for(float t = 0.0; t <= 4.0; t++) {
                                float percent = t / 4.0;
                                color += texture2D(tDiffuse, vUv + toCenter * percent * blurAmount).rgb;
                                total += 1.0;
                            }
                            color /= total;
                        } else {
                            color = texture2D(tDiffuse, vUv).rgb;
                        }

                        // 1. Vignette (Damage or Flash Darkening)
                        float vignette = dist * dist * 4.0 * intensity;
                        color = mix(color, vColor, clamp(vignette, 0.0, 0.8));

                        // 2. Flash Whiteout (Additive/Cover)
                        color = mix(color, vec3(1.0, 1.0, 1.0), clamp(flashIntensity, 0.0, 1.0));

                        gl_FragColor = vec4(color, 1.0);
                    }
                `
            };

            this.RedDotShader = {
                uniforms: { "reticleColor": { value: new THREE.Color(0xff0000) } },
                vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `
                    uniform vec3 reticleColor;
                    varying vec2 vUv;
                    void main() {
                        vec2 uv = vUv - 0.5;
                        float d = length(uv);
                        
                        // Very sharp inner dot
                        float dot = 1.0 - smoothstep(0.02, 0.04, d);
                        
                        // Faint Glow
                        float glow = (1.0 - smoothstep(0.0, 0.25, d)) * 0.15;
                        
                        float alpha = dot + glow;
                        
                        // ABSOLUTE DISCARD: If no dot/glow, don't render pixel at all
                        if (alpha < 0.05) discard;
                        
                        gl_FragColor = vec4(reticleColor * 3.0, alpha); 
                    }
                `
            };

            this.HoloShader = {
                uniforms: { "reticleColor": { value: new THREE.Color(0xffffff) } },
                vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `
                    uniform vec3 reticleColor;
                    varying vec2 vUv;
                    void main() {
                        vec2 uv = vUv - 0.5;
                        uv.y += 0.05; 
                        
                        float d = length(uv);
                        
                        float dot = 1.0 - smoothstep(0.015, 0.025, d);
                        float ring = smoothstep(0.25, 0.26, d) * (1.0 - smoothstep(0.28, 0.29, d));
                        
                        float angle = atan(uv.y, uv.x);
                        float tickMask = step(0.9, abs(sin(angle * 2.0))); 
                        float tick = ring * tickMask;
                        
                        float shape = max(dot, ring);
                        
                        if (shape < 0.05) discard;

                        gl_FragColor = vec4(reticleColor * 2.0, shape);
                    }
                `
            };
            
            // Post Effects
            this.Vignette = window.TacticalShooter.Shaders.Vignette || {};
            this.ChromaticAberration = window.TacticalShooter.Shaders.ChromaticAberration || {};
            this.MotionBlur = window.TacticalShooter.Shaders.MotionBlur || {};
            
            console.log('CustomShaders: Initialized.');
        }
    };
})();
