/**
 * KLARO BRAND MARK — GEOMETRIC NODE & LINE "K" LOGO
 * -----------------------------------------------------------------------------
 * Represents connectivity and operational flow using clean structural lines
 * in Navy (#1A2B4A) and a single high-intent Orange (#FF7A00) focal node.
 */

export function KlaroLogo({
  size = 32,
  showWordmark = true,
  wordmark = 'Klaro',
}: {
  size?: number;
  showWordmark?: boolean;
  wordmark?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none shrink-0">
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Klaro Logo"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="34"
          height="34"
          rx="8"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
        {/* Vertical Spine */}
        <line x1="11" y1="9" x2="11" y2="27" stroke="#1A2B4A" strokeWidth="2.4" strokeLinecap="round" />
        {/* Upper Diagonal Arm */}
        <line x1="11" y1="18" x2="25" y2="9" stroke="#1A2B4A" strokeWidth="2.4" strokeLinecap="round" />
        {/* Lower Diagonal Arm */}
        <line x1="15.5" y1="15.2" x2="25" y2="27" stroke="#1A2B4A" strokeWidth="2.4" strokeLinecap="round" />

        {/* Structural Nodes */}
        <circle cx="11" cy="9" r="2.3" fill="#1A2B4A" />
        <circle cx="11" cy="27" r="2.3" fill="#1A2B4A" />
        <circle cx="25" cy="9" r="2.3" fill="#1A2B4A" />
        <circle cx="25" cy="27" r="2.3" fill="#1A2B4A" />
        {/* Operational Core Hub Node */}
        <circle cx="11" cy="18" r="2.8" fill="#FF7A00" />
      </svg>
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-[#1A2B4A] whitespace-nowrap shrink-0">
          {wordmark}
        </span>
      )}
    </div>
  );
}
