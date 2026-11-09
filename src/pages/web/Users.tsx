import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, UserCheck, UserX } from 'lucide-react';
import type { Role, User } from '@/types';
import { useData } from '@/contexts/DataContext';
import { Avatar, Button, Card, Checkbox, EmptyState, Field, Segmented } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/status';
import { Modal } from '@/components/ui/Modal';
import { ROLE_LABEL, toggleUserActive, upsertUser } from '@/services/flpService';
import { DEMO_USER_IDS } from '@/data/seed';
import { normalize } from '@/utils/misc';

const PROTECTED = Object.values(DEMO_USER_IDS) as string[];

export default function UsersPage() {
  const { data, commit } = useData();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'todos'>('todos');
  const [editing, setEditing] = useState<User | 'new' | null>(null);

  const stats = useMemo(
    () =>
      Object.fromEntries(
        data.users.map((u) => [
          u.id,
          {
            bookings: data.bookings.filter((b) => b.userId === u.id && b.status !== 'cancelada').length,
            verifs: data.verifications.filter((v) => v.userId === u.id).length,
          },
        ]),
      ),
    [data],
  );
  const list = data.users.filter(
    (u) => (role === 'todos' || u.role === role) && (!q || normalize(`${u.name} ${u.email} ${u.position}`).includes(normalize(q))),
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Usuarios y perfiles</h2>
          <p className="text-sm text-muted">Gestión ficticia de cuentas, perfiles y líderes FLP (modo demo).</p>
        </div>
        <Button icon={Plus} onClick={() => setEditing('new')}>
          Nuevo usuario
        </Button>
      </div>
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Segmented<Role | 'todos'>
          ariaLabel="Perfil"
          value={role}
          onChange={setRole}
          options={[
            { value: 'todos', label: 'Todos', count: data.users.length },
            { value: 'admin', label: 'Administradores', count: data.users.filter((u) => u.role === 'admin').length },
            { value: 'planner', label: 'Planificadores', count: data.users.filter((u) => u.role === 'planner').length },
            { value: 'user', label: 'Usuarios', count: data.users.filter((u) => u.role === 'user').length },
          ]}
        />
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" placeholder="Buscar nombre, correo o cargo…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuarios" />
        </div>
      </Card>
      <Card className="overflow-x-auto">
        {list.length === 0 ? (
          <EmptyState title="Sin usuarios" />
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-semibold">Usuario</th>
                <th className="px-3 py-3 font-semibold">Perfil</th>
                <th className="px-3 py-3 font-semibold">Área</th>
                <th className="px-3 py-3 font-semibold">Participación</th>
                <th className="px-3 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} tone={u.active ? 'brand' : 'dark'} />
                      <div>
                        <p className="font-semibold text-ink">
                          {u.name} {PROTECTED.includes(u.id) && <Badge tone="warning" className="ml-1">Cuenta demo</Badge>}
                        </p>
                        <p className="text-xs text-muted">{u.email} · {u.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={u.role === 'admin' ? 'dark' : u.role === 'planner' ? 'info' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge>
                    {u.isFlpLeader && <Badge tone="brand" className="ml-1">Líder FLP</Badge>}
                  </td>
                  <td className="px-3 py-3 text-graphite">{u.area}</td>
                  <td className="px-3 py-3 text-xs text-graphite">
                    {stats[u.id]?.bookings ?? 0} reservas · {stats[u.id]?.verifs ?? 0} verificaciones
                  </td>
                  <td className="px-3 py-3">{u.active ? <Badge tone="success" dot>Activo</Badge> : <Badge dot>Inactivo</Badge>}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(u)} aria-label={`Editar ${u.name}`} />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={u.active ? UserX : UserCheck}
                        onClick={() => commit(toggleUserActive(data, u.id, PROTECTED))}
                        aria-label={u.active ? `Desactivar ${u.name}` : `Activar ${u.name}`}
                        title={u.active ? 'Desactivar' : 'Activar'}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {editing && <UserDialog user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function UserDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { data, commit } = useData();
  const [f, setF] = useState<Omit<User, 'id'> & { id?: string }>(
    user ?? { name: '', email: '', role: 'user', position: '', area: 'Mina', isFlpLeader: false, active: true },
  );
  const locked = Boolean(user && PROTECTED.includes(user.id));
  return (
    <Modal
      open
      onClose={onClose}
      title={user ? 'Editar usuario' : 'Nuevo usuario'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => commit(upsertUser(data, f)) && onClose()}>{user ? 'Guardar' : 'Crear usuario'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required>
          {(p) => <input {...p} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        </Field>
        <Field label="Correo" required hint={locked ? 'El correo de cuentas demo no se modifica.' : undefined}>
          {(p) => <input {...p} type="email" className="input" disabled={locked} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}
        </Field>
        <Field label="Perfil" required hint={locked ? 'Las cuentas demo mantienen su perfil.' : undefined}>
          {(p) => (
            <select {...p} className="input" disabled={locked} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              <option value="admin">Administrador</option>
              <option value="planner">Planificador</option>
              <option value="user">Usuario</option>
            </select>
          )}
        </Field>
        <Field label="Área">
          {(p) => (
            <select {...p} className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as User['area'] })}>
              <option>Mina</option>
              <option>Coloso</option>
              <option>Ambas</option>
            </select>
          )}
        </Field>
        <Field label="Cargo" className="sm:col-span-2">
          {(p) => <input {...p} className="input" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} />}
        </Field>
        <div className="sm:col-span-2">
          <Checkbox checked={f.isFlpLeader} onChange={(v) => setF({ ...f, isFlpLeader: v })} label="Líder FLP" description="Puede ser asignado como líder de visitas programadas." />
        </div>
      </div>
    </Modal>
  );
}
