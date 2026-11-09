import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ClipboardList, ShieldCheck, HardHat, type LucideIcon } from 'lucide-react';
import type { Experience, Role } from '@/types';
import { DEMO_USER_IDS } from '@/data/seed';
import { useData } from '@/contexts/DataContext';
import { DEMO_PASSWORD, useSessions } from '@/contexts/SessionContext';
import { useToast } from '@/contexts/ToastContext';

export const ROLE_OPTIONS: Array<{ role: Role; label: string; description: string; icon: LucideIcon }> = [
  { role: 'admin', label: 'Administrador', description: 'Dashboard ejecutivo, proyectos, usuarios y seguimiento.', icon: ShieldCheck },
  { role: 'planner', label: 'Planificador', description: 'Publica horarios, coordina y confirma visitas.', icon: ClipboardList },
  { role: 'user', label: 'Usuario', description: 'Reserva visitas, verifica en terreno y registra acciones.', icon: HardHat },
];

/** Estado y validación del formulario de acceso demo (compartido por web y móvil). */
export function useDemoLogin(experience: Experience) {
  const { data } = useData();
  const { login } = useSessions();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const emailFor = (r: Role) => data.users.find((u) => u.id === DEMO_USER_IDS[r])?.email ?? '';

  const [role, setRoleState] = useState<Role>('user');
  const [email, setEmail] = useState(() => emailFor('user'));
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const setRole = (r: Role) => {
    setRoleState(r);
    setEmail(emailFor(r));
    setPassword(DEMO_PASSWORD);
    setErrors({});
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Ingresa el correo de la cuenta demo.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Formato de correo no válido.';
    if (!password) next.password = 'Ingresa la contraseña demo.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    window.setTimeout(() => {
      const r = login(experience, role, email, password);
      setLoading(false);
      if (!r.ok) {
        setErrors({ form: r.error });
        return;
      }
      toast.success(`Sesión demo iniciada como ${ROLE_OPTIONS.find((o) => o.role === role)!.label}.`);
      const base = experience === 'web' ? '/web' : '/app';
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith(base) ? from : base, { replace: true });
    }, 350);
  };

  return { role, setRole, email, setEmail, password, setPassword, errors, loading, submit };
}
