/**
 * KLARO UI KIT — "Violet Dock" primitives modelled on the Cloud Dock reference:
 * avatars + stacks, folder cards, document thumbnails, status chips, progress bar.
 */
import React from 'react';
import { Folder } from 'lucide-react';

const AVATAR_TONES = [
  'bg-[#7C5CFF] text-white',
  'bg-[#12A150] text-white',
  'bg-[#E58A00] text-white',
  'bg-[#0EA5E9] text-white',
  'bg-[#DB2777] text-white',
  'bg-[#17112B] text-white',
];

function toneFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function initialsOf(name?: string | null): string {
  if (!name) return 'K';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || 'K';
}

export function Avatar({
  name,
  size = 32,
  ring = 'ring-surface',
}: {
  name: string;
  size?: number;
  ring?: string;
}) {
  return (
    <span
      title={name}
      aria-label={name}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ${ring} ${toneFor(name)}`}
    >
      {initialsOf(name)}
    </span>
  );
}

export function AvatarStack({
  names,
  max = 3,
  size = 30,
  ring = 'ring-surface',
}: {
  names: string[];
  max?: number;
  size?: number;
  ring?: string;
}) {
  const unique = Array.from(new Set(names.filter(Boolean)));
  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((n, i) => (
        <span key={n} className={i === 0 ? '' : '-ms-2'}>
          <Avatar name={n} size={size} ring={ring} />
        </span>
      ))}
      {extra > 0 && (
        <span
          style={{ height: size, minWidth: size }}
          className="-ms-2 inline-flex items-center justify-center rounded-full bg-brand-soft px-1.5 text-xs font-bold text-brand ring-2 ring-surface"
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

/** Folder-shaped card (tab on top, two layered back sheets) — "Shared Folders" in the reference. */
export function FolderCard({
  title,
  meta,
  names,
  featured = false,
  icon,
  onClick,
}: {
  title: string;
  meta: string;
  names: string[];
  featured?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full text-start pt-4 focus-visible:rounded-[28px]"
    >
      {/* back sheets */}
      <span
        aria-hidden="true"
        className={`absolute top-0 start-0 h-10 w-[46%] rounded-t-[18px] ${
          featured ? 'bg-brand-glow/70' : 'bg-brand-soft'
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute top-2 start-4 h-10 w-[60%] rounded-t-[18px] ${
          featured ? 'bg-brand/60' : 'bg-canvas-2'
        }`}
      />
      <span
        className={`relative block min-h-[150px] rounded-[26px] p-5 transition-transform duration-200 group-hover:-translate-y-0.5 ${
          featured
            ? 'text-white shadow-[var(--shadow-hero)] bg-[linear-gradient(160deg,var(--color-night-3),var(--color-night))]'
            : 'bg-surface text-ink border border-line shadow-[var(--shadow-card)]'
        }`}
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            featured ? 'bg-white/10 text-brand-glow' : 'bg-brand-soft text-brand'
          }`}
        >
          {icon ?? <Folder className="h-5 w-5" />}
        </span>
        <span className="mt-4 block text-base font-bold leading-tight">{title}</span>
        <span className={`mt-1 block text-xs ${featured ? 'text-night-text' : 'text-muted'}`}>
          {meta}
        </span>
        <span className="mt-4 block">
          <AvatarStack
            names={names}
            ring={featured ? 'ring-night-3' : 'ring-surface'}
            size={28}
          />
        </span>
      </span>
    </button>
  );
}

/** Blurred mini-document preview used in "Recent edited" cards. */
export function DocThumb({ label, tone = 'brand' }: { label: string; tone?: 'brand' | 'green' | 'amber' }) {
  const badge =
    tone === 'green' ? 'bg-success' : tone === 'amber' ? 'bg-warning' : 'bg-brand';
  return (
    <span className="relative block h-[120px] overflow-hidden rounded-[18px] bg-canvas-2/70">
      <span className="absolute inset-x-5 top-5 bottom-0 rounded-t-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${badge}`}>
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span className="mt-3 block h-2.5 w-3/4 rounded-full bg-canvas-2" />
        <span className="mt-2 block h-2.5 w-1/2 rounded-full bg-canvas-2" />
      </span>
    </span>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'brand';
  children: React.ReactNode;
}) {
  const map = {
    success: 'bg-green-50 text-success',
    warning: 'bg-amber-50 text-[#9A5B00]',
    danger: 'bg-red-50 text-danger',
    neutral: 'bg-canvas-2 text-muted',
    brand: 'bg-brand-soft text-brand',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${map[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="block h-1.5 w-full overflow-hidden rounded-full bg-canvas-2"
    >
      <span
        className="block h-full rounded-full bg-gradient-to-r from-brand to-brand-glow transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}
