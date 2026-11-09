import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ListChecks, Plus, RotateCcw, Search, PlayCircle } from 'lucide-react';
import type { Area } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { Button, Card, EmptyState, KpiCard, Segmented } from '@/components/ui/primitives';
import { ActionBadge, AreaBadge } from '@/components/ui/status';
import { findProject, setActionStatus } from '@/services/flpService';
import { isOverdue } from '@/services/selectors';
import { ActionFormDialog, scopedActions } from '@/features/actions/actions';
import { fmtDate, daysFromToday } from '@/utils/date';
import { normalize, pct } from '@/utils/misc';

type Filter = 'activas' | 'vencidas' | 'cerradas' | 'todas';

export default function ActionsPage() {
  const { data, commit } = useData();
  const { user, role } = useAuth('web');
  const [filter, setFilter] = useState<Filter>('activas');
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const scope = useMemo(() => scopedActions(data, role, user.id), [data, role, user.id]);
  const list = useMemo(() => {
    const nq = normalize(q);
    return scope
      .filter((a) => {
        if (filter === 'activas') return a.status !== 'cerrada';
        if (filter === 'vencidas') return isOverdue(a);
        if (filter === 'cerradas') return a.status === 'cerrada';
        return true;
      })
      .filter((a) => area === 'Todas' || findProject(data, a.projectId)?.area === area)
      .filter((a) => !nq || normalize(`${a.finding} ${a.description} ${a.responsible} ${findProject(data, a.projectId)?.name}`).includes(nq))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [scope, filter, area, q, data]);

  const open = scope.filter((a) => a.status !== 'cerrada').length;
  const overdue = scope.filter(isOverdue).length;
  const closed = scope.filter((a) => a.status === 'cerrada').length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">{role === 'user' ? 'Mis hallazgos y acciones' : 'Hallazgos y planes de acción'}</h2>
          <p className="text-sm text-muted">Seguimiento de acciones derivadas de las verificaciones FLP.</p>
        </div>
        {role !== 'user' && (
          <Button icon={Plus} onClick={() => setCreating(true)}>
            Nueva acción
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total acciones" value={scope.length} icon={ListChecks} tone="ink" />
        <KpiCard label="Abiertas" value={open} icon={PlayCircle} tone="warning" />
        <KpiCard label="Vencidas" value={overdue} icon={AlertTriangle} tone="danger" onClick={() => setFilter('vencidas')} />
        <KpiCard label="Cierre" value={`${pct(closed, scope.length)}%`} icon={CheckCircle2} tone="success" hint={`${closed} cerradas`} />
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Segmented<Filter>
          ariaLabel="Estado"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'activas', label: 'Activas' },
            { value: 'vencidas', label: 'Vencidas' },
            { value: 'cerradas', label: 'Cerradas' },
            { value: 'todas', label: 'Todas' },
          ]}
        />
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" placeholder="Buscar hallazgo, acción, responsable…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <select className="input h-10 w-auto" value={area} onChange={(e) => setArea(e.target.value as Area | 'Todas')} aria-label="Área">
          <option value="Todas">Todas las áreas</option>
          <option>Mina</option>
          <option>Coloso</option>
        </select>
      </Card>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={ListChecks} title="No hay acciones en esta vista" description={role === 'user' ? 'Las acciones se crean al registrar hallazgos en tus verificaciones.' : undefined} />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.slice(0, 80).map((a) => {
            const p = findProject(data, a.projectId);
            const d = daysFromToday(a.dueDate);
            return (
              <Card key={a.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ActionBadge action={a} />
                    {p && <AreaBadge area={p.area} />}
                    {a.completedOnSpot && <span className="text-xs text-success">Cerrada en terreno</span>}
                  </div>
                  <span className={isOverdue(a) ? 'text-xs font-semibold text-danger' : 'text-xs text-muted'}>
                    {a.status === 'cerrada' ? `Cerrada ${a.closedAt ? fmtDate(a.closedAt.slice(0, 10)) : ''}` : d < 0 ? `Venció hace ${-d} días` : d === 0 ? 'Vence hoy' : `Vence en ${d} días`}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">{p?.code} · {p?.name}</p>
                <p className="mt-1 text-sm text-graphite">
                  <span className="font-semibold text-ink">Hallazgo:</span> {a.finding}
                </p>
                <p className="mt-1 text-sm text-graphite">
                  <span className="font-semibold text-ink">Acción:</span> {a.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-graphite">
                  <span>
                    Responsable: <strong className="text-ink">{a.responsible}</strong> · Compromiso {fmtDate(a.dueDate)}
                  </span>
                  <div className="flex gap-1.5">
                    {a.status === 'abierta' && (
                      <Button size="sm" variant="secondary" onClick={() => commit(setActionStatus(data, a.id, 'en_progreso'))}>
                        En progreso
                      </Button>
                    )}
                    {a.status !== 'cerrada' ? (
                      <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => commit(setActionStatus(data, a.id, 'cerrada'))}>
                        Cerrar
                      </Button>
                    ) : (
                      role !== 'user' && (
                        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => commit(setActionStatus(data, a.id, 'abierta'))}>
                          Reabrir
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ActionFormDialog open={creating} onClose={() => setCreating(false)} by={user.id} />
    </div>
  );
}
