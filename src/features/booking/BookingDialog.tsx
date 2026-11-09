import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarCheck } from 'lucide-react';
import type { RequirementKey } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button, Checkbox } from '@/components/ui/primitives';
import { useData } from '@/contexts/DataContext';
import { bookSlot, findSlot, findUserOverlap } from '@/services/flpService';
import { slotView } from '@/services/selectors';
import { SlotSummary } from '@/features/slots/SlotSummary';
import { RequirementsChecklist } from './RequirementsChecklist';

/** Reserva desde la web: detalle + requisitos + confirmación en un solo diálogo. */
export function BookingDialog({ slotId, userId, onClose, onBooked }: { slotId: string | null; userId: string; onClose: () => void; onBooked?: () => void }) {
  const { data, commitWith } = useData();
  const [checked, setChecked] = useState<RequirementKey[]>([]);
  const [ack, setAck] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setChecked([]);
    setAck(false);
    setNote('');
    setError('');
  }, [slotId]);

  const raw = slotId ? findSlot(data, slotId) : undefined;
  if (!raw) return null;
  const slot = slotView(data, raw);
  const overlap = findUserOverlap(data, userId, raw);

  const submit = () => {
    if (!ack) {
      setError('Debes confirmar que revisaste los requisitos.');
      return;
    }
    const r = commitWith(bookSlot(data, { slotId: raw.id, userId, requirementsAck: ack, checklist: checked, note }));
    if (r) {
      onBooked?.();
      onClose();
    }
  };

  return (
    <Modal
      open={Boolean(slotId)}
      onClose={onClose}
      title="Reservar visita FLP"
      description="Revisa el detalle y los requisitos antes de confirmar."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={CalendarCheck} onClick={submit} disabled={slot.seats === 0}>
            Confirmar reserva
          </Button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <SlotSummary slot={slot} compact />
        <div>
          <p className="label">Requisitos previos ({slot.requirements.length})</p>
          <p className="mb-3 text-xs text-muted">Marca lo que ya tienes listo. Lo pendiente quedará en tu checklist previo a la visita.</p>
          <RequirementsChecklist
            requirements={slot.requirements}
            checked={checked}
            onToggle={(k) => setChecked((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))}
          />
          <label className="label mt-4" htmlFor="book-note">
            Comentario para planificación (opcional)
          </label>
          <textarea id="book-note" className="input min-h-16" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          {overlap && (
            <p className="mt-3 flex gap-2 rounded-xl bg-warning-50 p-3 text-xs font-medium text-warning">
              <AlertTriangle className="size-4 shrink-0" aria-hidden /> Ya tienes otra visita superpuesta en este horario; la reserva será rechazada.
            </p>
          )}
          <div className="mt-4 rounded-xl border border-line p-3">
            <Checkbox
              checked={ack}
              onChange={(v) => {
                setAck(v);
                setError('');
              }}
              label="Revisé los requisitos de acceso y seguridad"
              description="Me comprometo a cumplirlos antes de ingresar al área."
            />
          </div>
          {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}
