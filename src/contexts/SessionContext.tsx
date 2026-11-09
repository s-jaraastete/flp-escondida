import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Experience, Role, Session, User } from '@/types';
import { DEMO_USER_IDS } from '@/data/seed';
import { loadSession, saveSession } from '@/services/storage';
import { useData } from './DataContext';

/**
 * Autenticación SIMULADA (modo demostración). No es un mecanismo de seguridad:
 * solo recuerda qué perfil demo eligió la persona en cada experiencia.
 * Web y móvil tienen sesiones independientes.
 */
export const DEMO_PASSWORD = 'demo2026';

interface SessionApi {
  sessions: Record<Experience, Session | null>;
  login: (exp: Experience, role: Role, email: string, password: string) => { ok: boolean; error?: string };
  switchRole: (exp: Experience, role: Role) => void;
  logout: (exp: Experience) => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data } = useData();
  const [sessions, setSessions] = useState<Record<Experience, Session | null>>(() => ({
    web: loadSession('web'),
    mobile: loadSession('mobile'),
  }));

  const set = useCallback((exp: Experience, s: Session | null) => {
    saveSession(exp, s);
    setSessions((prev) => ({ ...prev, [exp]: s }));
  }, []);

  const login = useCallback<SessionApi['login']>(
    (exp, role, email, password) => {
      const user = data.users.find((u) => u.id === DEMO_USER_IDS[role]);
      if (!user || user.email.toLowerCase() !== email.trim().toLowerCase())
        return { ok: false, error: 'El correo no corresponde a la cuenta demo del perfil seleccionado.' };
      if (password !== DEMO_PASSWORD) return { ok: false, error: `Contraseña demo incorrecta (usa "${DEMO_PASSWORD}").` };
      set(exp, { userId: user.id, role, experience: exp, startedAt: new Date().toISOString() });
      return { ok: true };
    },
    [data.users, set],
  );

  const switchRole = useCallback(
    (exp: Experience, role: Role) =>
      set(exp, { userId: DEMO_USER_IDS[role], role, experience: exp, startedAt: new Date().toISOString() }),
    [set],
  );

  const logout = useCallback((exp: Experience) => set(exp, null), [set]);

  const api = useMemo(() => ({ sessions, login, switchRole, logout }), [sessions, login, switchRole, logout]);
  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessions debe usarse dentro de SessionProvider');
  return ctx;
}

/** Sesión + usuario actual para una experiencia concreta. */
export function useAuth(exp: Experience) {
  const { sessions, switchRole, logout } = useSessions();
  const { data } = useData();
  const session = sessions[exp];
  const user: User | undefined = session ? data.users.find((u) => u.id === session.userId) : undefined;
  return {
    session,
    user: user as User,
    role: session?.role as Role,
    switchRole: (r: Role) => switchRole(exp, r),
    logout: () => logout(exp),
  };
}
