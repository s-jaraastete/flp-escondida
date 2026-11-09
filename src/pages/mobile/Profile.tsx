import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, ChevronRight, LogOut, Monitor, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/SessionContext';
import { useData } from '@/contexts/DataContext';
import { usePhoneContainer } from '@/layouts/PhoneFrame';
import { MSection, StatPill } from '@/components/mobile/MobileKit';
import { Avatar, Button } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { CHART, GroupedBars } from '@/components/charts/Charts';
import { ROLE_LABEL } from '@/services/flpService';
import { kpis, monthlySeries } from '@/services/selectors';
import { ROLE_OPTIONS } from '@/features/auth/useDemoLogin';
import { cx } from '@/utils/misc';
import { OnlineToggle } from '@/features/offline/ConnectivityUI';
import { useConnectivity } from '@/contexts/ConnectivityContext';

export default function MobileProfile() {
  const { user, role, switchRole, logout } = useAuth('mobile');
  const { data, reset } = useData();
  const navigate = useNavigate();
  const container = usePhoneContainer();
  const [confirmReset, setConfirmReset] = useState(false);
  const k = kpis(data, role === 'user' ? { userId: user.id } : {});
  const series = monthlySeries(data, { userId: user.id }).slice(-4);

  return (
    <div>
      <header className="flp-band px-4 pb-8 pt-6 text-center text-white">
        <div className="flex justify-center">
          <Avatar name={user.name} size="lg" />
        </div>
        <p className="mt-3 text-xl font-extrabold">{user.name}</p>
        <p className="text-sm text-white/85">{user.position}</p>
        <div className="mt-2 flex justify-center gap-2">
          <Badge>{ROLE_LABEL[role]}</Badge>
          <DemoBadgeInline />
        </div>
        <p className="mt-2 text-xs text-white/80">{user.email}</p>
      </header>

      {role === 'user' ? (
        <>
          <div className="-mt-5 grid grid-cols-3 gap-2.5 px-4">
            <StatPill label="Completadas" value={k.completed} tone="success" />
            <StatPill label="Cumplimiento" value={`${k.avgCompliance}%`} tone="brand" />
            <StatPill label="Acciones abiertas" value={k.actionsOpen} tone={k.actionsOverdue ? 'danger' : 'ink'} />
          </div>
          <MSection title="Mi participación">
            <div className="card p-3">
              <GroupedBars
                data={series}
                xKey="mes"
                height={180}
                series={[
                  { key: 'programadas', name: 'Inscritas', color: CHART.s1 },
                  { key: 'completadas', name: 'Verificadas', color: CHART.s2 },
                ]}
              />
            </div>
          </MSection>
        </>
      ) : (
        <div className="-mt-5 grid grid-cols-3 gap-2.5 px-4">
          <StatPill label="Programadas" value={k.scheduledSlots} />
          <StatPill label="Pendientes" value={k.pending} tone="warning" />
          <StatPill label="Ocupación" value={`${k.occupancyRate}%`} tone="brand" />
        </div>
      )}

      <ConnectionSection />

      <MSection title="Cambiar de perfil">
        <div className="card divide-y divide-line overflow-hidden">
          {ROLE_OPTIONS.map((o) => (
            <button
              key={o.role}
              onClick={() => {
                if (o.role !== role) {
                  switchRole(o.role);
                  navigate('/app');
                }
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-canvas"
            >
              <span className={cx('grid size-10 place-items-center rounded-xl', o.role === role ? 'bg-brand text-white' : 'bg-canvas text-graphite')}>
                <o.icon className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-ink">{o.label}</span>
                <span className="block text-xs text-muted">{o.description}</span>
              </span>
              {o.role === role ? <Check className="size-5 text-brand" aria-label="Perfil actual" /> : <ChevronRight className="size-5 text-muted" aria-hidden />}
            </button>
          ))}
        </div>
      </MSection>

      <MSection title="Opciones">
        <div className="grid gap-2">
          <Button variant="secondary" size="lg" block icon={Monitor} onClick={() => navigate('/web')}>
            Abrir Plataforma Web
          </Button>
          {role === 'admin' && (
            <Button variant="secondary" size="lg" block icon={RotateCcw} onClick={() => setConfirmReset(true)}>
              Restablecer datos demo
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            block
            icon={LogOut}
            className="text-danger"
            onClick={() => {
              logout();
              navigate('/app/login');
            }}
          >
            Cerrar sesión
          </Button>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted">FLP Escondida · prototipo v0.1 · datos ficticios guardados en este dispositivo</p>
      </MSection>

      <ConfirmDialog
        container={container}
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          setConfirmReset(false);
        }}
        title="Restablecer datos demo"
        message="Se regenerarán todos los datos de demostración con fechas desde hoy."
        confirmLabel="Restablecer"
      />
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{children}</span>;
}

function DemoBadgeInline() {
  return <span className="rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-bold text-warning">Modo demo</span>;
}

/** Modo de conexión y registros que esperan sincronización. */
function ConnectionSection() {
  const { online, outbox, syncing } = useConnectivity();
  return (
    <MSection title="Conexión y sincronización">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{online ? (syncing ? 'Sincronizando…' : 'En línea') : 'Sin conexión'}</p>
            <p className="text-xs text-muted">Usa Offline para trabajar en zonas sin señal.</p>
          </div>
          <OnlineToggle />
        </div>
        {outbox.length > 0 && (
          <ul className="mt-3 grid gap-1.5 border-t border-line pt-3">
            {outbox.map((o) => (
              <li key={o.id} className="flex items-start gap-2 text-xs text-graphite">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-warning" aria-hidden />
                <span className="flex-1">{o.label}</span>
                <span className="shrink-0 tabular-nums text-muted">{o.at.slice(11, 16)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MSection>
  );
}
