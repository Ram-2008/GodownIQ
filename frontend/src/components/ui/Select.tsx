import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, className, id, children, ...rest }, ref) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <select
      ref={ref}
      id={id}
      className={`rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </select>
  </div>
));
Select.displayName = "Select";
