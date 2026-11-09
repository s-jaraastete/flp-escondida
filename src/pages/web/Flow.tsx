import { CalendarCheck, CalendarClock, CalendarPlus, ClipboardCheck, FolderKanban, HardHat, ListChecks, LineChart, Search } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Card, SectionTitle } from '@/components/ui/primitives';
import { isOverdue } from '@/services/selectors';
import { todayISO } from '@/utils/date';

export default function FlowPage() {
  const { data } = useData();
  const t = todayISO();
  const steps = [
    { icon: FolderKanban, who: 'Proyecto', title: 'Registra disponibilidad', detail: 'Días y horarios en que puede recibir visitas.', metric: `${data.projects.filter((p) => p.status === 'vigente').length} proyectos vigentes` },
    { icon: CalendarPlus, who: 'Planificador', title: 'Programa la visita', detail: 'Fecha, área, cupos, OVCC/CTP, líder, grupo, RM/CC y requisitos.', metric: `${data.slots.filter((s) => s.status === 'publicado' && s.date >= t).length} horarios publicados` },
    { icon: Search, who: 'Usuario', title: 'Revisa horarios', detail: 'Busca por proyecto, área, fecha o tipo de actividad.', metric: 'Filtros y calendario' },
    { icon: CalendarClock, who: 'Usuario', title: 'Reserva', detail: 'Revisa requisitos y envía la solicitud. Se evitan sobrecupos y superposiciones.', metric: `${data.bookings.filter((b) => b.status === 'pendiente').length} solicitudes pendientes` },
    { icon: CalendarCheck, who: 'Planificador', title: 'Confirma la coordinación', detail: 'Confirma, rechaza o reprograma con CO / ITO / jefe de terreno.', metric: `${data.bookings.filter((b) => b.status === 'confirmada').length} visitas confirmadas` },
    { icon: HardHat, who: 'Líder / usuario', title: 'Ejecuta la actividad FLP', detail: 'Visita en terreno con el checklist previo completo.', metric: 'Mina y Coloso' },
    { icon: ClipboardCheck, who: 'Usuario', title: 'Registra la verificación', detail: 'Preguntas SÍ / NO / N/A, comentarios y evidencia (simulada).', metric: `${data.verifications.length} verificaciones` },
    { icon: ListChecks, who: 'Responsable', title: 'Genera acciones', detail: 'Hallazgo → plan de acción con responsable y fecha compromiso.', metric: `${data.actions.filter((a) => a.status !== 'cerrada').length} abiertas · ${data.actions.filter(isOverdue).length} vencidas` },
    { icon: LineChart, who: 'Administrador', title: 'Monitorea cumplimiento', detail: 'Dashboards por área, cumplimiento y cierre de acciones.', metric: 'Indicadores en tiempo real' },
  ];
  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Flujo del proceso FLP</h2>
        <p className="text-sm text-muted">Desde la disponibilidad del proyecto hasta el monitoreo del cumplimiento. Las cifras se calculan con los datos actuales.</p>
      </div>
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Card className="relative flex h-full gap-4 p-5">
              <div className="flex flex-col items-center">
                <span className="grid size-11 place-items-center rounded-xl bg-brand text-white">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className="mt-2 text-xs font-extrabold text-brand">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">{s.who}</p>
                <p className="text-base font-bold text-ink">{s.title}</p>
                <p className="mt-1 text-sm text-graphite">{s.detail}</p>
                <p className="mt-2 inline-block rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink">{s.metric}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <Card className="p-5">
        <SectionTitle title="Estados de una reserva" />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {['Pendiente', '→', 'Confirmada', '→', 'Completada (con verificación)'].map((x, i) => (
            <span key={i} className={x === '→' ? 'text-muted' : 'rounded-full border border-line px-3 py-1 font-semibold text-ink'}>
              {x}
            </span>
          ))}
          <span className="ml-4 text-muted">Alternativas:</span>
          {['Rechazada', 'Cancelada', 'Reprogramada → Confirmada'].map((x) => (
            <span key={x} className="rounded-full bg-canvas px-3 py-1 text-graphite">
              {x}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
