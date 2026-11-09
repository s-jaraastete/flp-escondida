import { useMemo, useState } from 'react';
import type { ActivityType, Area } from '@/types';
import { useData } from '@/contexts/DataContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { Chip, SlotCard } from '@/components/mobile/MobileKit';
import { EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/status';
import { slotView } from '@/services/selectors';
import { todayISO } from '@/utils/date';

/** Seguimiento de actividades FLP (administrador). */
export default function MobileActivities() {
  const { data } = useData();
  const [period, setPeriod] = useState<'proximas' | 'pasadas'>('proximas');
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const [type, setType] = useState<ActivityType | 'Todas'>('Todas');
  const t = todayISO();
  const list = useMemo(() => {
    const l = data.slots
      .filter((s) => s.status === 'publicado' && (period === 'proximas' ? s.date >= t : s.date < t))
      .filter((s) => type === 'Todas' || s.activityType === type)
      .map((s) => slotView(data, s))
      .filter((s) => area === 'Todas' || s.project.area === area);
    return period === 'pasadas' ? l.reverse() : l;
  }, [data, period, area, type, t]);

  const verifiedBySlot = useMemo(() => {
    const m = new Map<string, number>();
    data.verifications.forEach((v) => m.set(v.slotId, (m.get(v.slotId) ?? 0) + 1));
    return m;
  }, [data.verifications]);

  return (
    <div>
      <MobileHeader title="Actividades FLP" subtitle="Seguimiento">
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1" role="tablist">
          {(['proximas', 'pasadas'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={period === k} onClick={() => setPeriod(k)} className={period === k ? 'rounded-lg bg-white py-2 text-xs font-bold text-ink' : 'rounded-lg py-2 text-xs font-bold text-white/70'}>
              {k === 'proximas' ? 'Próximas' : 'Realizadas'}
            </button>
          ))}
        </div>
      </MobileHeader>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
        {(['Todas', 'Mina', 'Coloso'] as const).map((a) => (
          <Chip key={a} active={area === a} onClick={() => setArea(a)}>
            {a}
          </Chip>
        ))}
        <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />
        {(['Todas', 'OVCC', 'CTP'] as const).map((x) => (
          <Chip key={x} active={type === x} onClick={() => setType(x)}>
            {x === 'Todas' ? 'Tipos' : x}
          </Chip>
        ))}
      </div>
      <p className="px-4 pt-3 text-xs text-muted">{list.length} actividades</p>
      <div className="grid gap-2.5 px-4 pt-2">
        {list.length === 0 && <EmptyState compact title="Sin actividades" />}
        {list.slice(0, 40).map((s) => (
          <SlotCard
            key={s.id}
            slot={s}
            to={`/app/disponibilidad/${s.id}`}
            right={
              period === 'pasadas' ? (
                <Badge tone={verifiedBySlot.get(s.id) ? 'success' : 'warning'}>{verifiedBySlot.get(s.id) ?? 0} verif.</Badge>
              ) : (
                <span className="text-[11px] font-bold text-graphite">{s.occupied}/{s.capacity} inscritos</span>
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
