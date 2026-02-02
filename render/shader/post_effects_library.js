
// js/render/shader/post_effects_library.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.Shaders = window.TacticalShooter.Shaders || {};

    // 1. Vignette Shader (Cinematic Dark Corners)
    window.TacticalShooter.Shaders.Vignette = {
        uniforms: {
            "tDiffuse": { value: null },
            "offset": { value: 1.0 },   // Size of clear center
            "darkness": { value: 1.0 }  // Intensity of darkness
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
            uniform float offset;
            uniform float darkness;
            varying vec2 vUv;
            void main() {
                vec4 texel = texture2D(tDiffuse, vUv);
                vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
                gl_FragColor = vec4(mix(texel.rgb, vec3(0.0), dot(uv, uv) * darkness), texel.a);
            }
        `
    };

    // 2. Chromatic Aberration (Glitch/Impact/Stun)
    window.TacticalShooter.Shaders.ChromaticAberration = {
        uniforms: {
            "tDiffuse": { value: null },
            "amount": { value: 0.005 },
            "angle": { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float amount;
            uniform float angle;
            varying vec2 vUv;
            void main() {
                vec2 offset = amount * vec2(cos(angle), sin(angle));
                float r = texture2D(tDiffuse, vUv + offset).r;
                float g = texture2D(tDiffuse, vUv).g;
                float b = texture2D(tDiffuse, vUv - offset).b;
                gl_FragColor = vec4(r, g, b, 1.0);
            }
        `
    };

    // 3. Directional Motion Blur (Linear Blur)
    window.TacticalShooter.Shaders.MotionBlur = {
        uniforms: {
            "tDiffuse": { value: null },
            "velocity": { value: { x:0, y:0 } }, // Use plain object, PostProcessor or ShaderPass will handle
            "resolution": { value: { x: window.innerWidth, y: window.innerHeight } },
            "samples": { value: 8 } 
        },
        vertexShader: `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform vec2 velocity;
            uniform vec2 resolution;
            uniform int samples;
            varying vec2 vUv;
            
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                if (length(velocity) < 0.001) {
                    gl_FragColor = color;
                    return;
                }
                
                vec2 texelSize = 1.0 / resolution;
                vec2 direction = velocity * texelSize;
                
                float total = 1.0;
                
                // Sample along vector
                for(int i=1; i<8; i++) {
                    // Manual unroll loop limit or use fixed samples
                    color += texture2D(tDiffuse, vUv + direction * float(i));
                    total += 1.0;
                }
                
                gl_FragColor = color / total;
            }
        `
    };
})();
