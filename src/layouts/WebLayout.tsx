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
  LogOut,
  Menu,
  RotateCcw,
  Search,
  Smartphone,
  Users,
  X,
  type LucideIcon,
  Zap,
} from 'lucide-react';
import type { Role } from '@/types';
import { useAuth } from '@/contexts/SessionContext';
import { useData } from '@/contexts/DataContext';
import { Avatar } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { DemoBadge, Wordmark } from '@/components/ui/Brand';
import { ConnectivityBanner, OnlineToggle } from '@/features/offline/ConnectivityUI';
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
      { to: '/web/spot', label: 'FLP spot', icon: Zap },
      { to: '/web/proyectos', label: 'Proyectos', icon: FolderKanban },
      { to: '/web/calendario', label: 'Calendario', icon: CalendarDays },
    ];
  }
  const items: NavItem[] = [
    { to: '/web', label: role === 'admin' ? 'Dashboard ejecutivo' : 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/web/proyectos', label: 'Proyectos', icon: FolderKanban },
    { to: '/web/calendario', label: 'Calendario', icon: CalendarDays },
    { to: '/web/programacion', label: role === 'admin' ? 'Actividades FLP' : 'Programación', icon: CalendarPlus },
    { to: '/web/solicitudes', label: 'Solicitudes', icon: Inbox, badge: pending },
    { to: '/web/spot', label: 'FLP spot', icon: Zap },
  ];
  if (role === 'admin') items.push({ to: '/web/usuarios', label: 'Usuarios y perfiles', icon: Users });
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

  // Menú lateral estilo FLP: columna oscura angosta con ícono sobre etiqueta.
  const sidebar = (
    <nav className="scroll-thin flex h-full flex-col overflow-y-auto overflow-x-hidden bg-flp-bar text-white" aria-label="Navegación principal">
      <p className="truncate px-1.5 pb-2 pt-4 text-center text-[0.625rem] font-bold uppercase tracking-wide text-white/40">{ROLE_LABEL[role]}</p>
      <ul>
        {nav.map((item) => (
          <li key={item.to} className="border-t border-white/10 last:border-b">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'relative flex flex-col items-center gap-1.5 px-2 py-4 text-center text-xs font-medium leading-tight transition',
                  isActive ? 'bg-black/35 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-y-0 left-0 w-1 bg-brand" aria-hidden />}
                  <item.icon className={cx('size-7 shrink-0', isActive && 'text-brand')} strokeWidth={1.8} aria-hidden />
                  <span>{item.label}</span>
                  {!!item.badge && (
                    <span className="absolute right-3 top-2.5 min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-xs font-bold tabular-nums text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <p className="mt-auto px-3 py-4 text-center text-xs leading-snug text-white/35">Prototipo con datos ficticios</p>
    </nav>
  );

  return (
    <div className="flex min-h-[calc(100dvh-var(--demo-h))] flex-col">
      {/* Barra superior oscura (como FLP: marca a la izquierda, usuario a la derecha) */}
      <header className="sticky top-[var(--demo-h)] z-30 flex h-14 shrink-0 items-center gap-3 bg-flp-bar px-4 text-white sm:px-6">
        <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden" aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
        <Wordmark size="md" />
        <span className="hidden h-6 w-px bg-white/20 sm:block" aria-hidden />
        <span className="hidden truncate text-sm font-medium text-white/80 sm:block">Field Leadership Program</span>
        <div className="flex-1" />
        <span className="hidden xl:contents">
          <DemoBadge />
        </span>
        <span className="hidden sm:contents">
          <OnlineToggle />
        </span>
        {role === 'user' && (
          <button
            onClick={() => navigate('/web/reservar')}
            className="hidden items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/15 hover:text-white md:inline-flex"
          >
            <Search className="size-4" aria-hidden /> Buscar proyecto u horario
          </button>
        )}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-2.5 rounded-xl p-1.5 pr-2 hover:bg-white/10"
            aria-haspopup="menu"
            aria-expanded={menu}
          >
            <Avatar name={user.name} />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-white">{user.name}</span>
              <span className="block text-xs text-white/60">{ROLE_LABEL[role]}</span>
            </span>
            <ChevronDown className="size-4 text-white/60" aria-hidden />
          </button>
          {menu && (
            <div role="menu" className="animate-pop absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-ink">{user.name}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
              <p className="mt-1 px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-widest text-muted">Cambiar de perfil</p>
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

      <ConnectivityBanner className="sticky top-[calc(var(--demo-h)+3.5rem)] z-20" />

      <div className="flex flex-1">
        <aside className="hidden w-[112px] shrink-0 bg-flp-bar lg:block">
          <div className="sticky top-[calc(var(--demo-h)+3.5rem)] h-[calc(100dvh-3.5rem-var(--demo-h))]">{sidebar}</div>
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="animate-fade absolute inset-0 bg-ink/60" onClick={() => setDrawer(false)} aria-hidden />
            <div className="animate-pop relative h-full w-[112px]">
              {sidebar}
              <button onClick={() => setDrawer(false)} className="absolute -right-11 top-3 rounded-lg bg-flp-bar p-1.5 text-white/80" aria-label="Cerrar menú">
                <X className="size-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Banda naranja con curvas de nivel y título de la página */}
          <div className="flp-band h-44 shrink-0 px-4 pt-7 sm:px-6 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Plataforma Safety Planner</p>
            <h1 className="mt-1 truncate text-3xl font-bold text-white drop-shadow-sm">{current?.label ?? 'Safety Planner'}</h1>
          </div>

          <main className="relative -mt-16 mx-auto w-full max-w-[1400px] flex-1 px-3 pb-8 sm:px-5 lg:px-8">
            <div className="rounded-2xl bg-canvas p-4 shadow-[var(--shadow-pop)] sm:p-6">
              <Outlet />
            </div>
          </main>
        </div>
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
