import { CheckCircle2, CloudUpload, RefreshCw, WifiOff } from 'lucide-react';
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { cx } from '@/utils/misc';

/** Selector Online / Offline, con el mismo formato que el de FLP. */
export function OnlineToggle({ className }: { className?: string }) {
  const { online, forcedOffline, setForcedOffline } = useConnectivity();
  const noNetwork = !online && !forcedOffline;
  return (
    <div
      role="radiogroup"
      aria-label="Modo de conexión"
      title={noNetwork ? 'El dispositivo no tiene conexión' : undefined}
      className={cx('inline-flex shrink-0 rounded-lg bg-white p-1 text-sm shadow-sm ring-1 ring-black/10', className)}
    >
      {[
        { value: false, label: 'Online' },
        { value: true, label: 'Offline' },
      ].map((o) => {
        const active = o.value ? !online : online;
        return (
          <button
            key={o.label}
            role="radio"
            aria-checked={active}
            disabled={noNetwork && !o.value}
            onClick={() => setForcedOffline(o.value)}
            className={cx(
              'rounded-md px-2.5 py-1 font-semibold transition disabled:cursor-not-allowed',
              active ? (o.value ? 'bg-warning text-white' : 'bg-ink text-white') : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Aviso de estado: sin conexión con registros en cola, sincronizando, o sincronizado. */
export function ConnectivityBanner({ className }: { className?: string }) {
  const { online, forcedOffline, outbox, syncing, justSynced, setForcedOffline } = useConnectivity();
  const n = outbox.length;

  if (!online)
    return (
      <div role="status" className={cx('flex items-center gap-2.5 bg-flp-bar px-4 py-2 text-sm text-white', className)}>
        <WifiOff className="size-4 shrink-0 text-amber-400" aria-hidden />
        <p className="min-w-0 flex-1 leading-tight">
          <strong>Sin conexión.</strong> Puedes seguir trabajando: {n === 0 ? 'lo que registres' : <><strong>{n}</strong> {n === 1 ? 'registro queda' : 'registros quedan'} en el dispositivo y</>}{' '}
          {n === 0 ? 'se guardará en el dispositivo.' : 'se sincronizarán al volver la señal.'}
        </p>
        {forcedOffline && (
          <button onClick={() => setForcedOffline(false)} className="shrink-0 rounded-md bg-white/20 px-2.5 py-1 text-xs font-bold hover:bg-white/30">
            Conectar
          </button>
        )}
      </div>
    );
  if (syncing)
    return (
      <div role="status" className={cx('flex items-center gap-2.5 bg-petrol px-4 py-2 text-sm text-white', className)}>
        <RefreshCw className="size-4 shrink-0 animate-spin" aria-hidden />
        <p className="flex-1">Sincronizando {n} {n === 1 ? 'registro' : 'registros'} con el servidor…</p>
        <CloudUpload className="size-4 shrink-0 opacity-70" aria-hidden />
      </div>
    );
  if (justSynced > 0)
    return (
      <div role="status" className={cx('animate-fade flex items-center gap-2.5 bg-success px-4 py-2 text-sm text-white', className)}>
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        <p className="flex-1">Todo sincronizado · {justSynced} {justSynced === 1 ? 'registro enviado' : 'registros enviados'}.</p>
      </div>
    );
  return null;
}
