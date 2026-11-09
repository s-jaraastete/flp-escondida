import { useMemo, useState } from 'react';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { ActivityType, Area } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { Button, Card, Segmented } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/Modal';
import { OPEN_BOOKING } from '@/services/flpService';
import { slotView, type SlotView } from '@/services/selectors';
import { SlotDetailDialog } from '@/features/slots/SlotDetailDialog';
import { SlotForm } from '@/features/slots/SlotForm';
import { BookingDialog } from '@/features/booking/BookingDialog';
import { WEEK_OPTS, capitalize, fmtMonth, locale, toISODate, toMinutes, today } from '@/utils/date';
import { cx } from '@/utils/misc';

const START_H = 7;
const END_H = 20;
const HOUR_PX = 52;

export default function CalendarPage() {
  const { data } = useData();
  const { user, role } = useAuth('web');
  const [view, setView] = useState<'semana' | 'mes'>('semana');
  const [cursor, setCursor] = useState(today());
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const [type, setType] = useState<ActivityType | 'Todas'>('Todas');
  const [onlyMine, setOnlyMine] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [publish, setPublish] = useState(false);

  const mySlots = useMemo(
    () => new Set(data.bookings.filter((b) => b.userId === user.id && [...OPEN_BOOKING, 'completada'].includes(b.status)).map((b) => b.slotId)),
    [data.bookings, user.id],
  );

  const days = useMemo(() => {
    if (view === 'semana') return eachDayOfInterval({ start: startOfWeek(cursor, WEEK_OPTS), end: endOfWeek(cursor, WEEK_OPTS) });
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), WEEK_OPTS), end: endOfWeek(endOfMonth(cursor), WEEK_OPTS) });
  }, [view, cursor]);

  const byDay = useMemo(() => {
    const from = toISODate(days[0]);
    const to = toISODate(days[days.length - 1]);
    const m = new Map<string, SlotView[]>();
    data.slots
      .filter((s) => s.status === 'publicado' && s.date >= from && s.date <= to)
      .filter((s) => type === 'Todas' || s.activityType === type)
      .filter((s) => !onlyMine || mySlots.has(s.id))
      .map((s) => slotView(data, s))
      .filter((s) => area === 'Todas' || s.project.area === area)
      .forEach((s) => m.set(s.date, [...(m.get(s.date) ?? []), s]));
    return m;
  }, [data, days, area, type, onlyMine, mySlots]);

  const move = (n: number) => setCursor((c) => (view === 'semana' ? addWeeks(c, n) : addMonths(c, n)));
  const title =
    view === 'semana'
      ? `${format(days[0], "d 'de' MMM", { locale })} – ${format(days[6], "d 'de' MMM yyyy", { locale })}`
      : capitalize(fmtMonth(cursor));
  const total = [...byDay.values()].reduce((n, l) => n + l.length, 0);

  return (
    <div className="grid gap-4">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={() => move(-1)} aria-label="Anterior" />
          <Button variant="secondary" size="sm" onClick={() => setCursor(today())}>
            Hoy
          </Button>
          <Button variant="ghost" size="sm" icon={ChevronRight} onClick={() => move(1)} aria-label="Siguiente" />
        </div>
        <h2 className="min-w-48 text-lg font-bold first-letter:uppercase text-ink">{title}</h2>
        <span className="text-sm text-muted">{total} visitas</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented<'semana' | 'mes'> ariaLabel="Vista" size="sm" value={view} onChange={setView} options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }]} />
          <select className="input h-9 w-auto py-1" value={area} onChange={(e) => setArea(e.target.value as Area | 'Todas')} aria-label="Área">
            <option value="Todas">Todas las áreas</option>
            <option>Mina</option>
            <option>Coloso</option>
          </select>
          <select className="input h-9 w-auto py-1" value={type} onChange={(e) => setType(e.target.value as ActivityType | 'Todas')} aria-label="Tipo de actividad">
            <option value="Todas">OVCC y CTP</option>
            <option value="OVCC">Solo OVCC</option>
            <option value="CTP">Solo CTP</option>
          </select>
          {role === 'user' && (
            <label className="flex items-center gap-2 text-sm text-graphite">
              <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Solo mis visitas
            </label>
          )}
          {role !== 'user' && (
            <Button size="sm" icon={Plus} onClick={() => setPublish(true)}>
              Publicar
            </Button>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-4 px-1 text-xs text-graphite">
        <Legend className="bg-brand" label="OVCC" />
        <Legend className="bg-ink" label="CTP" />
        <Legend className="border-2 border-dashed border-danger bg-surface" label="Sin cupos" />
        {role === 'user' && <Legend className="bg-surface ring-2 ring-petrol" label="Mi visita" />}
      </div>

      {view === 'semana' ? (
        <WeekGrid days={days} byDay={byDay} mySlots={mySlots} onOpen={setDetail} />
      ) : (
        <MonthGrid
          days={days}
          cursor={cursor}
          byDay={byDay}
          mySlots={mySlots}
          onOpen={setDetail}
          onDay={(d) => {
            setCursor(d);
            setView('semana');
          }}
        />
      )}

      <SlotDetailDialog
        slotId={detail}
        role={role}
        userId={user.id}
        onClose={() => setDetail(null)}
        onBook={(id) => {
          setDetail(null);
          setBookId(id);
        }}
      />
      <BookingDialog slotId={bookId} userId={user.id} onClose={() => setBookId(null)} />
      <Modal open={publish} onClose={() => setPublish(false)} title="Publicar horario de visita" size="lg">
        <SlotForm by={user.id} onDone={() => setPublish(false)} onCancel={() => setPublish(false)} />
      </Modal>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cx('size-3 rounded', className)} aria-hidden /> {label}
    </span>
  );
}

function eventCls(s: SlotView, mine: boolean) {
  return cx(
    'rounded-lg text-left transition hover:brightness-110 focus-visible:z-10',
    s.seats === 0 ? 'border-2 border-dashed border-danger bg-surface text-ink' : s.activityType === 'OVCC' ? 'bg-brand text-white' : 'bg-ink text-white',
    mine && 'ring-2 ring-petrol ring-offset-1',
  );
}

function WeekGrid({ days, byDay, mySlots, onOpen }: { days: Date[]; byDay: Map<string, SlotView[]>; mySlots: Set<string>; onOpen: (id: string) => void }) {
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  return (
    <Card className="overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="sticky top-0 grid grid-cols-[56px_repeat(7,1fr)] border-b border-line">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className={cx('px-2 py-3 text-center', isToday(d) && 'bg-brand-50')}>
              <p className="text-xs font-semibold uppercase text-muted">{format(d, 'EEE', { locale })}</p>
              <p className={cx('mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-lg font-bold', isToday(d) ? 'bg-brand text-white' : 'text-ink')}>{format(d, 'd')}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="pr-2 text-right text-xs text-muted">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {days.map((d) => {
            const list = (byDay.get(toISODate(d)) ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));
            // asignación simple de carriles para eventos superpuestos
            const lanes: string[] = [];
            const placed = list.map((s) => {
              let lane = lanes.findIndex((end) => end <= s.start);
              if (lane === -1) {
                lane = lanes.length;
                lanes.push(s.end);
              } else lanes[lane] = s.end;
              return { s, lane };
            });
            const n = Math.max(1, lanes.length);
            return (
              <div key={d.toISOString()} className={cx('relative border-l border-line', isToday(d) && 'bg-brand-50/40')} style={{ height: HOUR_PX * hours.length }}>
                {hours.map((h) => (
                  <div key={h} className="border-b border-line/60" style={{ height: HOUR_PX }} />
                ))}
                {placed.map(({ s, lane }) => {
                  const top = ((toMinutes(s.start) - START_H * 60) / 60) * HOUR_PX;
                  const height = Math.max(26, ((toMinutes(s.end) - toMinutes(s.start)) / 60) * HOUR_PX - 3);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onOpen(s.id)}
                      className={cx('absolute overflow-hidden px-2 py-1', eventCls(s, mySlots.has(s.id)))}
                      style={{ top, height, left: `calc(${(lane / n) * 100}% + 3px)`, width: `calc(${100 / n}% - 6px)` }}
                      aria-label={`${s.activityType} ${s.project.name} ${s.start} a ${s.end}, ${s.seats} cupos`}
                    >
                      <p className="truncate text-xs font-bold">
                        {s.start} · {s.activityType}
                      </p>
                      <p className="truncate text-xs opacity-90">{s.project.name}</p>
                      {height > 60 && (
                        <p className="truncate text-xs opacity-75">
                          {s.occupied}/{s.capacity} · {s.project.area}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function MonthGrid({
  days,
  cursor,
  byDay,
  mySlots,
  onOpen,
  onDay,
}: {
  days: Date[];
  cursor: Date;
  byDay: Map<string, SlotView[]>;
  mySlots: Set<string>;
  onOpen: (id: string) => void;
  onDay: (d: Date) => void;
}) {
  return (
    <Card className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-line">
          {days.slice(0, 7).map((d) => (
            <p key={d.toISOString()} className="py-2 text-center text-xs font-semibold uppercase text-muted">
              {format(d, 'EEEE', { locale })}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const list = (byDay.get(toISODate(d)) ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));
            return (
              <div key={d.toISOString()} className={cx('min-h-28 border-b border-r border-line p-1.5', !isSameMonth(d, cursor) && 'bg-canvas/60')}>
                <button
                  onClick={() => onDay(d)}
                  className={cx(
                    'mb-1 grid size-7 place-items-center rounded-full text-xs font-bold',
                    isToday(d) ? 'bg-brand text-white' : isSameMonth(d, cursor) ? 'text-ink hover:bg-canvas' : 'text-muted',
                  )}
                  aria-label={`Ver semana del ${format(d, "d 'de' MMMM", { locale })}`}
                >
                  {format(d, 'd')}
                </button>
                <div className="grid gap-1">
                  {list.slice(0, 3).map((s) => (
                    <button key={s.id} onClick={() => onOpen(s.id)} className={cx('truncate px-1.5 py-0.5 text-xs font-semibold', eventCls(s, mySlots.has(s.id)))}>
                      {s.start} {s.project.name}
                    </button>
                  ))}
                  {list.length > 3 && (
                    <button onClick={() => onDay(d)} className="text-left text-xs font-semibold text-brand hover:underline">
                      +{list.length - 3} más
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
