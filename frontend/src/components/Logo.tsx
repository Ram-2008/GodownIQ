import { useId } from "react";

export function Logo({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const bgId = `logo-bg-${uid}`;
  const roofId = `logo-roof-${uid}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 512 512" className="h-7 w-7 flex-shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16264A" />
            <stop offset="100%" stopColor="#22385F" />
          </linearGradient>
          <linearGradient id={roofId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F2A93B" />
            <stop offset="100%" stopColor="#E0901F" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="512" height="512" rx="104" fill={`url(#${bgId})`} />
        <rect x="146" y="266" width="220" height="140" rx="10" fill="#F4F1EA" />
        <polygon points="256,150 384,266 128,266" fill={`url(#${roofId})`} />
        <polygon points="256,150 384,266 366,266 256,172" fill="#FFFFFF" opacity="0.15" />
        <rect x="234" y="322" width="44" height="84" rx="4" fill="#22385F" />
        <rect x="166" y="292" width="36" height="10" rx="3" fill="#22385F" opacity="0.4" />
        <rect x="310" y="292" width="36" height="10" rx="3" fill="#22385F" opacity="0.4" />
        <circle cx="374" cy="176" r="15" fill="#F2A93B" />
        <circle cx="374" cy="176" r="27" fill="none" stroke="#F2A93B" strokeWidth="4" opacity="0.55" />
        <circle cx="374" cy="176" r="39" fill="none" stroke="#F2A93B" strokeWidth="3" opacity="0.3" />
      </svg>
      <span className="font-bold text-brand-700">GodownIQ</span>
    </div>
  );
}
