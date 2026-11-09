import { useEffect, useMemo, useState } from 'react';
import { Repeat } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, EmptyState } from '@/components/ui/primitives';
import { SeatsBadge, TypeBadge } from '@/components/ui/status';
import { useData } from '@/contexts/DataContext';
import { findBooking, findSlot, findUser, findUserOverlap, rescheduleBooking, slotHasStarted } from '@/services/flpService';
import { slotView } from '@/services/selectors';
import { capitalize, fmtShort } from '@/utils/date';
import { cx } from '@/utils/misc';

/** Planificador: mover una reserva a otro horario con cupo (mismo proyecto por defecto). */
export function RescheduleDialog({ bookingId, by, onClose, container }: { bookingId: string | null; by: string; onClose: () => void; container?: HTMLElement | null }) {
  const { data, commit } = useData();
  const [sameProject, setSameProject] = useState(true);
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    setTarget(null);
    setSameProject(true);
  }, [bookingId]);

  const booking = bookingId ? findBooking(data, bookingId) : undefined;
  const current = booking ? findSlot(data, booking.slotId) : undefined;

  const options = useMemo(() => {
    if (!booking || !current) return [];
    return data.slots
      .filter((s) => s.status === 'publicado' && s.id !== current.id && !slotHasStarted(s) && (!sameProject || s.projectId === current.projectId))
      .map((s) => slotView(data, s))
      .filter((s) => s.seats > 0 && !findUserOverlap(data, booking.userId, s, booking.id))
      .slice(0, 30);
  }, [data, booking, current, sameProject]);

  if (!booking || !current) return null;
  const cur = slotView(data, current);

  return (
    <Modal
      open={Boolean(bookingId)}
      onClose={onClose}
      container={container}
      title="Reprogramar visita"
      description={`${findUser(data, booking.userId)?.name} · actual: ${capitalize(fmtShort(cur.date))} ${cur.start}–${cur.end}, ${cur.project.name}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={Repeat} disabled={!target} onClick={() => target && commit(rescheduleBooking(data, booking.id, target, by)) && onClose()}>
            Reprogramar
          </Button>
        </>
      }
    >
      <label className="mb-3 flex items-center gap-2 text-sm text-graphite">
        <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={sameProject} onChange={(e) => setSameProject(e.target.checked)} />
        Solo horarios del mismo proyecto
      </label>
      {options.length === 0 ? (
        <EmptyState compact title="Sin horarios alternativos" description="No hay horarios futuros con cupo y sin superposición. Publica uno nuevo o amplía la búsqueda." />
      ) : (
        <ul className="grid gap-2" role="radiogroup" aria-label="Horarios disponibles">
          {options.map((s) => (
            <li key={s.id}>
              <button
                role="radio"
                aria-checked={target === s.id}
                onClick={() => setTarget(s.id)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition',
                  target === s.id ? 'border-brand bg-brand-50' : 'border-line hover:border-graphite/30',
                )}
              >
                <div className="w-20 shrink-0 text-center">
                  <p className="text-xs font-semibold first-letter:uppercase text-muted">{fmtShort(s.date)}</p>
                  <p className="text-sm font-bold text-ink">{s.start}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{s.project.name}</p>
                  <p className="truncate text-xs text-muted">{s.title}</p>
                </div>
                <TypeBadge type={s.activityType} />
                <SeatsBadge seats={s.seats} capacity={s.capacity} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
