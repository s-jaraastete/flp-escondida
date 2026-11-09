import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2 } from 'lucide-react';
import type { RequirementKey } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { Button, Checkbox, EmptyState } from '@/components/ui/primitives';
import { OPEN_BOOKING, bookSlot, findSlot, findUserOverlap, slotHasStarted } from '@/services/flpService';
import { slotView } from '@/services/selectors';
import { SlotSummary } from '@/features/slots/SlotSummary';
import { RequirementsChecklist } from '@/features/booking/RequirementsChecklist';
import { capitalize, fmtLong } from '@/utils/date';
import { cx } from '@/utils/misc';

const STEPS = ['Detalle', 'Requisitos', 'Confirmar'];

/** Reserva paso a paso: detalle → requisitos → confirmación. */
export default function MobileBookSlot() {
  const { slotId = '' } = useParams();
  const { data, commitWith } = useData();
  const { user } = useAuth('mobile');
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<RequirementKey[]>([]);
  const [ack, setAck] = useState(false);
  const [note, setNote] = useState('');
  const [ackError, setAckError] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);

  const raw = findSlot(data, slotId);
  if (!raw) return <EmptyState title="Horario no encontrado" />;
  const slot = slotView(data, raw);
  const existing = data.bookings.find((b) => b.slotId === raw.id && b.userId === user.id && OPEN_BOOKING.includes(b.status));
  const overlap = findUserOverlap(data, user.id, raw);
  const blocked = slot.seats === 0 || slotHasStarted(raw) || raw.status !== 'publicado';

  if (doneId)
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-success-50 text-success">
          <CheckCircle2 className="size-10" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-ink">¡Reserva enviada!</h1>
        <p className="mt-2 text-sm text-graphite">
          Tu solicitud para <strong>{slot.project.name}</strong> el {fmtLong(slot.date)} a las {slot.start} quedó <strong>pendiente de confirmación</strong> por planificación.
        </p>
        <div className="mt-8 grid w-full gap-2">
          <Button size="lg" onClick={() => navigate(`/app/visita/${doneId}`)}>
            Ver mi visita y checklist
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/app/explorar')}>
            Seguir explorando
          </Button>
        </div>
      </div>
    );

  const next = () => {
    if (step === 1 && !ack) {
      setAckError(true);
      return;
    }
    if (step < 2) setStep(step + 1);
    else {
      const r = commitWith(bookSlot(data, { slotId: raw.id, userId: user.id, requirementsAck: ack, checklist: checked, note }));
      if (r) setDoneId(r.booking.id);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <MobileHeader title="Reservar visita" subtitle={slot.project.code} back>
        <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Pasos">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? 'step' : undefined}>
              <div className={cx('h-1 rounded-full', i <= step ? 'bg-brand' : 'bg-white/20')} />
              <p className={cx('mt-1 text-[11px] font-bold', i === step ? 'text-white' : 'text-white/50')}>
                {i + 1}. {s}
              </p>
            </li>
          ))}
        </ol>
      </MobileHeader>

      <div className="flex-1 px-4 pt-4">
        {existing ? (
          <EmptyState
            icon={CalendarCheck}
            title="Ya estás inscrito en este horario"
            action={<Link to={`/app/visita/${existing.id}`} className="font-bold text-brand">Ver mi visita</Link>}
          />
        ) : step === 0 ? (
          <div className="card p-4">
            <SlotSummary slot={slot} compact />
          </div>
        ) : step === 1 ? (
          <div>
            <p className="text-sm text-graphite">Antes de reservar, revisa los requisitos de acceso y seguridad. Marca lo que ya tienes listo.</p>
            <div className="mt-3">
              <RequirementsChecklist
                large
                requirements={slot.requirements}
                checked={checked}
                onToggle={(k) => setChecked((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))}
              />
            </div>
            <div className={cx('mt-4 rounded-2xl border bg-surface p-4', ackError ? 'border-danger' : 'border-line')}>
              <Checkbox
                checked={ack}
                onChange={(v) => {
                  setAck(v);
                  setAckError(false);
                }}
                label="Revisé y cumpliré los requisitos"
                description="Requisito obligatorio para enviar la reserva."
              />
            </div>
            {ackError && <p className="mt-1.5 text-xs font-medium text-danger">Debes confirmar que revisaste los requisitos.</p>}
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="card p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">Resumen</p>
              <p className="mt-1 text-lg font-extrabold text-ink">{slot.project.name}</p>
              <p className="text-sm text-graphite">{capitalize(fmtLong(slot.date))}</p>
              <p className="text-sm font-bold text-ink">{slot.start} – {slot.end} hrs · {slot.activityType}</p>
              <p className="mt-2 text-xs text-muted">
                Requisitos listos: {checked.length}/{slot.requirements.length} · Líder {slot.leaderName}
              </p>
            </div>
            {overlap && (
              <p className="flex gap-2 rounded-2xl bg-warning-50 p-3 text-xs font-medium text-warning">
                <AlertTriangle className="size-4 shrink-0" aria-hidden /> Tienes otra visita superpuesta en este horario. No podrás confirmar esta reserva.
              </p>
            )}
            <label className="block">
              <span className="label">Comentario para planificación (opcional)</span>
              <textarea className="input min-h-24 text-base" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
        )}
      </div>

      {!existing && (
        <div className="sticky bottom-0 mt-4 grid grid-cols-[auto_1fr] gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
          <Button variant="secondary" size="lg" onClick={() => (step ? setStep(step - 1) : navigate(-1))}>
            {step ? 'Atrás' : 'Cancelar'}
          </Button>
          <Button size="lg" icon={step === 2 ? CalendarCheck : ArrowRight} disabled={blocked} onClick={next}>
            {blocked ? 'Sin cupos disponibles' : step === 2 ? 'Confirmar reserva' : 'Continuar'}
          </Button>
        </div>
      )}
    </div>
  );
}
