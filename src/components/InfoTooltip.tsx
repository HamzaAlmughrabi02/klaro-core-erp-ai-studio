/**
 * KLARO UI LAYER — ACCESSIBLE TECHNICAL TERM TOOLTIP
 * -----------------------------------------------------------------------------
 * Renders a crisp `?` HelpCircle icon next to technical concepts (Schema Builder,
 * RBAC, System Blueprint, Live Payload Preview) with hover + keyboard-focus tooltip.
 */

import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span className="relative group inline-flex items-center">
      <button
        type="button"
        aria-label={text}
        className="p-1 rounded-full text-[#1A2B4A]/50 hover:text-[#1A2B4A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus:text-[#1A2B4A] transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute top-full start-0 mt-2 w-72 p-3 rounded-lg bg-[#1A2B4A] text-white text-xs font-normal leading-relaxed z-40 border border-[#1A2B4A]"
      >
        {text}
      </span>
    </span>
  );
}
