/**
 * KLARO BRAND MARK — GEOMETRIC NODE & LINE "K" LOGO (Violet Dock identity)
 * -----------------------------------------------------------------------------
 * `tone="light"` is for light surfaces; `tone="dark"` for the dark sidebar/hero.
 * The hub node uses the brand violet; the rest follows the surrounding ink.
 */

export function KlaroLogo({
  size = 32,
  showWordmark = true,
  wordmark = 'Klaro',
  tone = 'light',
}: {
  size?: number;
  showWordmark?: boolean;
  wordmark?: string;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  const stroke = dark ? '#FFFFFF' : '#17112B';
  const hub = dark ? '#A78BFA' : '#6D3DF2';
  return (
    <div className="inline-flex items-center gap-2.5 select-none shrink-0">
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Klaro"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="34"
          height="34"
          rx="10"
          fill={dark ? '#231A48' : '#FFFFFF'}
          stroke={dark ? '#2A2250' : '#E6E2F0'}
          strokeWidth="1.5"
        />
        <line x1="11" y1="9" x2="11" y2="27" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        <line x1="11" y1="18" x2="25" y2="9" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        <line x1="15.5" y1="15.2" x2="25" y2="27" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="11" cy="9" r="2.3" fill={stroke} />
        <circle cx="11" cy="27" r="2.3" fill={stroke} />
        <circle cx="25" cy="9" r="2.3" fill={stroke} />
        <circle cx="25" cy="27" r="2.3" fill={stroke} />
        <circle cx="11" cy="18" r="2.8" fill={hub} />
      </svg>
      {showWordmark && (
        <span
          className={`text-lg font-extrabold tracking-tight whitespace-nowrap shrink-0 ${
            dark ? 'text-white' : 'text-ink'
          }`}
        >
          {wordmark}
        </span>
      )}
    </div>
  );
}
