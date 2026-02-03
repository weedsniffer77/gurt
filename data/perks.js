
// js/data/perks.js
(function() {
    window.TacticalShooter = window.TacticalShooter || {};
    window.TacticalShooter.GameData = window.TacticalShooter.GameData || {};

    window.TacticalShooter.GameData.Perks = {
        // --- DAMAGE (Red) ---
        "LAST_STAND": {
            id: "LAST_STAND",
            name: "LAST STAND",
            type: "damage",
            color: "#ff3333",
            description: "2x Damage when health is below 15 HP.",
            downside: "None.",
            iconClass: "icon-damage",
            iconHtml: `<div class="css-bullet-cartridge"></div>`
        },
        "STOPPING_POWER": {
            id: "STOPPING_POWER",
            name: "TAINT TICKLER",
            type: "damage",
            color: "#ff3333",
            description: "1.15x Damage.",
            downside: "-5% Movement Speed.",
            iconClass: "icon-damage",
            iconHtml: `<div class="css-bullet-cartridge"></div>`
        },
        "MARTYRDOM": {
            id: "MARTYRDOM",
            name: "GOONING",
            type: "damage",
            color: "#ff3333",
            description: "Drop a live grenade 1s after death.",
            downside: "None.",
            iconClass: "icon-explosion",
            iconHtml: `<div class="icon-frag-body"></div>`
        },
        "SUBSONIC_AMMO": {
            id: "SUBSONIC_AMMO",
            name: "SUBSONIC AMMO",
            type: "damage",
            color: "#ff3333",
            description: "No bullet splashes, 100 dmg headshot within 5 meters.",
            downside: "Req: Type 92 + Suppressor.",
            iconClass: "icon-eye",
            iconHtml: `<div class="eye-shape"><div class="eye-pupil"></div></div>`,
            requirements: { 
                weaponId: "TYPE92",
                requireAttachments: ["type92_suppressor"]
            },
            reqText: "REQ: SUPPRESSOR"
        },
        "AKIMBO_PISTOLS": {
            id: "AKIMBO_PISTOLS",
            name: "AKIMBO",
            type: "damage",
            color: "#ff3333",
            description: "Dual wield pistols.",
            downside: "Req: No Sights.",
            iconClass: "icon-bandolier", 
            iconHtml: `<div class="css-bullet-cartridge"></div><div class="css-bullet-cartridge"></div><div class="css-bullet-cartridge"></div>`,
            requirements: { 
                weaponId: "PISTOL",
                excludeAttachments: ["optic_reddot", "optic_holo"]
            },
            reqText: "REQ: NO SIGHTS"
        },

        // --- MOBILITY (Blue) ---
        "SHOTGUN_JUMP": {
            id: "SHOTGUN_JUMP",
            name: "GOONING",
            type: "mobility",
            color: "#33aaff",
            description: "DONT USE THIS IT SUCKS DICK",
            downside: "Req: Shotgun. -50% 12ga dmg.",
            iconClass: "icon-jump",
            iconHtml: `<div class="css-chevron"></div><div class="css-chevron"></div>`,
            requirements: { weaponId: "SHOTGUN" },
            reqText: "REQ: SHOTGUN"
        },
        "ROCKET_JUMP": {
            id: "ROCKET_JUMP",
            name: "TS SO NICHE",
            type: "mobility",
            color: "#33aaff",
            description: "The worst perk in the game.",
            downside: "Req: RPG-7. HEAT dmg capped at 20. FRAG lethal radius 2m.",
            iconClass: "icon-jump",
            iconHtml: `<div class="css-chevron"></div><div class="css-chevron"></div>`,
            requirements: { weaponId: "RPG7" },
            reqText: "REQ: RPG-7"
        },
        "SCOUT": {
            id: "SCOUT",
            name: "SCOUT",
            type: "mobility",
            color: "#33aaff",
            description: "1.35x Movement Speed.",
            downside: "Max HP reduced to 75.",
            iconClass: "icon-speed",
            iconHtml: `<div class="css-chevron"></div><div class="css-chevron"></div>`
        },
        "ADRENALINE": {
            id: "ADRENALINE",
            name: "BRICKED UP",
            type: "mobility",
            color: "#33aaff",
            description: "+15% Speed after taking damage.",
            downside: "None.",
            iconClass: "icon-speed",
            iconHtml: `<div class="css-chevron"></div><div class="css-chevron"></div>`
        },

        // --- UTILITY (Green) ---
        "QUICK_HEAL": {
            id: "QUICK_HEAL",
            name: "QUICK HEAL",
            type: "utility",
            color: "#44cc44",
            description: "Faster health regen start.",
            downside: "None.",
            iconClass: "icon-heal",
            iconHtml: `<div class="heal-cross"></div>`
        },
        "BANDOLIER": {
            id: "BANDOLIER",
            name: "BANDOLIER",
            type: "utility",
            color: "#44cc44",
            description: "Spawn with +30% Reserve Ammo.",
            downside: "-5% Movement Speed.",
            iconClass: "icon-bandolier",
            iconHtml: `<div class="css-bullet-cartridge"></div><div class="css-bullet-cartridge"></div><div class="css-bullet-cartridge"></div>`
        },
        "FLAK_JACKET": {
            id: "FLAK_JACKET",
            name: "FLAK JACKET",
            type: "utility",
            color: "#44cc44",
            description: "-40% Explosion Damage.",
            downside: "-7.5% Movement Speed.",
            iconClass: "icon-shield",
            iconHtml: `<svg viewBox="0 0 24 30" preserveAspectRatio="none"><path fill-rule="evenodd" d="M0 0 H24 V8 Q24 25 12 30 Q0 25 0 8 Z M4 3 H20 V8 Q20 21 12 26 Q4 21 4 8 Z" fill="white"/></svg>`
        },
        "PLATE_CARRIER": {
            id: "PLATE_CARRIER",
            name: "PLATE CARRIER",
            type: "utility",
            color: "#44cc44",
            description: "-20% All Damage Taken.",
            downside: "-15% Movement Speed.",
            iconClass: "icon-shield",
            iconHtml: `<svg viewBox="0 0 24 30" preserveAspectRatio="none"><path fill-rule="evenodd" d="M0 0 H24 V8 Q24 25 12 30 Q0 25 0 8 Z M4 3 H20 V8 Q20 21 12 26 Q4 21 4 8 Z" fill="white"/></svg>`
        },
        "STEALTH": {
            id: "STEALTH",
            name: "STEALTH",
            type: "utility",
            color: "#44cc44",
            description: "Nametag range reduced.",
            downside: "Max HP reduced by 25%.",
            iconClass: "icon-eye",
            iconHtml: `<div class="eye-shape"><div class="eye-pupil"></div></div>`
        },
        "QUICK_RELOAD": {
            id: "QUICK_RELOAD",
            name: "QUICK RELOAD",
            type: "utility",
            color: "#44cc44",
            description: "+30% Reload Speed.",
            downside: "-30% Reserve Ammo.",
            iconClass: "icon-recycle",
            iconHtml: `<div class="recycle-loop"><div class="arrow-tip tip-1"></div><div class="arrow-tip tip-2"></div></div>`
        }
    };

    console.log("Perks Loaded.");
})();
