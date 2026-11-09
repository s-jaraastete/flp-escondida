import { useState } from 'react';
import { Zap } from 'lucide-react';
import type { ActivityType, FlpData } from '@/types';
import { useData } from '@/contexts/DataContext';
import { Button, EmptyState, Field } from '@/components/ui/primitives';
import { AreaBadge, TypeBadge } from '@/components/ui/status';
import { ACTIVITY_TYPES } from '@/data/catalogs';
import { findProject, findUser, registerSpot } from '@/services/flpService';
import { fmtShort, todayISO } from '@/utils/date';
import { cx } from '@/utils/misc';

/** Formulario corto para registrar un FLP spot (FLP hecho sin reserva previa). */
export function SpotForm({ userId, large }: { userId: string; large?: boolean }) {
  const { data, commit } = useData();
  const blank = { projectId: '', activityType: 'OVCC' as ActivityType, date: todayISO(), note: '' };
  const [f, setF] = useState(blank);
  const projects = data.projects.filter((p) => p.status === 'vigente');

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (commit(registerSpot(data, { userId, ...f }))) setF(blank);
      }}
    >
      <Field label="¿Dónde hiciste el FLP?" required>
        {(p) => (
          <select {...p} className={cx('input', large && 'min-h-12 text-base')} value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
            <option value="">Selecciona el proyecto…</option>
            {projects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.code} · {x.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div>
        <p className="label">¿Qué hiciste?</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de actividad">
          {(Object.keys(ACTIVITY_TYPES) as ActivityType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={f.activityType === t}
              onClick={() => setF({ ...f, activityType: t })}
              className={cx(
                'rounded-xl border-2 p-3 text-left',
                f.activityType === t ? 'border-brand bg-brand-50' : 'border-line bg-surface',
              )}
            >
              <span className="block font-extrabold text-ink">
                {ACTIVITY_TYPES[t].label} · {ACTIVITY_TYPES[t].flp}
              </span>
              <span className="block text-xs text-graphite">{ACTIVITY_TYPES[t].name}</span>
            </button>
          ))}
        </div>
      </div>
      <Field label="Fecha" required>
        {(p) => <input {...p} type="date" max={todayISO()} className={cx('input', large && 'min-h-12 text-base')} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />}
      </Field>
      <Field label="Comentario (opcional)">
        {(p) => <textarea {...p} className="input min-h-16" placeholder="Ej.: pasé por el área y aproveché de observar los controles." value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />}
      </Field>
      <Button type="submit" size="lg" block icon={Zap}>
        Registrar FLP spot
      </Button>
    </form>
  );
}

/** Lista de FLP spot (propios o de todos), del más reciente al más antiguo. */
export function SpotList({ data, userId, showUser }: { data: FlpData; userId?: string; showUser?: boolean }) {
  const list = (data.spots ?? []).filter((s) => !userId || s.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) return <EmptyState compact icon={Zap} title="Aún no hay FLP spot" description="Cuando hagas un FLP sin reserva, regístralo aquí." />;
  return (
    <ul className="grid gap-2">
      {list.slice(0, 40).map((s) => {
        const p = findProject(data, s.projectId);
        return (
          <li key={s.id} className="flex items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-line">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-petrol-50 text-petrol">
              <Zap className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <TypeBadge type={s.activityType} />
                {p && <AreaBadge area={p.area} />}
                <span className="text-xs text-muted">{fmtShort(s.date)}</span>
              </div>
              <p className="mt-0.5 truncate font-bold text-ink">{p?.name ?? '—'}</p>
              {showUser && <p className="truncate text-xs text-graphite">{findUser(data, s.userId)?.name}</p>}
              {s.note && <p className="truncate text-xs text-muted">{s.note}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
