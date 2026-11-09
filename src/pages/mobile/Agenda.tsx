import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import type { Area } from '@/types';
import { useData } from '@/contexts/DataContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { Chip, DayStrip, MSection, SlotCard } from '@/components/mobile/MobileKit';
import { EmptyState, ProgressBar } from '@/components/ui/primitives';
import { slotView, upcomingSlots } from '@/services/selectors';
import { capitalize, fmtLong, todayISO } from '@/utils/date';

/** Agenda del planificador: días con horarios publicados y ocupación. */
export default function MobileAgenda() {
  const { data } = useData();
  const [day, setDay] = useState(todayISO());
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const slots = useMemo(
    () => upcomingSlots(data, 21).map((s) => slotView(data, s)).filter((s) => area === 'Todas' || s.project.area === area),
    [data, area],
  );
  const marks = useMemo(() => {
    const m = new Map<string, number>();
    slots.forEach((s) => m.set(s.date, (m.get(s.date) ?? 0) + 1));
    return m;
  }, [slots]);
  const list = slots.filter((s) => s.date === day);
  const occ = list.reduce((n, s) => n + s.occupied, 0);
  const cap = list.reduce((n, s) => n + s.capacity, 0);

  return (
    <div>
      <MobileHeader
        title="Agenda FLP"
        subtitle="Planificación"
        right={
          <Link to="/app/disponibilidad/nueva" className="grid size-10 place-items-center rounded-full bg-brand" aria-label="Publicar horario">
            <Plus className="size-5" />
          </Link>
        }
      >
        <div className="mt-3">
          <DayStrip value={day} onChange={setDay} marks={marks} />
        </div>
      </MobileHeader>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
        {(['Todas', 'Mina', 'Coloso'] as const).map((a) => (
          <Chip key={a} active={area === a} onClick={() => setArea(a)}>
            {a}
          </Chip>
        ))}
      </div>
      <MSection title={capitalize(fmtLong(day))}>
        {list.length > 0 && (
          <div className="mb-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-graphite">{list.length} visitas · {occ}/{cap} cupos usados</span>
              <span className="font-bold text-ink">{cap ? Math.round((occ / cap) * 100) : 0}%</span>
            </div>
            <ProgressBar value={cap ? (occ / cap) * 100 : 0} label="Ocupación del día" />
          </div>
        )}
        {list.length === 0 ? (
          <EmptyState compact title="Sin visitas este día" action={<Link to="/app/disponibilidad/nueva" className="text-sm font-bold text-brand">Publicar horario</Link>} />
        ) : (
          <div className="grid gap-2.5">
            {list.map((s) => (
              <SlotCard key={s.id} slot={s} to={`/app/disponibilidad/${s.id}`} right={<span className="text-[11px] font-bold text-graphite">{s.occupied}/{s.capacity}</span>} />
            ))}
          </div>
        )}
      </MSection>
    </div>
  );
}
