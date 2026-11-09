import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { VERIFICATION_QUESTIONS } from '@/data/catalogs';
import {
  bookSlot,
  checkVisit,
  registerSpot,
  cancelBooking,
  createSlot,
  decideBooking,
  occupancy,
  rescheduleBooking,
  setFlpActivityId,
  submitVerification,
  validateSlot,
  slotHasStarted,
  type SlotInput,
} from './flpService';
import { awaitingForUser, kpis, spotTotals } from './selectors';
import { addDaysISO, todayISO } from '@/utils/date';
import type { Answer, FlpData, Slot } from '@/types';

const USER = 'u-user';
const PLANNER = 'u-planner';

function slotInput(d: FlpData, over: Partial<SlotInput> = {}): SlotInput {
  return {
    projectId: 'p7',
    date: addDaysISO(todayISO(), 60), // fuera del rango sembrado: sin conflictos previos
    start: '09:00',
    end: '10:00',
    activityType: 'OVCC',
    capacity: 1,
    riskId: 'rm2',
    controlId: 'cc21',
    leaderId: d.users.find((u) => u.isFlpLeader && u.active)!.id,
    group: 'Grupo 9',
    requirements: ['identificacion'],
    notes: '',
    ...over,
  };
}

function withSlot(d: FlpData, over: Partial<SlotInput> = {}): { data: FlpData; slot: Slot } {
  const r = createSlot(d, slotInput(d, over), PLANNER);
  if (!r.ok) throw new Error(r.error);
  const slot = r.value.slots.find((s) => !d.slots.some((x) => x.id === s.id))!;
  return { data: r.value, slot };
}

function book(d: FlpData, slotId: string, userId = USER) {
  return bookSlot(d, { slotId, userId, requirementsAck: true, checklist: [] });
}

describe('datos demo', () => {
  it('genera ≥ 12 proyectos en Mina y Coloso con relaciones consistentes', () => {
    const d = buildSeed();
    expect(d.projects.length).toBeGreaterThanOrEqual(12);
    expect(new Set(d.projects.map((p) => p.area))).toEqual(new Set(['Mina', 'Coloso']));
    for (const b of d.bookings) expect(d.slots.some((s) => s.id === b.slotId)).toBe(true);
    for (const v of d.verifications) expect(d.bookings.find((b) => b.id === v.bookingId)?.status).toBe('completada');
    for (const s of d.slots) expect(occupancy(d, s.id)).toBeLessThanOrEqual(s.capacity);
  });

  it('incluye reservas en todos los estados y acciones abiertas y cerradas', () => {
    const d = buildSeed();
    const st = new Set(d.bookings.map((b) => b.status));
    for (const s of ['pendiente', 'confirmada', 'completada', 'cancelada']) expect(st.has(s as never)).toBe(true);
    expect(d.actions.some((a) => a.status === 'cerrada')).toBe(true);
    expect(d.actions.some((a) => a.status !== 'cerrada')).toBe(true);
  });

  it('el usuario demo tiene una visita lista para verificar', () => {
    expect(kpis(buildSeed(), { userId: USER }).awaitingVerification).toBeGreaterThanOrEqual(1);
  });
});

describe('reservas', () => {
  it('registra una reserva pendiente y evita sobrecupos', () => {
    const { data, slot } = withSlot(buildSeed(), { capacity: 1 });
    const first = book(data, slot.id);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.booking.status).toBe('pendiente');
    const second = book(first.value.data, slot.id, 'u-4');
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/cupos/i);
  });

  it('exige declarar la revisión de requisitos', () => {
    const { data, slot } = withSlot(buildSeed());
    expect(bookSlot(data, { slotId: slot.id, userId: USER, requirementsAck: false, checklist: [] }).ok).toBe(false);
  });

  it('detecta reservas superpuestas del mismo usuario', () => {
    const a = withSlot(buildSeed(), { capacity: 3, start: '09:00', end: '11:00' });
    const b = withSlot(a.data, { capacity: 3, projectId: 'p9', start: '10:00', end: '12:00', riskId: 'rm5', controlId: 'cc51', leaderId: 'u-5' });
    const r1 = book(b.data, a.slot.id);
    if (!r1.ok) throw new Error(r1.error);
    const r2 = book(r1.value.data, b.slot.id);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toMatch(/conflicto/i);
  });

  it('confirma, cancela y libera el cupo', () => {
    const { data, slot } = withSlot(buildSeed(), { capacity: 1 });
    const r = book(data, slot.id);
    if (!r.ok) throw new Error(r.error);
    const c = decideBooking(r.value.data, r.value.booking.id, 'confirmada', PLANNER);
    if (!c.ok) throw new Error(c.error);
    const x = cancelBooking(c.value, r.value.booking.id, USER);
    expect(x.ok).toBe(true);
    if (x.ok) expect(occupancy(x.value, slot.id)).toBe(0);
  });

  it('rechazar exige motivo', () => {
    const { data, slot } = withSlot(buildSeed());
    const r = book(data, slot.id);
    if (!r.ok) throw new Error(r.error);
    expect(decideBooking(r.value.data, r.value.booking.id, 'rechazada', PLANNER, '').ok).toBe(false);
    expect(decideBooking(r.value.data, r.value.booking.id, 'rechazada', PLANNER, 'Sin transporte').ok).toBe(true);
  });

  it('reprograma a otro horario con cupo', () => {
    const a = withSlot(buildSeed(), { capacity: 2 });
    const b = withSlot(a.data, { capacity: 2, start: '14:00', end: '15:00' });
    const r = book(b.data, a.slot.id);
    if (!r.ok) throw new Error(r.error);
    const m = rescheduleBooking(r.value.data, r.value.booking.id, b.slot.id, PLANNER);
    expect(m.ok).toBe(true);
    if (m.ok) {
      const moved = m.value.bookings.find((x) => x.id === r.value.booking.id)!;
      expect(moved.slotId).toBe(b.slot.id);
      expect(moved.status).toBe('confirmada');
    }
  });
});

describe('programación', () => {
  it('detecta conflicto de proyecto y de líder', () => {
    const { data, slot } = withSlot(buildSeed());
    const issues = validateSlot(data, slotInput(data, { start: '09:30', end: '10:30', leaderId: slot.leaderId }));
    expect(issues.some((i) => i.message.includes('proyecto ya recibe'))).toBe(true);
    expect(issues.some((i) => i.field === 'leaderId')).toBe(true);
  });

  it('valida horas, cupos y fecha', () => {
    const d = buildSeed();
    expect(validateSlot(d, slotInput(d, { start: '11:00', end: '10:00' })).some((i) => i.field === 'end')).toBe(true);
    expect(validateSlot(d, slotInput(d, { capacity: 0 })).some((i) => i.field === 'capacity')).toBe(true);
    expect(validateSlot(d, slotInput(d, { date: addDaysISO(todayISO(), -1) })).some((i) => i.field === 'date')).toBe(true);
  });
});

describe('verificación', () => {
  it('registra verificación, crea acciones y actualiza indicadores', () => {
    const d = buildSeed();
    const booking = d.bookings.find(
      (b) => b.userId === USER && b.status === 'confirmada' && slotHasStarted(d.slots.find((s) => s.id === b.slotId)!),
    )!;
    const before = kpis(d, { userId: USER });
    const answers = VERIFICATION_QUESTIONS.map((q, i) => ({
      questionId: q.id,
      response: (i === 0 ? 'NO' : 'SI') as Answer,
      comment: i === 0 ? 'Procedimiento desactualizado' : '',
      evidence: [],
      actionRequired: i === 0,
    }));
    // Sin plan de acción para el hallazgo: debe fallar.
    expect(submitVerification(d, { bookingId: booking.id, userId: USER, contractorObserved: true, answers, actions: [] }).ok).toBe(false);
    const r = submitVerification(d, {
      bookingId: booking.id,
      userId: USER,
      contractorObserved: true,
      answers,
      actions: [{ questionId: 'q1', description: 'Actualizar procedimiento', responsible: 'ITO del contrato', dueDate: addDaysISO(todayISO(), 10), completedOnSpot: false }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.verification.compliance).toBe(Math.round((6 / 7) * 100));
    const after = kpis(r.value.data, { userId: USER });
    expect(after.completed).toBe(before.completed + 1);
    expect(after.actionsOpen).toBe(before.actionsOpen + 1);
    expect(r.value.data.bookings.find((b) => b.id === booking.id)?.status).toBe('completada');
  });

  it('guarda el cierre post-visita y permite vincular el ID de FLP después', () => {
    const d = buildSeed();
    const booking = d.bookings.find(
      (b) => b.userId === USER && b.status === 'confirmada' && slotHasStarted(d.slots.find((s) => s.id === b.slotId)!),
    )!;
    const answers = VERIFICATION_QUESTIONS.map((q) => ({ questionId: q.id, response: 'SI' as Answer, comment: '', evidence: [], actionRequired: false }));
    const r = submitVerification(d, {
      bookingId: booking.id,
      userId: USER,
      contractorObserved: true,
      answers,
      actions: [],
      postVisit: { flpActivityId: '', eventProposal: 'ninguno', eventId: 'X', immediateActions: ' Se detuvo la tarea ', followUp: '' },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = r.value.verification;
    expect(v.postVisit?.immediateActions).toBe('Se detuvo la tarea');
    expect(v.postVisit?.eventId).toBe(''); // sin evento: no guarda ID de evento
    expect(setFlpActivityId(r.value.data, v.id, 'cco-123', USER).ok).toBe(false); // formato inválido
    expect(setFlpActivityId(r.value.data, v.id, 'CCO-2026-11-4068392', PLANNER).ok).toBe(false); // otra persona
    const linked = setFlpActivityId(r.value.data, v.id, 'cco-2026-11-4068392', USER);
    expect(linked.ok).toBe(true);
    if (linked.ok) expect(linked.value.verifications.find((x) => x.id === v.id)?.postVisit?.flpActivityId).toBe('CCO-2026-11-4068392');
  });
});

describe('Check de visita y FLP spot', () => {
  it('marca la visita como realizada con un solo check y no permite repetirlo', () => {
    const d = buildSeed();
    const b = awaitingForUser(d, USER)[0];
    const r = checkVisit(d, b.id, USER);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.bookings.find((x) => x.id === b.id)?.status).toBe('completada');
    expect(r.value.verifications.find((v) => v.bookingId === b.id)?.postVisit?.flpActivityId).toBe('');
    expect(checkVisit(r.value, b.id, USER).ok).toBe(false);
    expect(checkVisit(d, b.id, PLANNER).ok).toBe(false);
  });

  it('registra un FLP spot y rechaza fechas futuras o sin proyecto', () => {
    const d = buildSeed();
    const before = spotTotals(d, { userId: USER }).spot;
    const ok = registerSpot(d, { userId: USER, projectId: d.projects[0].id, activityType: 'CTP', date: todayISO(), note: '' });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(spotTotals(ok.value, { userId: USER }).spot).toBe(before + 1);
    expect(registerSpot(d, { userId: USER, projectId: '', activityType: 'OVCC', date: todayISO(), note: '' }).ok).toBe(false);
    expect(registerSpot(d, { userId: USER, projectId: d.projects[0].id, activityType: 'OVCC', date: addDaysISO(todayISO(), 1), note: '' }).ok).toBe(false);
  });
});
