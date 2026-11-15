/**
 * KLARO UI LAYER — ENTERPRISE EMPTY STATE ILLUSTRATION COMPONENT
 * -----------------------------------------------------------------------------
 * Replaces plain empty messages with bespoke geometric Klaro vector scenes,
 * clear guidance, and an actionable Orange (#FF7A00) primary CTA.
 */

import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel?: string;
  onAction?: () => void;
  variant?: 'contacts' | 'products' | 'documents' | 'custom' | 'audit';
}

export function EmptyState({
  title,
  description,
  ctaLabel,
  onAction,
  variant = 'contacts',
}: EmptyStateProps) {
  return (
    <div className="py-14 px-6 text-center flex flex-col items-center justify-center space-y-4">
      {/* Custom Klaro Architectural Vector Illustration */}
      <svg
        width="104"
        height="84"
        viewBox="0 0 104 84"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="12"
          y="14"
          width="80"
          height="56"
          rx="10"
          fill="#F3F5F7"
          stroke="#CBD5E1"
          strokeWidth="1.5"
        />
        <rect
          x="24"
          y="26"
          width="56"
          height="10"
          rx="4"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />
        <rect
          x="24"
          y="42"
          width="36"
          height="8"
          rx="3"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.2"
        />
        <circle cx="76" cy="54" r="14" fill="#FFFFFF" stroke="#1A2B4A" strokeWidth="1.8" />
        {variant === 'audit' ? (
          <path
            d="M76 47V54L80 57"
            stroke="#FF7A00"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M76 48V60M70 54H82"
            stroke="#FF7A00"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        )}
        <circle cx="20" cy="14" r="3" fill="#1A2B4A" />
        <circle cx="84" cy="14" r="3" fill="#2ECC71" />
      </svg>

      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-bold text-[#1A2B4A]">{title}</p>
        <p className="text-xs text-[#1A2B4A]/65 leading-relaxed">{description}</p>
      </div>

      {ctaLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] text-white text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{ctaLabel}</span>
        </button>
      )}
    </div>
  );
}
