import { useState } from 'react';
import { Ban, CalendarCheck, Pencil } from 'lucide-react';
import type { Role } from '@/types';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Avatar, Button } from '@/components/ui/primitives';
import { Badge, BookingBadge } from '@/components/ui/status';
import { useData } from '@/contexts/DataContext';
import { cancelSlot, findSlot, findUser, OPEN_BOOKING, slotHasStarted } from '@/services/flpService';
import { slotView } from '@/services/selectors';
import { SlotSummary } from './SlotSummary';
import { SlotForm } from './SlotForm';
import { RequirementsChecklist } from '@/features/booking/RequirementsChecklist';

/** Detalle de un horario con acciones según perfil (reservar / editar / cancelar). */
export function SlotDetailDialog({
  slotId,
  role,
  userId,
  onClose,
  onBook,
}: {
  slotId: string | null;
  role: Role;
  userId: string;
  onClose: () => void;
  onBook?: (slotId: string) => void;
}) {
  const { data, commit } = useData();
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const raw = slotId ? findSlot(data, slotId) : undefined;
  if (!raw) return null;
  const slot = slotView(data, raw);
  const attendees = data.bookings.filter((b) => b.slotId === raw.id);
  const mine = attendees.find((b) => b.userId === userId && OPEN_BOOKING.includes(b.status));
  const started = slotHasStarted(raw);
  const canManage = role !== 'user' && raw.status === 'publicado' && !started;
  const close = () => {
    setEditing(false);
    onClose();
  };

  return (
    <>
      <Modal
        open={Boolean(slotId)}
        onClose={close}
        title={editing ? 'Editar horario' : 'Detalle de la visita'}
        size="lg"
        footer={
          editing ? undefined : (
            <>
              {raw.status === 'cancelado' && <Badge tone="danger">Horario cancelado</Badge>}
              {canManage && (
                <>
                  <Button variant="secondary" icon={Ban} onClick={() => setConfirmCancel(true)}>
                    Cancelar horario
                  </Button>
                  <Button variant="dark" icon={Pencil} onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                </>
              )}
              {role === 'user' && onBook && !mine && raw.status === 'publicado' && !started && (
                <Button icon={CalendarCheck} disabled={slot.seats === 0} onClick={() => onBook(raw.id)}>
                  {slot.seats === 0 ? 'Sin cupos' : 'Reservar'}
                </Button>
              )}
              {mine && <Badge tone="info">Ya estás inscrito ({mine.status})</Badge>}
            </>
          )
        }
      >
        {editing ? (
          <SlotForm slot={raw} by={userId} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        ) : (
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <SlotSummary slot={slot} compact />
            <div className="grid content-start gap-5">
              <div>
                <p className="label">Requisitos</p>
                <RequirementsChecklist requirements={slot.requirements} />
              </div>
              {role !== 'user' && (
                <div>
                  <p className="label">
                    Participantes ({slot.occupied}/{slot.capacity})
                  </p>
                  {attendees.length === 0 ? (
                    <p className="text-sm text-muted">Sin reservas.</p>
                  ) : (
                    <ul className="grid gap-1.5">
                      {attendees.map((b) => {
                        const u = findUser(data, b.userId);
                        return (
                          <li key={b.id} className="flex items-center gap-2.5 rounded-xl border border-line px-2.5 py-2">
                            <Avatar name={u?.name ?? '?'} size="sm" tone="dark" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{u?.name}</span>
                            <BookingBadge status={b.status} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          if (commit(cancelSlot(data, raw.id, userId))) {
            setConfirmCancel(false);
            close();
          }
        }}
        title="Cancelar horario"
        message={`Se cancelará el horario y ${attendees.filter((b) => OPEN_BOOKING.includes(b.status)).length} reserva(s) activas pasarán a "Cancelada".`}
        confirmLabel="Cancelar horario"
      />
    </>
  );
}
