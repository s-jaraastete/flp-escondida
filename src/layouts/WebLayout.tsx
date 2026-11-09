import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ClipboardCheck,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  Smartphone,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';
import { useAuth } from '@/contexts/SessionContext';
import { useData } from '@/contexts/DataContext';
import { Avatar } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { DemoBadge, FlpMark, Wordmark } from '@/components/ui/Brand';
import { ROLE_LABEL } from '@/services/flpService';
import { userBookings } from '@/services/selectors';
import { ROLE_OPTIONS } from '@/features/auth/useDemoLogin';
import { cx } from '@/utils/misc';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  end?: boolean;
}

function useNav(role: Role, userId: string): NavItem[] {
  const { data } = useData();
  const pending = data.bookings.filter((b) => b.status === 'pendiente').length;
  if (role === 'user') {
    const toVerify = userBookings(data, userId).filter((b) => b.awaitingVerification).length;
    return [
      { to: '/web', label: 'Mi dashboard', icon: LayoutDashboard, end: true },
      { to: '/web/reservar', label: 'Reservar visita', icon: CalendarPlus },
      { to: '/web/mis-visitas', label: 'Mis visitas', icon: ClipboardCheck, badge: toVerify },
      { to: '/web/proyectos', label: 'Proyectos', icon: FolderKanban },
      { to: '/web/calendario', label: 'Calendario', icon: CalendarDays },
      { to: '/web/acciones', label: 'Mis acciones', icon: ListChecks },
      { to: '/web/flujo', label: 'Flujo FLP', icon: Workflow },
    ];
  }
  const items: NavItem[] = [
    { to: '/web', label: role === 'admin' ? 'Dashboard ejecutivo' : 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/web/proyectos', label: 'Proyectos', icon: FolderKanban },
    { to: '/web/calendario', label: 'Calendario', icon: CalendarDays },
    { to: '/web/programacion', label: role === 'admin' ? 'Actividades FLP' : 'Programación', icon: CalendarPlus },
    { to: '/web/solicitudes', label: 'Solicitudes', icon: Inbox, badge: pending },
    { to: '/web/acciones', label: 'Hallazgos y acciones', icon: ListChecks },
  ];
  if (role === 'admin') items.push({ to: '/web/usuarios', label: 'Usuarios y perfiles', icon: Users });
  items.push({ to: '/web/flujo', label: 'Flujo FLP', icon: Workflow });
  return items;
}

export default function WebLayout() {
  const { user, role, switchRole, logout } = useAuth('web');
  const { reset } = useData();
  const nav = useNav(role, user.id);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  const current = nav.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  const sidebar = (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <FlpMark />
        <div className="leading-tight">
          <p className="wordmark text-sm">FLP ESCONDIDA</p>
          <p className="text-[11px] text-white/50">Field Leadership Program</p>
        </div>
      </div>
      <p className="px-5 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">{ROLE_LABEL[role]}</p>
      <nav className="scroll-thin flex-1 overflow-y-auto px-3" aria-label="Navegación principal">
        <ul className="grid gap-1">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive ? 'bg-brand text-white shadow-[0_6px_20px_rgb(241_90_36/0.35)]' : 'text-white/70 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className="min-w-5 rounded-full bg-white/15 px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums group-[.active]:bg-white/25">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="m-3 rounded-2xl bg-white/5 p-4">
        <Wordmark size="sm" />
        <p className="mt-2 text-[11px] leading-relaxed text-white/45">Prototipo con datos ficticios. Persistencia local en este navegador.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden bg-ink lg:block">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade absolute inset-0 bg-ink/60" onClick={() => setDrawer(false)} aria-hidden />
          <div className="animate-pop relative h-full w-72">
            {sidebar}
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-5 rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-graphite hover:bg-canvas lg:hidden" aria-label="Abrir menú">
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-muted">Plataforma FLP Escondida</p>
            <h1 className="truncate text-base font-bold text-ink">{current?.label ?? 'FLP Escondida'}</h1>
          </div>
          <DemoBadge className="hidden sm:inline-flex" />
          {role === 'user' && (
            <button
              onClick={() => navigate('/web/reservar')}
              className="hidden items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-muted hover:border-brand/40 hover:text-ink md:inline-flex"
            >
              <Search className="size-4" aria-hidden /> Buscar proyecto u horario
            </button>
          )}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu((m) => !m)}
              className="flex items-center gap-2.5 rounded-xl p-1.5 pr-2 hover:bg-canvas"
              aria-haspopup="menu"
              aria-expanded={menu}
            >
              <Avatar name={user.name} />
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-semibold text-ink">{user.name}</span>
                <span className="block text-xs text-muted">{ROLE_LABEL[role]}</span>
              </span>
              <ChevronDown className="size-4 text-muted" aria-hidden />
            </button>
            {menu && (
              <div role="menu" className="animate-pop absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-ink">{user.name}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>
                <p className="mt-1 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted">Cambiar de perfil</p>
                {ROLE_OPTIONS.map((o) => (
                  <button
                    key={o.role}
                    role="menuitemradio"
                    aria-checked={o.role === role}
                    onClick={() => {
                      setMenu(false);
                      if (o.role !== role) {
                        switchRole(o.role);
                        navigate('/web');
                      }
                    }}
                    className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm', o.role === role ? 'bg-brand-50 font-semibold text-brand-700' : 'text-graphite hover:bg-canvas')}
                  >
                    <o.icon className="size-4" aria-hidden /> {o.label}
                  </button>
                ))}
                <div className="my-2 h-px bg-line" />
                <button role="menuitem" onClick={() => navigate('/app')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-graphite hover:bg-canvas">
                  <Smartphone className="size-4" aria-hidden /> Abrir aplicación móvil
                </button>
                {role === 'admin' && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenu(false);
                      setConfirmReset(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-graphite hover:bg-canvas"
                  >
                    <RotateCcw className="size-4" aria-hidden /> Restablecer datos demo
                  </button>
                )}
                <button
                  role="menuitem"
                  onClick={() => {
                    logout();
                    navigate('/web/login');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-50"
                >
                  <LogOut className="size-4" aria-hidden /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          setConfirmReset(false);
        }}
        title="Restablecer datos demo"
        message="Se eliminarán todas las reservas, verificaciones y acciones creadas durante la demostración y se regenerarán los datos iniciales con fechas a partir de hoy. Las sesiones abiertas se mantienen."
        confirmLabel="Restablecer"
      />
    </div>
  );
}
