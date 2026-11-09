import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useToast } from './ToastContext';
import { uid } from '@/utils/misc';

/**
 * Modo sin conexión (demo).
 * - "Offline" puede forzarse con el selector Online/Offline (como en FLP) o activarse solo si el dispositivo pierde señal.
 * - Lo que se registra sin conexión queda en una cola local ("pendiente de sincronizar").
 * - Al volver a Online la cola se sincroniza. La sincronización es SIMULADA: no existe servidor en el prototipo.
 */
export interface OutboxItem {
  id: string;
  label: string;
  at: string;
}

interface ConnectivityApi {
  online: boolean;
  /** true si el usuario eligió Offline manualmente (si es false y online=false, el dispositivo no tiene red). */
  forcedOffline: boolean;
  setForcedOffline: (v: boolean) => void;
  outbox: OutboxItem[];
  enqueue: (label: string) => void;
  syncing: boolean;
  /** Cantidad sincronizada recién (para mostrar la confirmación unos segundos). */
  justSynced: number;
}

const OFFLINE_KEY = 'flp-escondida:offline';
const OUTBOX_KEY = 'flp-escondida:outbox';
const SYNC_MS = 2200;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
}

const Ctx = createContext<ConnectivityApi | null>(null);

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [forcedOffline, setForced] = useState<boolean>(() => read(OFFLINE_KEY, false));
  const [browserOnline, setBrowserOnline] = useState<boolean>(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [outbox, setOutbox] = useState<OutboxItem[]>(() => read(OUTBOX_KEY, []));
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(0);
  const online = browserOnline && !forcedOffline;
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const up = () => setBrowserOnline(true);
    const down = () => setBrowserOnline(false);
    const onStorage = (e: StorageEvent) => {
      if (e.key === OFFLINE_KEY) setForced(read(OFFLINE_KEY, false));
      if (e.key === OUTBOX_KEY) setOutbox(read(OUTBOX_KEY, []));
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      window.removeEventListener('storage', onStorage);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  // Al recuperar conexión con registros en cola: sincronización simulada.
  const toastRef = useRef(toast);
  toastRef.current = toast;
  useEffect(() => {
    if (!online || outbox.length === 0) return;
    setSyncing(true);
    const n = outbox.length;
    const t = window.setTimeout(() => {
      setOutbox([]);
      write(OUTBOX_KEY, []);
      setSyncing(false);
      setJustSynced(n);
      toastRef.current.success(`${n} ${n === 1 ? 'registro sincronizado' : 'registros sincronizados'} con el servidor.`);
      timers.current.push(window.setTimeout(() => setJustSynced(0), 3000));
    }, SYNC_MS);
    return () => {
      clearTimeout(t);
      setSyncing(false);
    };
  }, [online, outbox.length]);

  const setForcedOffline = useCallback((v: boolean) => {
    setForced(v);
    write(OFFLINE_KEY, v);
  }, []);

  const enqueue = useCallback((label: string) => {
    setOutbox((list) => {
      const next = [...list, { id: uid('o'), label, at: new Date().toISOString() }];
      write(OUTBOX_KEY, next);
      return next;
    });
  }, []);

  const api = useMemo(
    () => ({ online, forcedOffline, setForcedOffline, outbox, enqueue, syncing, justSynced }),
    [online, forcedOffline, setForcedOffline, outbox, enqueue, syncing, justSynced],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useConnectivity() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConnectivity debe usarse dentro de ConnectivityProvider');
  return ctx;
}
