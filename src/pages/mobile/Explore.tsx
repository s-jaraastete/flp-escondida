import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Building2, ChevronRight, Search } from 'lucide-react';
import type { ActivityType, Area } from '@/types';
import { companyById, riskById } from '@/data/catalogs';
import { useData } from '@/contexts/DataContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { Chip } from '@/components/mobile/MobileKit';
import { EmptyState } from '@/components/ui/primitives';
import { AreaBadge, Badge } from '@/components/ui/status';
import { seatsLeft } from '@/services/flpService';
import { upcomingSlots } from '@/services/selectors';
import { relativeDay } from '@/utils/date';
import { normalize } from '@/utils/misc';

export default function MobileExplore() {
  const { data } = useData();
  const [q, setQ] = useState('');
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const [type, setType] = useState<ActivityType | 'Todas'>('Todas');
  const [onlyAvail, setOnlyAvail] = useState(false);
  const slots = useMemo(() => upcomingSlots(data, 45).filter((s) => type === 'Todas' || s.activityType === type), [data, type]);

  const list = useMemo(() => {
    const nq = normalize(q);
    return data.projects
      .filter((p) => p.status === 'vigente' && (area === 'Todas' || p.area === area))
      .filter((p) => !nq || normalize(`${p.name} ${p.code} ${p.sector} ${companyById(p.companyId)?.name}`).includes(nq))
      .map((p) => {
        const ps = slots.filter((s) => s.projectId === p.id);
        const withSeats = ps.filter((s) => seatsLeft(data, s) > 0);
        return { p, total: ps.length, available: withSeats.length, next: withSeats[0] };
      })
      .filter((x) => !onlyAvail || x.available > 0)
      .sort((a, b) => (a.next?.date ?? '9999').localeCompare(b.next?.date ?? '9999'));
  }, [data, q, area, slots, onlyAvail]);

  return (
    <div>
      <MobileHeader title="Explorar proyectos" subtitle="Disponibilidad FLP">
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            className="h-12 w-full rounded-2xl bg-white pl-10 pr-4 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Proyecto, empresa, sector…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar proyectos"
          />
        </div>
      </MobileHeader>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
        {(['Todas', 'Mina', 'Coloso'] as const).map((a) => (
          <Chip key={a} active={area === a} onClick={() => setArea(a)}>
            {a === 'Todas' ? 'Todas las áreas' : a}
          </Chip>
        ))}
        <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />
        {(['Todas', 'OVCC', 'CTP'] as const).map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)}>
            {t === 'Todas' ? 'OVCC + CTP' : t}
          </Chip>
        ))}
        <Chip active={onlyAvail} onClick={() => setOnlyAvail((v) => !v)}>
          Con cupos
        </Chip>
      </div>
      <p className="px-4 pt-3 text-xs text-muted">{list.length} proyectos</p>
      <div className="grid gap-2.5 px-4 pt-2">
        {list.length === 0 && <EmptyState compact title="Sin resultados" description="Prueba con otro filtro." />}
        {list.map(({ p, total, available, next }) => (
          <Link key={p.id} to={`/app/proyecto/${p.id}`} className="card block p-4 active:scale-[0.99]">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <AreaBadge area={p.area} />
                  <span className="text-[11px] font-bold text-muted">{p.code}</span>
                </div>
                <p className="mt-1.5 font-bold leading-snug text-ink">{p.name}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                  <Building2 className="size-3" aria-hidden /> {companyById(p.companyId)?.name}
                </p>
              </div>
              <ChevronRight className="mt-1 size-5 text-muted" aria-hidden />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {p.riskIds.slice(0, 3).map((r) => (
                <Badge key={r} tone="brand" className="font-medium">
                  {riskById(r)?.code}
                </Badge>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-xs">
              <span className="text-graphite">
                <strong className="text-ink">{available}</strong> de {total} horarios con cupo
              </span>
              {next ? <span className="inline-block font-bold first-letter:uppercase text-brand">Próx.: {relativeDay(next.date)} {next.start}</span> : <span className="text-muted">Sin cupos</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
