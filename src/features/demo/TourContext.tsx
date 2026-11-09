import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import type { FlpData, Role } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useSessions } from '@/contexts/SessionContext';
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { useToast } from '@/contexts/ToastContext';
import { TOUR_FLOWS, TOUR_KEY } from './tour';

interface TourApi {
  done: Set<number>;
  clear: () => void;
}

const Ctx = createContext<TourApi | null>(null);

function readDone(): number[] {
  try {
    const raw = localStorage.getItem(TOUR_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

/**
 * Detecta los recorridos comparando los datos antes y después de cada cambio
 * (nueva reserva, confirmación, horario, verificación, vínculo FLP, acción cerrada),
 * más la ruta actual, la sincronización y los perfiles usados.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const { data } = useData();
  const { sessions } = useSessions();
  const { justSynced } = useConnectivity();
  const toast = useToast();
  const { pathname } = useLocation();
  const [done, setDone] = useState<number[]>(readDone);
  const prev = useRef<FlpData>(data);
  const rolesSeen = useRef<Set<Role>>(new Set());
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const doneRef = useRef<number[]>(done);
  const mark = useCallback((id: number) => {
    if (doneRef.current.includes(id)) return;
    const next = [...doneRef.current, id];
    doneRef.current = next;
    setDone(next);
    try {
      localStorage.setItem(TOUR_KEY, JSON.stringify(next));
    } catch {
      /* sin almacenamiento */
    }
    const f = TOUR_FLOWS.find((x) => x.id === id)!;
    window.setTimeout(() => toastRef.current.success(`Recorrido ${id} completado · ${f.title} (${next.length}/${TOUR_FLOWS.length})`), 250);
  }, []);

  // Cambios en los datos.
  useEffect(() => {
    const before = prev.current;
    prev.current = data;
    if (before === data || before.seededAt !== data.seededAt) return; // restablecer demo no cuenta
    const inApp = pathname.startsWith('/app');
    const oldBookings = new Map(before.bookings.map((b) => [b.id, b]));
    if (data.bookings.some((b) => !oldBookings.has(b.id))) mark(inApp ? 8 : 3);
    if (data.bookings.some((b) => b.status === 'confirmada' && oldBookings.get(b.id)?.status === 'pendiente')) mark(4);
    if (data.slots.length > before.slots.length) mark(2);
    const oldVer = new Map(before.verifications.map((v) => [v.id, v]));
    if (data.verifications.length > before.verifications.length) mark(5);
    if (data.verifications.some((v) => v.postVisit?.flpActivityId && !oldVer.get(v.id)?.postVisit?.flpActivityId)) mark(6);
    const oldAct = new Map(before.actions.map((a) => [a.id, a]));
    if (data.actions.some((a) => a.status === 'cerrada' && oldAct.get(a.id) && oldAct.get(a.id)!.status !== 'cerrada')) mark(9);
  }, [data, pathname, mark]);

  // Ruta + perfil.
  useEffect(() => {
    if ((pathname === '/web' || pathname === '/web/') && sessions.web?.role === 'admin') mark(1);
  }, [pathname, sessions.web?.role, mark]);

  // Perfiles usados (web o móvil).
  useEffect(() => {
    for (const s of [sessions.web, sessions.mobile]) if (s) rolesSeen.current.add(s.role);
    if (rolesSeen.current.size >= 3) mark(10);
  }, [sessions.web, sessions.mobile, mark]);

  useEffect(() => {
    if (justSynced > 0) mark(7);
  }, [justSynced, mark]);

  const clear = useCallback(() => {
    doneRef.current = [];
    setDone([]);
    rolesSeen.current = new Set();
    try {
      localStorage.removeItem(TOUR_KEY);
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const api = useMemo(() => ({ done: new Set(done), clear }), [done, clear]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useTour() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTour debe usarse dentro de TourProvider');
  return ctx;
}
