import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FlpData, Result } from '@/types';
import { DATA_KEY, loadData, resetData, saveData } from '@/services/storage';
import { useToast } from './ToastContext';
import { useConnectivity } from './ConnectivityContext';

interface DataApi {
  data: FlpData;
  /** Aplica el resultado de una operación de dominio: persiste y notifica. Devuelve true si tuvo éxito. */
  commit: (r: Result<FlpData>, opts?: { silent?: boolean }) => boolean;
  /** Variante para operaciones que devuelven { data, ... }. */
  commitWith: <T extends { data: FlpData }>(r: Result<T>) => T | null;
  reset: () => void;
}

const DataContext = createContext<DataApi | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FlpData>(() => loadData());
  const toast = useToast();
  const { online, enqueue } = useConnectivity();
  /** Sin conexión: se guarda igual en el dispositivo y queda en cola para sincronizar. */
  const notify = useCallback(
    (message: string) => {
      if (online) return toast.success(message);
      enqueue(message);
      toast.success(`${message} Guardado en el dispositivo: se sincronizará al recuperar señal.`);
    },
    [online, enqueue, toast],
  );

  // Sincroniza entre pestañas (p. ej. web en una pestaña y app móvil en otra).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DATA_KEY && e.newValue) {
        try {
          setData(JSON.parse(e.newValue));
        } catch {
          /* ignorar */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: FlpData) => {
    saveData(next);
    setData(next);
  }, []);

  const commit = useCallback(
    (r: Result<FlpData>, opts?: { silent?: boolean }) => {
      if (!r.ok) {
        toast.error(r.error);
        return false;
      }
      persist(r.value);
      if (!opts?.silent) notify(r.message);
      else if (!online) enqueue(r.message);
      return true;
    },
    [persist, toast, notify, online, enqueue],
  );

  const commitWith = useCallback(
    <T extends { data: FlpData }>(r: Result<T>) => {
      if (!r.ok) {
        toast.error(r.error);
        return null;
      }
      persist(r.value.data);
      notify(r.message);
      return r.value;
    },
    [persist, toast, notify],
  );

  const reset = useCallback(() => {
    setData(resetData());
    toast.success('Datos de demostración restablecidos.');
  }, [toast]);

  const api = useMemo(() => ({ data, commit, commitWith, reset }), [data, commit, commitWith, reset]);
  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider');
  return ctx;
}
