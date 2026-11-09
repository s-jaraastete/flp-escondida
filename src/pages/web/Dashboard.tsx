import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Gauge,
  Inbox,
  Info,
  ListChecks,
  MapPin,
  RotateCcw,
  Target,
  X,
} from 'lucide-react';
import type { Area } from '@/types';
import { useAuth } from '@/contexts/SessionContext';
import { useData } from '@/contexts/DataContext';
import { Button, Card, EmptyState, KpiCard, ProgressBar, SectionTitle, Segmented } from '@/components/ui/primitives';
import { BookingBadge, TypeBadge, AreaBadge, SeatsBadge } from '@/components/ui/status';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { CHART, GroupedBars, HorizontalBars, TrendLine } from '@/components/charts/Charts';
import {
  actionsByStatus,
  alerts,
  areaBreakdown,
  bookingView,
  findingsByRisk,
  kpis,
  monthlySeries,
  slotView,
  upcomingSlots,
  userBookings,
  awaitingForUser,
} from '@/services/selectors';
import { decideBooking } from '@/services/flpService';
import { SlotForm } from '@/features/slots/SlotForm';
import { BookingDialog } from '@/features/booking/BookingDialog';
import { capitalize, fmtLong, fmtShort, relativeDay, todayISO, addDaysISO } from '@/utils/date';
import { cx } from '@/utils/misc';

export default function WebDashboard() {
  const { role } = useAuth('web');
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'planner') return <PlannerDashboard />;
  return <UserDashboard />;
}

/* ------------------------------------------------------------------ Admin */

function AdminDashboard() {
  const { data, reset } = useData();
  const navigate = useNavigate();
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const [confirmReset, setConfirmReset] = useState(false);
  const k = useMemo(() => kpis(data, { area }), [data, area]);
  const series = useMemo(() => monthlySeries(data, { area }), [data, area]);
  const byArea = useMemo(() => areaBreakdown(data), [data]);
  const actionStatus = useMemo(() => actionsByStatus(data, { area }), [data, area]);
  const findings = useMemo(() => findingsByRisk(data, { area }), [data, area]);
  const alertList = useMemo(() => alerts(data, { area }), [data, area]);
  const next = useMemo(
    () =>
      upcomingSlots(data, 7)
        .map((s) => slotView(data, s))
        .filter((s) => area === 'Todas' || s.project.area === area)
        .slice(0, 8),
    [data, area],
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{capitalize(fmtLong(todayISO()))}</p>
          <h2 className="text-2xl font-extrabold text-ink">Dashboard ejecutivo FLP</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Area | 'Todas'>
            ariaLabel="Filtrar por área"
            value={area}
            onChange={setArea}
            options={[
              { value: 'Todas', label: 'Todas' },
              { value: 'Mina', label: 'Mina' },
              { value: 'Coloso', label: 'Coloso' },
            ]}
          />
          <Button variant="secondary" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
            Restablecer demo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Visitas programadas" value={k.scheduledSlots} icon={CalendarClock} hint={`Ocupación de cupos ${k.occupancyRate}%`} onClick={() => navigate('/web/calendario')} />
        <KpiCard label="Reservas confirmadas" value={k.confirmed} icon={CalendarCheck} tone="petrol" hint={`${k.pending} pendientes de confirmar`} onClick={() => navigate('/web/solicitudes')} />
        <KpiCard label="Visitas completadas" value={k.completed} icon={CheckCircle2} tone="success" hint={`${k.awaitingVerification} pendientes de verificación`} />
        <KpiCard
          label="Acciones abiertas"
          value={k.actionsOpen}
          icon={ListChecks}
          tone={k.actionsOverdue ? 'danger' : 'ink'}
          hint={`${k.actionsOverdue} vencidas · cierre ${k.actionClosure}%`}
          onClick={() => navigate('/web/acciones')}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Actividad mensual" subtitle="Visitas programadas vs realizadas (con verificación registrada)" />
          <GroupedBars
            data={series}
            xKey="mes"
            series={[
              { key: 'programadas', name: 'Programadas', color: CHART.s1 },
              { key: 'completadas', name: 'Realizadas', color: CHART.s2 },
            ]}
          />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Cumplimiento promedio" subtitle="% de respuestas SÍ en verificaciones" />
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tabular-nums text-ink">{k.avgCompliance}%</span>
            <span className="text-sm text-muted">{k.verifications} verificaciones</span>
          </div>
          <TrendLine data={series} xKey="mes" yKey="cumplimiento" name="Cumplimiento" height={190} domain={[50, 100]} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {byArea.map((a) => (
          <Card key={a.area} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={cx('grid size-10 place-items-center rounded-xl', a.area === 'Mina' ? 'bg-brand-50 text-brand' : 'bg-petrol-50 text-petrol')}>
                  <MapPin className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted">Área</p>
                  <p className="text-lg font-bold text-ink">{a.area}</p>
                </div>
              </div>
              <AreaBadge area={a.area} />
            </div>
            <dl className="mt-4 grid grid-cols-4 gap-3 text-center">
              {[
                ['Programadas', a.scheduledSlots],
                ['Confirmadas', a.confirmed],
                ['Completadas', a.completed],
                ['Acciones abiertas', a.actionsOpen],
              ].map(([label, v]) => (
                <div key={label as string} className="rounded-xl bg-canvas p-2">
                  <dd className="text-xl font-extrabold tabular-nums text-ink">{v}</dd>
                  <dt className="text-[11px] leading-tight text-muted">{label}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-4 grid gap-3">
              <Meter label="Cumplimiento promedio" value={a.avgCompliance} tone="success" />
              <Meter label="Ocupación de cupos próximos" value={a.occupancyRate} tone="brand" />
              <Meter label="Cierre de acciones" value={a.actionClosure} tone="petrol" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Planes de acción por estado" />
          <HorizontalBars data={actionStatus} colors={[CHART.warning, CHART.info, CHART.danger, CHART.success]} />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Hallazgos por riesgo material" subtitle="Respuestas NO registradas" />
          {findings.length ? <HorizontalBars data={findings} color={CHART.s1} /> : <EmptyState compact title="Sin hallazgos" />}
        </Card>
        <Card className="p-5">
          <SectionTitle title="Alertas" action={<Link to="/web/acciones" className="text-sm font-semibold text-brand hover:underline">Ver acciones</Link>} />
          <AlertList items={alertList} />
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title="Próximos 7 días" subtitle="Actividades FLP programadas" action={<Link to="/web/programacion" className="text-sm font-semibold text-brand hover:underline">Gestionar actividades</Link>} />
        <UpcomingTable slots={next} />
      </Card>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          setConfirmReset(false);
        }}
        title="Restablecer datos demo"
        message="Se regenerarán proyectos, horarios, reservas, verificaciones y acciones con fechas a partir de hoy. Los cambios realizados se perderán."
        confirmLabel="Restablecer"
      />
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: 'success' | 'brand' | 'petrol' }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-graphite">{label}</span>
        <span className="font-bold tabular-nums text-ink">{value}%</span>
      </div>
      <ProgressBar value={value} tone={tone} label={label} />
    </div>
  );
}

function AlertList({ items }: { items: ReturnType<typeof alerts> }) {
  if (!items.length) return <EmptyState compact icon={CheckCircle2} title="Sin alertas" description="Todo al día." />;
  return (
    <ul className="grid gap-2">
      {items.slice(0, 7).map((a) => (
        <li key={a.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-line p-2.5">
          <span
            className={cx(
              'grid size-8 shrink-0 place-items-center rounded-lg',
              a.tone === 'danger' && 'bg-danger-50 text-danger',
              a.tone === 'warning' && 'bg-warning-50 text-warning',
              a.tone === 'info' && 'bg-petrol-50 text-petrol',
            )}
          >
            {a.tone === 'info' ? <Info className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{a.title}</p>
            <p className="truncate text-xs text-muted">{a.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function UpcomingTable({ slots, onBook }: { slots: ReturnType<typeof slotView>[]; onBook?: (id: string) => void }) {
  if (!slots.length) return <EmptyState compact icon={CalendarClock} title="Sin actividades en el período" />;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-2 font-semibold">Fecha</th>
            <th className="px-3 py-2 font-semibold">Proyecto</th>
            <th className="px-3 py-2 font-semibold">Actividad</th>
            <th className="px-3 py-2 font-semibold">Líder</th>
            <th className="px-3 py-2 font-semibold">Cupos</th>
            {onBook && <th className="px-5 py-2" />}
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
              <td className="px-5 py-3">
                <p className="font-semibold first-letter:uppercase text-ink">{relativeDay(s.date)}</p>
                <p className="text-xs text-muted">
                  {s.start}–{s.end}
                </p>
              </td>
              <td className="px-3 py-3">
                <Link to={`/web/proyectos/${s.project.id}`} className="font-medium text-ink hover:text-brand">
                  {s.project.name}
                </Link>
                <p className="text-xs text-muted">{s.project.area} · {s.companyName}</p>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <TypeBadge type={s.activityType} />
                  <span className="text-xs text-graphite">{s.riskCode} / {s.controlCode}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-graphite">
                {s.leaderName}
                <p className="text-xs text-muted">{s.group}</p>
              </td>
              <td className="px-3 py-3">
                <SeatsBadge seats={s.seats} capacity={s.capacity} />
                <p className="mt-0.5 text-xs text-muted tabular-nums">
                  {s.occupied}/{s.capacity}
                </p>
              </td>
              {onBook && (
                <td className="px-5 py-3 text-right">
                  <Button size="sm" disabled={s.seats === 0} onClick={() => onBook(s.id)}>
                    Reservar
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ Planificador */

function PlannerDashboard() {
  const { data, commit } = useData();
  const { user } = useAuth('web');
  const navigate = useNavigate();
  const [publish, setPublish] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const k = kpis(data);
  const t = todayISO();
  const week = upcomingSlots(data, 7).map((s) => slotView(data, s));
  const full = upcomingSlots(data, 60).filter((s) => slotView(data, s).seats === 0).length;
  const pending = data.bookings
    .filter((b) => b.status === 'pendiente')
    .map((b) => bookingView(data, b))
    .sort((a, b) => (a.slot.date + a.slot.start).localeCompare(b.slot.date + b.slot.start));
  const series = monthlySeries(data);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Hola, {user.name.split(' ')[0]}</p>
          <h2 className="text-2xl font-extrabold text-ink">Planificación FLP</h2>
        </div>
        <Button icon={CalendarPlus} onClick={() => setPublish(true)}>
          Publicar horario de visita
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Solicitudes pendientes" value={k.pending} icon={Inbox} tone={k.pending ? 'warning' : 'ink'} hint="Por confirmar o rechazar" onClick={() => navigate('/web/solicitudes')} />
        <KpiCard label="Visitas esta semana" value={week.length} icon={CalendarClock} hint={`${k.scheduledSlots} programadas en total`} onClick={() => navigate('/web/calendario')} />
        <KpiCard label="Ocupación de cupos" value={`${k.occupancyRate}%`} icon={Gauge} tone="petrol" hint={`${full} horarios completos`} />
        <KpiCard label="Por verificar" value={k.awaitingVerification} icon={ClipboardCheck} tone={k.awaitingVerification ? 'danger' : 'success'} hint="Visitas realizadas sin registro" />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-3">
          <SectionTitle
            title="Solicitudes por revisar"
            subtitle="Confirma o rechaza las reservas de usuarios"
            action={<Link to="/web/solicitudes" className="text-sm font-semibold text-brand hover:underline">Ver todas</Link>}
          />
          {pending.length === 0 ? (
            <EmptyState compact icon={CheckCircle2} title="Sin solicitudes pendientes" />
          ) : (
            <ul className="grid gap-2">
              {pending.slice(0, 6).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-bold first-letter:uppercase text-ink">{relativeDay(b.slot.date)}</p>
                    <p className="text-xs text-muted">{b.slot.start}–{b.slot.end}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{b.userName}</p>
                    <p className="truncate text-xs text-muted">
                      {b.slot.project.name} · {b.slot.occupied}/{b.slot.capacity} cupos
                    </p>
                  </div>
                  <TypeBadge type={b.slot.activityType} />
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="success" icon={Check} onClick={() => commit(decideBooking(data, b.id, 'confirmada', user.id))}>
                      Confirmar
                    </Button>
                    <Button size="sm" variant="secondary" icon={X} onClick={() => setRejectId(b.id)} aria-label={`Rechazar solicitud de ${b.userName}`}>
                      Rechazar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Horarios publicados por área" subtitle="Mina vs Coloso por mes" />
          <GroupedBars
            data={series}
            xKey="mes"
            series={[
              { key: 'mina', name: 'Mina', color: CHART.s1 },
              { key: 'coloso', name: 'Coloso', color: CHART.s2 },
            ]}
            height={240}
          />
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title="Agenda de la semana" subtitle={`Desde ${fmtShort(t)} hasta ${fmtShort(addDaysISO(t, 7))}`} />
        <UpcomingTable slots={week} />
      </Card>

      <Modal open={publish} onClose={() => setPublish(false)} title="Publicar horario de visita" description="Define disponibilidad del proyecto, actividad, RM/CC y requisitos." size="lg">
        <SlotForm by={user.id} onDone={() => setPublish(false)} onCancel={() => setPublish(false)} />
      </Modal>
      <ConfirmDialog
        open={Boolean(rejectId)}
        onClose={() => setRejectId(null)}
        onConfirm={(reason) => {
          if (rejectId && commit(decideBooking(data, rejectId, 'rechazada', user.id, reason))) setRejectId(null);
        }}
        title="Rechazar solicitud"
        message="La persona será notificada y el cupo quedará liberado."
        reasonLabel="Motivo del rechazo"
        reasonRequired
        confirmLabel="Rechazar"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Usuario */

function UserDashboard() {
  const { data } = useData();
  const { user } = useAuth('web');
  const navigate = useNavigate();
  const [bookId, setBookId] = useState<string | null>(null);
  const mine = userBookings(data, user.id);
  const t = todayISO();
  const upcoming = mine.filter((b) => ['pendiente', 'confirmada'].includes(b.status) && b.slot.date >= t);
  const toVerify = awaitingForUser(data, user.id);
  const k = kpis(data, { userId: user.id });
  const series = monthlySeries(data, { userId: user.id });
  const next = upcoming[0];
  const myIds = new Set(mine.filter((b) => ['pendiente', 'confirmada'].includes(b.status)).map((b) => b.slotId));
  const suggestions = upcomingSlots(data, 21)
    .map((s) => slotView(data, s))
    .filter((s) => s.seats > 0 && !myIds.has(s.id) && s.date > t && (user.area === 'Ambas' || s.project.area === user.area))
    .slice(0, 5);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{capitalize(fmtLong(t))}</p>
          <h2 className="text-2xl font-extrabold text-ink">Hola, {user.name.split(' ')[0]}</h2>
        </div>
        <Button icon={CalendarPlus} onClick={() => navigate('/web/reservar')}>
          Reservar visita FLP
        </Button>
      </div>

      {toVerify.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-brand/30 bg-brand-50 p-4">
          <span className="grid size-11 place-items-center rounded-xl bg-brand text-white">
            <ClipboardCheck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">Tienes {toVerify.length} visita(s) por verificar</p>
            <p className="text-sm text-graphite">
              {toVerify[0].slot.project.name} · {relativeDay(toVerify[0].slot.date)} {toVerify[0].slot.start}
            </p>
          </div>
          <Button onClick={() => navigate(`/web/verificacion/${toVerify[0].id}`)} icon={ArrowRight}>
            Registrar verificación
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Próximas visitas" value={upcoming.length} icon={CalendarClock} hint={`${upcoming.filter((b) => b.status === 'pendiente').length} pendientes de confirmación`} onClick={() => navigate('/web/mis-visitas')} />
        <KpiCard label="Visitas completadas" value={k.completed} icon={CheckCircle2} tone="success" hint="Histórico de participación" />
        <KpiCard label="Mi cumplimiento" value={`${k.avgCompliance}%`} icon={Target} tone="petrol" hint={`${k.verifications} verificaciones registradas`} />
        <KpiCard label="Acciones abiertas" value={k.actionsOpen} icon={ListChecks} tone={k.actionsOverdue ? 'danger' : 'ink'} hint={`${k.actionsOverdue} vencidas`} onClick={() => navigate('/web/acciones')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-1">
          {next ? (
            <div className="flex h-full flex-col">
              <div className="bg-ink p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Próxima visita</p>
                <p className="mt-1 text-2xl font-extrabold first-letter:uppercase">{relativeDay(next.slot.date)}</p>
                <p className="flex items-center gap-1.5 text-sm text-white/70">
                  <Clock className="size-3.5" aria-hidden /> {next.slot.start}–{next.slot.end} hrs
                </p>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap gap-2">
                  <BookingBadge status={next.status} />
                  <TypeBadge type={next.slot.activityType} />
                </div>
                <p className="mt-2 font-bold text-ink">{next.slot.project.name}</p>
                <p className="text-sm text-muted">{next.slot.title}</p>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-graphite">Requisitos listos</span>
                    <span className="font-bold text-ink">
                      {next.checklist.length}/{next.slot.requirements.length}
                    </span>
                  </div>
                  <ProgressBar value={(next.checklist.length / Math.max(1, next.slot.requirements.length)) * 100} tone="success" label="Requisitos listos" />
                </div>
                <Button variant="secondary" className="mt-auto" block onClick={() => navigate('/web/mis-visitas')}>
                  Ver detalle y checklist
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState icon={CalendarClock} title="Sin visitas próximas" description="Reserva un horario disponible en algún proyecto." action={<Button onClick={() => navigate('/web/reservar')}>Buscar horarios</Button>} />
          )}
        </Card>
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Mi participación mensual" subtitle="Visitas inscritas vs verificaciones registradas" />
          <GroupedBars
            data={series}
            xKey="mes"
            series={[
              { key: 'programadas', name: 'Inscritas', color: CHART.s1 },
              { key: 'completadas', name: 'Verificadas', color: CHART.s2 },
            ]}
            height={240}
          />
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Horarios recomendados para ti"
          subtitle={user.area === 'Ambas' ? 'Con cupos disponibles' : `Con cupos disponibles en ${user.area}`}
          action={<Link to="/web/reservar" className="text-sm font-semibold text-brand hover:underline">Ver todos</Link>}
        />
        <UpcomingTable slots={suggestions} onBook={setBookId} />
      </Card>

      <BookingDialog slotId={bookId} userId={user.id} onClose={() => setBookId(null)} />
    </div>
  );
}
