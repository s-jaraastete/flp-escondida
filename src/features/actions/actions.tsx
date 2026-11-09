import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ActionPlan, FlpData, Role } from '@/types';
import { ACTION_OWNERS } from '@/data/catalogs';
import { Modal } from '@/components/ui/Modal';
import { Button, Field } from '@/components/ui/primitives';
import { useData } from '@/contexts/DataContext';
import { createAction, type ManualActionInput } from '@/services/flpService';
import { addDaysISO, todayISO } from '@/utils/date';

/** Acciones visibles según el perfil: el usuario ve las de sus verificaciones o creadas por él. */
export function scopedActions(d: FlpData, role: Role, userId: string): ActionPlan[] {
  if (role !== 'user') return d.actions;
  const mine = new Set(d.verifications.filter((v) => v.userId === userId).map((v) => v.id));
  return d.actions.filter((a) => (a.verificationId ? mine.has(a.verificationId) : a.createdBy === userId));
}

/** Registrar un hallazgo y su plan de acción fuera de una verificación. */
export function ActionFormDialog({ open, onClose, by, container }: { open: boolean; onClose: () => void; by: string; container?: HTMLElement | null }) {
  const { data, commit } = useData();
  const blank: ManualActionInput = { projectId: '', finding: '', description: '', responsible: '', dueDate: addDaysISO(todayISO(), 14) };
  const [f, setF] = useState(blank);
  const [submitted, setSubmitted] = useState(false);
  const errs = {
    projectId: !f.projectId ? 'Selecciona un proyecto.' : undefined,
    finding: !f.finding.trim() ? 'Describe el hallazgo.' : undefined,
    description: !f.description.trim() ? 'Describe la acción.' : undefined,
    responsible: !f.responsible ? 'Asigna un responsable.' : undefined,
    dueDate: !f.dueDate || f.dueDate < todayISO() ? 'Debe ser hoy o posterior.' : undefined,
  };
  const e = (k: keyof typeof errs) => (submitted ? errs[k] : undefined);
  const close = () => {
    setF(blank);
    setSubmitted(false);
    onClose();
  };
  const save = () => {
    setSubmitted(true);
    if (Object.values(errs).some(Boolean)) return;
    if (commit(createAction(data, f, by))) close();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      container={container}
      title="Nuevo hallazgo y plan de acción"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button icon={Plus} onClick={save}>
            Crear acción
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Proyecto" required error={e('projectId')}>
          {(p) => (
            <select {...p} className="input" value={f.projectId} onChange={(ev) => setF({ ...f, projectId: ev.target.value })}>
              <option value="">Selecciona…</option>
              {data.projects.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code} · {x.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Hallazgo" required error={e('finding')}>
          {(p) => <textarea {...p} className="input min-h-16" value={f.finding} onChange={(ev) => setF({ ...f, finding: ev.target.value })} />}
        </Field>
        <Field label="Acción" required error={e('description')}>
          {(p) => <textarea {...p} className="input min-h-16" value={f.description} onChange={(ev) => setF({ ...f, description: ev.target.value })} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Responsable" required error={e('responsible')}>
            {(p) => (
              <select {...p} className="input" value={f.responsible} onChange={(ev) => setF({ ...f, responsible: ev.target.value })}>
                <option value="">Selecciona…</option>
                {ACTION_OWNERS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Fecha compromiso" required error={e('dueDate')}>
            {(p) => <input {...p} type="date" min={todayISO()} className="input" value={f.dueDate} onChange={(ev) => setF({ ...f, dueDate: ev.target.value })} />}
          </Field>
        </div>
      </div>
    </Modal>
  );
}
