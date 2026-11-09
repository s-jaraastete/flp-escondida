import { useMemo, useState } from 'react';
import { CalendarSearch, Clock, MapPin, RotateCcw, Search, UserRound } from 'lucide-react';
import type { ActivityType, Area } from '@/types';
import { RISKS } from '@/data/catalogs';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { Button, Card, EmptyState, Segmented } from '@/components/ui/primitives';
import { AreaBadge, Badge, SeatsBadge, TypeBadge } from '@/components/ui/status';
import { OPEN_BOOKING, findUserOverlap, slotHasStarted } from '@/services/flpService';
import { slotView } from '@/services/selectors';
import { BookingDialog } from '@/features/booking/BookingDialog';
import { addDaysISO, capitalize, fmtLong, relativeDay, todayISO } from '@/utils/date';
import { normalize } from '@/utils/misc';

export default function BookPage() {
  const { data } = useData();
  const { user } = useAuth('web');
  const t = todayISO();
  const [q, setQ] = useState('');
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const [type, setType] = useState<ActivityType | 'Todas'>('Todas');
  const [risk, setRisk] = useState('');
  const [from, setFrom] = useState(t);
  const [to, setTo] = useState(addDaysISO(t, 21));
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [bookId, setBookId] = useState<string | null>(null);

  const mine = useMemo(() => new Set(data.bookings.filter((b) => b.userId === user.id && OPEN_BOOKING.includes(b.status)).map((b) => b.slotId)), [data.bookings, user.id]);

  const results = useMemo(() => {
    const nq = normalize(q);
    return data.slots
      .filter((s) => s.status === 'publicado' && s.date >= from && s.date <= to && !slotHasStarted(s))
      .filter((s) => (type === 'Todas' || s.activityType === type) && (!risk || s.riskId === risk))
      .map((s) => slotView(data, s))
      .filter((s) => s.project.status === 'vigente' && (area === 'Todas' || s.project.area === area))
      .filter((s) => !onlyAvailable || s.seats > 0)
      .filter((s) => !nq || normalize(`${s.project.name} ${s.project.code} ${s.companyName} ${s.title} ${s.project.sector}`).includes(nq));
  }, [data, q, area, type, risk, from, to, onlyAvailable]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof results>();
    results.forEach((s) => m.set(s.date, [...(m.get(s.date) ?? []), s]));
    return [...m.entries()];
  }, [results]);

  const clear = () => {
    setQ('');
    setArea('Todas');
    setType('Todas');
    setRisk('');
    setFrom(t);
    setTo(addDaysISO(t, 21));
    setOnlyAvailable(true);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <Card className="h-fit p-5 lg:sticky lg:top-20">
        <p className="mb-4 flex items-center gap-2 font-bold text-ink">
          <CalendarSearch className="size-5 text-brand" aria-hidden /> Buscar horarios
        </p>
        <div className="grid gap-4">
          <div>
            <label className="label" htmlFor="bq">Proyecto o empresa</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input id="bq" className="input pl-9" placeholder="Ej. Correa, Coloso…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div>
            <span className="label">Área</span>
            <Segmented<Area | 'Todas'> ariaLabel="Área" block size="sm" value={area} onChange={setArea} options={[{ value: 'Todas', label: 'Todas' }, { value: 'Mina', label: 'Mina' }, { value: 'Coloso', label: 'Coloso' }]} />
          </div>
          <div>
            <span className="label">Tipo de actividad</span>
            <Segmented<ActivityType | 'Todas'> ariaLabel="Tipo" block size="sm" value={type} onChange={setType} options={[{ value: 'Todas', label: 'Todas' }, { value: 'OVCC', label: 'OVCC' }, { value: 'CTP', label: 'CTP' }]} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="bfrom">Desde</label>
              <input id="bfrom" type="date" min={t} className="input px-2" value={from} onChange={(e) => setFrom(e.target.value || t)} />
            </div>
            <div>
              <label className="label" htmlFor="bto">Hasta</label>
              <input id="bto" type="date" min={from} className="input px-2" value={to} onChange={(e) => setTo(e.target.value || from)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="brisk">Riesgo material</label>
            <select id="brisk" className="input" value={risk} onChange={(e) => setRisk(e.target.value)}>
              <option value="">Todos</option>
              {RISKS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-graphite">
            <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
            Solo con cupos disponibles
          </label>
          <Button variant="ghost" icon={RotateCcw} onClick={clear}>
            Limpiar filtros
          </Button>
        </div>
      </Card>

      <div className="grid content-start gap-5">
        <p className="text-sm text-muted">
          <strong className="text-ink">{results.length}</strong> horarios encontrados
        </p>
        {grouped.length === 0 ? (
          <Card>
            <EmptyState icon={CalendarSearch} title="No hay horarios con estos filtros" description="Amplía el rango de fechas o quita filtros." action={<Button variant="secondary" onClick={clear}>Limpiar filtros</Button>} />
          </Card>
        ) : (
          grouped.map(([date, list]) => (
            <section key={date}>
              <h3 className="mb-2 flex items-baseline gap-2 text-sm font-bold text-ink">
                <span className="inline-block first-letter:uppercase">{relativeDay(date)}</span>
                <span className="font-normal text-muted">{capitalize(fmtLong(date))}</span>
              </h3>
              <div className="grid gap-3 xl:grid-cols-2">
                {list.map((s) => {
                  const booked = mine.has(s.id);
                  const overlap = !booked && findUserOverlap(data, user.id, s);
                  return (
                    <Card key={s.id} className="flex flex-col p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <TypeBadge type={s.activityType} />
                            <AreaBadge area={s.project.area} />
                          </div>
                          <p className="mt-2 font-bold leading-snug text-ink">{s.project.name}</p>
                          <p className="truncate text-xs text-muted">{s.companyName}</p>
                        </div>
                        <SeatsBadge seats={s.seats} capacity={s.capacity} />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-graphite">
                        <span className="font-semibold">{s.riskCode}</span> {s.controlName}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-graphite">
                        <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{s.start}–{s.end}</span>
                        <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{s.project.sector}</span>
                        <span className="flex items-center gap-1"><UserRound className="size-3.5" aria-hidden />{s.leaderName}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                        <span className="text-xs text-muted">{s.requirements.length} requisitos previos</span>
                        {booked ? (
                          <Badge tone="info">Ya inscrito</Badge>
                        ) : overlap ? (
                          <Badge tone="warning">Choca con otra visita</Badge>
                        ) : (
                          <Button size="sm" disabled={s.seats === 0} onClick={() => setBookId(s.id)}>
                            {s.seats === 0 ? 'Sin cupos' : 'Reservar'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
      <BookingDialog slotId={bookId} userId={user.id} onClose={() => setBookId(null)} />
    </div>
  );
}
