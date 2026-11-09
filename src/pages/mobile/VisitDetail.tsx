import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Ban, CheckCircle2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { usePhoneContainer } from '@/layouts/PhoneFrame';
import { MSection } from '@/components/mobile/MobileKit';
import { Button, EmptyState, ProgressBar } from '@/components/ui/primitives';
import { BookingBadge } from '@/components/ui/status';
import { ConfirmDialog } from '@/components/ui/Modal';
import { cancelBooking, findBooking, slotHasStarted } from '@/services/flpService';
import { bookingView } from '@/services/selectors';
import { SlotSummary } from '@/features/slots/SlotSummary';
import { PrecheckEditor } from '@/features/booking/PrecheckEditor';
import { FlpRegistryCard } from '@/features/flp/FlpRegistryCard';
import { CheckVisitButton } from '@/features/verification/CheckVisitButton';
import { fmtDateTime } from '@/utils/date';

export default function MobileVisitDetail() {
  const { bookingId = '' } = useParams();
  const { data, commit } = useData();
  const { user } = useAuth('mobile');
  const navigate = useNavigate();
  const container = usePhoneContainer();
  const [confirm, setConfirm] = useState(false);
  const raw = findBooking(data, bookingId);
  if (!raw || raw.userId !== user.id) return <EmptyState title="Visita no encontrada" />;
  const b = bookingView(data, raw);
  const active = ['pendiente', 'confirmada'].includes(b.status);
  const canCancel = active && !slotHasStarted(b.slot);
  const v = data.verifications.find((x) => x.bookingId === b.id);
  const ready = b.checklist.length;
  const total = b.slot.requirements.length;

  return (
    <div>
      <MobileHeader title="Detalle de visita" subtitle={b.slot.project.code} back="/app/visitas" right={<BookingBadge status={b.status} awaiting={b.awaitingVerification} noShow={b.noShow} />} />
      <div className="px-4 pt-4">
        <div className="card p-4">
          <SlotSummary slot={b.slot} compact />
        </div>
      </div>

      {b.awaitingVerification && (
        <div className="px-4 pt-4">
          <CheckVisitButton size="lg" block bookingId={b.id} userId={user.id} label="Marcar visita como realizada" />
        </div>
      )}
      {v && (
        <MSection title="Visita realizada">
          <div className="card flex items-center gap-3 p-4">
            <CheckCircle2 className="size-8 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-bold text-ink">Visita marcada como realizada</p>
              <p className="text-xs text-muted">{fmtDateTime(v.completedAt)}</p>
            </div>
          </div>
          <FlpRegistryCard verification={v} projectName={data.projects.find((p) => p.id === v.projectId)?.name ?? ''} className="mt-3" />
        </MSection>
      )}

      {active && (
        <MSection title="Checklist previo a la visita">
          <div className="mb-3 flex items-center gap-3">
            <ProgressBar value={(ready / Math.max(1, total)) * 100} tone={ready === total ? 'success' : 'brand'} label="Checklist previo" />
            <span className="shrink-0 text-xs font-bold text-ink">
              {ready}/{total}
            </span>
          </div>
          <PrecheckEditor bookingId={b.id} editable large />
          {ready === total && <p className="mt-2 text-center text-xs font-semibold text-success">¡Todo listo para la visita!</p>}
        </MSection>
      )}

      <MSection title="Historial">
        <ol className="grid gap-2.5 border-l-2 border-line pl-4">
          {b.history.map((h, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand" aria-hidden />
              <p className="text-sm font-bold first-letter:uppercase text-ink">{h.status}</p>
              <p className="text-xs text-muted">{fmtDateTime(h.at)}</p>
              {h.note && <p className="text-xs text-graphite">{h.note}</p>}
            </li>
          ))}
        </ol>
      </MSection>

      {canCancel && (
        <div className="px-4 pt-6">
          <Button variant="secondary" size="lg" block icon={Ban} className="text-danger" onClick={() => setConfirm(true)}>
            Cancelar reserva
          </Button>
        </div>
      )}
      <ConfirmDialog
        container={container}
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={(reason) => {
          if (commit(cancelBooking(data, b.id, user.id, reason))) {
            setConfirm(false);
            navigate('/app/visitas');
          }
        }}
        title="Cancelar reserva"
        message="Liberarás tu cupo en esta visita."
        reasonLabel="Motivo (opcional)"
        confirmLabel="Cancelar reserva"
      />
    </div>
  );
}
