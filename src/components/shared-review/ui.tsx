import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle, ArrowLeft, Info, WifiOff } from 'lucide-react';
import type { GamePack } from '@/types';
import { readableTextOn } from '@/lib/theme';
import { PATH_COLORS } from './common';

export function ReviewShell({ onBack, backLabel = 'Back to games', wide, children }: {
  onBack: () => void;
  backLabel?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="sr-shell paper-dots min-h-[100svh] pb-16 text-ink">
      <div className={`mx-auto px-4 pt-4 md:px-8 md:pt-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="btn-3d btn-white inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            {backLabel}
          </button>
          <span className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-xs font-extrabold uppercase tracking-wider">
            Shared review
          </span>
        </div>
        {children}
      </div>
    </section>
  );
}

export function Notice({ tone = 'info', children, action }: { tone?: 'info' | 'warn' | 'error' | 'offline'; children: ReactNode; action?: ReactNode }) {
  const styles = {
    info: 'bg-sky-soft',
    warn: 'bg-sun-soft',
    error: 'bg-coral-soft',
    offline: 'bg-coral-soft',
  }[tone];
  const Icon = tone === 'offline' ? WifiOff : tone === 'info' ? Info : AlertTriangle;
  return (
    <div role={tone === 'error' || tone === 'offline' ? 'alert' : 'status'} className={`flex flex-wrap items-start gap-3 rounded-2xl border-2 border-ink p-3.5 text-sm font-bold ${styles}`}>
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-snug">{children}</div>
      {action}
    </div>
  );
}

export function PackBadge({ pack, size = 'md' }: { pack: GamePack; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9 text-lg' : 'h-12 w-12 text-2xl';
  return (
    <span
      aria-hidden="true"
      className={`flex flex-shrink-0 items-center justify-center rounded-2xl border-2 border-ink ${box}`}
      style={{ backgroundColor: pack.library.color, boxShadow: '2px 2px 0 0 #2E2459' }}
    >
      {pack.mascotEmoji ? <span className="leading-none">{pack.mascotEmoji}</span> : <span className="font-display text-ink">{pack.title.charAt(0)}</span>}
    </span>
  );
}

export function PathPill({ pathId, className = '' }: { pathId?: string; className?: string }) {
  if (!pathId) return null;
  const fill = PATH_COLORS[pathId] ?? '#FFB020';
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold ${className}`}
      style={{ backgroundColor: fill, color: readableTextOn(fill) }}
    >
      Path {pathId}
    </span>
  );
}

/** QR generated on-device: the invite token never goes to a third party. */
export function QrImage({ value, label, className }: { value: string; label: string; className?: string }) {
  const [state, setState] = useState<{ value: string; src?: string; failed?: boolean }>({ value });
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 4, width: 720, errorCorrectionLevel: 'M', color: { dark: '#2E2459', light: '#FFFDF7' } })
      .then(src => { if (!cancelled) setState({ value, src }); })
      .catch(() => { if (!cancelled) setState({ value, failed: true }); });
    return () => { cancelled = true; };
  }, [value]);
  const current = state.value === value ? state : { value };
  if (current.failed) return <div className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-ink/40 p-4 text-center text-sm font-bold ${className}`}>QR code unavailable. Copy the link instead.</div>;
  if (!current.src) return <div className={`animate-pulse rounded-2xl bg-ink/10 ${className}`} aria-label="Preparing QR code" />;
  return <img src={current.src} alt={label} className={`rounded-2xl ${className}`} draggable={false} />;
}
