import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK } from "./theme";
import { formatINR } from "../../utils/currency";
import { formatDDMMYYYY } from "../../utils/date";

interface PricePoint {
  date: string;
  unit_price: number;
}

function PriceTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 text-xs text-gray-500">{formatDDMMYYYY(label!)}</div>
      <div className="font-semibold text-gray-900">{formatINR(payload[0].value)}</div>
    </div>
  );
}

export function PriceTrendChart({ data }: { data: PricePoint[] }) {
  if (data.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-400">No purchases in the last 90 days.</div>;
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
          <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fill: CHART_INK.muted, fontSize: 11 }} axisLine={{ stroke: CHART_INK.baseline }} tickLine={false} minTickGap={24} />
          <YAxis tick={{ fill: CHART_INK.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={44} domain={["auto", "auto"]} />
          <Tooltip content={<PriceTooltip />} cursor={{ stroke: CHART_INK.baseline, strokeWidth: 1 }} />
          <Line type="monotone" dataKey="unit_price" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3, stroke: CHART_INK.surface, strokeWidth: 1, fill: "#2a78d6" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
