import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Building2, CalendarClock, FolderKanban, Pause, Pencil, Play, Plus, Search } from 'lucide-react';
import type { Area, Project, RequirementKey } from '@/types';
import { COMPANIES, REQUIREMENTS, REQUIREMENT_KEYS, RISKS, companyById, riskById } from '@/data/catalogs';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SessionContext';
import { Button, Card, EmptyState, Field, Segmented } from '@/components/ui/primitives';
import { AreaBadge, Badge } from '@/components/ui/status';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { toggleProjectStatus, upsertProject, seatsLeft } from '@/services/flpService';
import { upcomingSlots } from '@/services/selectors';
import { cx, normalize } from '@/utils/misc';

export default function ProjectsPage() {
  const { data, commit } = useData();
  const { role } = useAuth('web');
  const [q, setQ] = useState('');
  const [area, setArea] = useState<Area | 'Todas'>('Todas');
  const [status, setStatus] = useState<'todos' | 'vigente' | 'suspendido'>('vigente');
  const [editing, setEditing] = useState<Project | 'new' | null>(null);
  const [toggle, setToggle] = useState<Project | null>(null);
  const isAdmin = role === 'admin';

  const upcoming = useMemo(() => upcomingSlots(data, 60), [data]);
  const list = useMemo(() => {
    const nq = normalize(q);
    return data.projects.filter((p) => {
      if (area !== 'Todas' && p.area !== area) return false;
      if (status !== 'todos' && p.status !== status) return false;
      if (!nq) return true;
      const company = companyById(p.companyId)?.name ?? '';
      return normalize(`${p.code} ${p.name} ${p.sector} ${company} ${p.contractOwner} ${p.ito}`).includes(nq);
    });
  }, [data.projects, q, area, status]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" placeholder="Buscar por nombre, código, empresa, CO o ITO…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar proyectos" />
        </div>
        <Segmented<Area | 'Todas'> ariaLabel="Área" value={area} onChange={setArea} options={[{ value: 'Todas', label: 'Todas' }, { value: 'Mina', label: 'Mina' }, { value: 'Coloso', label: 'Coloso' }]} />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Estado">
          <option value="vigente">Vigentes</option>
          <option value="suspendido">Suspendidos</option>
          <option value="todos">Todos</option>
        </select>
        {isAdmin && (
          <Button icon={Plus} onClick={() => setEditing('new')}>
            Nuevo proyecto
          </Button>
        )}
      </div>

      <p className="text-sm text-muted">{list.length} proyecto(s)</p>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={FolderKanban} title="No se encontraron proyectos" description="Ajusta la búsqueda o los filtros." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((p) => {
            const slots = upcoming.filter((s) => s.projectId === p.id);
            const seats = slots.reduce((n, s) => n + seatsLeft(data, s), 0);
            return (
              <Card key={p.id} className={cx('flex flex-col p-5', p.status === 'suspendido' && 'opacity-75')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">{p.code}</p>
                    <Link to={`/web/proyectos/${p.id}`} className="mt-0.5 block text-lg font-bold leading-snug text-ink hover:text-brand">
                      {p.name}
                    </Link>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <AreaBadge area={p.area} />
                    {p.status === 'suspendido' && <Badge tone="danger">Suspendido</Badge>}
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-graphite">{p.description}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-graphite">
                  <Building2 className="size-4 text-muted" aria-hidden /> {companyById(p.companyId)?.name}
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  {[
                    ['CO', p.contractOwner],
                    ['ITO', p.ito],
                    ['Jefe terreno', p.siteManager],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-muted">{k}</dt>
                      <dd className="truncate font-medium text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.riskIds.map((r) => (
                    <Badge key={r} tone="brand" className="font-medium">
                      {riskById(r)?.code}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="flex items-center gap-1.5 text-sm text-graphite">
                    <CalendarClock className="size-4 text-muted" aria-hidden />
                    <strong className="text-ink">{slots.length}</strong> horarios · <strong className="text-ink">{seats}</strong> cupos
                  </span>
                  <div className="flex gap-1">
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`} />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={p.status === 'vigente' ? Pause : Play}
                          onClick={() => setToggle(p)}
                          aria-label={p.status === 'vigente' ? `Suspender ${p.name}` : `Reactivar ${p.name}`}
                        />
                      </>
                    )}
                    <Link to={`/web/proyectos/${p.id}`} className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-xs font-semibold text-white hover:bg-ink-700">
                      Ver disponibilidad
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && <ProjectFormDialog project={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(toggle)}
        onClose={() => setToggle(null)}
        onConfirm={() => {
          if (toggle && commit(toggleProjectStatus(data, toggle.id))) setToggle(null);
        }}
        tone={toggle?.status === 'vigente' ? 'danger' : 'primary'}
        title={toggle?.status === 'vigente' ? 'Suspender proyecto' : 'Reactivar proyecto'}
        message={
          toggle?.status === 'vigente'
            ? `"${toggle?.name}" dejará de aceptar nuevas reservas y programaciones. Las reservas existentes se mantienen.`
            : `"${toggle?.name}" volverá a recibir programaciones y reservas.`
        }
        confirmLabel={toggle?.status === 'vigente' ? 'Suspender' : 'Reactivar'}
      />
    </div>
  );
}

function ProjectFormDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { data, commit } = useData();
  const [f, setF] = useState<Omit<Project, 'id'> & { id?: string }>(
    project ?? {
      code: '',
      name: '',
      area: 'Mina',
      sector: '',
      companyId: '',
      contractOwner: '',
      ito: '',
      siteManager: '',
      visitContact: '',
      description: '',
      riskIds: [],
      defaultRequirements: ['identificacion', 'confirmacion_co'],
      status: 'vigente',
    },
  );
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const text = (k: 'code' | 'name' | 'sector' | 'contractOwner' | 'ito' | 'siteManager' | 'visitContact', label: string, required = true) => (
    <Field label={label} required={required}>
      {(p) => <input {...p} className="input" value={f[k]} onChange={(e) => set(k, e.target.value)} />}
    </Field>
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={project ? 'Editar proyecto' : 'Nuevo proyecto'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => commit(upsertProject(data, f)) && onClose()}>{project ? 'Guardar' : 'Crear proyecto'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {text('code', 'Código')}
        {text('name', 'Nombre')}
        <Field label="Área" required>
          {(p) => (
            <select {...p} className="input" value={f.area} onChange={(e) => set('area', e.target.value as Area)}>
              <option>Mina</option>
              <option>Coloso</option>
            </select>
          )}
        </Field>
        {text('sector', 'Sector', false)}
        <Field label="Empresa contratista" required className="sm:col-span-2">
          {(p) => (
            <select {...p} className="input" value={f.companyId} onChange={(e) => set('companyId', e.target.value)}>
              <option value="">Selecciona…</option>
              {COMPANIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.specialty}
                </option>
              ))}
            </select>
          )}
        </Field>
        {text('contractOwner', 'Contract Owner (CO)')}
        {text('ito', 'ITO')}
        {text('siteManager', 'Jefe de terreno')}
        {text('visitContact', 'Persona a visitar / auditar')}
        <Field label="Descripción" className="sm:col-span-2">
          {(p) => <textarea {...p} className="input min-h-16" value={f.description} onChange={(e) => set('description', e.target.value)} />}
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="label">Riesgos materiales asociados *</legend>
          <div className="flex flex-wrap gap-2">
            {RISKS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={f.riskIds.includes(r.id)}
                onClick={() => set('riskIds', toggleIn(f.riskIds, r.id))}
                className={cx('rounded-full border px-3 py-1 text-xs font-semibold', f.riskIds.includes(r.id) ? 'border-brand bg-brand-50 text-brand-700' : 'border-line text-graphite')}
                title={r.name}
              >
                {r.code} · {r.name.slice(0, 28)}
                {r.name.length > 28 ? '…' : ''}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="label">Requisitos por defecto</legend>
          <div className="flex flex-wrap gap-2">
            {REQUIREMENT_KEYS.map((k: RequirementKey) => (
              <button
                key={k}
                type="button"
                aria-pressed={f.defaultRequirements.includes(k)}
                onClick={() => set('defaultRequirements', toggleIn(f.defaultRequirements, k))}
                className={cx('rounded-full border px-3 py-1 text-xs font-semibold', f.defaultRequirements.includes(k) ? 'border-petrol bg-petrol-50 text-petrol' : 'border-line text-graphite')}
              >
                {REQUIREMENTS[k].label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
