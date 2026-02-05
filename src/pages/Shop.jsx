import { useEffect, useMemo, useState } from "react";
import { SHOP_ITEMS } from "../services/shopItems";
import "../styles/shop.css";

const RARITY_ORDER = ["common", "rare", "epic", "legendary"];

function applyThemeVars(themeVars) {
  if (!themeVars) return;
  const root = document.documentElement;

  // smooth-ish transition
  root.classList.add("theme-transition");
  for (const [k, v] of Object.entries(themeVars)) root.style.setProperty(k, v);

  window.setTimeout(() => root.classList.remove("theme-transition"), 220);
}

export default function Shop({ initialPoints = 0, initialUnlockedItems = [] }) {
  const [points, setPoints] = useState(initialPoints);
  const [unlockedItems, setUnlockedItems] = useState(initialUnlockedItems);

  const [activeCharacter, setActiveCharacter] = useState(
    () => localStorage.getItem("activeCharacter") || null
  );
  const [activeTheme, setActiveTheme] = useState(
    () => localStorage.getItem("activeTheme") || null
  );

  // tiny UI feedback
  const [popId, setPopId] = useState(null);

  const characters = useMemo(() => {
    return SHOP_ITEMS
      .filter((i) => i.type === "character")
      .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  }, []);

  const themes = useMemo(() => {
    return SHOP_ITEMS
      .filter((i) => i.type === "theme")
      .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  }, []);

  const percentUnlocked = Math.round((unlockedItems.length / SHOP_ITEMS.length) * 100);

  // Apply theme on mount / when changed
  useEffect(() => {
    if (!activeTheme) return;
    const themeItem = SHOP_ITEMS.find((i) => i.id === activeTheme);
    if (themeItem?.themeVars) applyThemeVars(themeItem.themeVars);
  }, [activeTheme]);

  function pulseCard(itemId) {
    setPopId(itemId);
    window.setTimeout(() => setPopId(null), 220);
  }

  function handlePurchase(item) {
    if (!item) return;
    if (unlockedItems.includes(item.id)) return;
    if (points < item.cost) return;

    setPoints((p) => p - item.cost);
    setUnlockedItems((items) => [...items, item.id]);
    pulseCard(item.id);

    // auto-equip
    if (item.type === "character") {
      setActiveCharacter(item.id);
      localStorage.setItem("activeCharacter", item.id);
    }
    if (item.type === "theme") {
      setActiveTheme(item.id);
      localStorage.setItem("activeTheme", item.id);
      if (item.themeVars) applyThemeVars(item.themeVars);
    }
  }

  function handleEquip(item) {
    if (!unlockedItems.includes(item.id)) return;
    pulseCard(item.id);

    if (item.type === "character") {
      setActiveCharacter(item.id);
      localStorage.setItem("activeCharacter", item.id);
    }

    if (item.type === "theme") {
      setActiveTheme(item.id);
      localStorage.setItem("activeTheme", item.id);
      if (item.themeVars) applyThemeVars(item.themeVars);
    }
  }

  function renderCard(item) {
    const unlocked = unlockedItems.includes(item.id);
    const affordable = points >= item.cost;

    const equipped =
      (item.type === "character" && activeCharacter === item.id) ||
      (item.type === "theme" && activeTheme === item.id);

    return (
      <div
        key={item.id}
        className={[
          "shop-card",
          unlocked ? "unlocked" : "locked",
          equipped ? "equipped" : "",
          item.rarity ? `rarity-${item.rarity}` : "",
          popId === item.id ? "pop" : "",
        ].join(" ")}
      >
        <div className="sparkle" aria-hidden="true" />
        <div className="top-row">
          <div className="preview">{item.preview}</div>
          <div className={`rarity-badge rarity-${item.rarity || "common"}`}>
            {(item.rarity || "common").toUpperCase()}
          </div>
        </div>

        <h3>{item.name}</h3>
        <p>{item.description}</p>

        {!unlocked ? (
          <button
            className="shop-btn shop-btn-primary"
            disabled={!affordable}
            onClick={() => handlePurchase(item)}
          >
            {affordable ? `Unlock • ${item.cost}` : `Need ${item.cost - points} more`}
          </button>
        ) : equipped ? (
          <div className="equipped-label">Equipped ✓</div>
        ) : (
          <button className="shop-btn shop-btn-ghost" onClick={() => handleEquip(item)}>
            Equip
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="shop-page">
      <header className="shop-header">
        <div>
          <h1>Shop</h1>
          <p className="shop-sub">Unlock characters & themes. Equip what you earn.</p>
        </div>
        <div className="points-pill">⭐ {points}</div>
      </header>

      <div className="shop-progress">
        <div className="shop-progress-bar">
          <div className="shop-progress-fill" style={{ width: `${percentUnlocked}%` }} />
        </div>
        <span>{percentUnlocked}% unlocked</span>
      </div>

      <section className="shop-section">
        <h2>Characters</h2>
        <div className="shop-grid">{characters.map(renderCard)}</div>
      </section>

      <section className="shop-section">
        <h2>Themes</h2>
        <div className="shop-grid">{themes.map(renderCard)}</div>
      </section>
    </div>
  );
}
