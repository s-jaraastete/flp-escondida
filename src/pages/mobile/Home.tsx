import { Wordmark } from '@/components/ui/Brand';
import { OnlineToggle } from '@/features/offline/ConnectivityUI';
import { VisitSteps } from '@/features/guide/VisitSteps';
import { Glossary } from '@/features/guide/Glossary';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertTriangle, Bell, CalendarDays, Check, Clock, Compass, Info, MapPin, X, Zap } from 'lucide-react';
import type { Area } from '@/types';
import { useAuth } from '@/contexts/SessionContext';
import { useData } from '@/contexts/DataContext';
import { Avatar, Button, EmptyState } from '@/components/ui/primitives';
import { TypeBadge } from '@/components/ui/status';
import { ConfirmDialog } from '@/components/ui/Modal';
import { CHART, GroupedBars } from '@/components/charts/Charts';
import { MLink, MSection, SlotCard, StatPill } from '@/components/mobile/MobileKit';
import { usePhoneContainer } from '@/layouts/PhoneFrame';
import { decideBooking, ROLE_LABEL } from '@/services/flpService';
import { alerts, spotSeries, spotTotals, awaitingForUser, bookingView, kpis, monthlySeries, slotView, upcomingSlots, userBookings } from '@/services/selectors';
import { capitalize, fmtLong, relativeDay, todayISO } from '@/utils/date';
import { cx } from '@/utils/misc';

export default function MobileHome() {
  const { role } = useAuth('mobile');
  if (role === 'admin') return <AdminHome />;
  if (role === 'planner') return <PlannerHome />;
  return <UserHome />;
}

function Greeting({ alertsCount = 0, children }: { alertsCount?: number; children?: React.ReactNode }) {
  const { user, role } = useAuth('mobile');
  const navigate = useNavigate();
  return (
    <header className="flp-band px-4 pb-6 pt-4 text-white">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Wordmark tone="white" size="sm" />
        <OnlineToggle className="p-0.5 text-xs" />
      </div>
      <div className="flex items-center gap-3">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">{ROLE_LABEL[role]} · FLP Escondida</p>
          <p className="truncate text-lg font-extrabold">Hola, {user.name.split(' ')[0]}</p>
        </div>
        <button onClick={() => navigate('/app/perfil')} className="relative grid size-10 place-items-center rounded-full bg-black/15" aria-label={`Notificaciones: ${alertsCount}`}>
          <Bell className="size-5" />
          {alertsCount > 0 && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-brand ring-2 ring-white" aria-hidden />}
        </button>
      </div>
      <p className="mt-1 pl-12 text-xs first-letter:uppercase text-white/80">{fmtLong(todayISO())}</p>
      {children}
    </header>
  );
}

/* ------------------------------------------------------------------ Usuario */

function UserHome() {
  const { data } = useData();
  const { user } = useAuth('mobile');
  const navigate = useNavigate();
  const t = todayISO();
  const mine = userBookings(data, user.id);
  const upcoming = mine.filter((b) => ['pendiente', 'confirmada'].includes(b.status) && b.slot.date >= t && !b.awaitingVerification);
  const toVerify = awaitingForUser(data, user.id);
  const k = kpis(data, { userId: user.id });
  const next = upcoming[0];
  const booked = new Set(mine.filter((b) => ['pendiente', 'confirmada'].includes(b.status)).map((b) => b.slotId));
  const suggestions = upcomingSlots(data, 21)
    .map((s) => slotView(data, s))
    .filter((s) => s.seats > 0 && s.date > t && !booked.has(s.id) && (user.area === 'Ambas' || s.project.area === user.area))
    .slice(0, 4);

  return (
    <div>
      <Greeting alertsCount={toVerify.length}>
        {next ? (
          <Link to={`/app/visita/${next.id}`} className="mt-4 block rounded-2xl bg-gradient-to-br from-brand to-brand-700 p-4 shadow-[0_12px_30px_rgb(231_85_15/0.35)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-white/80">Próxima visita</span>
              <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold first-letter:uppercase">{next.status}</span>
            </div>
            <p className="mt-2 text-xl font-extrabold first-letter:uppercase">
              {relativeDay(next.slot.date)} · {next.slot.start}
            </p>
            <p className="truncate text-sm font-semibold">{next.slot.project.name}</p>
            <p className="flex items-center gap-1 text-xs text-white/80">
              <MapPin className="size-3" aria-hidden /> {next.slot.project.area} · {next.slot.project.sector}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white" style={{ width: `${(next.checklist.length / Math.max(1, next.slot.requirements.length)) * 100}%` }} />
              </div>
              <span className="text-xs font-bold">
                {next.checklist.length}/{next.slot.requirements.length} requisitos
              </span>
            </div>
          </Link>
        ) : (
          <button onClick={() => navigate('/app/explorar')} className="mt-4 w-full rounded-2xl border border-dashed border-white/25 p-4 text-left">
            <p className="font-bold">No tienes visitas próximas</p>
            <p className="text-sm text-white/60">Explora proyectos y reserva un horario →</p>
          </button>
        )}
      </Greeting>

      <div className="px-4 pt-4">
        <VisitSteps userId={user.id} base="/app" />
      </div>

      <div className="grid grid-cols-3 gap-2.5 px-4 pt-4">
        <StatPill label="Visitas completadas" value={k.completed} tone="success" />
        <StatPill label="Mi cumplimiento" value={`${k.avgCompliance}%`} tone="brand" />
        <StatPill label="Mis FLP spot" value={(data.spots ?? []).filter((s) => s.userId === user.id).length} tone="ink" />
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 pt-4">
        {[
          { to: '/app/explorar', icon: Compass, label: 'Explorar' },
          { to: '/app/visitas', icon: CalendarDays, label: 'Mis visitas' },
          { to: '/app/spot', icon: Zap, label: 'FLP spot' },
          { to: '/app/perfil', icon: Info, label: 'Mi perfil' },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface py-3 text-xs font-bold text-graphite ring-1 ring-line active:scale-95">
            <q.icon className="size-5 text-brand" aria-hidden />
            {q.label}
          </Link>
        ))}
      </div>

      <MSection title="Horarios disponibles para ti" action={<MLink to="/app/explorar">Ver más</MLink>}>
        {suggestions.length ? (
          <div className="grid gap-2.5">
            {suggestions.map((s) => (
              <SlotCard key={s.id} slot={s} to={`/app/reservar/${s.id}`} />
            ))}
          </div>
        ) : (
          <EmptyState compact title="Sin horarios disponibles" />
        )}
      </MSection>

      <div className="px-4 pt-4">
        <Glossary />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Planificador */

function PlannerHome() {
  const { data, commit } = useData();
  const { user } = useAuth('mobile');
  const container = usePhoneContainer();
  const [reject, setReject] = useState<string | null>(null);
  const k = kpis(data);
  const todaySlots = upcomingSlots(data, 0).map((s) => slotView(data, s));
  const week = upcomingSlots(data, 7);
  const pending = data.bookings
    .filter((b) => b.status === 'pendiente')
    .map((b) => bookingView(data, b))
    .sort((a, b) => (a.slot.date + a.slot.start).localeCompare(b.slot.date + b.slot.start));

  return (
    <div>
      <Greeting alertsCount={pending.length}>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ['Pendientes', k.pending],
            ['Hoy', todaySlots.length],
            ['Semana', week.length],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl bg-white/10 p-3">
              <p className="text-2xl font-extrabold tabular-nums">{v}</p>
              <p className="text-xs text-white/60">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-white/10 p-3">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-white/70">Ocupación de cupos próximos</span>
            <span className="font-bold">{k.occupancyRate}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-brand" style={{ width: `${k.occupancyRate}%` }} />
          </div>
        </div>
      </Greeting>

      <MSection title={`Solicitudes por revisar (${pending.length})`} action={<MLink to="/app/solicitudes">Todas</MLink>}>
        {pending.length === 0 ? (
          <EmptyState compact icon={Check} title="Todo al día" description="No hay solicitudes pendientes." />
        ) : (
          <ul className="grid gap-2.5">
            {pending.slice(0, 4).map((b) => (
              <li key={b.id} className="card p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={b.userName} size="sm" tone="dark" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{b.userName}</p>
                    <p className="truncate text-xs text-muted">
                      {capitalize(relativeDay(b.slot.date))} {b.slot.start} · {b.slot.project.name}
                    </p>
                  </div>
                  <TypeBadge type={b.slot.activityType} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="secondary" icon={X} onClick={() => setReject(b.id)}>
                    Rechazar
                  </Button>
                  <Button variant="success" icon={Check} onClick={() => commit(decideBooking(data, b.id, 'confirmada', user.id))}>
                    Confirmar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </MSection>

      <MSection title="Agenda de hoy" action={<MLink to="/app/agenda">Agenda</MLink>}>
        {todaySlots.length === 0 ? (
          <EmptyState compact icon={CalendarDays} title="Sin visitas hoy" />
        ) : (
          <div className="grid gap-2.5">
            {todaySlots.map((s) => (
              <SlotCard key={s.id} slot={s} to={`/app/disponibilidad/${s.id}`} right={<span className="text-xs font-bold text-graphite">{s.occupied}/{s.capacity} inscritos</span>} />
            ))}
          </div>
        )}
      </MSection>

      <ConfirmDialog
        container={container}
        open={Boolean(reject)}
        onClose={() => setReject(null)}
        onConfirm={(reason) => reject && commit(decideBooking(data, reject, 'rechazada', user.id, reason)) && setReject(null)}
        title="Rechazar solicitud"
        message="El cupo quedará disponible."
        reasonLabel="Motivo"
        reasonRequired
        confirmLabel="Rechazar"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Administrador */

function AdminHome() {
  const { data } = useData();
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const k = useMemo(() => kpis(data, { area }), [data, area]);
  const series = useMemo(() => monthlySeries(data, { area }).slice(-5), [data, area]);
  const al = useMemo(() => alerts(data, { area }), [data, area]);
  const spS = useMemo(() => spotSeries(data, { area }).slice(-5), [data, area]);
  const sp = useMemo(() => spotTotals(data, { area }), [data, area]);

  return (
    <div>
      <Greeting alertsCount={al.length}>
        <div className="mt-4">
          <div className="rounded-xl bg-white/10 p-1">
            <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="Área">
              {(['Todas', 'Mina', 'Coloso'] as const).map((a) => (
                <button
                  key={a}
                  role="tab"
                  aria-selected={area === a}
                  onClick={() => setArea(a)}
                  className={cx('rounded-lg py-1.5 text-xs font-bold', area === a ? 'bg-white text-ink' : 'text-white/70')}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Cumplimiento promedio</p>
              <p className="text-4xl font-extrabold tabular-nums">{k.avgCompliance}%</p>
            </div>
            <p className="pb-1.5 text-xs text-white/60">{k.verifications} verificaciones</p>
          </div>
        </div>
      </Greeting>

      <div className="grid grid-cols-2 gap-2.5 px-4 pt-4">
        <StatPill label="Visitas programadas" value={k.scheduledSlots} />
        <StatPill label="Confirmadas próximas" value={k.confirmed} tone="brand" />
        <StatPill label="Completadas" value={k.completed} tone="success" />
        <StatPill label="Pendientes de confirmar" value={k.pending} tone="warning" />
        <StatPill label="FLP spot (6 meses)" value={sp.spot} />
        <StatPill label="Planificado sin asistencia" value={sp.sinAsistencia} tone="danger" />
      </div>

      <MSection title="Actividad mensual">
        <div className="card p-3">
          <GroupedBars
            data={series}
            xKey="mes"
            height={200}
            series={[
              { key: 'programadas', name: 'Programadas', color: CHART.s1 },
              { key: 'completadas', name: 'Realizadas', color: CHART.s2 },
            ]}
          />
        </div>
      </MSection>

      <MSection title="Alertas">
        {al.length === 0 ? (
          <EmptyState compact title="Sin alertas" />
        ) : (
          <ul className="grid gap-2">
            {al.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', a.tone === 'danger' ? 'bg-danger-50 text-danger' : a.tone === 'warning' ? 'bg-warning-50 text-warning' : 'bg-petrol-50 text-petrol')}>
                  {a.tone === 'info' ? <Clock className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{a.title}</p>
                  <p className="truncate text-xs text-muted">{a.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </MSection>

      <MSection title="FLP planificado vs spot" action={<MLink to="/app/spot">Ver spot</MLink>}>
        <div className="card p-3">
          <GroupedBars
            data={spS}
            xKey="mes"
            height={200}
            series={[
              { key: 'planificado', name: 'Planificado', color: CHART.s1 },
              { key: 'spot', name: 'Spot', color: CHART.info },
            ]}
          />
        </div>
      </MSection>

      <MSection title="Planificado sin asistencia">
        <div className="card p-3">
          <GroupedBars data={spS} xKey="mes" height={180} series={[{ key: 'sinAsistencia', name: 'Sin asistencia', color: CHART.danger }]} />
        </div>
      </MSection>
    </div>
  );
}
