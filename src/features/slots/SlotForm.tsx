import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import type { ActivityType, RequirementKey, Slot } from '@/types';
import { ACTIVITY_TYPES, REQUIREMENTS, REQUIREMENT_KEYS, RISKS, controlsForRisk } from '@/data/catalogs';
import { Button, Field, Segmented } from '@/components/ui/primitives';
import { useData } from '@/contexts/DataContext';
import { createSlot, updateSlot, validateSlot, type SlotInput } from '@/services/flpService';
import { addDaysISO, todayISO } from '@/utils/date';
import { cx } from '@/utils/misc';
import { REQUIREMENT_ICON } from '@/features/booking/RequirementsChecklist';

function emptyInput(projectId = ''): SlotInput {
  return {
    projectId,
    date: addDaysISO(todayISO(), 2),
    start: '09:00',
    end: '11:00',
    activityType: 'OVCC',
    capacity: 4,
    riskId: '',
    controlId: '',
    leaderId: '',
    group: 'Grupo 1',
    requirements: [],
    notes: '',
  };
}

/**
 * Crear / editar disponibilidad de un proyecto (horario de visita FLP).
 * Muestra conflictos de agenda (mismo proyecto o mismo líder superpuestos) antes de publicar.
 */
export function SlotForm({
  slot,
  by,
  defaultProjectId,
  onDone,
  onCancel,
  mobile,
}: {
  slot?: Slot;
  by: string;
  defaultProjectId?: string;
  onDone: () => void;
  onCancel?: () => void;
  mobile?: boolean;
}) {
  const { data, commit } = useData();
  const [input, setInput] = useState<SlotInput>(() => {
    if (slot) {
      const { projectId, date, start, end, activityType, capacity, riskId, controlId, leaderId, group, requirements, notes } = slot;
      return { projectId, date, start, end, activityType, capacity, riskId, controlId, leaderId, group, requirements, notes };
    }
    const base = emptyInput(defaultProjectId);
    const p = data.projects.find((x) => x.id === defaultProjectId);
    if (p) {
      base.riskId = p.riskIds[0];
      base.controlId = controlsForRisk(p.riskIds[0])[0]?.id ?? '';
      base.requirements = [...p.defaultRequirements];
    }
    return base;
  });
  const [submitted, setSubmitted] = useState(false);

  const projects = data.projects.filter((p) => p.status === 'vigente' || p.id === input.projectId);
  const leaders = data.users.filter((u) => u.isFlpLeader && u.active);
  const project = data.projects.find((p) => p.id === input.projectId);
  const issues = useMemo(() => validateSlot(data, input, slot?.id), [data, input, slot?.id]);
  const err = (f: keyof SlotInput) => (submitted ? issues.find((i) => i.field === f)?.message : undefined);
  const conflicts = issues.filter((i) => i.message.startsWith('Conflicto'));

  const set = <K extends keyof SlotInput>(k: K, v: SlotInput[K]) => setInput((s) => ({ ...s, [k]: v }));

  const onProject = (id: string) => {
    const p = data.projects.find((x) => x.id === id);
    setInput((s) => ({
      ...s,
      projectId: id,
      riskId: p?.riskIds[0] ?? '',
      controlId: p ? controlsForRisk(p.riskIds[0])[0]?.id ?? '' : '',
      requirements: p ? [...p.defaultRequirements] : s.requirements,
    }));
  };

  const onRisk = (riskId: string) => setInput((s) => ({ ...s, riskId, controlId: controlsForRisk(riskId)[0]?.id ?? '' }));

  const toggleReq = (k: RequirementKey) =>
    set('requirements', input.requirements.includes(k) ? input.requirements.filter((x) => x !== k) : [...input.requirements, k]);

  const save = () => {
    setSubmitted(true);
    if (issues.length) return;
    const ok = slot ? commit(updateSlot(data, slot.id, input)) : commit(createSlot(data, input, by));
    if (ok) onDone();
  };

  const riskOptions = [...RISKS].sort((a, b) => Number(!project?.riskIds.includes(a.id)) - Number(!project?.riskIds.includes(b.id)));
  const grid = mobile ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2';
  const inputCls = cx('input', mobile && 'h-12 text-base');

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-5"
    >
      <div className={grid}>
        <Field label="Proyecto" required error={err('projectId')} className={mobile ? '' : 'sm:col-span-2'}>
          {(p) => (
            <select {...p} className={inputCls} value={input.projectId} onChange={(e) => onProject(e.target.value)} disabled={Boolean(slot)}>
              <option value="">Selecciona un proyecto…</option>
              {(['Mina', 'Coloso'] as const).map((area) => (
                <optgroup key={area} label={area}>
                  {projects
                    .filter((x) => x.area === area)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.code} · {x.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          )}
        </Field>
        <Field label="Fecha" required error={err('date')}>
          {(p) => <input {...p} type="date" min={todayISO()} className={inputCls} value={input.date} onChange={(e) => set('date', e.target.value)} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio" required error={err('start')}>
            {(p) => <input {...p} type="time" step={900} className={inputCls} value={input.start} onChange={(e) => set('start', e.target.value)} />}
          </Field>
          <Field label="Término" required error={err('end')}>
            {(p) => <input {...p} type="time" step={900} className={inputCls} value={input.end} onChange={(e) => set('end', e.target.value)} />}
          </Field>
        </div>
        <div>
          <span className="label">Tipo de actividad</span>
          <Segmented<ActivityType>
            ariaLabel="Tipo de actividad"
            block
            value={input.activityType}
            onChange={(v) => set('activityType', v)}
            options={[
              { value: 'OVCC', label: 'OVCC' },
              { value: 'CTP', label: 'CTP' },
            ]}
          />
          <p className="mt-1 text-xs text-muted">{ACTIVITY_TYPES[input.activityType].description}</p>
        </div>
        <Field label="Cupos" required error={err('capacity')} hint="Máximo de participantes (1 a 30).">
          {(p) => (
            <input
              {...p}
              type="number"
              min={1}
              max={30}
              inputMode="numeric"
              className={inputCls}
              value={Number.isNaN(input.capacity) ? '' : input.capacity}
              onChange={(e) => set('capacity', parseInt(e.target.value, 10))}
            />
          )}
        </Field>
        <Field label="Riesgo material (RM)" required error={err('riskId')}>
          {(p) => (
            <select {...p} className={inputCls} value={input.riskId} onChange={(e) => onRisk(e.target.value)}>
              <option value="">Selecciona…</option>
              {riskOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.name}
                  {project?.riskIds.includes(r.id) ? ' ★' : ''}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Control crítico (CC)" required error={err('controlId')}>
          {(p) => (
            <select {...p} className={inputCls} value={input.controlId} onChange={(e) => set('controlId', e.target.value)} disabled={!input.riskId}>
              <option value="">Selecciona…</option>
              {controlsForRisk(input.riskId).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Líder FLP" required error={err('leaderId')}>
          {(p) => (
            <select {...p} className={inputCls} value={input.leaderId} onChange={(e) => set('leaderId', e.target.value)}>
              <option value="">Selecciona…</option>
              {leaders.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.position}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Grupo de visita" required error={err('group')}>
          {(p) => (
            <>
              <input {...p} list="groups" className={inputCls} value={input.group} onChange={(e) => set('group', e.target.value)} />
              <datalist id="groups">
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={i} value={`Grupo ${i + 1}`} />
                ))}
              </datalist>
            </>
          )}
        </Field>
      </div>

      <fieldset>
        <legend className="label">Requisitos de acceso y seguridad</legend>
        <div className={cx('grid gap-2', !mobile && 'sm:grid-cols-2')}>
          {REQUIREMENT_KEYS.map((k) => {
            const Icon = REQUIREMENT_ICON[k];
            const on = input.requirements.includes(k);
            return (
              <button
                key={k}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleReq(k)}
                className={cx(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                  on ? 'border-brand bg-brand-50 font-semibold text-brand-700' : 'border-line text-graphite hover:border-graphite/30',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{REQUIREMENTS[k].label}</span>
                {on && <CheckCircle2 className="size-4" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="Notas para participantes">
        {(p) => (
          <textarea
            {...p}
            className="input min-h-20"
            value={input.notes}
            maxLength={400}
            placeholder="Punto de encuentro, foco de la visita, coordinación con CO / ITO…"
            onChange={(e) => set('notes', e.target.value)}
          />
        )}
      </Field>

      {conflicts.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-50 p-3 text-sm text-danger">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" aria-hidden /> Conflictos de agenda detectados
          </p>
          <ul className="mt-1 list-disc pl-6 text-xs">
            {conflicts.map((c) => (
              <li key={c.message}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}
      {submitted && issues.length > 0 && conflicts.length === 0 && (
        <p role="alert" className="text-sm font-medium text-danger">
          Revisa los campos marcados.
        </p>
      )}

      <div className={cx('flex gap-2', mobile ? 'flex-col-reverse' : 'justify-end')}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} size={mobile ? 'lg' : 'md'}>
            Cancelar
          </Button>
        )}
        <Button type="submit" icon={Send} size={mobile ? 'lg' : 'md'}>
          {slot ? 'Guardar cambios' : 'Publicar horario'}
        </Button>
      </div>
    </form>
  );
}
