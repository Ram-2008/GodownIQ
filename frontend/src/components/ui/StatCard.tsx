import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: string;
  tone?: "default" | "warning" | "critical";
  onClick?: () => void;
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "border-gray-200",
  warning: "border-amber-300 bg-amber-50",
  critical: "border-red-300 bg-red-50",
};

export function StatCard({ label, value, tone = "default", onClick }: StatCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={clsx(
        "flex flex-col gap-1 rounded-xl border bg-white p-4 text-left shadow-sm",
        toneClasses[tone],
        onClick && "cursor-pointer hover:shadow-md"
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-2xl font-semibold text-gray-900">{value}</span>
    </Comp>
  );
}
