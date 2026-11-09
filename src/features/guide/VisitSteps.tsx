import { Link } from 'react-router';
import { CalendarPlus, Check, ClipboardCheck, PackageCheck, Send, type LucideIcon } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { awaitingForUser, userBookings } from '@/services/selectors';
import { todayISO } from '@/utils/date';
import { cx } from '@/utils/misc';
import { CheckVisitButton } from '@/features/verification/CheckVisitButton';

interface Step {
  n: number;
  title: string;
  text: string;
  /** Texto cuando es el paso actual (si difiere). */
  nowText?: string;
  icon: LucideIcon;
  action: string;
  to: string;
}

/**
 * "¿Qué tengo que hacer?": el proceso FLP en 4 pasos con lenguaje simple,
 * marcando en qué paso está la persona y con un solo botón para avanzar.
 */
export function VisitSteps({ userId, base, className }: { userId: string; base: '/app' | '/web'; className?: string }) {
  const { data } = useData();
  const t = todayISO();
  const mine = userBookings(data, userId);
  const toVerify = awaitingForUser(data, userId);
  const next = mine.find((b) => ['pendiente', 'confirmada'].includes(b.status) && b.slot.date >= t && !b.awaitingVerification);
  const pendingFlp = data.verifications.filter((v) => v.userId === userId && v.postVisit && !v.postVisit.flpActivityId);
  const mobile = base === '/app';

  const steps: Step[] = [
    { n: 1, title: 'Reserva tu visita', text: 'Elige un proyecto y un horario con cupo.', icon: CalendarPlus, action: 'Reservar', to: mobile ? '/app/explorar' : '/web/reservar' },
    {
      n: 2,
      title: 'Prepárate',
      text: 'Revisa EPP, credencial y permisos.',
      nowText: next
        ? `Te faltan ${Math.max(0, next.slot.requirements.length - next.checklist.length)} de ${next.slot.requirements.length} requisitos (EPP, credencial…).`
        : undefined,
      icon: PackageCheck,
      action: 'Ver requisitos',
      to: next ? (mobile ? `/app/visita/${next.id}` : '/web/mis-visitas') : mobile ? '/app/visitas' : '/web/mis-visitas',
    },
    {
      n: 3,
      title: 'Haz la visita',
      text: 'Ve a terreno y, al terminar, márcala como realizada.',
      icon: ClipboardCheck,
      action: 'Marcar como realizada',
      to: mobile ? '/app/visitas' : '/web/mis-visitas',
    },
    { n: 4, title: 'Regístrala en FLP', text: 'Copia el resumen a FLP y pega aquí el ID.', icon: Send, action: 'Registrar en FLP', to: mobile ? '/app/visitas' : '/web/mis-visitas' },
  ];

  const ready = next && next.checklist.length >= next.slot.requirements.length;
  const current = toVerify.length ? 3 : pendingFlp.length ? 4 : !next ? 1 : ready ? 3 : 2;
  const waiting = current === 3 && !toVerify.length; // todo listo, falta que llegue el día

  return (
    <section className={cx('card p-4', className)} aria-labelledby="steps-t">
      <h2 id="steps-t" className="text-base font-extrabold text-ink">
        ¿Qué tengo que hacer?
      </h2>
      <p className="text-sm text-muted">Tu visita FLP en 4 pasos.</p>
      <ol className={cx('mt-3 grid gap-2', !mobile && 'lg:grid-cols-4')}>
        {steps.map((s) => {
          const isDone = s.n < current;
          const isNow = s.n === current;
          return (
            <li key={s.n} aria-current={isNow ? 'step' : undefined} className={cx('flex flex-col rounded-xl p-3', isNow ? 'bg-brand-50 ring-2 ring-brand' : 'bg-canvas')}>
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    'grid size-9 shrink-0 place-items-center rounded-full text-base font-extrabold',
                    isDone ? 'bg-success text-white' : isNow ? 'bg-brand text-white' : 'bg-white text-muted ring-1 ring-line',
                  )}
                >
                  {isDone ? <Check className="size-5" strokeWidth={3} aria-label="Listo" /> : s.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cx('font-bold', isDone ? 'text-muted' : 'text-ink')}>{s.title}</p>
                  {(isNow || !mobile) && <p className="text-sm text-graphite">{isNow && waiting ? 'Todo listo. Vuelve aquí el día de la visita.' : isNow ? (s.nowText ?? s.text) : s.text}</p>}
                </div>
                <s.icon className={cx('size-5 shrink-0', isNow ? 'text-brand' : 'text-muted')} aria-hidden />
              </div>
              {isNow && !waiting && s.n === 3 && toVerify[0] ? (
                <CheckVisitButton size="lg" block className="mt-3" bookingId={toVerify[0].id} userId={userId} />
              ) : isNow && !waiting && (
                <Link
                  to={s.to}
                  className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 text-base font-bold text-white shadow-sm active:scale-[0.98]"
                >
                  {s.action}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
