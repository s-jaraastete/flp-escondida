import { useMemo } from 'react';
import { CalendarCheck, UserX, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/SessionContext';
import { useData } from '@/contexts/DataContext';
import { Card, KpiCard, SectionTitle } from '@/components/ui/primitives';
import { CHART, GroupedBars } from '@/components/charts/Charts';
import { spotSeries, spotTotals } from '@/services/selectors';
import { SpotForm, SpotList } from '@/features/spot/Spot';

export default function SpotPage() {
  const { user, role } = useAuth('web');
  const { data } = useData();
  const isUser = role === 'user';
  const filter = isUser ? { userId: user.id } : {};
  const series = useMemo(() => spotSeries(data, filter), [data, isUser, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = useMemo(() => spotTotals(data, filter), [data, isUser, user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">{isUser ? 'Mis FLP spot' : 'FLP spot'}</h2>
        <p className="text-sm text-muted">FLP que se hicieron sin reservar un horario. Así también cuentan para el cumplimiento.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="FLP planificado" value={t.planificado} icon={CalendarCheck} tone="petrol" hint="Con reserva, últimos 6 meses" />
        <KpiCard label="FLP spot" value={t.spot} icon={Zap} tone="ink" hint={`${t.spotShare}% del total`} />
        <KpiCard label="Planificado sin asistencia" value={t.sinAsistencia} icon={UserX} tone={t.sinAsistencia ? 'danger' : 'ink'} hint={`${t.noShowRate}% de las reservas confirmadas`} />
      </div>

      <div className={isUser ? 'grid gap-6 xl:grid-cols-3' : 'grid gap-6 xl:grid-cols-2'}>
        {isUser && (
          <Card className="p-5">
            <SectionTitle title="Registrar FLP spot" subtitle="¿Hiciste un FLP sin reserva? Anótalo aquí." />
            <SpotForm userId={user.id} />
          </Card>
        )}
        <Card className="p-5">
          <SectionTitle title="Planificado vs spot" subtitle="Por mes" />
          <GroupedBars
            data={series}
            xKey="mes"
            height={240}
            series={[
              { key: 'planificado', name: 'Planificado', color: CHART.s1 },
              { key: 'spot', name: 'Spot', color: CHART.info },
            ]}
          />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Planificado sin asistencia" subtitle="Reservas confirmadas que no se realizaron" />
          <GroupedBars data={series} xKey="mes" height={240} series={[{ key: 'sinAsistencia', name: 'Sin asistencia', color: CHART.danger }]} />
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title={isUser ? 'Mis registros' : 'Últimos FLP spot'} />
        <SpotList data={data} userId={isUser ? user.id : undefined} showUser={!isUser} />
      </Card>
    </div>
  );
}
