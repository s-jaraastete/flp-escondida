import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { Verification } from '@/types';
import { Button, EmptyState } from '@/components/ui/primitives';
import { FlpRegistryCard } from '@/features/flp/FlpRegistryCard';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { findBooking } from '@/services/flpService';
import { bookingView } from '@/services/selectors';
import { VerificationForm } from '@/features/verification/VerificationForm';

export default function WebVerificationPage() {
  const { bookingId = '' } = useParams();
  const { data } = useData();
  const { user } = useAuth('web');
  const navigate = useNavigate();
  const raw = findBooking(data, bookingId);
  const [done, setDone] = useState<Verification | null>(null);
  const back = (
    <Link to="/web/mis-visitas" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-graphite hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden /> Mis visitas
    </Link>
  );
  if (done) {
    const nActions = data.actions.filter((a) => a.verificationId === done.id).length;
    return (
      <div className="mx-auto grid max-w-xl gap-4 py-6 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-50 text-success">
          <CheckCircle2 className="size-8" aria-hidden />
        </span>
        <h2 className="text-2xl font-extrabold text-ink">Verificación registrada</h2>
        <p className="text-4xl font-extrabold text-brand">{done.compliance}%</p>
        <p className="-mt-3 text-sm text-muted">de cumplimiento · {nActions ? `${nActions} plan(es) de acción creados` : 'sin acciones requeridas'}</p>
        <FlpRegistryCard verification={done} projectName={data.projects.find((p) => p.id === done.projectId)?.name ?? ''} />
        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/web/mis-visitas')}>Mis visitas</Button>
          {nActions > 0 && <Button onClick={() => navigate('/web/acciones')}>Ver acciones</Button>}
        </div>
      </div>
    );
  }
  if (!raw || raw.userId !== user.id) return <div className="grid gap-4">{back}<EmptyState icon={ShieldAlert} title="Visita no encontrada" /></div>;
  const booking = bookingView(data, raw);
  if (!booking.awaitingVerification)
    return (
      <div className="grid gap-4">
        {back}
        <EmptyState
          icon={ShieldAlert}
          title={booking.hasVerification ? 'Esta visita ya fue verificada' : 'Verificación no disponible'}
          description={
            booking.hasVerification
              ? 'Puedes revisar las acciones generadas en "Mis acciones".'
              : 'La verificación se habilita desde la hora de inicio de la visita y requiere que la reserva esté confirmada por planificación.'
          }
        />
      </div>
    );
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      {back}
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Verificación en terreno</h2>
        <p className="text-sm text-muted">Responde cada pregunta. Si registras un hallazgo (NO), crea el plan de acción asociado.</p>
      </div>
      <VerificationForm booking={booking} onDone={setDone} />
    </div>
  );
}
