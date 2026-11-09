import { addMonths, format, startOfMonth } from 'date-fns';
import type { ActionPlan, Area, Booking, FlpData, Slot } from '@/types';
import { companyById, controlById, riskById } from '@/data/catalogs';
import { locale, today, todayISO, toISODate } from '@/utils/date';
import { pct } from '@/utils/misc';
import { OCCUPYING, findProject, findSlot, findUser, isNoShow, occupancy, slotHasStarted } from './flpService';

export interface SlotView extends Slot {
  project: NonNullable<ReturnType<typeof findProject>>;
  companyName: string;
  riskName: string;
  riskCode: string;
  controlName: string;
  controlCode: string;
  leaderName: string;
  occupied: number;
  seats: number;
}

export function slotView(d: FlpData, s: Slot): SlotView {
  const project = findProject(d, s.projectId)!;
  const risk = riskById(s.riskId);
  const control = controlById(s.controlId);
  const occ = occupancy(d, s.id);
  return {
    ...s,
    project,
    companyName: companyById(project.companyId)?.name ?? '—',
    riskName: risk?.name ?? '—',
    riskCode: risk?.code ?? '',
    controlName: control?.name ?? '—',
    controlCode: control?.code ?? '',
    leaderName: findUser(d, s.leaderId)?.name ?? '—',
    occupied: occ,
    seats: Math.max(0, s.capacity - occ),
  };
}

export interface BookingView extends Booking {
  slot: SlotView;
  userName: string;
  hasVerification: boolean;
  awaitingVerification: boolean;
  /** Confirmada y no marcada dentro del plazo. */
  noShow: boolean;
}

export function bookingView(d: FlpData, b: Booking): BookingView {
  const slot = slotView(d, findSlot(d, b.slotId)!);
  const hasVerification = d.verifications.some((v) => v.bookingId === b.id);
  return {
    ...b,
    slot,
    userName: findUser(d, b.userId)?.name ?? '—',
    hasVerification,
    noShow: isNoShow(b, slot, hasVerification),
    awaitingVerification: b.status === 'confirmada' && slotHasStarted(slot) && !hasVerification && !isNoShow(b, slot, hasVerification),
  };
}

export const isOverdue = (a: ActionPlan) => a.status !== 'cerrada' && a.dueDate < todayISO();

export interface Filters {
  area?: Area | 'Todas';
  userId?: string;
}

const areaOk = (d: FlpData, projectId: string, area?: Filters['area']) =>
  !area || area === 'Todas' || findProject(d, projectId)?.area === area;

export function kpis(d: FlpData, f: Filters = {}) {
  const t = todayISO();
  const slots = d.slots.filter((s) => s.status === 'publicado' && areaOk(d, s.projectId, f.area));
  const slotIds = new Set(slots.map((s) => s.id));
  const bookings = d.bookings.filter((b) => slotIds.has(b.slotId) && (!f.userId || b.userId === f.userId));
  const upcomingSlots = slots.filter((s) => s.date >= t);
  const verifications = d.verifications.filter((v) => areaOk(d, v.projectId, f.area) && (!f.userId || v.userId === f.userId));
  const verifIds = new Set(verifications.map((v) => v.id));
  const actions = d.actions.filter(
    (a) => areaOk(d, a.projectId, f.area) && (!f.userId || (a.verificationId ? verifIds.has(a.verificationId) : a.createdBy === f.userId)),
  );
  const futureBookings = bookings.filter((b) => findSlot(d, b.slotId)!.date >= t);
  const awaiting = bookings.filter(
    (b) => b.status === 'confirmada' && slotHasStarted(findSlot(d, b.slotId)!) && !d.verifications.some((v) => v.bookingId === b.id),
  );
  const totalSeats = upcomingSlots.reduce((n, s) => n + s.capacity, 0);
  const usedSeats = upcomingSlots.reduce((n, s) => n + occupancy(d, s.id), 0);
  const avgCompliance = verifications.length
    ? Math.round(verifications.reduce((n, v) => n + v.compliance, 0) / verifications.length)
    : 0;
  const closed = actions.filter((a) => a.status === 'cerrada').length;
  return {
    scheduledSlots: upcomingSlots.length,
    confirmed: futureBookings.filter((b) => b.status === 'confirmada').length,
    pending: bookings.filter((b) => b.status === 'pendiente').length,
    completed: bookings.filter((b) => b.status === 'completada').length,
    cancelled: bookings.filter((b) => b.status === 'cancelada' || b.status === 'rechazada').length,
    awaitingVerification: awaiting.length,
    occupancyRate: pct(usedSeats, totalSeats),
    avgCompliance,
    verifications: verifications.length,
    actionsOpen: actions.filter((a) => a.status !== 'cerrada').length,
    actionsOverdue: actions.filter(isOverdue).length,
    actionsClosed: closed,
    actionClosure: pct(closed, actions.length),
    actionsTotal: actions.length,
  };
}

/** Serie mensual: últimos 5 meses + mes actual + próximo mes. */
export function monthlySeries(d: FlpData, f: Filters = {}) {
  const base = startOfMonth(today());
  const months = Array.from({ length: 7 }, (_, i) => addMonths(base, i - 5));
  return months.map((m) => {
    const key = format(m, 'yyyy-MM');
    const slots = d.slots.filter((s) => s.status === 'publicado' && s.date.startsWith(key) && areaOk(d, s.projectId, f.area));
    const ids = new Set(slots.map((s) => s.id));
    const bookings = d.bookings.filter((b) => ids.has(b.slotId) && (!f.userId || b.userId === f.userId));
    const verifs = d.verifications.filter(
      (v) => v.completedAt.startsWith(key) && areaOk(d, v.projectId, f.area) && (!f.userId || v.userId === f.userId),
    );
    return {
      key,
      mes: format(m, 'MMM yy', { locale }),
      programadas: f.userId ? bookings.filter((b) => OCCUPYING.includes(b.status)).length : slots.length,
      // Usuario: verificaciones propias. Global: visitas (horarios) con al menos una verificación.
      completadas: f.userId ? verifs.length : new Set(verifs.map((v) => v.slotId)).size,
      mina: slots.filter((s) => findProject(d, s.projectId)?.area === 'Mina').length,
      coloso: slots.filter((s) => findProject(d, s.projectId)?.area === 'Coloso').length,
      cumplimiento: verifs.length ? Math.round(verifs.reduce((n, v) => n + v.compliance, 0) / verifs.length) : null,
    };
  });
}

/** Planificado (con reserva) vs FLP spot y planificado sin asistencia, por mes. */
export function spotSeries(d: FlpData, f: Filters = {}) {
  const base = startOfMonth(today());
  const t = todayISO();
  const months = Array.from({ length: 6 }, (_, i) => addMonths(base, i - 5));
  return months.map((m) => {
    const key = format(m, 'yyyy-MM');
    const verifs = d.verifications.filter((v) => v.completedAt.startsWith(key) && areaOk(d, v.projectId, f.area) && (!f.userId || v.userId === f.userId));
    const spots = (d.spots ?? []).filter((s) => s.date.startsWith(key) && areaOk(d, s.projectId, f.area) && (!f.userId || s.userId === f.userId));
    const noShow = d.bookings.filter((b) => {
      if (b.status !== 'confirmada' || (f.userId && b.userId !== f.userId)) return false;
      const s = findSlot(d, b.slotId);
      return !!s && s.date.startsWith(key) && areaOk(d, s.projectId, f.area) && isNoShow(b, s, d.verifications.some((v) => v.bookingId === b.id), t);
    });
    return { key, mes: format(m, 'MMM yy', { locale }), planificado: verifs.length, spot: spots.length, sinAsistencia: noShow.length };
  });
}

/** Totales de los últimos 6 meses para las tarjetas de FLP spot / sin asistencia. */
export function spotTotals(d: FlpData, f: Filters = {}) {
  const s = spotSeries(d, f);
  const planificado = s.reduce((n, x) => n + x.planificado, 0);
  const spot = s.reduce((n, x) => n + x.spot, 0);
  const sinAsistencia = s.reduce((n, x) => n + x.sinAsistencia, 0);
  const total = planificado + spot;
  return { planificado, spot, sinAsistencia, spotShare: total ? Math.round((spot / total) * 100) : 0, noShowRate: planificado + sinAsistencia ? Math.round((sinAsistencia / (planificado + sinAsistencia)) * 100) : 0 };
}

export function areaBreakdown(d: FlpData) {
  return (['Mina', 'Coloso'] as Area[]).map((area) => {
    const k = kpis(d, { area });
    return { area, ...k };
  });
}

export function actionsByStatus(d: FlpData, f: Filters = {}) {
  const list = d.actions.filter((a) => areaOk(d, a.projectId, f.area));
  return [
    { name: 'Abiertas', value: list.filter((a) => a.status === 'abierta' && !isOverdue(a)).length, key: 'abierta' },
    { name: 'En progreso', value: list.filter((a) => a.status === 'en_progreso' && !isOverdue(a)).length, key: 'en_progreso' },
    { name: 'Vencidas', value: list.filter(isOverdue).length, key: 'vencida' },
    { name: 'Cerradas', value: list.filter((a) => a.status === 'cerrada').length, key: 'cerrada' },
  ];
}

export function activityTypeSplit(d: FlpData, f: Filters = {}) {
  const v = d.verifications.filter((x) => areaOk(d, x.projectId, f.area) && (!f.userId || x.userId === f.userId));
  return [
    { name: 'OVCC', value: v.filter((x) => x.verificationType === 'OVCC').length },
    { name: 'CTP', value: v.filter((x) => x.verificationType === 'CTP').length },
  ];
}

/** Riesgos materiales con más hallazgos (respuestas NO). */
export function findingsByRisk(d: FlpData, f: Filters = {}) {
  const counts = new Map<string, number>();
  d.verifications
    .filter((v) => areaOk(d, v.projectId, f.area))
    .forEach((v) => {
      const n = v.answers.filter((a) => a.response === 'NO').length;
      if (n) counts.set(v.riskId, (counts.get(v.riskId) ?? 0) + n);
    });
  return [...counts.entries()]
    .map(([riskId, value]) => ({ name: riskById(riskId)?.code ?? riskId, full: riskById(riskId)?.name ?? '', value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

/** Visitas próximas (publicadas, con cupo o no), ordenadas. */
export function upcomingSlots(d: FlpData, days = 60) {
  const t = todayISO();
  const limit = toISODate(new Date(today().getTime() + days * 86400000));
  return d.slots.filter((s) => s.status === 'publicado' && s.date >= t && s.date <= limit);
}

/** Reservas del usuario que esperan registro de verificación (más recientes primero). */
export function awaitingForUser(d: FlpData, userId: string) {
  return userBookings(d, userId)
    .filter((b) => b.awaitingVerification)
    .reverse();
}

export function userBookings(d: FlpData, userId: string) {
  return d.bookings
    .filter((b) => b.userId === userId)
    .map((b) => bookingView(d, b))
    .sort((a, b) => (a.slot.date + a.slot.start).localeCompare(b.slot.date + b.slot.start));
}

export function alerts(d: FlpData, f: Filters = {}) {
  const t = todayISO();
  const list: Array<{ id: string; tone: 'danger' | 'warning' | 'info'; title: string; detail: string }> = [];
  d.bookings
    .filter((b) => b.status === 'confirmada')
    .map((b) => bookingView(d, b))
    .filter((b) => b.awaitingVerification && b.slot.date < t && areaOk(d, b.slot.projectId, f.area))
    .slice(0, 4)
    .forEach((b) => list.push({ id: b.id, tone: 'warning', title: 'Visita sin marcar', detail: `${b.userName} · ${b.slot.project.name}` }));
  const pend = d.bookings.filter((b) => b.status === 'pendiente' && areaOk(d, findSlot(d, b.slotId)!.projectId, f.area)).length;
  if (pend) list.push({ id: 'pend', tone: 'info', title: `${pend} solicitudes por confirmar`, detail: 'Revisar en Solicitudes de reserva' });
  return list;
}
