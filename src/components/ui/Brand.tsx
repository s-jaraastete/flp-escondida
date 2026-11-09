import { cx } from '@/utils/misc';

const LOGO_HEIGHT = { sm: 'h-4', md: 'h-5', lg: 'h-8' } as const;

/**
 * Logo "35 años Escondida | BHP" (archivo entregado por el cliente en public/).
 * tone="color" = naranja corporativo (fondos blancos o negros); tone="white" = sobre la banda naranja.
 */
export function Wordmark({ tone = 'color', size = 'md', className }: { tone?: 'color' | 'white'; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const file = tone === 'white' ? 'escondida-bhp-white.png' : 'escondida-bhp.png';
  return <img src={`${import.meta.env.BASE_URL}${file}`} alt="Escondida | BHP" className={cx('inline-block w-auto select-none', LOGO_HEIGHT[size], className)} draggable={false} />;
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
    <span className={cx('inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-warning ring-1 ring-warning/30', className)}>
      Modo demo
    </span>
  );
}
