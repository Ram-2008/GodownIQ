import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK } from "./theme";
import { SpendTooltip } from "./ChartTooltip";
import { formatIndianNumber } from "../../utils/currency";

interface DailySpendPoint {
  date: string;
  total: number;
}

const SERIES_COLOR = "#2a78d6";

function dayTick(dateStr: string): string {
  return dateStr.slice(8, 10);
}

export function DailySpendChart({ data }: { data: DailySpendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dailySpendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.1} />
              <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
          <XAxis
            dataKey="date"
            tickFormatter={dayTick}
            tick={{ fill: CHART_INK.muted, fontSize: 12 }}
            axisLine={{ stroke: CHART_INK.baseline }}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            tick={{ fill: CHART_INK.muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => formatIndianNumber(v)}
          />
          <Tooltip content={<SpendTooltip />} cursor={{ stroke: CHART_INK.baseline, strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke={SERIES_COLOR}
            strokeWidth={2}
            fill="url(#dailySpendFill)"
            dot={false}
            activeDot={{ r: 4, stroke: CHART_INK.surface, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
