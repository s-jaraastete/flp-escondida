import { useAuth } from '@/contexts/SessionContext';
import { useData } from '@/contexts/DataContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { MSection } from '@/components/mobile/MobileKit';
import { spotTotals } from '@/services/selectors';
import { SpotForm, SpotList } from '@/features/spot/Spot';

export default function MobileSpot() {
  const { user, role } = useAuth('mobile');
  const { data } = useData();
  const isUser = role === 'user';
  const t = spotTotals(data, isUser ? { userId: user.id } : {});
  return (
    <div>
      <MobileHeader title="FLP spot" subtitle="FLP sin reserva previa">
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['Planificado', t.planificado],
            ['Spot', t.spot],
            ['Sin asistencia', t.sinAsistencia],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-white/10 py-2">
              <p className="text-xl font-extrabold tabular-nums">{v}</p>
              <p className="text-xs text-white/70">{l}</p>
            </div>
          ))}
        </div>
      </MobileHeader>
      {isUser && (
        <MSection title="¿Hiciste un FLP sin reserva?">
          <div className="card p-4">
            <SpotForm userId={user.id} large />
          </div>
        </MSection>
      )}
      <MSection title={isUser ? 'Mis FLP spot' : 'Últimos FLP spot'}>
        <SpotList data={data} userId={isUser ? user.id : undefined} showUser={!isUser} />
      </MSection>
    </div>
  );
}
