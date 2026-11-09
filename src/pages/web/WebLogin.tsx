import { Link } from 'react-router';
import { ArrowLeft, BarChart3, CalendarDays, Info, LogIn, Monitor, ShieldCheck } from 'lucide-react';
import { Button, Field } from '@/components/ui/primitives';
import { DemoBadge, FlpMark, Wordmark } from '@/components/ui/Brand';
import { ROLE_OPTIONS, useDemoLogin } from '@/features/auth/useDemoLogin';
import { DEMO_PASSWORD } from '@/contexts/SessionContext';
import { cx } from '@/utils/misc';

export default function WebLogin() {
  const f = useDemoLogin('web');
  return (
    <div className="grid min-h-[calc(100dvh-var(--demo-h))] lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 top-1/3 size-96 rounded-full bg-brand/30 blur-[110px]" aria-hidden />
        <Wordmark />
        <div className="relative mt-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/70">
            <Monitor className="size-3.5" aria-hidden /> Plataforma Web
          </span>
          <h1 className="wordmark mt-5 text-5xl leading-none">
            FLP <span className="text-brand">ESCONDIDA</span>
          </h1>
          <p className="mt-3 max-w-md text-white/70">Planificación, agendamiento y seguimiento del liderazgo en terreno en Mina y Coloso.</p>
          <ul className="mt-10 grid max-w-md gap-4 text-sm text-white/80">
            {[
              { icon: CalendarDays, t: 'Calendario semanal y mensual con cupos en tiempo real' },
              { icon: ShieldCheck, t: 'Requisitos de acceso y seguridad antes de cada visita' },
              { icon: BarChart3, t: 'Indicadores de cumplimiento y planes de acción' },
            ].map(({ icon: I, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-brand">
                  <I className="size-4" aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex flex-col bg-canvas px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> Inicio
          </Link>
          <DemoBadge />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex items-center gap-3">
            <FlpMark />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Plataforma Web</p>
              <h2 className="text-2xl font-extrabold text-ink">Iniciar sesión</h2>
            </div>
          </div>

          <form onSubmit={f.submit} noValidate className="card p-6">
            <fieldset>
              <legend className="label">Perfil de demostración</legend>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Perfil">
                {ROLE_OPTIONS.map((o) => (
                  <button
                    key={o.role}
                    type="button"
                    role="radio"
                    aria-checked={f.role === o.role}
                    onClick={() => f.setRole(o.role)}
                    className={cx(
                      'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition',
                      f.role === o.role ? 'border-brand bg-brand-50 text-brand-700' : 'border-line bg-surface text-graphite hover:border-graphite/30',
                    )}
                  >
                    <o.icon className="size-5" aria-hidden />
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{ROLE_OPTIONS.find((o) => o.role === f.role)!.description}</p>
            </fieldset>

            <div className="mt-5 grid gap-4">
              <Field label="Correo" error={f.errors.email} required>
                {(p) => <input {...p} type="email" autoComplete="username" className="input" value={f.email} onChange={(e) => f.setEmail(e.target.value)} />}
              </Field>
              <Field label="Contraseña" error={f.errors.password} required>
                {(p) => (
                  <input {...p} type="password" autoComplete="current-password" className="input" value={f.password} onChange={(e) => f.setPassword(e.target.value)} />
                )}
              </Field>
            </div>
            {f.errors.form && (
              <p role="alert" className="mt-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-medium text-danger">
                {f.errors.form}
              </p>
            )}
            <Button type="submit" size="lg" block icon={LogIn} loading={f.loading} className="mt-6">
              Ingresar en modo demostración
            </Button>
          </form>

          <div className="mt-5 flex gap-3 rounded-2xl border border-line bg-surface p-4 text-xs text-graphite">
            <Info className="mt-0.5 size-4 shrink-0 text-petrol" aria-hidden />
            <p>
              Autenticación <strong>simulada</strong> para la demostración: no protege información real. Las credenciales demo se completan al elegir un
              perfil (contraseña: <code className="rounded bg-canvas px-1 font-mono">{DEMO_PASSWORD}</code>).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
