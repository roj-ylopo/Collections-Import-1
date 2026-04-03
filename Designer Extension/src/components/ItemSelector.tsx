import React, { useState, useEffect } from "react";

interface ItemSelectorProps {
  items: unknown[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
}

function getTitle(item: unknown): string {
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if (typeof obj.title === "string" && obj.title) return obj.title;
    // fallback: first string value
    for (const v of Object.values(obj)) {
      if (typeof v === "string" && v) return v;
    }
  }
  return "(untitled)";
}

const ItemSelector: React.FC<ItemSelectorProps> = ({ items, selectedIds, onChange }) => {
  const [firstN, setFirstN] = useState<string>("");

  const allSelected = selectedIds.size === items.length;

  const toggleAll = () => {
    if (allSelected) {
      onChange(new Set());
    } else {
      onChange(new Set(items.map((_, i) => i)));
    }
    setFirstN("");
  };

  const toggleItem = (idx: number) => {
    const next = new Set(selectedIds);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    onChange(next);
    setFirstN("");
  };

  const handleFirstN = (val: string) => {
    setFirstN(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) {
      const clamped = Math.min(n, items.length);
      onChange(new Set(items.slice(0, clamped).map((_, i) => i)));
    } else if (val === "" || n === 0) {
      onChange(new Set());
    }
  };

  return (
    <div className="item-selector">
      <div className="item-selector-toolbar">
        <div className="item-selector-toolbar-left">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            title={allSelected ? "Deselect all" : "Select all"}
            style={{ width: 15, height: 15, accentColor: "var(--brand-color)", cursor: "pointer" }}
          />
          <span className="item-selector-count-label">
            <strong>{selectedIds.size}</strong> of {items.length} selected
          </span>
        </div>
        <div className="item-selector-first-n">
          <span>First</span>
          <input
            type="number"
            className="input-sm"
            min={1}
            max={items.length}
            value={firstN}
            placeholder="N"
            onChange={(e) => handleFirstN(e.target.value)}
          />
          <span>items</span>
        </div>
      </div>
      <div className="item-selector-scroll">
        {items.map((item, i) => {
          const checked = selectedIds.has(i);
          return (
            <div
              key={i}
              className={`item-selector-row${checked ? " selected" : ""}`}
              onClick={() => toggleItem(i)}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleItem(i)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="item-selector-title">{getTitle(item)}</span>
              <span className="item-selector-index">#{i + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ItemSelector;
