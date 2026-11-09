import { Building2, CalendarDays, Clock, Crosshair, MapPin, ShieldAlert, UserRound, Users } from 'lucide-react';
import type { SlotView } from '@/services/selectors';
import { AreaBadge, SeatsBadge, TypeBadge } from '@/components/ui/status';
import { capitalize, fmtLong } from '@/utils/date';

/** Ficha de un horario/visita: fecha, proyecto, roles de contacto, RM/CC y cupos. */
export function SlotSummary({ slot, compact }: { slot: SlotView; compact?: boolean }) {
  const rows: Array<[typeof Clock, string, string]> = [
    [CalendarDays, 'Fecha', capitalize(fmtLong(slot.date))],
    [Clock, 'Horario', `${slot.start} – ${slot.end} hrs`],
    [MapPin, 'Área / sector', `${slot.project.area} · ${slot.project.sector}`],
    [Building2, 'Empresa contratista', slot.companyName],
    [UserRound, 'Líder FLP', `${slot.leaderName} · ${slot.group}`],
    [Users, 'Persona a visitar', slot.project.visitContact],
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={slot.activityType} />
        <AreaBadge area={slot.project.area} />
        <SeatsBadge seats={slot.seats} capacity={slot.capacity} />
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {slot.project.code} · {slot.project.name}
      </p>
      <h3 className="mt-0.5 text-lg font-bold leading-snug text-ink">{slot.title}</h3>

      <dl className={compact ? 'mt-4 grid gap-3' : 'mt-4 grid gap-3 sm:grid-cols-2'}>
        {rows.map(([Icon, k, v]) => (
          <div key={k} className="flex gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <div className="min-w-0">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="text-sm font-medium text-ink">{v}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-2 rounded-xl bg-canvas p-3">
        <div className="flex gap-2.5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <p className="text-sm">
            <span className="font-semibold">Riesgo material {slot.riskCode}:</span> {slot.riskName}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Crosshair className="mt-0.5 size-4 shrink-0 text-petrol" aria-hidden />
          <p className="text-sm">
            <span className="font-semibold">Control crítico {slot.controlCode}:</span> {slot.controlName}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {[
          ['Contract Owner', slot.project.contractOwner],
          ['ITO', slot.project.ito],
          ['Jefe de terreno', slot.project.siteManager],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line p-2">
            <dt className="text-muted">{k}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {slot.notes && <p className="mt-3 text-sm text-graphite">{slot.notes}</p>}
    </div>
  );
}
