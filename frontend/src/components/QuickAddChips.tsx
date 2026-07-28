import { QuickChip } from "../types/domain";
import { formatINR } from "../utils/currency";
import { FirstTimeHint } from "./FirstTimeHint";

export function QuickAddChips({ chips, onPick }: { chips: QuickChip[]; onPick: (chip: QuickChip) => void }) {
  if (chips.length === 0) return null;

  return (
    <div className="mb-4">
      <FirstTimeHint id="quick-chips">
        Tap a chip to instantly fill in that item's usual quantity and price — you can still change anything before saving.
      </FirstTimeHint>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Quick add</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.item_id}
            type="button"
            onClick={() => onPick(chip)}
            className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100 active:scale-95"
          >
            {chip.item_name} {formatINR(chip.last_unit_price, { decimals: false })}/{chip.unit}
          </button>
        ))}
      </div>
    </div>
  );
}
