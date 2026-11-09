import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { companyById, riskById } from '@/data/catalogs';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { MobileHeader } from '@/layouts/MobileLayout';
import { DayStrip, MSection, SlotCard } from '@/components/mobile/MobileKit';
import { EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/status';
import { OPEN_BOOKING, findProject } from '@/services/flpService';
import { slotView, upcomingSlots } from '@/services/selectors';
import { RequirementsChecklist } from '@/features/booking/RequirementsChecklist';
import { capitalize, fmtLong, todayISO } from '@/utils/date';

export default function MobileProject() {
  const { id = '' } = useParams();
  const { data } = useData();
  const { user, role } = useAuth('mobile');
  const project = findProject(data, id);
  const slots = useMemo(() => upcomingSlots(data, 21).filter((s) => s.projectId === id).map((s) => slotView(data, s)), [data, id]);
  const marks = useMemo(() => {
    const m = new Map<string, number>();
    slots.forEach((s) => m.set(s.date, (m.get(s.date) ?? 0) + 1));
    return m;
  }, [slots]);
  const [day, setDay] = useState(() => slots[0]?.date ?? todayISO());
  const daySlots = slots.filter((s) => s.date === day);
  const mine = new Set(data.bookings.filter((b) => b.userId === user.id && OPEN_BOOKING.includes(b.status)).map((b) => b.slotId));

  if (!project) return <EmptyState title="Proyecto no encontrado" />;
  return (
    <div>
      <MobileHeader title={project.name} subtitle={`${project.code} · ${project.area}`} back>
        <p className="mt-1 text-xs text-white/60">{companyById(project.companyId)?.name}</p>
        <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-widest text-white/50">Disponibilidad · próximas 3 semanas</p>
        <DayStrip value={day} onChange={setDay} marks={marks} />
      </MobileHeader>

      <MSection title={capitalize(fmtLong(day))}>
        {daySlots.length === 0 ? (
          <EmptyState compact title="Sin horarios este día" description={marks.size ? 'Los días con punto naranjo tienen horarios publicados.' : 'Este proyecto aún no publica disponibilidad.'} />
        ) : (
          <div className="grid gap-2.5">
            {daySlots.map((s) => (
              <SlotCard
                key={s.id}
                slot={s}
                showProject={false}
                to={role === 'user' ? `/app/reservar/${s.id}` : `/app/disponibilidad/${s.id}`}
                right={mine.has(s.id) ? <Badge tone="info">Inscrito</Badge> : undefined}
              />
            ))}
          </div>
        )}
      </MSection>

      <MSection title="Equipo del proyecto">
        <dl className="grid grid-cols-2 gap-2">
          {[
            ['Contract Owner', project.contractOwner],
            ['ITO', project.ito],
            ['Jefe de terreno', project.siteManager],
            ['Persona a visitar', project.visitContact],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="text-sm font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </MSection>

      <MSection title="Riesgos materiales">
        <ul className="grid gap-2">
          {project.riskIds.map((r) => (
            <li key={r} className="flex items-start gap-2.5 rounded-2xl bg-surface p-3 text-sm ring-1 ring-line">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>
                <strong>{riskById(r)?.code}</strong> {riskById(r)?.name}
              </span>
            </li>
          ))}
        </ul>
      </MSection>

      <MSection title="Requisitos habituales">
        <RequirementsChecklist requirements={project.defaultRequirements} />
      </MSection>
    </div>
  );
}
