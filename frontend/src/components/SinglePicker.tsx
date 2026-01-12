import { useEffect, useRef, useState } from "react";
import { suggestLookup, upsertLookup } from "../api/lookups";
import type { LookupCategory } from "../api/lookups";

type Props = {
  label: string;
  category: LookupCategory;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

const norm = (s: string) => s.trim().replace(/\s+/g, " ");

export function SinglePicker({ label, category, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // valoarea "selectată" înainte de editare (ca să nu se schimbe în timp ce tastezi)
  const selectedAtFocusRef = useRef<string>("");

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!focused) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const q = norm(query);

    if (!q) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    // IMPORTANT: comparăm cu valoarea existentă la momentul focus-ului, nu cu value live
    const selected = (selectedAtFocusRef.current || "").toLowerCase();
    if (selected && q.toLowerCase() === selected) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        const items: string[] = await suggestLookup(category, q);

        // scoate valoarea selectată inițial (nu "value" live, care se schimbă pe măsură ce tastezi)
        const filtered = items.filter((s) => s.toLowerCase() !== selected);

        setSuggestions(filtered.slice(0, 10));
        setOpen(filtered.length > 0);
      } catch (e) {
        console.error("Lookup suggest failed:", category, q, e);
        setSuggestions([]);
        setOpen(false);
      }
    }, 200);

    return () => window.clearTimeout(t);
  }, [query, focused, category]);

  const commit = async (raw: string) => {
    const v = norm(raw);
    if (!v) return;

    onChange(v);

    try {
      await upsertLookup(category, v);
    } catch (e) {
      console.error("Lookup upsert failed:", category, v, e);
    }

    // după commit, asta devine valoarea "selectată"
    selectedAtFocusRef.current = v;

    setQuery(v);
    setSuggestions([]);
    setOpen(false);

    window.setTimeout(() => inputRef.current?.select(), 0);
  };

  const displayValue = focused ? query : value || "";

  return (
    <div className="tagpicker" ref={boxRef}>
      <label>{label}</label>

      <div className="tagpicker-inputwrap">
        <input
          ref={inputRef}
          value={displayValue}
          placeholder={placeholder || "Search or add..."}
          onFocus={() => {
            setFocused(true);
            selectedAtFocusRef.current = value || "";
            setQuery(value || "");
            setOpen(false);
          }}
          onBlur={() => {
            setFocused(false);
            setQuery("");
            setOpen(false);
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next); // permite Save fără Enter
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(query);
            }
            if (e.key === "Escape") {
              setOpen(false);
              setQuery(value || "");
            }
          }}
        />

        {open && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((s) => (
              <div
                key={s}
                className="suggestion"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(s);
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      <small className="hint">Press Enter to add if it is not in the list.</small>
    </div>
  );
}
