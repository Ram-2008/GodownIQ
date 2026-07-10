import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK } from "./theme";
import { ItemSpendTooltip } from "./ChartTooltip";
import { formatINR, formatIndianNumber } from "../../utils/currency";

interface TopItem {
  item_id: string;
  item_name: string;
  total: number;
}

const SERIES_COLOR = "#2a78d6";

export function TopItemsBarChart({ data, onSelect }: { data: TopItem[]; onSelect?: (itemId: string) => void }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
          <XAxis
            dataKey="item_name"
            tick={{ fill: CHART_INK.muted, fontSize: 12 }}
            axisLine={{ stroke: CHART_INK.baseline }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_INK.muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => formatIndianNumber(v)}
          />
          <Tooltip content={<ItemSpendTooltip />} cursor={{ fill: CHART_INK.gridline, opacity: 0.4 }} />
          <Bar
            dataKey="total"
            fill={SERIES_COLOR}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            onClick={(data: any) => onSelect?.(data.item_id)}
            cursor={onSelect ? "pointer" : undefined}
          >
            <LabelList
              dataKey="total"
              position="top"
              formatter={(v: number) => formatINR(v, { decimals: false })}
              style={{ fill: CHART_INK.secondary, fontSize: 11 }}
            />
            {data.map((d) => (
              <Cell key={d.item_id} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
