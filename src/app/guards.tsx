import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import type { Experience, Role } from '@/types';
import { useAuth } from '@/contexts/SessionContext';
import { EmptyState } from '@/components/ui/primitives';

/** Exige sesión demo en la experiencia indicada (web y móvil son independientes). */
export function RequireAuth({ experience, children }: { experience: Experience; children: ReactNode }) {
  const { session, user } = useAuth(experience);
  const location = useLocation();
  if (!session || !user) {
    const to = experience === 'web' ? '/web/login' : '/app/login';
    return <Navigate to={to} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Restringe una vista a ciertos perfiles. */
export function RoleGate({ experience, roles, children }: { experience: Experience; roles: Role[]; children: ReactNode }) {
  const { role } = useAuth(experience);
  if (!roles.includes(role))
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Vista no disponible para tu perfil"
        description="Cambia de perfil desde el menú de usuario para acceder a esta sección."
      />
    );
  return <>{children}</>;
}
