import { useEffect, useRef, useState } from "react";

type LookupCategory = "CITY" | "COUNTRY" | "FACULTY" | "EXPERT_AREA" | "COMPANY_DOMAIN";

const norm = (s: string) => s.trim().replace(/\s+/g, " ");

// aici folosim exact wrapper-ele tale din Profile.tsx
// dacă le ții în Profile.tsx, mută-le într-un fișier comun (ex: src/utils/lookups.ts)
import { suggestLookup, upsertLookup } from "../api/lookups";

const suggest = (category: LookupCategory, q: string) => suggestLookup(category as any, q);
const upsert = (category: LookupCategory, value: string) => upsertLookup(category as any, value);

type SinglePickerProps = {
  label: string;
  category: LookupCategory;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SinglePicker({
  label,
  category,
  value,
  onChange,
  placeholder
}: SinglePickerProps) {
  const [input, setInput] = useState(value || "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // ține input sincron cu value când se încarcă profilul
  useEffect(() => {
    setInput(value || "");
  }, [value]);

  useEffect(() => {
    const q = input.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        const list = await suggest(category, q);
        setSuggestions(list.slice(0, 10));
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => window.clearTimeout(t);
  }, [input, category]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const commit = async (raw: string) => {
    const v = norm(raw);
    if (!v) return;

    onChange(v);

    try {
      await upsert(category, v);
    } catch {}

    setOpen(false);
  };

  return (
    <div className="tagpicker" ref={boxRef}>
      <label>{label}</label>

      <div className="tagpicker-inputwrap">
        <input
          value={input}
          placeholder={placeholder}
          onChange={(e) => {
            setInput(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => input.trim() && setOpen(true)}
          onBlur={() => commit(input)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(input);
            }
            if (e.key === "Escape") setOpen(false);
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
                  setInput(s);
                  commit(s);
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      <small className="hint">Enter pentru a adăuga dacă nu există.</small>
    </div>
  );
}
