import { useMemo, useState } from 'react';
import { CalendarClock, CalendarPlus, Eye, Search, Users, AlertTriangle } from 'lucide-react';
import type { ActivityType, Area } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { Button, Card, EmptyState, KpiCard, ProgressBar, Segmented } from '@/components/ui/primitives';
import { Badge, TypeBadge, AreaBadge } from '@/components/ui/status';
import { Modal } from '@/components/ui/Modal';
import { slotView } from '@/services/selectors';
import { SlotForm } from '@/features/slots/SlotForm';
import { SlotDetailDialog } from '@/features/slots/SlotDetailDialog';
import { capitalize, fmtShort, todayISO } from '@/utils/date';
import { normalize } from '@/utils/misc';

type Period = 'proximas' | 'pasadas' | 'todas';

export default function SchedulingPage() {
  const { data } = useData();
  const { user, role } = useAuth('web');
  const [publish, setPublish] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState<Period>('proximas');
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const [type, setType] = useState<ActivityType | 'Todas'>('Todas');
  const [status, setStatus] = useState<'publicado' | 'cancelado' | 'todos'>('publicado');
  const t = todayISO();

  const all = useMemo(() => data.slots.map((s) => slotView(data, s)), [data]);
  const list = useMemo(() => {
    const nq = normalize(q);
    const l = all.filter(
      (s) =>
        (period === 'todas' || (period === 'proximas' ? s.date >= t : s.date < t)) &&
        (area === 'Todas' || s.project.area === area) &&
        (type === 'Todas' || s.activityType === type) &&
        (status === 'todos' || s.status === status) &&
        (!nq || normalize(`${s.project.name} ${s.project.code} ${s.title} ${s.leaderName} ${s.group} ${s.companyName}`).includes(nq)),
    );
    return period === 'pasadas' ? l.reverse() : l;
  }, [all, q, period, area, type, status, t]);

  const upcoming = all.filter((s) => s.status === 'publicado' && s.date >= t);
  const full = upcoming.filter((s) => s.seats === 0).length;
  const empty = upcoming.filter((s) => s.occupied === 0).length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">{role === 'admin' ? 'Gestión de actividades FLP' : 'Programación de visitas'}</h2>
          <p className="text-sm text-muted">Publica la disponibilidad de los proyectos y gestiona los horarios OVCC y CTP.</p>
        </div>
        <Button icon={CalendarPlus} onClick={() => setPublish(true)}>
          Nuevo horario
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Horarios próximos" value={upcoming.length} icon={CalendarClock} />
        <KpiCard label="Horarios completos" value={full} icon={AlertTriangle} tone={full ? 'warning' : 'ink'} hint="Sin cupos disponibles" />
        <KpiCard label="Sin inscritos" value={empty} icon={Users} tone="petrol" hint="Considera difundir o reprogramar" />
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" placeholder="Buscar proyecto, líder, grupo…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <Segmented<Period> ariaLabel="Período" size="sm" value={period} onChange={setPeriod} options={[{ value: 'proximas', label: 'Próximas' }, { value: 'pasadas', label: 'Pasadas' }, { value: 'todas', label: 'Todas' }]} />
        <select className="input h-9 w-auto py-1" value={area} onChange={(e) => setArea(e.target.value as Area | 'Todas')} aria-label="Área">
          <option value="Todas">Todas las áreas</option>
          <option>Mina</option>
          <option>Coloso</option>
        </select>
        <select className="input h-9 w-auto py-1" value={type} onChange={(e) => setType(e.target.value as ActivityType | 'Todas')} aria-label="Tipo">
          <option value="Todas">OVCC y CTP</option>
          <option>OVCC</option>
          <option>CTP</option>
        </select>
        <select className="input h-9 w-auto py-1" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Estado">
          <option value="publicado">Publicados</option>
          <option value="cancelado">Cancelados</option>
          <option value="todos">Todos</option>
        </select>
      </Card>

      <Card className="overflow-x-auto">
        {list.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No hay horarios con estos filtros" action={<Button onClick={() => setPublish(true)}>Publicar horario</Button>} />
        ) : (
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-semibold">Fecha</th>
                <th className="px-3 py-3 font-semibold">Proyecto</th>
                <th className="px-3 py-3 font-semibold">Actividad · RM / CC</th>
                <th className="px-3 py-3 font-semibold">Líder / grupo</th>
                <th className="px-3 py-3 font-semibold">Ocupación</th>
                <th className="px-3 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 120).map((s) => (
                <tr key={s.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                  <td className="px-5 py-3">
                    <p className="font-semibold first-letter:uppercase text-ink">{capitalize(fmtShort(s.date))}</p>
                    <p className="text-xs text-muted">{s.start}–{s.end}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-ink">{s.project.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <AreaBadge area={s.project.area} />
                      <span className="truncate text-xs text-muted">{s.companyName}</span>
                    </div>
                  </td>
                  <td className="max-w-72 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={s.activityType} />
                      <span className="text-xs font-semibold text-graphite">{s.riskCode} · {s.controlCode}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted" title={s.controlName}>{s.controlName}</p>
                  </td>
                  <td className="px-3 py-3 text-graphite">
                    {s.leaderName}
                    <p className="text-xs text-muted">{s.group}</p>
                  </td>
                  <td className="w-40 px-3 py-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="tabular-nums text-ink">{s.occupied}/{s.capacity}</span>
                      {s.seats === 0 && <span className="font-semibold text-danger">Completo</span>}
                    </div>
                    <ProgressBar value={(s.occupied / s.capacity) * 100} tone={s.seats === 0 ? 'danger' : 'brand'} label="Ocupación" />
                  </td>
                  <td className="px-3 py-3">
                    {s.status === 'cancelado' ? <Badge tone="danger">Cancelado</Badge> : s.date < t ? <Badge>Realizado</Badge> : <Badge tone="success">Publicado</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="secondary" icon={Eye} onClick={() => setDetail(s.id)}>
                      Gestionar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {list.length > 120 && <p className="p-3 text-center text-xs text-muted">Mostrando 120 de {list.length}. Usa los filtros para acotar.</p>}
      </Card>

      <Modal open={publish} onClose={() => setPublish(false)} title="Publicar horario de visita" description="El horario quedará disponible para reservas inmediatamente." size="lg">
        <SlotForm by={user.id} onDone={() => setPublish(false)} onCancel={() => setPublish(false)} />
      </Modal>
      <SlotDetailDialog slotId={detail} role={role} userId={user.id} onClose={() => setDetail(null)} />
    </div>
  );
}
