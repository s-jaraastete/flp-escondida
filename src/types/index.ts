/**
 * Modelo de dominio FLP Escondida.
 * Compartido por la Plataforma Web y la Aplicación Móvil.
 */

export type Role = 'admin' | 'planner' | 'user';
export type Experience = 'web' | 'mobile';
export type Area = 'Mina' | 'Coloso';
export type ActivityType = 'OVCC' | 'CTP';

export type RequirementKey =
  | 'epp_especial'
  | 'candado'
  | 'curso'
  | 'chip'
  | 'identificacion'
  | 'autorizacion_area'
  | 'confirmacion_co';

export interface Company {
  id: string;
  name: string;
  specialty: string;
}

export interface MaterialRisk {
  id: string;
  code: string;
  name: string;
}

export interface CriticalControl {
  id: string;
  riskId: string;
  code: string;
  name: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  area: Area;
  sector: string;
  companyId: string;
  contractOwner: string;
  ito: string;
  siteManager: string; // Jefe de terreno
  visitContact: string; // Persona a visitar / auditar
  description: string;
  riskIds: string[];
  defaultRequirements: RequirementKey[];
  status: 'vigente' | 'suspendido';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
  area: Area | 'Ambas';
  isFlpLeader: boolean;
  active: boolean;
}

export type SlotStatus = 'publicado' | 'cancelado';

/** Horario / visita programada publicada por planificación para un proyecto. */
export interface Slot {
  id: string;
  projectId: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  activityType: ActivityType;
  title: string;
  capacity: number;
  riskId: string;
  controlId: string;
  leaderId: string;
  group: string;
  requirements: RequirementKey[];
  notes: string;
  status: SlotStatus;
  createdBy: string;
  createdAt: string;
}

export type BookingStatus = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada' | 'completada';

export interface BookingEvent {
  at: string;
  status: BookingStatus | 'reprogramada' | 'creada';
  by: string;
  note?: string;
}

export interface Booking {
  id: string;
  slotId: string;
  userId: string;
  status: BookingStatus;
  requirementsAck: boolean;
  checklist: RequirementKey[]; // requisitos que el usuario marcó como listos
  note: string;
  createdAt: string;
  updatedAt: string;
  history: BookingEvent[];
}

export type Answer = 'SI' | 'NO' | 'NA';

export interface VerificationQuestion {
  id: string;
  text: string;
  hint: string;
}

export interface VerificationAnswer {
  questionId: string;
  response: Answer | null;
  comment: string;
  evidence: string[]; // nombres de archivo simulados (no se almacenan archivos)
  actionRequired: boolean;
}

export type EventProposal = 'ninguno' | 'Hz' | 'LM';

/** Cierre post-visita (columnas "Post visita de terreno" de la planilla del cliente) y puente con FLP. */
export interface PostVisit {
  flpActivityId: string; // ID de la actividad registrada en FLP (p. ej. CCO-2026-11-4068392)
  eventProposal: EventProposal; // Propuesta de evento Hz / LM
  eventId: string; // ID del evento Hz / LM
  immediateActions: string; // Acciones inmediatas tomadas en terreno
  followUp: string; // Oportunidades para seguimiento de la actividad y/o área
}

export interface Verification {
  id: string;
  bookingId: string;
  slotId: string;
  projectId: string;
  userId: string;
  activityName: string;
  verificationType: ActivityType;
  riskId: string;
  controlId: string;
  contractorObserved: boolean;
  answers: VerificationAnswer[];
  compliance: number; // 0-100 (% de SÍ sobre respuestas aplicables)
  completedAt: string;
  postVisit?: PostVisit;
}

export type ActionStatus = 'abierta' | 'en_progreso' | 'cerrada';

export interface ActionPlan {
  id: string;
  verificationId: string | null;
  projectId: string;
  questionId: string | null;
  finding: string; // hallazgo
  description: string; // acción
  responsible: string; // responsable ficticio
  dueDate: string; // yyyy-MM-dd
  status: ActionStatus;
  completedOnSpot: boolean;
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
}

/** FLP spot: actividad FLP realizada sin reserva previa (no planificada). */
export interface SpotFlp {
  id: string;
  userId: string;
  projectId: string;
  activityType: ActivityType;
  date: string; // yyyy-MM-dd
  note: string;
  createdAt: string;
}

export interface FlpData {
  version: number;
  seededAt: string;
  projects: Project[];
  users: User[];
  slots: Slot[];
  bookings: Booking[];
  verifications: Verification[];
  actions: ActionPlan[];
  spots: SpotFlp[];
}

export interface Session {
  userId: string;
  role: Role;
  experience: Experience;
  startedAt: string;
}

/** Resultado de una operación de dominio. */
export type Result<T = void> = { ok: true; value: T; message: string } | { ok: false; error: string };
