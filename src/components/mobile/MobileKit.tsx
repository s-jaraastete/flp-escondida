import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { addDays, format, isToday } from 'date-fns';
import { ChevronRight, Clock, MapPin, UserRound } from 'lucide-react';
import type { SlotView } from '@/services/selectors';
import { SeatsBadge, TypeBadge } from '@/components/ui/status';
import { locale, toISODate, today } from '@/utils/date';
import { cx } from '@/utils/misc';

export function MSection({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('px-4 pt-5', className)}>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="flex items-center text-xs font-bold text-brand">
      {children} <ChevronRight className="size-3.5" aria-hidden />
    </Link>
  );
}

/** Tarjeta táctil de horario disponible. */
export function SlotCard({ slot, to, right, showProject = true }: { slot: SlotView; to: string; right?: ReactNode; showProject?: boolean }) {
  return (
    <Link to={to} className="card flex gap-3 p-3.5 active:scale-[0.99]">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-canvas py-2">
        <span className="text-[10px] font-bold uppercase text-muted">{format(new Date(slot.date + 'T12:00'), 'EEE', { locale })}</span>
        <span className="text-xl font-extrabold leading-none text-ink">{slot.date.slice(8)}</span>
        <span className="text-[10px] font-semibold text-muted">{format(new Date(slot.date + 'T12:00'), 'MMM', { locale })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <TypeBadge type={slot.activityType} />
          {right ?? <SeatsBadge seats={slot.seats} capacity={slot.capacity} />}
        </div>
        {showProject && <p className="mt-1 truncate text-sm font-bold text-ink">{slot.project.name}</p>}
        <p className="truncate text-xs text-graphite">{slot.controlName}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <Clock className="size-3" aria-hidden />
            {slot.start}–{slot.end}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3" aria-hidden />
            {slot.project.area}
          </span>
          <span className="flex items-center gap-1">
            <UserRound className="size-3" aria-hidden />
            {slot.leaderName.split(' ')[0]}
          </span>
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 self-center text-muted" aria-hidden />
    </Link>
  );
}

/** Selector horizontal de días con indicador de disponibilidad. */
export function DayStrip({ value, onChange, days = 21, marks }: { value: string; onChange: (iso: string) => void; days?: number; marks: Map<string, number> }) {
  const list = Array.from({ length: days }, (_, i) => addDays(today(), i));
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="listbox" aria-label="Seleccionar día">
      {list.map((d) => {
        const iso = toISODate(d);
        const active = iso === value;
        const n = marks.get(iso) ?? 0;
        return (
          <button
            key={iso}
            role="option"
            aria-selected={active}
            onClick={() => onChange(iso)}
            className={cx(
              'flex w-14 shrink-0 flex-col items-center rounded-2xl py-2 transition',
              active ? 'bg-brand text-white shadow-[0_6px_16px_rgb(231_85_15/0.35)]' : 'bg-white/10 text-white',
            )}
            aria-label={`${format(d, "EEEE d 'de' MMMM", { locale })}, ${n} horarios`}
          >
            <span className={cx('text-[10px] font-bold uppercase', active ? 'text-white/85' : 'text-white/55')}>{isToday(d) ? 'Hoy' : format(d, 'EEE', { locale })}</span>
            <span className="text-lg font-extrabold leading-tight">{format(d, 'd')}</span>
            <span className={cx('mt-0.5 size-1.5 rounded-full', n ? (active ? 'bg-white' : 'bg-brand') : 'bg-transparent')} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition', active ? 'bg-ink text-white' : 'bg-surface text-graphite ring-1 ring-line')}
    >
      {children}
    </button>
  );
}

export function StatPill({ label, value, tone = 'ink' }: { label: string; value: ReactNode; tone?: 'ink' | 'brand' | 'success' | 'danger' | 'warning' }) {
  return (
    <div className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-card)] ring-1 ring-line">
      <p
        className={cx(
          'text-2xl font-extrabold tabular-nums',
          tone === 'ink' && 'text-ink',
          tone === 'brand' && 'text-brand',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-danger',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </p>
      <p className="text-[11px] font-medium leading-tight text-muted">{label}</p>
    </div>
  );
}

export const isoNextDays = (n: number) => toISODate(addDays(today(), n));
