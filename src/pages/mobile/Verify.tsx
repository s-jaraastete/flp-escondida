import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import type { Verification } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { Button, EmptyState } from '@/components/ui/primitives';
import { findBooking } from '@/services/flpService';
import { bookingView } from '@/services/selectors';
import { VerificationForm } from '@/features/verification/VerificationForm';

export default function MobileVerify() {
  const { bookingId = '' } = useParams();
  const { data } = useData();
  const { user } = useAuth('mobile');
  const navigate = useNavigate();
  const [done, setDone] = useState<Verification | null>(null);
  const raw = findBooking(data, bookingId);

  if (done) {
    const actions = data.actions.filter((a) => a.verificationId === done.id);
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-success-50 text-success">
          <CheckCircle2 className="size-10" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-ink">Verificación registrada</h1>
        <p className="mt-2 text-5xl font-extrabold text-brand">{done.compliance}%</p>
        <p className="text-sm text-muted">de cumplimiento</p>
        <p className="mt-3 text-sm text-graphite">{actions.length ? `Se crearon ${actions.length} plan(es) de acción.` : 'Sin acciones requeridas.'}</p>
        <div className="mt-8 grid w-full gap-2">
          {actions.length > 0 && (
            <Button size="lg" onClick={() => navigate('/app/acciones')}>
              Ver acciones
            </Button>
          )}
          <Button size="lg" variant="secondary" onClick={() => navigate('/app')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (!raw || raw.userId !== user.id) return <EmptyState title="Visita no encontrada" />;
  const b = bookingView(data, raw);
  if (!b.awaitingVerification)
    return (
      <div>
        <MobileHeader title="Verificación" back />
        <EmptyState
          title={b.hasVerification ? 'Visita ya verificada' : 'Verificación no disponible'}
          description="La verificación se habilita desde la hora de inicio de la visita y con la reserva confirmada."
        />
      </div>
    );

  return (
    <div>
      <MobileHeader title="Verificación en terreno" subtitle={b.slot.project.code} back />
      <div className="px-4 pt-4">
        <VerificationForm booking={b} mobile onDone={setDone} />
      </div>
    </div>
  );
}
