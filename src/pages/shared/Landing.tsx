import { Link } from 'react-router';
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Monitor, Smartphone, Users } from 'lucide-react';
import { DemoBadge, FlpMark, Wordmark } from '@/components/ui/Brand';

const FLOW = ['Disponibilidad', 'Programación', 'Reserva', 'Confirmación', 'Actividad FLP', 'Verificación', 'Acciones', 'Seguimiento'];

export default function Landing() {
  return (
    <div className="relative min-h-[calc(100dvh-var(--demo-h))] overflow-hidden bg-ink text-white">
      {/* Fondo: topografía abstracta del rajo */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
        <defs>
          <pattern id="topo" width="220" height="220" patternUnits="userSpaceOnUse">
            {[20, 45, 70, 95].map((r) => (
              <ellipse key={r} cx="110" cy="110" rx={r * 1.15} ry={r * 0.7} fill="none" stroke="#fff" strokeWidth="1" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo)" />
      </svg>
      <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-brand/25 blur-[120px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-48 -left-32 size-[420px] rounded-full bg-petrol/30 blur-[120px]" aria-hidden />

      <div className="relative mx-auto flex min-h-[calc(100dvh-var(--demo-h))] max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <Wordmark size="md" />
          <DemoBadge />
        </header>

        <main className="flex flex-1 flex-col justify-center py-6 lg:py-8">
          <div className="max-w-5xl">
            <div className="mb-4 flex items-center gap-3">
              <FlpMark className="size-10" />
              <span className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">Minera Escondida</span>
            </div>
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight [font-family:var(--font-display)] sm:text-5xl lg:text-[3.25rem]">
              Safety Planner
            </h1>
            <p className="mt-3 text-xl font-light italic text-white/80 sm:text-2xl">Field Leadership Program</p>
            <p className="mt-4 max-w-xl text-base text-white/70 sm:text-lg">
              Plataforma integrada de planificación, agendamiento y liderazgo en terreno.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <EntryCard
              to="/web/login"
              icon={Monitor}
              eyebrow="Escritorio"
              title="Ingresar a Plataforma Web"
              text="Administración, planificación de visitas, calendario, reservas, dashboards y seguimiento de planes de acción."
              features={[
                { icon: BarChart3, label: 'Dashboards' },
                { icon: CalendarDays, label: 'Calendario' },
                { icon: Users, label: 'Gestión' },
              ]}
            />
            <EntryCard
              to="/app/login"
              icon={Smartphone}
              eyebrow="Terreno"
              title="Ingresar a Aplicación Móvil"
              text="Explora proyectos, reserva visitas, revisa requisitos y registra verificaciones y hallazgos desde terreno."
              features={[
                { icon: CalendarDays, label: 'Reservas' },
                { icon: ClipboardCheck, label: 'Verificación' },
                { icon: CheckCircle2, label: 'Acciones' },
              ]}
              accent
            />
          </div>

          <ol className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-white/60" aria-label="Flujo FLP">
            {FLOW.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-medium text-white/80">
                  <span className="mr-1.5 text-brand">{i + 1}</span>
                  {step}
                </span>
                {i < FLOW.length - 1 && <ArrowRight className="size-3 text-white/30" aria-hidden />}
              </li>
            ))}
          </ol>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs text-white/50">
          <span>Prototipo demostrativo · datos ficticios · autenticación simulada (no es un mecanismo de seguridad real).</span>
          <span>v0.1 · {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}

function EntryCard({
  to,
  icon: Icon,
  eyebrow,
  title,
  text,
  features,
  accent,
}: {
  to: string;
  icon: typeof Monitor;
  eyebrow: string;
  title: string;
  text: string;
  features: Array<{ icon: typeof Monitor; label: string }>;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        'group relative flex flex-col overflow-hidden rounded-3xl border p-6 transition duration-200 hover:-translate-y-1 ' +
        (accent
          ? 'border-brand/50 bg-gradient-to-br from-brand to-brand-700 hover:shadow-[0_20px_60px_rgb(231_85_15/0.35)]'
          : 'border-white/10 bg-white/[0.04] backdrop-blur hover:border-white/25 hover:bg-white/[0.07]')
      }
    >
      <div className="flex items-start justify-between">
        <span className={'grid size-14 place-items-center rounded-2xl ' + (accent ? 'bg-white/15' : 'bg-brand')}>
          <Icon className="size-7" aria-hidden />
        </span>
        <span className={'text-xs font-bold uppercase tracking-[0.2em] ' + (accent ? 'text-white/80' : 'text-white/50')}>{eyebrow}</span>
      </div>
      <h2 className="mt-5 text-2xl font-extrabold">{title}</h2>
      <p className={'mt-2 text-sm leading-relaxed ' + (accent ? 'text-white/85' : 'text-white/65')}>{text}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {features.map((f) => (
          <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-medium">
            <f.icon className="size-3.5" aria-hidden />
            {f.label}
          </span>
        ))}
      </div>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
        Ingresar <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
      </span>
    </Link>
  );
}
