import { useState } from 'react';
import { Check, Inbox, Repeat, X } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { usePhoneContainer } from '@/layouts/PhoneFrame';
import { Avatar, Button, EmptyState } from '@/components/ui/primitives';
import { BookingBadge, TypeBadge } from '@/components/ui/status';
import { ConfirmDialog } from '@/components/ui/Modal';
import { decideBooking, slotHasStarted } from '@/services/flpService';
import { bookingView } from '@/services/selectors';
import { RescheduleDialog } from '@/features/booking/RescheduleDialog';
import { capitalize, relativeDay } from '@/utils/date';
import { cx } from '@/utils/misc';

export default function MobileRequests() {
  const { data, commit } = useData();
  const { user } = useAuth('mobile');
  const container = usePhoneContainer();
  const [tab, setTab] = useState<'pendiente' | 'confirmada'>('pendiente');
  const [reject, setReject] = useState<string | null>(null);
  const [resched, setResched] = useState<string | null>(null);
  const all = data.bookings.filter((b) => b.status === tab).map((b) => bookingView(data, b));
  const list = all.filter((b) => !slotHasStarted(b.slot)).sort((a, b) => (a.slot.date + a.slot.start).localeCompare(b.slot.date + b.slot.start));
  const count = (s: string) => data.bookings.filter((b) => b.status === s).length;

  return (
    <div>
      <MobileHeader title="Solicitudes" subtitle="Reservas de usuarios">
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1" role="tablist">
          {(['pendiente', 'confirmada'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('rounded-lg py-2 text-xs font-bold', tab === k ? 'bg-white text-ink' : 'text-white/70')}>
              {k === 'pendiente' ? 'Pendientes' : 'Confirmadas'} <span className="opacity-60">{count(k)}</span>
            </button>
          ))}
        </div>
      </MobileHeader>
      <div className="grid gap-2.5 px-4 pt-4">
        {list.length === 0 && <EmptyState icon={Inbox} title={tab === 'pendiente' ? 'Sin solicitudes pendientes' : 'Sin visitas confirmadas próximas'} />}
        {list.slice(0, 40).map((b) => (
          <article key={b.id} className="card p-3.5">
            <div className="flex items-center gap-3">
              <Avatar name={b.userName} size="sm" tone="dark" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{b.userName}</p>
                <p className="truncate text-xs text-muted">{b.slot.project.name}</p>
              </div>
              <BookingBadge status={b.status} />
            </div>
            <div className="mt-2.5 flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-xs">
              <span className="inline-block font-bold first-letter:uppercase text-ink">
                {capitalize(relativeDay(b.slot.date))} · {b.slot.start}–{b.slot.end}
              </span>
              <span className="flex items-center gap-1.5">
                <TypeBadge type={b.slot.activityType} />
                <span className={b.slot.seats === 0 ? 'font-bold text-danger' : 'text-graphite'}>
                  {b.slot.occupied}/{b.slot.capacity}
                </span>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Requisitos listos {b.checklist.length}/{b.slot.requirements.length}
              {b.note && <> · “{b.note}”</>}
            </p>
            <div className={cx('mt-3 grid gap-2', tab === 'pendiente' ? 'grid-cols-[auto_1fr_1fr]' : 'grid-cols-1')}>
              <Button variant="ghost" icon={Repeat} onClick={() => setResched(b.id)} aria-label="Reprogramar">
                {tab === 'confirmada' && 'Reprogramar'}
              </Button>
              {tab === 'pendiente' && (
                <>
                  <Button variant="secondary" icon={X} onClick={() => setReject(b.id)}>
                    Rechazar
                  </Button>
                  <Button variant="success" icon={Check} onClick={() => commit(decideBooking(data, b.id, 'confirmada', user.id))}>
                    Confirmar
                  </Button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <ConfirmDialog
        container={container}
        open={Boolean(reject)}
        onClose={() => setReject(null)}
        onConfirm={(reason) => reject && commit(decideBooking(data, reject, 'rechazada', user.id, reason)) && setReject(null)}
        title="Rechazar solicitud"
        message="El cupo quedará disponible."
        reasonLabel="Motivo"
        reasonRequired
        confirmLabel="Rechazar"
      />
      <RescheduleDialog container={container} bookingId={resched} by={user.id} onClose={() => setResched(null)} />
    </div>
  );
}
