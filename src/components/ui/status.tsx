import type { ActionPlan, ActivityType, Area, BookingStatus } from '@/types';
import { cx } from '@/utils/misc';
import { isOverdue } from '@/services/selectors';

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand' | 'dark';

const TONES: Record<Tone, string> = {
  success: 'bg-success-50 text-success ring-success/20',
  danger: 'bg-danger-50 text-danger ring-danger/20',
  warning: 'bg-warning-50 text-warning ring-warning/25',
  info: 'bg-petrol-50 text-petrol ring-petrol/20',
  neutral: 'bg-canvas text-graphite ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand/25',
  dark: 'bg-ink text-white ring-ink',
};

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  confirmada: { label: 'Confirmada', tone: 'info' },
  completada: { label: 'Completada', tone: 'success' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
  rechazada: { label: 'Rechazada', tone: 'danger' },
};

export function BookingBadge({ status, awaiting }: { status: BookingStatus; awaiting?: boolean }) {
  if (awaiting) return <Badge tone="brand" dot>Por verificar</Badge>;
  const s = BOOKING_STATUS[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function ActionBadge({ action }: { action: ActionPlan }) {
  if (isOverdue(action)) return <Badge tone="danger" dot>Vencida</Badge>;
  if (action.status === 'cerrada') return <Badge tone="success" dot>Cerrada</Badge>;
  if (action.status === 'en_progreso') return <Badge tone="info" dot>En progreso</Badge>;
  return <Badge tone="warning" dot>Abierta</Badge>;
}

const FLP_EQUIVALENT: Record<ActivityType, string> = { OVCC: 'CCO', CTP: 'PTC' };

/** Tipo de actividad. withFlp muestra además su equivalente en FLP (OVCC · CCO / CTP · PTC). */
export function TypeBadge({ type, withFlp }: { type: ActivityType; withFlp?: boolean }) {
  return (
    <span title={`Se registra en FLP como ${FLP_EQUIVALENT[type]}`}>
      <Badge tone={type === 'OVCC' ? 'brand' : 'dark'}>{withFlp ? `${type} · ${FLP_EQUIVALENT[type]}` : type}</Badge>
    </span>
  );
}

export function AreaBadge({ area }: { area: Area }) {
  return <Badge tone={area === 'Mina' ? 'neutral' : 'info'}>{area}</Badge>;
}

export function SeatsBadge({ seats, capacity }: { seats: number; capacity: number }) {
  if (seats === 0) return <Badge tone="danger">Sin cupos</Badge>;
  if (seats <= Math.ceil(capacity / 3)) return <Badge tone="warning">{seats} {seats === 1 ? 'cupo' : 'cupos'}</Badge>;
  return <Badge tone="success">{seats} cupos</Badge>;
}
