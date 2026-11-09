import type { Experience, Role } from '@/types';

/** Recorridos de la demo: cada uno se marca solo cuando la persona realiza la acción. */
export interface TourFlow {
  id: number;
  title: string;
  hint: string;
  role: Role;
  experience: Experience;
  path: string;
}

export const TOUR_FLOWS: TourFlow[] = [
  { id: 1, title: 'Ver el dashboard ejecutivo', hint: 'KPIs, Mina vs Coloso, FLP spot y planificado sin asistencia.', role: 'admin', experience: 'web', path: '/web' },
  { id: 2, title: 'Publicar un horario de visita', hint: 'Programación → Nuevo horario. Detecta choques de proyecto o líder.', role: 'planner', experience: 'web', path: '/web/programacion' },
  { id: 3, title: 'Reservar una visita con sus requisitos', hint: 'Elige un horario con cupo, marca requisitos y confirma.', role: 'user', experience: 'web', path: '/web/reservar' },
  { id: 4, title: 'Confirmar una solicitud de reserva', hint: 'Solicitudes → Confirmar (o rechazar / reprogramar).', role: 'planner', experience: 'web', path: '/web/solicitudes' },
  { id: 5, title: 'Marcar una visita como realizada', hint: 'Mis visitas → Marcar como realizada (un solo check).', role: 'user', experience: 'web', path: '/web/mis-visitas' },
  { id: 6, title: 'Vincular la verificación con FLP', hint: 'Copia el resumen y pega el ID de FLP (ej. CCO-2026-11-4071234).', role: 'user', experience: 'web', path: '/web/mis-visitas' },
  { id: 7, title: 'Trabajar sin señal y sincronizar', hint: 'Pasa a Offline, registra algo y vuelve a Online.', role: 'user', experience: 'mobile', path: '/app' },
  { id: 8, title: 'Reservar desde la app móvil', hint: 'Explorar → proyecto → horario → reserva paso a paso.', role: 'user', experience: 'mobile', path: '/app/explorar' },
  { id: 9, title: 'Registrar un FLP spot', hint: 'FLP spot → FLP hecho sin reserva previa.', role: 'user', experience: 'web', path: '/web/spot' },
  { id: 10, title: 'Cambiar entre los 3 perfiles', hint: 'Usa el selector Administrador · Planificador · Usuario de esta barra.', role: 'admin', experience: 'web', path: '/web' },
];

export const ROLE_SHORT: Record<Role, string> = { admin: 'Administrador', planner: 'Planificador', user: 'Usuario' };
export const TOUR_KEY = 'flp-escondida:tour';
