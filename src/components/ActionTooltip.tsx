/**
 * KLARO UI COMPONENT — LIGHTWEIGHT TAILWIND TOOLTIP
 * -----------------------------------------------------------------------------
 * Accessible, zero-dependency hover/focus tooltip used on collapsed Sidebar
 * icons and high-density table/header action buttons.
 */

import React from 'react';

interface ActionTooltipProps {
  label: string;
  side?: 'top' | 'bottom' | 'end';
  disabled?: boolean;
  children: React.ReactNode;
}

export function ActionTooltip({
  label,
  side = 'top',
  disabled = false,
  children,
}: ActionTooltipProps) {
  if (disabled || !label) {
    return <>{children}</>;
  }

  const positionClasses =
    side === 'end'
      ? 'start-full top-1/2 -translate-y-1/2 ms-2.5'
      : side === 'bottom'
      ? 'top-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mt-2'
      : 'bottom-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mb-2';

  return (
    <span className="relative inline-flex group/tooltip">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 px-2.5 py-1.5 rounded-lg bg-night text-white text-xs font-semibold whitespace-nowrap shadow-[var(--shadow-lift)] opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100 transition-all duration-150 ${positionClasses}`}
      >
        {label}
      </span>
    </span>
  );
}
