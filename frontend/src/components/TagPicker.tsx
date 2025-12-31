import { useEffect, useRef, useState } from "react";
import { suggestLookup, upsertLookup } from "../api/lookups";
import type { LookupCategory } from "../api/lookups";

type Props = {
  label: string;
  category: LookupCategory;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export default function TagPicker({
  label,
  category,
  values,
  onChange,
  placeholder
}: Props) {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await suggestLookup(category, q).catch(() => []);
      if (!alive) return;
      // nu arătăm ce e deja selectat
      const filtered = s.filter(x => !values.includes(x));
      setSuggestions(filtered);
    })();
    return () => {
      alive = false;
    };
  }, [category, q, values]);

  const addValue = async (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (values.includes(v)) return;

    // upsert în lookup, ca să apară și altora
    await upsertLookup(category, v).catch(() => {});
    onChange([...values, v]);
    setQ("");
    setSuggestions([]);
  };

  const removeValue = (v: string) => {
    onChange(values.filter(x => x !== v));
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue(q);
    }
    if (e.key === "Backspace" && !q && values.length > 0) {
      removeValue(values[values.length - 1]);
    }
  };

  return (
    <label style={{ position: "relative" }}>
      {label}

      <div
        ref={boxRef}
        style={{
          background: "#0c3b31",
          borderRadius: 12,
          padding: "10px 12px",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          minHeight: 48,
          alignItems: "center"
        }}
      >
        {values.map(v => (
          <span
            key={v}
            style={{
              background: "#062e25",
              border: "1px solid #164e41",
              borderRadius: 999,
              padding: "6px 10px",
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
              color: "white",
              fontSize: 14
            }}
          >
            {v}
            <button
              type="button"
              onClick={() => removeValue(v)}
              style={{
                background: "transparent",
                border: "none",
                color: "#8ebeb0",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1
              }}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || "Type and press Enter"}
          style={{
            flex: 1,
            minWidth: 180,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "white",
            fontSize: 15
          }}
        />
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.slice(0, 10).map(s => (
            <div
              key={s}
              className="suggestion"
              onMouseDown={() => addValue(s)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </label>
  );
}
