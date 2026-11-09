import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Ban, CalendarClock, ClipboardCheck, Eye, History } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { Button, Card, EmptyState, ProgressBar, Segmented } from '@/components/ui/primitives';
import { BookingBadge, TypeBadge, Badge } from '@/components/ui/status';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { cancelBooking, slotHasStarted } from '@/services/flpService';
import { userBookings, type BookingView } from '@/services/selectors';
import { SlotSummary } from '@/features/slots/SlotSummary';
import { PrecheckEditor } from '@/features/booking/PrecheckEditor';
import { capitalize, fmtDateTime, fmtShort, relativeDay, todayISO } from '@/utils/date';

type Tab = 'proximas' | 'verificar' | 'historial';

export default function MyVisitsPage() {
  const { data, commit } = useData();
  const { user } = useAuth('web');
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('proximas');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const t = todayISO();
  const mine = useMemo(() => userBookings(data, user.id), [data, user.id]);
  const groups: Record<Tab, BookingView[]> = {
    proximas: mine.filter((b) => ['pendiente', 'confirmada'].includes(b.status) && !b.awaitingVerification && b.slot.date >= t),
    verificar: mine.filter((b) => b.awaitingVerification).reverse(),
    historial: mine.filter((b) => ['completada', 'cancelada', 'rechazada'].includes(b.status) || (b.status === 'pendiente' && b.slot.date < t)).reverse(),
  };
  const list = groups[tab];
  const detail = mine.find((b) => b.id === detailId);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Mis visitas FLP</h2>
          <p className="text-sm text-muted">Reservas, checklist previo, verificaciones e historial.</p>
        </div>
        <Segmented<Tab>
          ariaLabel="Mis visitas"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'proximas', label: 'Próximas', count: groups.proximas.length },
            { value: 'verificar', label: 'Por verificar', count: groups.verificar.length },
            { value: 'historial', label: 'Historial', count: groups.historial.length },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === 'historial' ? History : tab === 'verificar' ? ClipboardCheck : CalendarClock}
            title={tab === 'proximas' ? 'No tienes visitas próximas' : tab === 'verificar' ? 'No tienes verificaciones pendientes' : 'Aún no tienes historial'}
            action={tab === 'proximas' ? <Button onClick={() => navigate('/web/reservar')}>Reservar visita</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((b) => {
            const started = slotHasStarted(b.slot);
            const v = data.verifications.find((x) => x.bookingId === b.id);
            return (
              <Card key={b.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="grid w-20 shrink-0 place-items-center rounded-xl bg-canvas py-2 text-center">
                  <span className="inline-block text-xs font-semibold first-letter:uppercase text-muted">{fmtShort(b.slot.date).split(' ')[0]}</span>
                  <span className="text-2xl font-extrabold leading-none text-ink">{b.slot.date.slice(8)}</span>
                  <span className="text-xs text-muted">{b.slot.start}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <BookingBadge status={b.status} awaiting={b.awaitingVerification} />
                    <TypeBadge type={b.slot.activityType} />
                    <span className="inline-block text-xs first-letter:uppercase text-muted">{relativeDay(b.slot.date)}</span>
                  </div>
                  <p className="mt-1 font-bold text-ink">{b.slot.project.name}</p>
                  <p className="truncate text-sm text-muted">{b.slot.title}</p>
                  {tab === 'proximas' && (
                    <div className="mt-2 flex max-w-xs items-center gap-2">
                      <ProgressBar value={(b.checklist.length / Math.max(1, b.slot.requirements.length)) * 100} tone="success" label="Checklist previo" />
                      <span className="shrink-0 text-xs text-graphite">
                        {b.checklist.length}/{b.slot.requirements.length} requisitos
                      </span>
                    </div>
                  )}
                  {v && (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-graphite">
                      Verificación registrada · cumplimiento <strong>{v.compliance}%</strong>
                      {v.postVisit?.flpActivityId ? (
                        <span className="rounded-full bg-success-50 px-2 py-0.5 font-mono font-semibold text-success ring-1 ring-success/30">FLP {v.postVisit.flpActivityId}</span>
                      ) : (
                        <span className="rounded-full bg-warning-50 px-2 py-0.5 font-semibold text-warning ring-1 ring-warning/30">Pendiente registro FLP</span>
                      )}
                    </p>
                  )}
                  {b.status === 'rechazada' && <p className="mt-1 text-xs text-danger">Motivo: {b.history.find((h) => h.status === 'rechazada')?.note ?? '—'}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={Eye} onClick={() => setDetailId(b.id)}>
                    Detalle
                  </Button>
                  {b.awaitingVerification && (
                    <Button size="sm" icon={ClipboardCheck} onClick={() => navigate(`/web/verificacion/${b.id}`)}>
                      Registrar verificación
                    </Button>
                  )}
                  {['pendiente', 'confirmada'].includes(b.status) && !started && (
                    <Button variant="ghost" size="sm" icon={Ban} onClick={() => setCancelId(b.id)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelId)}
        onClose={() => setCancelId(null)}
        onConfirm={(reason) => cancelId && commit(cancelBooking(data, cancelId, user.id, reason)) && setCancelId(null)}
        title="Cancelar reserva"
        message="Liberarás tu cupo para que otra persona pueda inscribirse."
        reasonLabel="Motivo (opcional)"
        confirmLabel="Cancelar reserva"
      />

      {detail && (
        <Modal open onClose={() => setDetailId(null)} title="Detalle de la visita" size="lg">
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <SlotSummary slot={detail.slot} compact />
            <div className="grid content-start gap-5">
              <div>
                <p className="label">Checklist previo</p>
                <PrecheckEditor bookingId={detail.id} editable={['pendiente', 'confirmada'].includes(detail.status)} />
              </div>
              <div>
                <p className="label">Historial</p>
                <ol className="grid gap-2 border-l-2 border-line pl-4">
                  {detail.history.map((h, i) => (
                    <li key={i} className="relative text-sm">
                      <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand" aria-hidden />
                      <span className="inline-block font-semibold first-letter:uppercase text-ink">{h.status}</span>
                      <span className="ml-2 text-xs text-muted">{fmtDateTime(h.at)}</span>
                      {h.note && <p className="text-xs text-graphite">{h.note}</p>}
                    </li>
                  ))}
                </ol>
              </div>
              <Badge tone="neutral">Reserva {capitalize(detail.status)}</Badge>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
