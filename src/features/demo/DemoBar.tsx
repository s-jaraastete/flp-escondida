import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Check, ListChecks, Monitor, RotateCcw, Smartphone, X } from 'lucide-react';
import type { Experience, Role } from '@/types';
import { useSessions } from '@/contexts/SessionContext';
import { useData } from '@/contexts/DataContext';
import { ConfirmDialog } from '@/components/ui/Modal';
import { cx } from '@/utils/misc';
import { ROLE_SHORT, TOUR_FLOWS, type TourFlow } from './tour';
import { useTour } from './TourContext';
import { TextSizeToggle } from '@/features/a11y/TextSize';

const ROLES: Role[] = ['admin', 'planner', 'user'];

/**
 * Franja de demostración (como en Cosecheros): perfil, web/móvil, recorridos y restablecer.
 * Selector demostrativo: cambia de perfil sin inicio de sesión.
 */
export function DemoBar() {
  const { sessions, switchRole } = useSessions();
  const { reset } = useData();
  const { done, clear } = useTour();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const exp: Experience = pathname.startsWith('/app') ? 'mobile' : 'web';
  const role = sessions[exp]?.role;
  const base = exp === 'web' ? '/web' : '/app';

  useEffect(() => {
    if (!guide) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setGuide(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [guide]);

  const pickRole = (r: Role) => {
    switchRole(exp, r);
    navigate(base);
  };
  const pickExp = (e: Experience) => {
    if (e === exp) return;
    const r = sessions[e]?.role ?? role ?? 'user';
    if (!sessions[e]) switchRole(e, r);
    navigate(e === 'web' ? '/web' : '/app');
  };
  const go = (f: TourFlow) => {
    switchRole(f.experience, f.role);
    setGuide(false);
    navigate(f.path);
  };

  return (
    <>
      <div
        role="region"
        aria-label="Controles de demostración"
        className="sticky top-0 z-[60] flex h-[var(--demo-h)] items-center gap-1.5 overflow-x-auto bg-[#141414] px-2 sm:gap-2 sm:px-3 text-xs text-white no-scrollbar"
      >
        <span className="shrink-0 rounded bg-amber-400 px-1.5 py-1 text-xs font-extrabold uppercase leading-none tracking-wider text-black">Demo</span>

        <div className="flex shrink-0 rounded-lg bg-white/10 p-0.5" role="group" aria-label="Experiencia">
          {(['web', 'mobile'] as const).map((e) => (
            <button
              key={e}
              aria-pressed={exp === e}
              onClick={() => pickExp(e)}
              className={cx('flex items-center gap-1 rounded-md px-2 py-1 font-semibold', exp === e ? 'bg-white text-black' : 'text-white/70 hover:text-white')}
              title={e === 'web' ? 'Plataforma web' : 'App móvil'}
            >
              {e === 'web' ? <Monitor className="size-3.5" aria-hidden /> : <Smartphone className="size-3.5" aria-hidden />}
              <span className="hidden sm:inline">{e === 'web' ? 'Web' : 'Móvil'}</span>
            </button>
          ))}
        </div>

        <div className="flex shrink-0 rounded-lg bg-white/10 p-0.5" role="group" aria-label="Perfil">
          {ROLES.map((r) => (
            <button
              key={r}
              aria-pressed={role === r}
              onClick={() => pickRole(r)}
              className={cx('rounded-md px-2.5 py-1 font-semibold', role === r ? 'bg-brand text-white' : 'text-white/70 hover:text-white')}
            >
              <span className="sm:hidden">{ROLE_SHORT[r].slice(0, 5)}.</span>
              <span className="hidden sm:inline">{ROLE_SHORT[r]}</span>
            </button>
          ))}
        </div>

        <span className="hidden min-w-0 flex-1 truncate text-white/50 lg:block">Selector demostrativo, sin inicio de sesión real · datos ficticios</span>
        <span className="flex-1 lg:hidden" />

        <TextSizeToggle dark />

        <button
          onClick={() => setGuide(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1 font-semibold hover:bg-white/10"
        >
          <ListChecks className="size-4" aria-hidden /> <span className="hidden sm:inline">Recorridos</span> {done.size}/{TOUR_FLOWS.length}
        </button>
        <button
          onClick={() => setConfirm(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1 font-semibold hover:bg-white/10"
          title="Restablecer demo"
        >
          <RotateCcw className="size-4" aria-hidden /> <span className="hidden md:inline">Restablecer</span>
        </button>
      </div>

      {guide && (
        <div className="fixed inset-0 z-[70]">
          <div className="animate-fade absolute inset-0 bg-black/50" onClick={() => setGuide(false)} aria-hidden />
          <aside className="animate-pop absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-[var(--shadow-pop)]" aria-label="Recorridos de la demo">
            <div className="flex items-start justify-between gap-3 border-b border-line p-4">
              <div>
                <h2 className="text-lg font-extrabold text-ink">Recorridos de la demo</h2>
                <p className="text-xs text-muted">
                  {done.size} de {TOUR_FLOWS.length} completados. Se marcan solos al realizarlos.
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
                  <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(done.size / TOUR_FLOWS.length) * 100}%` }} />
                </div>
              </div>
              <button onClick={() => setGuide(false)} className="rounded-lg bg-canvas p-1.5 text-graphite hover:text-ink" aria-label="Cerrar">
                <X className="size-5" />
              </button>
            </div>
            <ol className="scroll-thin flex-1 overflow-y-auto px-4">
              {TOUR_FLOWS.map((f) => {
                const ok = done.has(f.id);
                return (
                  <li key={f.id} className="grid grid-cols-[28px_1fr_auto] items-start gap-3 border-b border-line py-3">
                    <span
                      className={cx(
                        'grid size-6 place-items-center rounded-full border-2 text-xs font-bold',
                        ok ? 'border-success bg-success text-white' : 'border-line text-muted',
                      )}
                    >
                      {ok ? <Check className="size-3.5" strokeWidth={3} aria-label="Completado" /> : f.id}
                    </span>
                    <div className="min-w-0">
                      <p className={cx('text-sm font-bold text-ink', ok && 'text-muted line-through decoration-muted/60')}>{f.title}</p>
                      <p className="text-xs text-muted">{f.hint}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                        {f.experience === 'web' ? <Monitor className="size-3" aria-hidden /> : <Smartphone className="size-3" aria-hidden />}
                        {ROLE_SHORT[f.role]} · {f.experience === 'web' ? 'Web' : 'Móvil'}
                      </p>
                    </div>
                    <button onClick={() => go(f)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-brand/50 hover:text-brand-700">
                      Ir
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="border-t border-line p-4 text-xs text-muted">
              Todos los datos son ficticios. Los cambios se guardan solo en este navegador; “Restablecer” vuelve al estado inicial.
            </p>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          reset();
          clear();
          setConfirm(false);
        }}
        title="Restablecer demo"
        message="Se regeneran los datos de demostración con fechas desde hoy y se reinician los recorridos. Las sesiones de perfil se mantienen."
        confirmLabel="Restablecer"
      />
    </>
  );
}
