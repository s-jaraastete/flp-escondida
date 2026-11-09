/**
 * Reglas de negocio FLP. Funciones puras: reciben el estado y devuelven un nuevo estado
 * o un error de validación. La UI (web y móvil) usa exclusivamente estas funciones,
 * por lo que ambas experiencias comparten el mismo comportamiento.
 */
import type {
  SpotFlp,
  ActionPlan,
  ActionStatus,
  ActivityType,
  Booking,
  BookingStatus,
  FlpData,
  PostVisit,
  Project,
  RequirementKey,
  Result,
  Role,
  Slot,
  User,
  Verification,
  VerificationAnswer,
} from '@/types';
import { VERIFICATION_QUESTIONS, controlById } from '@/data/catalogs';
import { activityTitle, computeCompliance } from '@/data/seed';
import { addDaysISO, nowISO, timesOverlap, todayISO, toMinutes } from '@/utils/date';
import { uid } from '@/utils/misc';

type R = Result<FlpData>;
const ok = (value: FlpData, message: string): R => ({ ok: true, value, message });
const fail = (error: string): R => ({ ok: false, error });

/** Estados que ocupan cupo. */
export const OCCUPYING: BookingStatus[] = ['pendiente', 'confirmada', 'completada'];
/** Estados que el usuario aún puede gestionar. */
export const OPEN_BOOKING: BookingStatus[] = ['pendiente', 'confirmada'];

export const findUser = (d: FlpData, id: string) => d.users.find((u) => u.id === id);
export const findProject = (d: FlpData, id: string) => d.projects.find((p) => p.id === id);
export const findSlot = (d: FlpData, id: string) => d.slots.find((s) => s.id === id);
export const findBooking = (d: FlpData, id: string) => d.bookings.find((b) => b.id === id);

export function occupancy(d: FlpData, slotId: string, excludeBookingId?: string) {
  return d.bookings.filter((b) => b.slotId === slotId && b.id !== excludeBookingId && OCCUPYING.includes(b.status)).length;
}

export function seatsLeft(d: FlpData, slot: Slot) {
  return Math.max(0, slot.capacity - occupancy(d, slot.id));
}

/** ¿El horario ya ocurrió? (fecha anterior a hoy, o hoy con hora de inicio ya pasada). */
export function slotHasStarted(slot: Slot, now = new Date()) {
  const t = todayISO();
  if (slot.date < t) return true;
  if (slot.date > t) return false;
  return toMinutes(slot.start) <= now.getHours() * 60 + now.getMinutes();
}

/** Reserva activa del mismo usuario que se superpone con el horario indicado. */
/** Días que tiene la persona para marcar una visita como realizada. Después cuenta como "sin asistencia". */
export const CHECK_WINDOW_DAYS = 7;

/** Reserva confirmada que no se marcó dentro del plazo: FLP planificado sin asistencia. */
export function isNoShow(b: Booking, slot: Slot, hasVerification: boolean, today = todayISO()) {
  return b.status === 'confirmada' && !hasVerification && slot.date < addDaysISO(today, -CHECK_WINDOW_DAYS);
}

export function findUserOverlap(d: FlpData, userId: string, slot: Slot, excludeBookingId?: string) {
  return d.bookings.find((b) => {
    if (b.userId !== userId || b.id === excludeBookingId || !OPEN_BOOKING.includes(b.status)) return false;
    const s = findSlot(d, b.slotId);
    if (!s || s.status !== 'publicado') return false;
    return s.date === slot.date && timesOverlap(s.start, s.end, slot.start, slot.end);
  });
}

function pushHistory(b: Booking, status: Booking['history'][number]['status'], by: string, note?: string): Booking {
  const at = nowISO();
  return { ...b, updatedAt: at, history: [...b.history, { at, status, by, note }] };
}

function replace<T extends { id: string }>(list: T[], item: T) {
  return list.map((x) => (x.id === item.id ? item : x));
}

// ---------------------------------------------------------------- Reservas

export interface BookInput {
  slotId: string;
  userId: string;
  requirementsAck: boolean;
  checklist: RequirementKey[];
  note?: string;
}

export function bookSlot(d: FlpData, input: BookInput): Result<{ data: FlpData; booking: Booking }> {
  const slot = findSlot(d, input.slotId);
  if (!slot || slot.status !== 'publicado') return { ok: false, error: 'El horario seleccionado ya no está disponible.' };
  const project = findProject(d, slot.projectId);
  if (!project || project.status !== 'vigente') return { ok: false, error: 'El proyecto no está vigente para recibir visitas.' };
  const user = findUser(d, input.userId);
  if (!user || !user.active) return { ok: false, error: 'Tu cuenta no está habilitada para reservar.' };
  if (slotHasStarted(slot)) return { ok: false, error: 'No es posible reservar un horario que ya comenzó o pasó.' };
  if (!input.requirementsAck) return { ok: false, error: 'Debes declarar que revisaste los requisitos de acceso y seguridad.' };
  const dup = d.bookings.find((b) => b.slotId === slot.id && b.userId === user.id && OPEN_BOOKING.includes(b.status));
  if (dup) return { ok: false, error: 'Ya tienes una reserva activa en este horario.' };
  if (seatsLeft(d, slot) <= 0) return { ok: false, error: 'Sin cupos: el horario alcanzó su capacidad máxima.' };
  const overlap = findUserOverlap(d, user.id, slot);
  if (overlap) {
    const os = findSlot(d, overlap.slotId)!;
    const op = findProject(d, os.projectId);
    return { ok: false, error: `Conflicto de horario: ya tienes una visita ${os.start}–${os.end} en "${op?.name}".` };
  }
  const at = nowISO();
  const booking: Booking = {
    id: uid('b'),
    slotId: slot.id,
    userId: user.id,
    status: 'pendiente',
    requirementsAck: true,
    checklist: input.checklist,
    note: input.note?.trim() ?? '',
    createdAt: at,
    updatedAt: at,
    history: [{ at, status: 'creada', by: user.id, note: 'Solicitud de reserva enviada a planificación.' }],
  };
  return {
    ok: true,
    value: { data: { ...d, bookings: [...d.bookings, booking] }, booking },
    message: 'Reserva enviada. Quedó pendiente de confirmación por planificación.',
  };
}

export function cancelBooking(d: FlpData, bookingId: string, by: string, reason = ''): R {
  const b = findBooking(d, bookingId);
  if (!b) return fail('Reserva no encontrada.');
  if (!OPEN_BOOKING.includes(b.status)) return fail('Solo se pueden cancelar reservas pendientes o confirmadas.');
  const slot = findSlot(d, b.slotId);
  if (slot && slotHasStarted(slot)) return fail('La visita ya comenzó; no puede cancelarse.');
  const updated = pushHistory({ ...b, status: 'cancelada' }, 'cancelada', by, reason || undefined);
  return ok({ ...d, bookings: replace(d.bookings, updated) }, 'Reserva cancelada. El cupo quedó liberado.');
}

/** Marca / desmarca un requisito como listo en el checklist previo de una reserva. */
export function toggleChecklistItem(d: FlpData, bookingId: string, key: RequirementKey): R {
  const b = findBooking(d, bookingId);
  if (!b) return fail('Reserva no encontrada.');
  if (!OPEN_BOOKING.includes(b.status)) return fail('El checklist solo se edita en reservas activas.');
  const checklist = b.checklist.includes(key) ? b.checklist.filter((k) => k !== key) : [...b.checklist, key];
  return ok({ ...d, bookings: replace(d.bookings, { ...b, checklist, updatedAt: nowISO() }) }, 'Checklist actualizado.');
}

export function decideBooking(d: FlpData, bookingId: string, decision: 'confirmada' | 'rechazada', by: string, note = ''): R {
  const b = findBooking(d, bookingId);
  if (!b) return fail('Reserva no encontrada.');
  if (b.status !== 'pendiente') return fail('Solo se pueden confirmar o rechazar solicitudes pendientes.');
  if (decision === 'rechazada' && !note.trim()) return fail('Indica el motivo del rechazo.');
  const slot = findSlot(d, b.slotId);
  if (decision === 'confirmada' && slot && slotHasStarted(slot)) return fail('El horario ya pasó; reprograma la solicitud.');
  const updated = pushHistory({ ...b, status: decision }, decision, by, note || undefined);
  return ok(
    { ...d, bookings: replace(d.bookings, updated) },
    decision === 'confirmada' ? 'Visita confirmada y coordinada.' : 'Solicitud rechazada.',
  );
}

export function rescheduleBooking(d: FlpData, bookingId: string, newSlotId: string, by: string): R {
  const b = findBooking(d, bookingId);
  if (!b) return fail('Reserva no encontrada.');
  if (!OPEN_BOOKING.includes(b.status)) return fail('Solo se pueden reprogramar reservas pendientes o confirmadas.');
  if (b.slotId === newSlotId) return fail('Selecciona un horario distinto al actual.');
  const slot = findSlot(d, newSlotId);
  if (!slot || slot.status !== 'publicado') return fail('El nuevo horario no está disponible.');
  if (slotHasStarted(slot)) return fail('El nuevo horario ya pasó.');
  if (seatsLeft(d, slot) <= 0) return fail('El nuevo horario no tiene cupos disponibles.');
  const overlap = findUserOverlap(d, b.userId, slot, b.id);
  if (overlap) return fail('La persona ya tiene otra visita superpuesta en ese horario.');
  const updated = pushHistory({ ...b, slotId: slot.id, status: 'confirmada' }, 'reprogramada', by, `Reprogramada a ${slot.date} ${slot.start}.`);
  return ok({ ...d, bookings: replace(d.bookings, updated) }, 'Reserva reprogramada y confirmada en el nuevo horario.');
}

// ---------------------------------------------------------------- Disponibilidad / programación

export interface SlotInput {
  projectId: string;
  date: string;
  start: string;
  end: string;
  activityType: ActivityType;
  capacity: number;
  riskId: string;
  controlId: string;
  leaderId: string;
  group: string;
  requirements: RequirementKey[];
  notes: string;
}

export interface SlotIssue {
  field: keyof SlotInput | 'general';
  message: string;
}

export function validateSlot(d: FlpData, input: SlotInput, editingId?: string): SlotIssue[] {
  const issues: SlotIssue[] = [];
  const req = (field: keyof SlotInput, label: string) => {
    if (!String(input[field] ?? '').trim()) issues.push({ field, message: `${label} es obligatorio.` });
  };
  req('projectId', 'El proyecto');
  req('date', 'La fecha');
  req('start', 'La hora de inicio');
  req('end', 'La hora de término');
  req('riskId', 'El riesgo material');
  req('controlId', 'El control crítico');
  req('leaderId', 'El líder FLP');
  req('group', 'El grupo');
  if (issues.length) return issues;

  const project = findProject(d, input.projectId);
  if (!project) issues.push({ field: 'projectId', message: 'Proyecto inexistente.' });
  else if (project.status !== 'vigente') issues.push({ field: 'projectId', message: 'El proyecto está suspendido.' });
  if (input.date < todayISO()) issues.push({ field: 'date', message: 'La fecha no puede ser anterior a hoy.' });
  if (toMinutes(input.end) <= toMinutes(input.start)) issues.push({ field: 'end', message: 'La hora de término debe ser posterior al inicio.' });
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 30)
    issues.push({ field: 'capacity', message: 'Los cupos deben estar entre 1 y 30.' });
  if (controlById(input.controlId)?.riskId !== input.riskId)
    issues.push({ field: 'controlId', message: 'El control crítico no corresponde al riesgo material.' });
  if (editingId) {
    const used = occupancy(d, editingId);
    if (input.capacity < used) issues.push({ field: 'capacity', message: `Ya existen ${used} reservas; los cupos no pueden ser menores.` });
  }
  if (issues.length) return issues;

  // Conflictos de agenda
  for (const s of d.slots) {
    if (s.id === editingId || s.status !== 'publicado' || s.date !== input.date) continue;
    if (!timesOverlap(s.start, s.end, input.start, input.end)) continue;
    if (s.projectId === input.projectId)
      issues.push({ field: 'general', message: `Conflicto: el proyecto ya recibe una visita ${s.start}–${s.end} ese día.` });
    if (s.leaderId === input.leaderId) {
      const leader = findUser(d, s.leaderId);
      issues.push({ field: 'leaderId', message: `Conflicto: ${leader?.name ?? 'el líder'} ya lidera otra visita ${s.start}–${s.end}.` });
    }
  }
  return issues;
}

export function createSlot(d: FlpData, input: SlotInput, by: string): R {
  const issues = validateSlot(d, input);
  if (issues.length) return fail(issues[0].message);
  const slot: Slot = {
    id: uid('s'),
    ...input,
    group: input.group.trim(),
    notes: input.notes.trim(),
    title: activityTitle(input.activityType, input.controlId),
    status: 'publicado',
    createdBy: by,
    createdAt: nowISO(),
  };
  const slots = [...d.slots, slot].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return ok({ ...d, slots }, 'Horario publicado. Ya está disponible para reservas.');
}

export function updateSlot(d: FlpData, slotId: string, input: SlotInput): R {
  const current = findSlot(d, slotId);
  if (!current) return fail('Horario no encontrado.');
  const issues = validateSlot(d, input, slotId);
  if (issues.length) return fail(issues[0].message);
  const updated: Slot = { ...current, ...input, title: activityTitle(input.activityType, input.controlId) };
  // Si cambia fecha/hora, revisar superposiciones de los inscritos.
  const clash = d.bookings.find(
    (b) => b.slotId === slotId && OPEN_BOOKING.includes(b.status) && findUserOverlap(d, b.userId, updated, b.id),
  );
  if (clash) return fail(`${findUser(d, clash.userId)?.name} tendría una visita superpuesta con el nuevo horario.`);
  return ok({ ...d, slots: replace(d.slots, updated) }, 'Horario actualizado.');
}

export function cancelSlot(d: FlpData, slotId: string, by: string): R {
  const slot = findSlot(d, slotId);
  if (!slot || slot.status !== 'publicado') return fail('El horario no está publicado.');
  if (slotHasStarted(slot)) return fail('No se puede cancelar una visita que ya comenzó.');
  const affected = d.bookings.filter((b) => b.slotId === slotId && OPEN_BOOKING.includes(b.status));
  const bookings = d.bookings.map((b) =>
    affected.includes(b) ? pushHistory({ ...b, status: 'cancelada' }, 'cancelada', by, 'Horario cancelado por planificación.') : b,
  );
  return ok(
    { ...d, slots: replace(d.slots, { ...slot, status: 'cancelado' }), bookings },
    `Horario cancelado${affected.length ? ` y ${affected.length} reserva(s) notificadas como canceladas` : ''}.`,
  );
}

// ---------------------------------------------------------------- Verificación y acciones

export interface ActionDraft {
  questionId: string;
  description: string;
  responsible: string;
  dueDate: string;
  completedOnSpot: boolean;
}

export interface VerificationInput {
  bookingId: string;
  userId: string;
  contractorObserved: boolean;
  answers: VerificationAnswer[];
  actions: ActionDraft[];
  postVisit?: PostVisit;
}

export function validateVerification(d: FlpData, input: VerificationInput): string[] {
  const errors: string[] = [];
  const b = findBooking(d, input.bookingId);
  if (!b) return ['Reserva no encontrada.'];
  if (b.userId !== input.userId) errors.push('Solo la persona inscrita puede registrar esta verificación.');
  if (b.status !== 'confirmada') errors.push('La verificación requiere una visita confirmada.');
  const slot = findSlot(d, b.slotId);
  if (slot && !slotHasStarted(slot)) errors.push('La verificación se habilita desde la hora de inicio de la visita.');
  if (d.verifications.some((v) => v.bookingId === b.id)) errors.push('Esta visita ya tiene una verificación registrada.');
  VERIFICATION_QUESTIONS.forEach((q, i) => {
    const a = input.answers.find((x) => x.questionId === q.id);
    if (!a?.response) errors.push(`Pregunta ${i + 1}: selecciona SÍ, NO o N/A.`);
    else if (a.response === 'NO' && !a.comment.trim()) errors.push(`Pregunta ${i + 1}: agrega un comentario que describa el hallazgo.`);
    if (a?.actionRequired) {
      const act = input.actions.find((x) => x.questionId === q.id);
      if (!act || !act.description.trim()) errors.push(`Pregunta ${i + 1}: describe la acción requerida.`);
      else {
        if (!act.responsible) errors.push(`Pregunta ${i + 1}: asigna un responsable.`);
        if (!act.completedOnSpot && (!act.dueDate || act.dueDate < todayISO()))
          errors.push(`Pregunta ${i + 1}: la fecha compromiso debe ser hoy o posterior.`);
      }
    }
  });
  return errors;
}

export const FLP_ID_PATTERN = /^(CCO|PTC|LA|TTT)-\d{4}-\d{2}-\d{5,8}$/i;

function normalizePostVisit(p: PostVisit): PostVisit {
  return {
    flpActivityId: p.flpActivityId.trim().toUpperCase(),
    eventProposal: p.eventProposal,
    eventId: p.eventProposal === 'ninguno' ? '' : p.eventId.trim(),
    immediateActions: p.immediateActions.trim(),
    followUp: p.followUp.trim(),
  };
}

/** Registra (o corrige) el ID de la actividad en FLP después de haberla cargado allá. */
export function setFlpActivityId(d: FlpData, verificationId: string, flpActivityId: string, userId: string): Result<FlpData> {
  const v = d.verifications.find((x) => x.id === verificationId);
  if (!v) return { ok: false, error: 'Verificación no encontrada.' };
  if (v.userId !== userId) return { ok: false, error: 'Solo quien registró la verificación puede vincularla con FLP.' };
  const id = flpActivityId.trim().toUpperCase();
  if (id && !FLP_ID_PATTERN.test(id)) return { ok: false, error: 'Formato de ID FLP no válido. Ejemplo: CCO-2026-11-4068392.' };
  const base: PostVisit = v.postVisit ?? { flpActivityId: '', eventProposal: 'ninguno', eventId: '', immediateActions: '', followUp: '' };
  const next: Verification = { ...v, postVisit: { ...base, flpActivityId: id } };
  return {
    ok: true,
    value: { ...d, verifications: d.verifications.map((x) => (x.id === v.id ? next : x)) },
    message: id ? `Actividad vinculada con FLP (${id}).` : 'Vínculo con FLP eliminado.',
  };
}

export function submitVerification(d: FlpData, input: VerificationInput): Result<{ data: FlpData; verification: Verification }> {
  const errors = validateVerification(d, input);
  if (errors.length) return { ok: false, error: errors[0] };
  const b = findBooking(d, input.bookingId)!;
  const slot = findSlot(d, b.slotId)!;
  const at = nowISO();
  const verification: Verification = {
    id: uid('v'),
    bookingId: b.id,
    slotId: slot.id,
    projectId: slot.projectId,
    userId: input.userId,
    activityName: slot.title,
    verificationType: slot.activityType,
    riskId: slot.riskId,
    controlId: slot.controlId,
    contractorObserved: input.contractorObserved,
    answers: input.answers,
    compliance: computeCompliance(input.answers),
    completedAt: at,
    ...(input.postVisit ? { postVisit: normalizePostVisit(input.postVisit) } : {}),
  };
  const newActions: ActionPlan[] = input.answers
    .filter((a) => a.actionRequired)
    .map((a) => {
      const draft = input.actions.find((x) => x.questionId === a.questionId)!;
      const q = VERIFICATION_QUESTIONS.find((x) => x.id === a.questionId)!;
      return {
        id: uid('a'),
        verificationId: verification.id,
        projectId: slot.projectId,
        questionId: q.id,
        finding: a.comment.trim() || q.text,
        description: draft.description.trim(),
        responsible: draft.responsible,
        dueDate: draft.completedOnSpot ? todayISO() : draft.dueDate,
        status: draft.completedOnSpot ? 'cerrada' : 'abierta',
        completedOnSpot: draft.completedOnSpot,
        createdBy: input.userId,
        createdAt: at,
        closedAt: draft.completedOnSpot ? at : null,
      };
    });
  const booking = pushHistory({ ...b, status: 'completada' }, 'completada', input.userId, 'Verificación registrada.');
  return {
    ok: true,
    value: {
      data: {
        ...d,
        bookings: replace(d.bookings, booking),
        verifications: [...d.verifications, verification],
        actions: [...d.actions, ...newActions],
      },
      verification,
    },
    message: `Verificación registrada (${verification.compliance}% de cumplimiento)${newActions.length ? ` y ${newActions.length} acción(es) creada(s)` : ''}.`,
  };
}

/**
 * Marca la visita como realizada con un solo check (sin formulario).
 * Queda como verificación sin hallazgos y pendiente de registro en FLP.
 */
export function checkVisit(d: FlpData, bookingId: string, userId: string): Result<FlpData> {
  const b = findBooking(d, bookingId);
  if (!b) return { ok: false, error: 'Reserva no encontrada.' };
  if (b.userId !== userId) return { ok: false, error: 'Solo la persona inscrita puede marcar esta visita.' };
  if (b.status !== 'confirmada') return { ok: false, error: 'Solo se pueden marcar visitas confirmadas.' };
  const slot = findSlot(d, b.slotId)!;
  if (!slotHasStarted(slot)) return { ok: false, error: 'Podrás marcarla desde la hora de inicio de la visita.' };
  if (d.verifications.some((v) => v.bookingId === b.id)) return { ok: false, error: 'Esta visita ya está marcada como realizada.' };
  if (isNoShow(b, slot, false)) return { ok: false, error: `Pasaron más de ${CHECK_WINDOW_DAYS} días: la visita quedó como planificada sin asistencia.` };
  const at = nowISO();
  const verification: Verification = {
    id: uid('v'),
    bookingId: b.id,
    slotId: slot.id,
    projectId: slot.projectId,
    userId,
    activityName: slot.title,
    verificationType: slot.activityType,
    riskId: slot.riskId,
    controlId: slot.controlId,
    contractorObserved: true,
    answers: [],
    compliance: 100,
    completedAt: at,
    postVisit: { flpActivityId: '', eventProposal: 'ninguno', eventId: '', immediateActions: '', followUp: '' },
  };
  const booking = pushHistory({ ...b, status: 'completada' }, 'completada', userId, 'Visita realizada.');
  return {
    ok: true,
    value: { ...d, bookings: replace(d.bookings, booking), verifications: [...d.verifications, verification] },
    message: 'Visita marcada como realizada.',
  };
}

// ---------------------------------------------------------------- FLP spot (sin planificar)

export interface SpotInput {
  userId: string;
  projectId: string;
  activityType: SpotFlp['activityType'];
  date: string;
  note: string;
}

/** Registra un FLP spot: la persona hizo FLP sin haber reservado un horario. */
export function registerSpot(d: FlpData, input: SpotInput): Result<FlpData> {
  if (!input.projectId || !findProject(d, input.projectId)) return { ok: false, error: 'Selecciona el proyecto donde hiciste el FLP.' };
  if (!input.date) return { ok: false, error: 'Indica la fecha.' };
  if (input.date > todayISO()) return { ok: false, error: 'El FLP spot se registra después de hacerlo (no puede ser una fecha futura).' };
  const spot: SpotFlp = { id: uid('sp'), userId: input.userId, projectId: input.projectId, activityType: input.activityType, date: input.date, note: input.note.trim(), createdAt: nowISO() };
  return { ok: true, value: { ...d, spots: [...(d.spots ?? []), spot] }, message: 'FLP spot registrado.' };
}

export interface ManualActionInput {
  projectId: string;
  finding: string;
  description: string;
  responsible: string;
  dueDate: string;
}

export function createAction(d: FlpData, input: ManualActionInput, by: string): R {
  if (!input.projectId) return fail('Selecciona un proyecto.');
  if (!input.finding.trim()) return fail('Describe el hallazgo.');
  if (!input.description.trim()) return fail('Describe la acción.');
  if (!input.responsible) return fail('Asigna un responsable.');
  if (!input.dueDate || input.dueDate < todayISO()) return fail('La fecha compromiso debe ser hoy o posterior.');
  const action: ActionPlan = {
    id: uid('a'),
    verificationId: null,
    projectId: input.projectId,
    questionId: null,
    finding: input.finding.trim(),
    description: input.description.trim(),
    responsible: input.responsible,
    dueDate: input.dueDate,
    status: 'abierta',
    completedOnSpot: false,
    createdBy: by,
    createdAt: nowISO(),
    closedAt: null,
  };
  return ok({ ...d, actions: [...d.actions, action] }, 'Plan de acción creado.');
}

export function setActionStatus(d: FlpData, actionId: string, status: ActionStatus): R {
  const a = d.actions.find((x) => x.id === actionId);
  if (!a) return fail('Acción no encontrada.');
  if (a.status === status) return fail('La acción ya está en ese estado.');
  const updated: ActionPlan = { ...a, status, closedAt: status === 'cerrada' ? nowISO() : null };
  const label = status === 'cerrada' ? 'cerrada' : status === 'en_progreso' ? 'en progreso' : 'reabierta';
  return ok({ ...d, actions: replace(d.actions, updated) }, `Acción ${label}.`);
}

// ---------------------------------------------------------------- Administración

export function upsertProject(d: FlpData, input: Omit<Project, 'id'> & { id?: string }): R {
  const required: Array<[keyof Project, string]> = [
    ['code', 'Código'],
    ['name', 'Nombre'],
    ['companyId', 'Empresa contratista'],
    ['contractOwner', 'Contract Owner'],
    ['ito', 'ITO'],
    ['siteManager', 'Jefe de terreno'],
    ['visitContact', 'Persona a visitar'],
  ];
  for (const [k, label] of required) if (!String(input[k] ?? '').trim()) return fail(`${label} es obligatorio.`);
  if (!input.riskIds.length) return fail('Asocia al menos un riesgo material.');
  const codeTaken = d.projects.some((p) => p.code.toLowerCase() === input.code.trim().toLowerCase() && p.id !== input.id);
  if (codeTaken) return fail('Ya existe un proyecto con ese código.');
  if (input.id) {
    const updated = { ...(findProject(d, input.id) as Project), ...input, id: input.id } as Project;
    return ok({ ...d, projects: replace(d.projects, updated) }, 'Proyecto actualizado.');
  }
  const project: Project = { ...input, id: uid('p'), code: input.code.trim().toUpperCase() } as Project;
  return ok({ ...d, projects: [...d.projects, project] }, 'Proyecto creado.');
}

export function toggleProjectStatus(d: FlpData, projectId: string): R {
  const p = findProject(d, projectId);
  if (!p) return fail('Proyecto no encontrado.');
  const status = p.status === 'vigente' ? 'suspendido' : 'vigente';
  return ok({ ...d, projects: replace(d.projects, { ...p, status }) }, status === 'vigente' ? 'Proyecto reactivado.' : 'Proyecto suspendido: no recibirá nuevas reservas.');
}

export function upsertUser(d: FlpData, input: Omit<User, 'id'> & { id?: string }): R {
  if (!input.name.trim()) return fail('El nombre es obligatorio.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return fail('Ingresa un correo válido.');
  if (d.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase() && u.id !== input.id))
    return fail('Ya existe un usuario con ese correo.');
  if (input.id) {
    const updated = { ...(findUser(d, input.id) as User), ...input, id: input.id } as User;
    return ok({ ...d, users: replace(d.users, updated) }, 'Usuario actualizado.');
  }
  return ok({ ...d, users: [...d.users, { ...input, id: uid('u') } as User] }, 'Usuario creado.');
}

export function toggleUserActive(d: FlpData, userId: string, protectedIds: string[]): R {
  const u = findUser(d, userId);
  if (!u) return fail('Usuario no encontrado.');
  if (protectedIds.includes(userId)) return fail('Las cuentas demo principales no pueden desactivarse.');
  return ok({ ...d, users: replace(d.users, { ...u, active: !u.active }) }, u.active ? 'Usuario desactivado.' : 'Usuario activado.');
}

export const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', planner: 'Planificador', user: 'Usuario' };
