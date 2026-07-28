export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-6 w-6 flex-shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#2a6857" />
        <path d="M16 6.5L27 14H5L16 6.5Z" fill="#ffffff" />
        <rect x="7" y="14" width="18" height="12" fill="#ffffff" />
        <rect x="14" y="19" width="4" height="7" fill="#2a6857" />
      </svg>
      <span className="font-bold text-brand-700">GodownIQ</span>
    </div>
  );
}
