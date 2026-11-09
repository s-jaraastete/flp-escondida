import { useMemo, useState } from 'react';
import { CheckCircle2, ListChecks, Plus } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { usePhoneContainer } from '@/layouts/PhoneFrame';
import { Chip } from '@/components/mobile/MobileKit';
import { Button, EmptyState } from '@/components/ui/primitives';
import { ActionBadge } from '@/components/ui/status';
import { findProject, setActionStatus } from '@/services/flpService';
import { isOverdue } from '@/services/selectors';
import { ActionFormDialog, scopedActions } from '@/features/actions/actions';
import { daysFromToday, fmtDate } from '@/utils/date';

type F = 'activas' | 'vencidas' | 'cerradas';

export default function MobileActions() {
  const { data, commit } = useData();
  const { user, role } = useAuth('mobile');
  const container = usePhoneContainer();
  const [f, setF] = useState<F>('activas');
  const [creating, setCreating] = useState(false);
  const scope = useMemo(() => scopedActions(data, role, user.id), [data, role, user.id]);
  const counts = {
    activas: scope.filter((a) => a.status !== 'cerrada').length,
    vencidas: scope.filter(isOverdue).length,
    cerradas: scope.filter((a) => a.status === 'cerrada').length,
  };
  const list = scope
    .filter((a) => (f === 'activas' ? a.status !== 'cerrada' : f === 'vencidas' ? isOverdue(a) : a.status === 'cerrada'))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 50);

  return (
    <div>
      <MobileHeader
        title={role === 'user' ? 'Mis acciones' : 'Planes de acción'}
        subtitle="Hallazgos y seguimiento"
        right={
          role !== 'user' ? (
            <button onClick={() => setCreating(true)} className="grid size-10 place-items-center rounded-full bg-brand" aria-label="Nueva acción">
              <Plus className="size-5" />
            </button>
          ) : undefined
        }
      />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
        <Chip active={f === 'activas'} onClick={() => setF('activas')}>
          Activas · {counts.activas}
        </Chip>
        <Chip active={f === 'vencidas'} onClick={() => setF('vencidas')}>
          Vencidas · {counts.vencidas}
        </Chip>
        <Chip active={f === 'cerradas'} onClick={() => setF('cerradas')}>
          Cerradas · {counts.cerradas}
        </Chip>
      </div>
      <div className="grid gap-2.5 px-4 pt-3">
        {list.length === 0 && <EmptyState icon={ListChecks} title="No hay acciones aquí" description={role === 'user' ? 'Se crean al registrar hallazgos en tus verificaciones.' : undefined} />}
        {list.map((a) => {
          const p = findProject(data, a.projectId);
          const d = daysFromToday(a.dueDate);
          return (
            <article key={a.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <ActionBadge action={a} />
                <span className={isOverdue(a) ? 'text-xs font-bold text-danger' : 'text-xs text-muted'}>
                  {a.status === 'cerrada' ? 'Cerrada' : d < 0 ? `Venció hace ${-d} d` : d === 0 ? 'Vence hoy' : `Vence en ${d} d`}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted">{p?.name}</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">{a.description}</p>
              <p className="mt-1 line-clamp-2 text-xs text-graphite">Hallazgo: {a.finding}</p>
              <p className="mt-2 text-xs text-muted">
                {a.responsible} · {fmtDate(a.dueDate)}
              </p>
              {a.status !== 'cerrada' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="secondary" disabled={a.status === 'en_progreso'} onClick={() => commit(setActionStatus(data, a.id, 'en_progreso'))}>
                    {a.status === 'en_progreso' ? 'En progreso' : 'Iniciar'}
                  </Button>
                  <Button variant="success" icon={CheckCircle2} onClick={() => commit(setActionStatus(data, a.id, 'cerrada'))}>
                    Cerrar
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <ActionFormDialog open={creating} onClose={() => setCreating(false)} by={user.id} container={container} />
    </div>
  );
}
