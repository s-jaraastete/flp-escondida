import { Link } from 'react-router';
import { ChevronLeft, Fingerprint, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { DemoBadge, FlpMark, Wordmark } from '@/components/ui/Brand';
import PhoneFrame from '@/layouts/PhoneFrame';
import { ROLE_OPTIONS, useDemoLogin } from '@/features/auth/useDemoLogin';
import { DEMO_PASSWORD } from '@/contexts/SessionContext';
import { cx } from '@/utils/misc';

export default function MobileLogin() {
  const f = useDemoLogin('mobile');
  return (
    <PhoneFrame>
      <div className="flex min-h-full flex-col bg-ink text-white">
        <div className="relative overflow-hidden px-6 pb-10 pt-6">
          <div className="pointer-events-none absolute -right-16 -top-10 size-64 rounded-full bg-brand/40 blur-[80px]" aria-hidden />
          <div className="relative flex items-center justify-between">
            <Link to="/" className="grid size-10 place-items-center rounded-full bg-white/10" aria-label="Volver al inicio">
              <ChevronLeft className="size-5" />
            </Link>
            <DemoBadge />
          </div>
          <div className="relative mt-10">
            <FlpMark className="size-12" />
            <h1 className="wordmark mt-5 text-4xl leading-none">
              SAFETY<br />
              <span className="text-brand">PLANNER</span>
            </h1>
            <p className="mt-2 text-sm italic text-white/70">Field Leadership Program · App de terreno</p>
          </div>
        </div>

        <form onSubmit={f.submit} noValidate className="flex flex-1 flex-col rounded-t-[2rem] bg-surface px-6 pb-8 pt-7 text-ink">
          <p className="text-lg font-extrabold">¿Con qué perfil ingresas?</p>
          <div className="mt-4 grid gap-2.5" role="radiogroup" aria-label="Perfil">
            {ROLE_OPTIONS.map((o) => {
              const active = f.role === o.role;
              return (
                <button
                  key={o.role}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => f.setRole(o.role)}
                  className={cx(
                    'flex w-full min-w-0 items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition active:scale-[0.99]',
                    active ? 'border-brand bg-brand-50' : 'border-line',
                  )}
                >
                  <span className={cx('grid size-11 place-items-center rounded-xl', active ? 'bg-brand text-white' : 'bg-canvas text-graphite')}>
                    <o.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{o.label}</span>
                    <span className="block truncate text-xs text-muted">{o.description}</span>
                  </span>
                  <span className={cx('size-5 rounded-full border-2', active ? 'border-[6px] border-brand' : 'border-line')} aria-hidden />
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3">
            <label className="block">
              <span className="label">Correo demo</span>
              <input type="email" className="input h-12 text-base" value={f.email} onChange={(e) => f.setEmail(e.target.value)} aria-invalid={Boolean(f.errors.email)} />
              {f.errors.email && <span className="mt-1 block text-xs font-medium text-danger">{f.errors.email}</span>}
            </label>
            <label className="block">
              <span className="label">Contraseña</span>
              <input type="password" className="input h-12 text-base" value={f.password} onChange={(e) => f.setPassword(e.target.value)} aria-invalid={Boolean(f.errors.password)} />
              {f.errors.password && <span className="mt-1 block text-xs font-medium text-danger">{f.errors.password}</span>}
            </label>
          </div>
          {f.errors.form && (
            <p role="alert" className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-sm font-medium text-danger">
              {f.errors.form}
            </p>
          )}

          <Button type="submit" size="lg" block icon={Fingerprint} loading={f.loading} className="mt-6 h-14 rounded-2xl text-base">
            Ingresar en modo demostración
          </Button>
          <p className="mt-4 text-center text-xs text-muted">
            Acceso simulado · contraseña demo <code className="font-mono">{DEMO_PASSWORD}</code>
          </p>
          <div className="mt-auto flex items-center justify-center gap-2 pt-6 text-xs text-muted">
            <Smartphone className="size-3.5" aria-hidden />
            <Wordmark size="sm" />
          </div>
        </form>
      </div>
    </PhoneFrame>
  );
}
