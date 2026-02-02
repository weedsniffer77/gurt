
// js/data/throwable_registry.js
(function() {
    const scripts = [
        "data/throwables/m67/m67_data.js",
        "data/throwables/m67/m67_model.js",
        "data/throwables/m84/m84_data.js",
        "data/throwables/m84/m84_model.js",
        "data/throwables/m83/m83_data.js",
        "data/throwables/m83/m83_model.js",
        "data/throwables/rpg_ammo.js"
    ];

    function loadNext(index) {
        if (index >= scripts.length) {
            console.log("ThrowableRegistry: All throwables loaded.");
            return;
        }
        const s = document.createElement('script');
        s.src = scripts[index];
        s.onload = () => loadNext(index + 1);
        s.onerror = () => {
            console.error("Failed to load throwable script:", scripts[index]);
            loadNext(index + 1);
        };
        document.head.appendChild(s);
    }
    
    // Start loading
    loadNext(0);
})();
