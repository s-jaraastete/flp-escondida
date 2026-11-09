import { useEffect, useState } from 'react';
import { cx } from '@/utils/misc';

/** Letra grande: agranda toda la interfaz (todo el texto está en rem). Pensado para leer en terreno. */
export type TextSize = 'normal' | 'lg';
const KEY = 'flp-escondida:text';
const EVT = 'flp-text-size';

export function readTextSize(): TextSize {
  try {
    return localStorage.getItem(KEY) === 'lg' ? 'lg' : 'normal';
  } catch {
    return 'normal';
  }
}

export function applyTextSize(v: TextSize) {
  document.documentElement.dataset.text = v;
}

export function setTextSize(v: TextSize) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* sin almacenamiento */
  }
  applyTextSize(v);
  window.dispatchEvent(new CustomEvent(EVT, { detail: v }));
}

export function useTextSize(): [TextSize, (v: TextSize) => void] {
  const [v, setV] = useState<TextSize>(readTextSize);
  useEffect(() => {
    const on = (e: Event) => setV((e as CustomEvent<TextSize>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return [v, setTextSize];
}

/** Botones A / A+ para cambiar el tamaño de letra. */
export function TextSizeToggle({ dark, className }: { dark?: boolean; className?: string }) {
  const [v, set] = useTextSize();
  return (
    <div role="radiogroup" aria-label="Tamaño de letra" className={cx('inline-flex shrink-0 rounded-lg p-0.5', dark ? 'bg-white/10' : 'bg-canvas ring-1 ring-line', className)}>
      {(
        [
          { value: 'normal', label: 'A', aria: 'Letra normal' },
          { value: 'lg', label: 'A+', aria: 'Letra grande' },
        ] as const
      ).map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={v === o.value}
          aria-label={o.aria}
          title={o.aria}
          onClick={() => set(o.value)}
          className={cx(
            'min-w-8 rounded-md px-2 py-1 font-bold',
            o.value === 'lg' && 'text-[1.1em]',
            v === o.value ? (dark ? 'bg-white text-black' : 'bg-ink text-white') : dark ? 'text-white/70 hover:text-white' : 'text-graphite hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
