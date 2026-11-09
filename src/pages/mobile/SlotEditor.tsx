import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Ban, Pencil } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { usePhoneContainer } from '@/layouts/PhoneFrame';
import { MSection } from '@/components/mobile/MobileKit';
import { Avatar, Button, EmptyState } from '@/components/ui/primitives';
import { Badge, BookingBadge } from '@/components/ui/status';
import { ConfirmDialog } from '@/components/ui/Modal';
import { OPEN_BOOKING, cancelSlot, findSlot, findUser, slotHasStarted } from '@/services/flpService';
import { slotView } from '@/services/selectors';
import { SlotForm } from '@/features/slots/SlotForm';
import { SlotSummary } from '@/features/slots/SlotSummary';

/** Crear disponibilidad (/disponibilidad/nueva) o ver / editar un horario existente. */
export default function MobileSlotEditor() {
  const { slotId } = useParams();
  const { data, commit } = useData();
  const { user } = useAuth('mobile');
  const navigate = useNavigate();
  const container = usePhoneContainer();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!slotId)
    return (
      <div>
        <MobileHeader title="Publicar horario" subtitle="Nueva disponibilidad" back />
        <div className="px-4 pt-4">
          <SlotForm mobile by={user.id} onDone={() => navigate('/app/agenda')} onCancel={() => navigate(-1)} />
        </div>
      </div>
    );

  const raw = findSlot(data, slotId);
  if (!raw) return <EmptyState title="Horario no encontrado" />;
  const slot = slotView(data, raw);
  const attendees = data.bookings.filter((b) => b.slotId === raw.id);
  const manageable = raw.status === 'publicado' && !slotHasStarted(raw);

  return (
    <div>
      <MobileHeader title={editing ? 'Editar horario' : 'Detalle del horario'} subtitle={slot.project.code} back={editing ? undefined : true} />
      <div className="px-4 pt-4">
        {editing ? (
          <SlotForm mobile slot={raw} by={user.id} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <div className="card p-4">
              {raw.status === 'cancelado' && <Badge tone="danger" className="mb-2">Horario cancelado</Badge>}
              <SlotSummary slot={slot} compact />
            </div>
            {manageable && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="lg" icon={Ban} onClick={() => setConfirm(true)}>
                  Cancelar
                </Button>
                <Button variant="dark" size="lg" icon={Pencil} onClick={() => setEditing(true)}>
                  Editar
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      {!editing && (
        <MSection title={`Participantes (${slot.occupied}/${slot.capacity})`}>
          {attendees.length === 0 ? (
            <EmptyState compact title="Aún sin inscritos" />
          ) : (
            <ul className="card divide-y divide-line">
              {attendees.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-3.5 py-3">
                  <Avatar name={findUser(data, b.userId)?.name ?? '?'} size="sm" tone="dark" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{findUser(data, b.userId)?.name}</span>
                  <BookingBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </MSection>
      )}
      <ConfirmDialog
        container={container}
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          if (commit(cancelSlot(data, raw.id, user.id))) {
            setConfirm(false);
            navigate('/app/agenda');
          }
        }}
        title="Cancelar horario"
        message={`Se cancelarán ${attendees.filter((b) => OPEN_BOOKING.includes(b.status)).length} reserva(s) activas.`}
        confirmLabel="Cancelar horario"
      />
    </div>
  );
}
