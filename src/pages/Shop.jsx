import { useState } from "react";
import { SHOP_ITEMS } from "../services/shopItems";
import "../styles/shop.css";

export default function Shop({
  initialPoints = 0,
  initialUnlockedItems = [],
}) {
  const [points, setPoints] = useState(initialPoints);
  const [unlockedItems, setUnlockedItems] = useState(initialUnlockedItems);
  const [activeCharacter, setActiveCharacter] = useState(null);
  const [activeTheme, setActiveTheme] = useState(null);

  function handlePurchase(item) {
    if (!item) return;
    if (unlockedItems.includes(item.id)) return;
    if (points < item.cost) return;

    setPoints(p => p - item.cost);
    setUnlockedItems(items => [...items, item.id]);

    if (item.type === "character") setActiveCharacter(item.id);
    if (item.type === "theme") setActiveTheme(item.id);
  }

  return (
    <div className="shop-page">
      <header className="shop-header">
        <h1>Shop</h1>
        <span className="points">⭐ {points}</span>
      </header>

      <div className="shop-grid">
        {SHOP_ITEMS.map(item => {
          const unlocked = unlockedItems.includes(item.id);
          const affordable = points >= item.cost;

          return (
            <div
              key={item.id}
              className={`shop-card ${unlocked ? "unlocked" : ""}`}
            >
              <div className="preview">{item.preview}</div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>

              <button
                disabled={unlocked || !affordable}
                onClick={() => handlePurchase(item)}
              >
                {unlocked
                  ? "Unlocked"
                  : affordable
                  ? `Unlock • ${item.cost}`
                  : `Need ${item.cost - points} more`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
