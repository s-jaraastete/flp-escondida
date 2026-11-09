import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Building2, CalendarPlus, ShieldAlert } from 'lucide-react';
import { companyById, controlsForRisk, riskById } from '@/data/catalogs';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { Button, Card, EmptyState, SectionTitle } from '@/components/ui/primitives';
import { AreaBadge, Badge, SeatsBadge, TypeBadge } from '@/components/ui/status';
import { Modal } from '@/components/ui/Modal';
import { findProject, OPEN_BOOKING } from '@/services/flpService';
import { slotView, upcomingSlots } from '@/services/selectors';
import { BookingDialog } from '@/features/booking/BookingDialog';
import { RequirementsChecklist } from '@/features/booking/RequirementsChecklist';
import { SlotForm } from '@/features/slots/SlotForm';
import { capitalize, fmtLong } from '@/utils/date';

export default function ProjectDetailPage() {
  const { id = '' } = useParams();
  const { data } = useData();
  const { user, role } = useAuth('web');
  const [bookId, setBookId] = useState<string | null>(null);
  const [publish, setPublish] = useState(false);
  const project = findProject(data, id);

  const slots = useMemo(
    () => upcomingSlots(data, 90).filter((s) => s.projectId === id).map((s) => slotView(data, s)),
    [data, id],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, typeof slots>();
    slots.forEach((s) => m.set(s.date, [...(m.get(s.date) ?? []), s]));
    return [...m.entries()];
  }, [slots]);

  if (!project) return <EmptyState title="Proyecto no encontrado" action={<Link to="/web/proyectos" className="font-semibold text-brand">Volver a proyectos</Link>} />;
  const mySlotIds = new Set(data.bookings.filter((b) => b.userId === user.id && OPEN_BOOKING.includes(b.status)).map((b) => b.slotId));
  const company = companyById(project.companyId);

  return (
    <div className="grid gap-6">
      <Link to="/web/proyectos" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-graphite hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Proyectos
      </Link>

      <Card className="overflow-hidden">
        <div className="bg-ink p-6 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <AreaBadge area={project.area} />
            {project.status === 'suspendido' ? <Badge tone="danger">Suspendido</Badge> : <Badge tone="success">Vigente</Badge>}
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-white/50">{project.code} · {project.sector}</p>
          <h2 className="text-2xl font-extrabold">{project.name}</h2>
          <p className="mt-1 max-w-3xl text-sm text-white/70">{project.description}</p>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-5">
          {[
            ['Empresa contratista', company?.name ?? '—'],
            ['Contract Owner (CO)', project.contractOwner],
            ['ITO', project.ito],
            ['Jefe de terreno', project.siteManager],
            ['Persona a visitar', project.visitContact],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-muted">{k}</p>
              <p className="font-semibold text-ink">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid gap-6 xl:col-span-1">
          <Card className="p-5">
            <SectionTitle title="Riesgos materiales y controles" />
            <ul className="grid gap-3">
              {project.riskIds.map((r) => (
                <li key={r} className="rounded-xl bg-canvas p-3">
                  <p className="flex items-start gap-2 text-sm font-semibold text-ink">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    {riskById(r)?.code} · {riskById(r)?.name}
                  </p>
                  <ul className="mt-1.5 grid gap-1 pl-6 text-xs text-graphite">
                    {controlsForRisk(r).map((c) => (
                      <li key={c.id}>
                        {c.code} {c.name}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Requisitos de acceso" subtitle="Requisitos habituales del proyecto" />
            <RequirementsChecklist requirements={project.defaultRequirements} />
          </Card>
        </div>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle
            title="Disponibilidad para visitas"
            subtitle={`${slots.length} horarios publicados`}
            action={
              role !== 'user' && project.status === 'vigente' ? (
                <Button icon={CalendarPlus} onClick={() => setPublish(true)}>
                  Publicar horario
                </Button>
              ) : undefined
            }
          />
          {byDate.length === 0 ? (
            <EmptyState title="Sin horarios publicados" description="Planificación aún no publica disponibilidad para este proyecto." />
          ) : (
            <div className="grid gap-5">
              {byDate.map(([date, list]) => (
                <div key={date}>
                  <p className="mb-2 text-sm font-bold first-letter:uppercase text-ink">{capitalize(fmtLong(date))}</p>
                  <ul className="grid gap-2">
                    {list.map((s) => {
                      const mine = mySlotIds.has(s.id);
                      return (
                        <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                          <div className="w-28 shrink-0">
                            <p className="text-base font-extrabold tabular-nums text-ink">{s.start}–{s.end}</p>
                            <p className="text-xs text-muted">{s.group}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <TypeBadge type={s.activityType} />
                              <p className="truncate text-sm font-semibold text-ink">{s.controlName}</p>
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                              <Building2 className="size-3" aria-hidden /> Líder: {s.leaderName} · {s.requirements.length} requisitos
                            </p>
                          </div>
                          <SeatsBadge seats={s.seats} capacity={s.capacity} />
                          {role === 'user' &&
                            (mine ? (
                              <Badge tone="info">Ya inscrito</Badge>
                            ) : (
                              <Button size="sm" disabled={s.seats === 0 || project.status !== 'vigente'} onClick={() => setBookId(s.id)}>
                                Reservar
                              </Button>
                            ))}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <BookingDialog slotId={bookId} userId={user.id} onClose={() => setBookId(null)} />
      <Modal open={publish} onClose={() => setPublish(false)} title={`Publicar horario · ${project.name}`} size="lg">
        <SlotForm by={user.id} defaultProjectId={project.id} onDone={() => setPublish(false)} onCancel={() => setPublish(false)} />
      </Modal>
    </div>
  );
}
