import { ReactNode, useState } from "react";

const STORAGE_PREFIX = "godowniq_hint_dismissed_";

/** A one-line explainer shown the first time a feature is visible, dismissed permanently (per browser) once closed. */
export function FirstTimeHint({ id, children }: { id: string; children: ReactNode }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_PREFIX + id) === "true");

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_PREFIX + id, "true");
    setDismissed(true);
  }

  return (
    <div className="mb-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
      <span className="flex-1">{children}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss this tip"
        className="flex-shrink-0 rounded p-0.5 leading-none text-blue-500 hover:bg-blue-100"
      >
        ✕
      </button>
    </div>
  );
}
