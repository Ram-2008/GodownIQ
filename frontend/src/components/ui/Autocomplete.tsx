import { useMemo, useRef, useState } from "react";
import clsx from "clsx";

export interface AutocompleteOption {
  id: string;
  name: string;
  subtitle?: string;
}

interface AutocompleteProps {
  label: string;
  options: AutocompleteOption[];
  value: string;
  onChange: (text: string) => void;
  onSelectExisting: (option: AutocompleteOption) => void;
  placeholder?: string;
  required?: boolean;
}

export function Autocomplete({ label, options, value, onChange, onSelectExisting, placeholder, required }: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [options, value]);

  const exactMatch = options.find((o) => o.name.toLowerCase() === value.trim().toLowerCase());

  function handleBlur() {
    // Delay so a click on a suggestion registers before the list closes.
    setTimeout(() => setOpen(false), 150);
  }

  return (
    <div className="relative flex flex-col gap-1" ref={containerRef}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        className="rounded-lg border border-gray-300 px-3 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        value={value}
        placeholder={placeholder}
        required={required}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onChange={(e) => onChange(e.target.value)}
      />
      {open && value.trim().length > 0 && (
        <div className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onMouseDown={() => {
                onSelectExisting(option);
                setOpen(false);
              }}
            >
              {option.name}
              {option.subtitle && <span className="ml-2 text-xs text-gray-400">{option.subtitle}</span>}
            </button>
          ))}
          {!exactMatch && (
            <div className={clsx("px-3 py-2 text-sm text-brand-700", filtered.length > 0 && "border-t border-gray-100")}>
              + Add "{value.trim()}" as new
            </div>
          )}
        </div>
      )}
    </div>
  );
}
