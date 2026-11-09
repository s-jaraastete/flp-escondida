import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Compass,
  Home,
  Inbox,
  ListChecks,
  Plus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';
import PhoneFrame from './PhoneFrame';
import { useAuth } from '@/contexts/SessionContext';
import { useData } from '@/contexts/DataContext';
import { userBookings } from '@/services/selectors';
import { cx } from '@/utils/misc';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
  fab?: boolean;
}

function useTabs(role: Role, userId: string): Tab[] {
  const { data } = useData();
  if (role === 'user') {
    const toVerify = userBookings(data, userId).filter((b) => b.awaitingVerification).length;
    return [
      { to: '/app', label: 'Inicio', icon: Home, end: true },
      { to: '/app/explorar', label: 'Explorar', icon: Compass },
      { to: '/app/visitas', label: 'Visitas', icon: CalendarDays, badge: toVerify },
      { to: '/app/acciones', label: 'Acciones', icon: ListChecks },
      { to: '/app/perfil', label: 'Perfil', icon: UserRound },
    ];
  }
  const pending = data.bookings.filter((b) => b.status === 'pendiente').length;
  if (role === 'planner')
    return [
      { to: '/app', label: 'Inicio', icon: Home, end: true },
      { to: '/app/agenda', label: 'Agenda', icon: CalendarDays },
      { to: '/app/disponibilidad/nueva', label: 'Publicar', icon: Plus, fab: true },
      { to: '/app/solicitudes', label: 'Solicitudes', icon: Inbox, badge: pending },
      { to: '/app/perfil', label: 'Perfil', icon: UserRound },
    ];
  return [
    { to: '/app', label: 'Panel', icon: BarChart3, end: true },
    { to: '/app/actividades', label: 'Actividades', icon: ClipboardList },
    { to: '/app/explorar', label: 'Proyectos', icon: Compass },
    { to: '/app/acciones', label: 'Acciones', icon: ListChecks },
    { to: '/app/perfil', label: 'Perfil', icon: UserRound },
  ];
}

export default function MobileLayout() {
  const { user, role } = useAuth('mobile');
  const tabs = useTabs(role, user.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <PhoneFrame scroll={false}>
      <div ref={scrollRef} className="no-scrollbar relative flex-1 overflow-y-auto pb-4">
        <Outlet />
      </div>
      <nav
        aria-label="Navegación de la app"
        className="relative z-20 grid shrink-0 grid-cols-5 border-t border-line bg-surface px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5"
      >
        {tabs.map((t) =>
          t.fab ? (
            <NavLink key={t.to} to={t.to} className="flex flex-col items-center" aria-label={t.label}>
              <span className="-mt-6 grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-[0_10px_24px_rgb(241_90_36/0.45)] ring-4 ring-surface">
                <t.icon className="size-6" aria-hidden />
              </span>
              <span className="mt-0.5 text-[10px] font-semibold text-graphite">{t.label}</span>
            </NavLink>
          ) : (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cx('relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition', isActive ? 'text-brand' : 'text-muted')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-brand-50')}>
                    <t.icon className="size-5" aria-hidden strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {t.label}
                  {!!t.badge && (
                    <span className="absolute right-2 top-0.5 min-w-4 rounded-full bg-brand px-1 text-center text-[9px] font-bold leading-4 text-white">
                      {t.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ),
        )}
      </nav>
    </PhoneFrame>
  );
}

/** Cabecera compacta de las pantallas móviles. */
export function MobileHeader({
  title,
  subtitle,
  back,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 bg-ink px-4 pb-4 pt-3 text-white">
      <div className="flex min-h-10 items-center gap-2">
        {back && (
          <button
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
            className="-ml-1 grid size-10 place-items-center rounded-full hover:bg-white/10"
            aria-label="Volver"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {subtitle && <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-white/50">{subtitle}</p>}
          <h1 className="truncate text-lg font-extrabold">{title}</h1>
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}
