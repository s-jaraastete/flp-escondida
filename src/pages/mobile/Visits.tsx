import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { Button, EmptyState } from '@/components/ui/primitives';
import { BookingBadge, TypeBadge } from '@/components/ui/status';
import { userBookings } from '@/services/selectors';
import { relativeDay, todayISO } from '@/utils/date';
import { cx } from '@/utils/misc';

type Tab = 'proximas' | 'verificar' | 'historial';

export default function MobileVisits() {
  const { data } = useData();
  const { user } = useAuth('mobile');
  const navigate = useNavigate();
  const t = todayISO();
  const all = userBookings(data, user.id);
  const groups = {
    proximas: all.filter((b) => ['pendiente', 'confirmada'].includes(b.status) && !b.awaitingVerification && b.slot.date >= t),
    verificar: all.filter((b) => b.awaitingVerification).reverse(),
    historial: all.filter((b) => ['completada', 'cancelada', 'rechazada'].includes(b.status) || (b.status === 'pendiente' && b.slot.date < t)).reverse(),
  };
  const [tab, setTab] = useState<Tab>(groups.verificar.length ? 'verificar' : 'proximas');
  const list = groups[tab];

  return (
    <div>
      <MobileHeader title="Mis visitas" subtitle="Reservas FLP">
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/10 p-1" role="tablist">
          {(
            [
              ['proximas', 'Próximas'],
              ['verificar', 'Verificar'],
              ['historial', 'Historial'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('rounded-lg py-2 text-xs font-bold', tab === k ? 'bg-white text-ink' : 'text-white/70')}>
              {l} <span className="tabular-nums opacity-60">{groups[k].length}</span>
            </button>
          ))}
        </div>
      </MobileHeader>
      <div className="grid gap-2.5 px-4 pt-4">
        {list.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title={tab === 'verificar' ? 'Sin verificaciones pendientes' : tab === 'proximas' ? 'No tienes visitas próximas' : 'Sin historial'}
            action={tab === 'proximas' ? <Button onClick={() => navigate('/app/explorar')}>Explorar proyectos</Button> : undefined}
          />
        )}
        {list.map((b) => (
          <Link key={b.id} to={b.awaitingVerification ? `/app/verificar/${b.id}` : `/app/visita/${b.id}`} className="card flex items-center gap-3 p-3.5 active:scale-[0.99]">
            <div className="w-14 shrink-0 text-center">
              <p className="text-xs font-bold first-letter:uppercase text-muted">{relativeDay(b.slot.date)}</p>
              <p className="text-lg font-extrabold text-ink">{b.slot.start}</p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <BookingBadge status={b.status} awaiting={b.awaitingVerification} />
                <TypeBadge type={b.slot.activityType} />
              </div>
              <p className="mt-1 truncate text-sm font-bold text-ink">{b.slot.project.name}</p>
              <p className="truncate text-xs text-muted">{b.slot.controlName}</p>
            </div>
            <ChevronRight className="size-5 text-muted" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
