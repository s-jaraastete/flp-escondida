import { useMemo, useState } from 'react';
import { Ban, Check, Inbox, Repeat, Search, X } from 'lucide-react';
import type { Area, BookingStatus } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { Avatar, Button, Card, EmptyState, Segmented } from '@/components/ui/primitives';
import { BookingBadge, TypeBadge } from '@/components/ui/status';
import { ConfirmDialog } from '@/components/ui/Modal';
import { cancelBooking, decideBooking, slotHasStarted } from '@/services/flpService';
import { bookingView } from '@/services/selectors';
import { RescheduleDialog } from '@/features/booking/RescheduleDialog';
import { capitalize, fmtDateTime, fmtShort } from '@/utils/date';
import { normalize } from '@/utils/misc';

type Tab = 'pendiente' | 'confirmada' | 'todas';

export default function RequestsPage() {
  const { data, commit } = useData();
  const { user } = useAuth('web');
  const [tab, setTab] = useState<Tab>('pendiente');
  const [q, setQ] = useState('');
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const [reject, setReject] = useState<string | null>(null);
  const [cancel, setCancel] = useState<string | null>(null);
  const [resched, setResched] = useState<string | null>(null);

  const all = useMemo(() => data.bookings.map((b) => bookingView(data, b)), [data]);
  const count = (s: BookingStatus) => all.filter((b) => b.status === s).length;
  const list = useMemo(() => {
    const nq = normalize(q);
    return all
      .filter((b) => (tab === 'todas' ? true : b.status === tab))
      .filter((b) => area === 'Todas' || b.slot.project.area === area)
      .filter((b) => !nq || normalize(`${b.userName} ${b.slot.project.name} ${b.slot.title}`).includes(nq))
      .sort((a, b) =>
        tab === 'todas' ? b.updatedAt.localeCompare(a.updatedAt) : (a.slot.date + a.slot.start).localeCompare(b.slot.date + b.slot.start),
      );
  }, [all, tab, q, area]);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Solicitudes de reserva</h2>
        <p className="text-sm text-muted">Confirma la coordinación, rechaza o reprograma las reservas de los usuarios.</p>
      </div>
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Segmented<Tab>
          ariaLabel="Estado"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pendiente', label: 'Pendientes', count: count('pendiente') },
            { value: 'confirmada', label: 'Confirmadas', count: count('confirmada') },
            { value: 'todas', label: 'Historial', count: all.length },
          ]}
        />
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" placeholder="Buscar persona o proyecto…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <select className="input h-10 w-auto" value={area} onChange={(e) => setArea(e.target.value as Area | 'Todas')} aria-label="Área">
          <option value="Todas">Todas las áreas</option>
          <option>Mina</option>
          <option>Coloso</option>
        </select>
      </Card>

      <Card className="overflow-x-auto">
        {list.length === 0 ? (
          <EmptyState icon={Inbox} title={tab === 'pendiente' ? 'No hay solicitudes pendientes' : 'Sin resultados'} description="Las nuevas reservas de usuarios aparecerán aquí." />
        ) : (
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-semibold">Solicitante</th>
                <th className="px-3 py-3 font-semibold">Visita</th>
                <th className="px-3 py-3 font-semibold">Proyecto / actividad</th>
                <th className="px-3 py-3 font-semibold">Cupos</th>
                <th className="px-3 py-3 font-semibold">Requisitos</th>
                <th className="px-3 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 150).map((b) => {
                const open = (b.status === 'pendiente' || b.status === 'confirmada') && !slotHasStarted(b.slot);
                return (
                  <tr key={b.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={b.userName} size="sm" tone="dark" />
                        <div>
                          <p className="font-semibold text-ink">{b.userName}</p>
                          <p className="text-xs text-muted">Solicitó {fmtDateTime(b.createdAt)}</p>
                        </div>
                      </div>
                      {b.note && <p className="mt-1 max-w-56 truncate text-xs italic text-graphite" title={b.note}>“{b.note}”</p>}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold first-letter:uppercase text-ink">{capitalize(fmtShort(b.slot.date))}</p>
                      <p className="text-xs text-muted">{b.slot.start}–{b.slot.end}</p>
                    </td>
                    <td className="max-w-72 px-3 py-3">
                      <p className="truncate font-medium text-ink">{b.slot.project.name}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <TypeBadge type={b.slot.activityType} />
                        <span className="truncate text-xs text-muted">{b.slot.project.area} · {b.slot.group}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      <span className={b.slot.seats === 0 ? 'font-semibold text-danger' : 'text-ink'}>
                        {b.slot.occupied}/{b.slot.capacity}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <span className={b.checklist.length === b.slot.requirements.length ? 'font-semibold text-success' : 'text-graphite'}>
                        {b.checklist.length}/{b.slot.requirements.length} listos
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <BookingBadge status={b.status} awaiting={b.awaitingVerification} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        {b.status === 'pendiente' && open && (
                          <>
                            <Button size="sm" variant="success" icon={Check} onClick={() => commit(decideBooking(data, b.id, 'confirmada', user.id))}>
                              Confirmar
                            </Button>
                            <Button size="sm" variant="secondary" icon={X} onClick={() => setReject(b.id)}>
                              Rechazar
                            </Button>
                          </>
                        )}
                        {open && (
                          <Button size="sm" variant="ghost" icon={Repeat} onClick={() => setResched(b.id)} aria-label={`Reprogramar reserva de ${b.userName}`} title="Reprogramar" />
                        )}
                        {b.status === 'confirmada' && open && (
                          <Button size="sm" variant="ghost" icon={Ban} onClick={() => setCancel(b.id)} aria-label={`Cancelar reserva de ${b.userName}`} title="Cancelar" />
                        )}
                        {!open && <span className="text-xs text-muted">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(reject)}
        onClose={() => setReject(null)}
        onConfirm={(reason) => reject && commit(decideBooking(data, reject, 'rechazada', user.id, reason)) && setReject(null)}
        title="Rechazar solicitud"
        message="El cupo quedará liberado para otras personas."
        reasonLabel="Motivo del rechazo"
        reasonRequired
        confirmLabel="Rechazar"
      />
      <ConfirmDialog
        open={Boolean(cancel)}
        onClose={() => setCancel(null)}
        onConfirm={(reason) => cancel && commit(cancelBooking(data, cancel, user.id, reason)) && setCancel(null)}
        title="Cancelar reserva confirmada"
        message="La persona dejará de estar inscrita en la visita."
        reasonLabel="Motivo (opcional)"
        confirmLabel="Cancelar reserva"
      />
      <RescheduleDialog bookingId={resched} by={user.id} onClose={() => setResched(null)} />
    </div>
  );
}
