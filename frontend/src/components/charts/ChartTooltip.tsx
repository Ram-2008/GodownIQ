import { TooltipProps } from "recharts";
import { formatINR } from "../../utils/currency";
import { formatDDMMYYYY } from "../../utils/date";

export function SpendTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value as number;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 text-xs text-gray-500">{formatDDMMYYYY(label as string)}</div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-0.5 w-3 bg-[#2a78d6]" />
        <span className="font-semibold text-gray-900">{formatINR(value)}</span>
      </div>
    </div>
  );
}

export function ItemSpendTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value as number;
  const name = payload[0].payload.item_name as string;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 text-xs text-gray-500">{name}</div>
      <div className="font-semibold text-gray-900">{formatINR(value)}</div>
    </div>
  );
}
