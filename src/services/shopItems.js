// shopItems.js
export const SHOP_ITEMS = [
  // ===== Characters =====
  {
    id: "cat_character",
    type: "character",
    name: "Sleepy Cat",
    cost: 500,
    rarity: "common",
    preview: "🐱",
    description: "Judges you silently while you study",
  },
  {
    id: "frog_character",
    type: "character",
    name: "Focus Frog",
    cost: 800,
    rarity: "rare",
    preview: "🐸",
    description: "Ribbit. Back to work.",
  },

  // ===== Themes =====
  {
    id: "midnight_theme",
    type: "theme",
    name: "Midnight Mode",
    cost: 300,
    rarity: "common",
    preview: "🌙",
    description: "Dark, calm, elite",
    // This is the key: global CSS vars.
    themeVars: {
      "--bg-color": "#0b1220",
      "--text-color": "#e5e7eb",
      "--btn-blue-bg": "#2563eb",
      "--border": "#1f2937",
    },
  },
  {
    id: "aurora_theme",
    type: "theme",
    name: "Aurora Glow",
    cost: 1200,
    rarity: "epic",
    preview: "🌌",
    description: "Soft neon gradient energy",
    themeVars: {
      "--bg-color": "#070A15",
      "--text-color": "#E6E8FF",
      "--btn-blue-bg": "#7C3AED",
      "--border": "#242A56",
    },
  },
  {
    id: "solar_theme",
    type: "theme",
    name: "Solar Flare",
    cost: 2500,
    rarity: "legendary",
    preview: "☀️",
    description: "Bright. Loud. Winner vibes.",
    themeVars: {
      "--bg-color": "#07080C",
      "--text-color": "#FFF7ED",
      "--btn-blue-bg": "#F97316",
      "--border": "#3B2A1B",
    },
  },
];
