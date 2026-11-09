import { cx } from '@/utils/misc';

/**
 * Identificador tipográfico (no usa logos oficiales ni imágenes externas).
 * Reemplazable por recursos gráficos corporativos autorizados cuando existan.
 */
export function Wordmark({ tone = 'light', size = 'md', className }: { tone?: 'light' | 'dark'; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      className={cx('wordmark inline-flex items-center gap-2 text-brand', size === 'sm' && 'text-sm', size === 'md' && 'text-base', size === 'lg' && 'text-2xl', className)}
      aria-label="Escondida BHP"
    >
      <span>ESCONDIDA</span>
      <span className={cx('h-[1em] w-px', tone === 'light' ? 'bg-white/40' : 'bg-ink/30')} aria-hidden />
      <span>BHP</span>
    </span>
  );
}

export function FlpMark({ className }: { className?: string }) {
  return (
    <span className={cx('grid size-9 place-items-center rounded-xl bg-brand text-white', className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="size-5" fill="currentColor">
        <path d="M4 25 L12.5 8 L17.5 17 L21 12 L28 25 Z" />
      </svg>
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning ring-1 ring-warning/30', className)}>
      Modo demo
    </span>
  );
}
