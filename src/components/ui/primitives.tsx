import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Inbox, Loader2, type LucideIcon } from 'lucide-react';
import { cx, initials } from '@/utils/misc';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-canvas',
  ghost: 'text-graphite hover:bg-canvas hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-110',
  success: 'bg-success text-white hover:brightness-110',
  dark: 'bg-ink text-white hover:bg-ink-700',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, loading, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('card', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Campo de formulario con etiqueta, ayuda y error accesibles. */
export function Field({
  label,
  error,
  hint,
  children,
  className,
  required,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
}) {
  const id = useId();
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': descId })}
      {(error || hint) && (
        <p id={descId} className={cx('mt-1 text-xs', error ? 'font-medium text-danger' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: 'brand' | 'success' | 'danger' | 'petrol' | 'ink' | 'warning';
  hint?: string;
  onClick?: () => void;
}) {
  const toneCls = {
    brand: 'bg-brand-50 text-brand',
    success: 'bg-success-50 text-success',
    danger: 'bg-danger-50 text-danger',
    petrol: 'bg-petrol-50 text-petrol',
    warning: 'bg-warning-50 text-warning',
    ink: 'bg-canvas text-ink',
  }[tone];
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cx('card flex items-start gap-4 p-4 text-left', onClick && 'transition hover:-translate-y-0.5 hover:border-brand/40')}
    >
      <span className={cx('grid size-11 shrink-0 place-items-center rounded-xl', toneCls)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className="mt-0.5 block text-2xl font-extrabold tabular-nums text-ink">{value}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
    </Comp>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14')}>
      <span className="grid size-12 place-items-center rounded-2xl bg-canvas text-muted">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({ name, size = 'md', tone = 'brand' }: { name: string; size?: 'sm' | 'md' | 'lg'; tone?: 'brand' | 'dark' }) {
  return (
    <span
      aria-hidden
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-bold',
        tone === 'brand' ? 'bg-brand text-white' : 'bg-ink text-white',
        size === 'sm' && 'size-7 text-[11px]',
        size === 'md' && 'size-9 text-xs',
        size === 'lg' && 'size-14 text-lg',
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({ value, tone = 'brand', label }: { value: number; tone?: 'brand' | 'success' | 'danger' | 'petrol'; label?: string }) {
  const color = { brand: 'bg-brand', success: 'bg-success', danger: 'bg-danger', petrol: 'bg-petrol' }[tone];
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-canvas"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/** Control segmentado (tabs simples / filtros). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  ariaLabel,
  block,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  size?: 'sm' | 'md';
  ariaLabel: string;
  block?: boolean;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cx('inline-flex rounded-xl bg-canvas p-1', block && 'flex w-full')}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 whitespace-nowrap rounded-lg font-semibold transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-xs text-muted tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Interruptor SÍ / NO / N/A (inspirado en formularios de verificación en terreno). */
export function AnswerToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  large,
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  ariaLabel: string;
  large?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-xl border border-line bg-canvas p-1">
      {options.map((o) => {
        const active = value === o.value;
        // Verde/rojo solo para respuestas de verificación (SI/NO); los SÍ/NO auxiliares usan tono neutro.
        const tone = o.value === 'SI' ? 'bg-success text-white' : o.value === 'NO' ? 'bg-danger text-white' : 'bg-ink text-white';
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'rounded-lg font-bold transition',
              large ? 'min-w-16 px-4 py-3 text-sm' : 'min-w-12 px-3 py-1.5 text-xs',
              active ? tone : 'text-graphite hover:bg-surface',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-[var(--color-brand)]"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}
