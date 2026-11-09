import { addDays, isWeekend } from 'date-fns';
import type {
  ActionPlan,
  Answer,
  Booking,
  BookingStatus,
  FlpData,
  Project,
  RequirementKey,
  Slot,
  SpotFlp,
  User,
  Verification,
  VerificationAnswer,
} from '@/types';
import { ACTION_OWNERS, CONTROLS, VERIFICATION_QUESTIONS, controlsForRisk, riskById } from './catalogs';
import { addDaysISO, timesOverlap, toISODate, today } from '@/utils/date';
import { seededRandom } from '@/utils/misc';

export const DATA_VERSION = 8;

/** Identificadores fijos de las cuentas demo (una por perfil). */
export const DEMO_USER_IDS = {
  admin: 'u-admin',
  planner: 'u-planner',
  user: 'u-user',
} as const;

const USERS: User[] = [
  { id: 'u-admin', name: 'Camila Herrera', email: 'admin.demo@flp-escondida.demo', role: 'admin', position: 'Administradora FLP (demo)', area: 'Ambas', isFlpLeader: true, active: true },
  { id: 'u-planner', name: 'Rodrigo Valdés', email: 'planificador.demo@flp-escondida.demo', role: 'planner', position: 'Planificador FLP (demo)', area: 'Ambas', isFlpLeader: false, active: true },
  { id: 'u-user', name: 'Valentina Soto', email: 'usuario.demo@flp-escondida.demo', role: 'user', position: 'Ingeniera de Confiabilidad (demo)', area: 'Mina', isFlpLeader: true, active: true },
  { id: 'u-p2', name: 'Paula Ortiz', email: 'p.ortiz@flp-escondida.demo', role: 'planner', position: 'Planificadora Coloso (demo)', area: 'Coloso', isFlpLeader: false, active: true },
  { id: 'u-4', name: 'Felipe Morales', email: 'f.morales@flp-escondida.demo', role: 'user', position: 'Superintendente Mantención (demo)', area: 'Mina', isFlpLeader: true, active: true },
  { id: 'u-5', name: 'Daniela Contreras', email: 'd.contreras@flp-escondida.demo', role: 'user', position: 'Jefa de Operaciones Puerto (demo)', area: 'Coloso', isFlpLeader: true, active: true },
  { id: 'u-6', name: 'Ignacio Pizarro', email: 'i.pizarro@flp-escondida.demo', role: 'user', position: 'Ingeniero de Proyectos (demo)', area: 'Mina', isFlpLeader: true, active: true },
  { id: 'u-7', name: 'Francisca Muñoz', email: 'f.munoz@flp-escondida.demo', role: 'user', position: 'Especialista HSE (demo)', area: 'Ambas', isFlpLeader: true, active: true },
  { id: 'u-8', name: 'Tomás Araya', email: 't.araya@flp-escondida.demo', role: 'user', position: 'Supervisor Mina (demo)', area: 'Mina', isFlpLeader: false, active: true },
  { id: 'u-9', name: 'Javiera Reyes', email: 'j.reyes@flp-escondida.demo', role: 'user', position: 'Ingeniera de Procesos (demo)', area: 'Coloso', isFlpLeader: false, active: true },
  { id: 'u-10', name: 'Sebastián Castro', email: 's.castro@flp-escondida.demo', role: 'user', position: 'Gerente de Área (demo)', area: 'Ambas', isFlpLeader: true, active: true },
  { id: 'u-11', name: 'Constanza Vera', email: 'c.vera@flp-escondida.demo', role: 'user', position: 'Analista de Contratos (demo)', area: 'Coloso', isFlpLeader: false, active: true },
  { id: 'u-12', name: 'Martín Olivares', email: 'm.olivares@flp-escondida.demo', role: 'user', position: 'Ingeniero Eléctrico (demo)', area: 'Mina', isFlpLeader: false, active: false },
];

const BASE_REQ: RequirementKey[] = ['identificacion', 'confirmacion_co'];

const PROJECTS: Project[] = [
  { id: 'p1', code: 'PRY-M01', name: 'Ampliación Botadero Norte', area: 'Mina', sector: 'Rajo Escondida', companyId: 'c3', contractOwner: 'Andrés Lagos', ito: 'Marcela Rivas', siteManager: 'Héctor Salinas', visitContact: 'Supervisor de turno A', description: 'Movimiento de tierras y construcción de pretiles para ampliación del botadero norte.', riskIds: ['rm2', 'rm6'], defaultRequirements: [...BASE_REQ, 'chip', 'curso'], status: 'vigente' },
  { id: 'p2', code: 'PRY-M02', name: 'Cambio Correa Overland CV-01', area: 'Mina', sector: 'Chancado / Correas', companyId: 'c2', contractOwner: 'Patricia Núñez', ito: 'Jorge Villalobos', siteManager: 'Luis Espinoza', visitContact: 'Jefe de turno montaje', description: 'Reemplazo de correa transportadora overland con detención programada.', riskIds: ['rm5', 'rm4', 'rm1'], defaultRequirements: [...BASE_REQ, 'candado', 'epp_especial'], status: 'vigente' },
  { id: 'p3', code: 'PRY-M03', name: 'Mantención Mayor Pala Eléctrica 23', area: 'Mina', sector: 'Taller Palas', companyId: 'c7', contractOwner: 'Ricardo Fuentes', ito: 'Carla Méndez', siteManager: 'Pablo Saldías', visitContact: 'Supervisor mantención mecánica', description: 'Overhaul de sistemas de levante y empuje de pala eléctrica.', riskIds: ['rm1', 'rm5', 'rm9'], defaultRequirements: [...BASE_REQ, 'candado', 'curso'], status: 'vigente' },
  { id: 'p4', code: 'PRY-M04', name: 'Subestación Eléctrica 220 kV Fase 2', area: 'Mina', sector: 'Sistemas Eléctricos', companyId: 'c6', contractOwner: 'Andrés Lagos', ito: 'Felipe Ahumada', siteManager: 'Raúl Cortés', visitContact: 'Jefe de terreno eléctrico', description: 'Montaje de transformadores y equipos de patio en subestación.', riskIds: ['rm1', 'rm4'], defaultRequirements: [...BASE_REQ, 'candado', 'autorizacion_area', 'epp_especial'], status: 'vigente' },
  { id: 'p5', code: 'PRY-M05', name: 'Pozos de Drenaje Rajo Sur', area: 'Mina', sector: 'Rajo Escondida Sur', companyId: 'c8', contractOwner: 'Mónica Saavedra', ito: 'Diego Paredes', siteManager: 'Claudio Rojas', visitContact: 'Supervisor perforación', description: 'Perforación y habilitación de pozos de drenaje en fase sur.', riskIds: ['rm2', 'rm5', 'rm8'], defaultRequirements: [...BASE_REQ, 'epp_especial', 'chip'], status: 'vigente' },
  { id: 'p6', code: 'PRY-M06', name: 'Mejoras Taller Camiones CAEX', area: 'Mina', sector: 'Taller Camiones', companyId: 'c1', contractOwner: 'Ricardo Fuentes', ito: 'Carla Méndez', siteManager: 'Nicolás Tapia', visitContact: 'Jefe de obra civil', description: 'Ampliación de bahías y estructuras metálicas en taller de camiones.', riskIds: ['rm3', 'rm9', 'rm4'], defaultRequirements: [...BASE_REQ, 'curso'], status: 'vigente' },
  { id: 'p7', code: 'PRY-M07', name: 'Relocalización Línea de Agua Fase 4', area: 'Mina', sector: 'Infraestructura', companyId: 'c4', contractOwner: 'Mónica Saavedra', ito: 'Jorge Villalobos', siteManager: 'Esteban Lara', visitContact: 'Supervisor de piping', description: 'Traslado de matriz de agua de proceso por avance de fase 4.', riskIds: ['rm2', 'rm4'], defaultRequirements: [...BASE_REQ, 'chip'], status: 'vigente' },
  { id: 'p8', code: 'PRY-M08', name: 'Transporte de Personal Turnos 7x7', area: 'Mina', sector: 'Caminos y accesos', companyId: 'c5', contractOwner: 'Patricia Núñez', ito: 'Diego Paredes', siteManager: 'Gonzalo Peña', visitContact: 'Supervisor de flota', description: 'Servicio de transporte de personal entre campamento y faena.', riskIds: ['rm6'], defaultRequirements: [...BASE_REQ], status: 'vigente' },
  { id: 'p9', code: 'PRY-C01', name: 'Mantención Filtros de Concentrado', area: 'Coloso', sector: 'Planta de Filtros', companyId: 'c7', contractOwner: 'Verónica Alfaro', ito: 'Manuel Orellana', siteManager: 'Rodrigo Ibáñez', visitContact: 'Supervisor planta filtros', description: 'Mantención de filtros prensa y sistemas hidráulicos.', riskIds: ['rm5', 'rm1'], defaultRequirements: [...BASE_REQ, 'candado', 'autorizacion_area'], status: 'vigente' },
  { id: 'p10', code: 'PRY-C02', name: 'Reemplazo Tramo Concentraducto', area: 'Coloso', sector: 'Concentraducto', companyId: 'c2', contractOwner: 'Verónica Alfaro', ito: 'Alejandra Soto', siteManager: 'Mauricio León', visitContact: 'Jefe de terreno piping', description: 'Reemplazo de tramo de cañería y soportes en trazado del concentraducto.', riskIds: ['rm4', 'rm2', 'rm9'], defaultRequirements: [...BASE_REQ, 'curso', 'epp_especial'], status: 'vigente' },
  { id: 'p11', code: 'PRY-C03', name: 'Bombeo Planta Desalinizadora', area: 'Coloso', sector: 'Planta Desalinizadora', companyId: 'c6', contractOwner: 'Fernando Ruiz', ito: 'Manuel Orellana', siteManager: 'Iván Morales', visitContact: 'Supervisor eléctrico', description: 'Cambio de motores y variadores en estación de bombeo.', riskIds: ['rm1', 'rm5', 'rm7'], defaultRequirements: [...BASE_REQ, 'candado', 'autorizacion_area'], status: 'vigente' },
  { id: 'p12', code: 'PRY-C04', name: 'Mantención Shiploader Muelle', area: 'Coloso', sector: 'Muelle', companyId: 'c3', contractOwner: 'Fernando Ruiz', ito: 'Alejandra Soto', siteManager: 'Cristóbal Díaz', visitContact: 'Supervisor portuario', description: 'Mantención estructural y mecánica del cargador de barcos.', riskIds: ['rm3', 'rm9', 'rm4'], defaultRequirements: [...BASE_REQ, 'epp_especial', 'curso', 'autorizacion_area'], status: 'vigente' },
  { id: 'p13', code: 'PRY-C05', name: 'Galpón Acopio de Concentrado', area: 'Coloso', sector: 'Acopio', companyId: 'c1', contractOwner: 'Verónica Alfaro', ito: 'Manuel Orellana', siteManager: 'Andrea Fuentes', visitContact: 'Jefa de obra', description: 'Refuerzo estructural y control de polvo en galpón de acopio.', riskIds: ['rm8', 'rm3', 'rm7'], defaultRequirements: [...BASE_REQ, 'epp_especial'], status: 'vigente' },
  { id: 'p14', code: 'PRY-C06', name: 'Línea de Transmisión Coloso', area: 'Coloso', sector: 'Líneas eléctricas', companyId: 'c6', contractOwner: 'Fernando Ruiz', ito: 'Alejandra Soto', siteManager: 'Sergio Navarro', visitContact: 'Jefe de cuadrilla', description: 'Cambio de aisladores y mantención de estructuras de transmisión.', riskIds: ['rm1', 'rm9'], defaultRequirements: [...BASE_REQ, 'candado', 'curso', 'epp_especial'], status: 'suspendido' },
];

const TIME_BLOCKS: Array<[string, string]> = [
  ['08:30', '10:30'],
  ['09:00', '11:00'],
  ['10:30', '12:30'],
  ['14:00', '16:00'],
  ['15:00', '17:00'],
];

const ACTION_TEMPLATES: Record<string, string> = {
  q1: 'Actualizar el procedimiento de trabajo incorporando el RM y sus controles críticos, y difundirlo a la cuadrilla.',
  q2: 'Ejecutar capacitación del RM y CC al personal y adjuntar registros de asistencia.',
  q3: 'Incorporar el RM/CC designado en el programa FLP mensual de la empresa contratista.',
  q4: 'Reinstruir la elaboración del análisis previo (CIS) y evaluación de riesgos antes del inicio de la tarea.',
  q5: 'Emitir y difundir instrucción de seguridad asociada al RM, con registro de firmas.',
  q6: 'Realizar charla de reforzamiento del RM y controles críticos con la cuadrilla.',
  q7: 'Implementar en terreno el control crítico faltante y evidenciarlo con registro fotográfico.',
};

export function activityTitle(type: Slot['activityType'], controlId: string) {
  const cc = CONTROLS.find((c) => c.id === controlId);
  return `${type} · ${cc?.name ?? 'Control crítico'}`;
}

export function computeCompliance(answers: VerificationAnswer[]) {
  const yes = answers.filter((a) => a.response === 'SI').length;
  const no = answers.filter((a) => a.response === 'NO').length;
  return yes + no === 0 ? 100 : Math.round((yes / (yes + no)) * 100);
}

export function buildSeed(): FlpData {
  const rnd = seededRandom(20261014);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const t0 = today();
  const nowStamp = new Date().toISOString();
  const leaders = USERS.filter((u) => u.isFlpLeader && u.active);
  const participants = USERS.filter((u) => u.role === 'user' && u.active);
  const activeProjects = PROJECTS.filter((p) => p.status === 'vigente');

  const slots: Slot[] = [];
  const bookings: Booking[] = [];
  const verifications: Verification[] = [];
  const actions: ActionPlan[] = [];
  let sc = 0;
  let bc = 0;
  let vc = 0;
  let ac = 0;

  const makeSlot = (date: string, project: Project, block: [string, string], over: Partial<Slot> = {}): Slot => {
    const riskId = pick(project.riskIds);
    const controlId = pick(controlsForRisk(riskId)).id;
    const activityType = rnd() < 0.65 ? 'OVCC' : 'CTP';
    const extra: RequirementKey[] = rnd() < 0.3 ? ['epp_especial'] : [];
    const slot: Slot = {
      id: `s${++sc}`,
      projectId: project.id,
      date,
      start: block[0],
      end: block[1],
      activityType,
      title: activityTitle(activityType, controlId),
      capacity: 3 + Math.floor(rnd() * 4),
      riskId,
      controlId,
      leaderId: pick(leaders).id,
      group: `Grupo ${1 + Math.floor(rnd() * 8)}`,
      requirements: Array.from(new Set([...project.defaultRequirements, ...extra])),
      notes: activityType === 'OVCC' ? `Foco: ${riskById(riskId)?.name}.` : 'Recorrido de liderazgo con el equipo del proyecto.',
      status: 'publicado',
      createdBy: rnd() < 0.6 ? 'u-planner' : 'u-p2',
      createdAt: nowStamp,
      ...over,
    };
    slots.push(slot);
    return slot;
  };

  const slotById = (id: string) => slots.find((s) => s.id === id)!;

  /** Verifica que el usuario no tenga otra reserva activa superpuesta (mismo día y horario). */
  const userIsFree = (userId: string, slot: Slot) =>
    !bookings.some((b) => {
      if (b.userId !== userId || !['pendiente', 'confirmada', 'completada'].includes(b.status)) return false;
      const s = slotById(b.slotId);
      return s.id === slot.id || (s.date === slot.date && timesOverlap(s.start, s.end, slot.start, slot.end));
    });

  const makeBooking = (slot: Slot, userId: string, status: BookingStatus): Booking => {
    const created = addDaysISO(slot.date, -(3 + Math.floor(rnd() * 10)));
    const history: Booking['history'] = [{ at: `${created}T09:00:00`, status: 'creada', by: userId }];
    if (status !== 'pendiente') {
      history.push({
        at: `${addDaysISO(created, 1)}T10:00:00`,
        status: status === 'completada' ? 'confirmada' : status,
        by: status === 'cancelada' ? userId : slot.createdBy,
        note: status === 'rechazada' ? 'Cupo reservado para equipo del área.' : undefined,
      });
    }
    if (status === 'completada') history.push({ at: `${slot.date}T${slot.end}:00`, status: 'completada', by: userId });
    const b: Booking = {
      id: `b${++bc}`,
      slotId: slot.id,
      userId,
      status,
      requirementsAck: true,
      checklist: status === 'completada' ? [...slot.requirements] : slot.requirements.filter(() => rnd() < 0.5),
      note: '',
      createdAt: `${created}T09:00:00`,
      updatedAt: `${created}T10:00:00`,
      history,
    };
    bookings.push(b);
    return b;
  };

  const makeVerification = (booking: Booking) => {
    const slot = slotById(booking.slotId);
    const answers: VerificationAnswer[] = VERIFICATION_QUESTIONS.map((q) => {
      const r = rnd();
      const response: Answer = r < 0.78 ? 'SI' : r < 0.93 ? 'NO' : 'NA';
      return {
        questionId: q.id,
        response,
        comment: response === 'NO' ? 'Se observa brecha respecto del estándar; se acuerda acción con el equipo.' : response === 'SI' ? 'Evidencia revisada en terreno.' : 'No aplica a la tarea observada.',
        evidence: response !== 'NA' && rnd() < 0.4 ? [`evidencia_${q.id}.jpg`] : [],
        actionRequired: response === 'NO',
      };
    });
    const v: Verification = {
      id: `v${++vc}`,
      bookingId: booking.id,
      slotId: slot.id,
      projectId: slot.projectId,
      userId: booking.userId,
      activityName: slot.title,
      verificationType: slot.activityType,
      riskId: slot.riskId,
      controlId: slot.controlId,
      contractorObserved: rnd() < 0.85,
      answers,
      compliance: computeCompliance(answers),
      completedAt: `${slot.date}T${slot.end}:00`,
    };
    verifications.push(v);
    answers
      .filter((a) => a.actionRequired)
      .forEach((a) => {
        const q = VERIFICATION_QUESTIONS.find((x) => x.id === a.questionId)!;
        const due = addDaysISO(slot.date, 10 + Math.floor(rnd() * 25));
        const overdue = due < toISODate(t0);
        const age = Math.round((t0.getTime() - new Date(due).getTime()) / 86400000);
        const closed = overdue ? rnd() < (age > 30 ? 0.92 : 0.65) : rnd() < 0.2;
        actions.push({
          id: `a${++ac}`,
          verificationId: v.id,
          projectId: slot.projectId,
          questionId: q.id,
          finding: q.text,
          description: ACTION_TEMPLATES[q.id],
          responsible: pick(ACTION_OWNERS),
          dueDate: due,
          status: closed ? 'cerrada' : rnd() < 0.5 ? 'en_progreso' : 'abierta',
          completedOnSpot: false,
          createdBy: booking.userId,
          createdAt: v.completedAt,
          closedAt: closed ? `${addDaysISO(due, -2)}T12:00:00` : null,
        });
      });
  };

  // ---------- Pasado: últimos ~5 meses (historial para tendencias) ----------
  for (let d = -150; d <= -1; d++) {
    const date = addDays(t0, d);
    if (isWeekend(date)) continue;
    const iso = toISODate(date);
    const perDay = d < -63 ? (rnd() < 0.6 ? 1 : 0) : rnd() < 0.5 ? 1 : 2;
    const usedProjects = new Set<string>();
    for (let k = 0; k < perDay; k++) {
      let project = pick(activeProjects);
      while (usedProjects.has(project.id)) project = pick(activeProjects);
      usedProjects.add(project.id);
      const slot = makeSlot(iso, project, pick(TIME_BLOCKS));
      const n = 1 + Math.floor(rnd() * Math.min(slot.capacity, 4));
      const pool = [...participants].sort(() => rnd() - 0.5);
      if (rnd() < 0.35) pool.unshift(USERS.find((u) => u.id === 'u-user')!);
      let placed = 0;
      for (const u of pool) {
        if (placed >= n) break;
        if (!userIsFree(u.id, slot)) continue;
        const r = rnd();
        // 'confirmada' sin realizar = planificado sin asistencia (~7%), más los pendientes de las últimas 2 semanas.
        const status: BookingStatus = r < 0.73 ? 'completada' : r < 0.8 ? 'confirmada' : r < 0.9 ? 'cancelada' : r < 0.95 ? 'rechazada' : d > -14 ? 'confirmada' : 'completada';
        const b = makeBooking(slot, u.id, status);
        if (status === 'completada') makeVerification(b);
        placed++;
      }
    }
  }

  // ---------- Futuro: próximas 6 semanas ----------
  for (let d = 0; d <= 42; d++) {
    const date = addDays(t0, d);
    if (isWeekend(date)) continue;
    const iso = toISODate(date);
    const perDay = 2 + (rnd() < 0.4 ? 1 : 0);
    const usedBlocks = new Set<number>();
    for (let k = 0; k < perDay; k++) {
      const project = pick(activeProjects);
      let bi = Math.floor(rnd() * TIME_BLOCKS.length);
      while (usedBlocks.has(bi)) bi = (bi + 1) % TIME_BLOCKS.length;
      usedBlocks.add(bi);
      const slot = makeSlot(iso, project, TIME_BLOCKS[bi]);
      // Los slots más lejanos tienen menos reservas.
      const fill = d < 10 ? 0.7 : d < 21 ? 0.45 : 0.2;
      const n = Math.min(slot.capacity, Math.floor(rnd() * slot.capacity * fill * 1.6));
      const pool = participants.filter((u) => u.id !== 'u-user').sort(() => rnd() - 0.5);
      let placed = 0;
      for (const u of pool) {
        if (placed >= n) break;
        if (!userIsFree(u.id, slot)) continue;
        const r = rnd();
        makeBooking(slot, u.id, r < 0.6 ? 'confirmada' : r < 0.9 ? 'pendiente' : 'cancelada');
        placed++;
      }
    }
  }

  // ---------- Escenarios garantizados para el usuario demo ----------
  const iso0 = toISODate(t0);
  const p1 = PROJECTS[0];
  const p9 = PROJECTS[8];
  const p2 = PROJECTS[1];
  // 1) Visita de hoy, confirmada y lista para registrar verificación.
  const sToday = makeSlot(iso0, p1, ['07:30', '08:30'], { riskId: 'rm2', controlId: 'cc21', activityType: 'OVCC', title: activityTitle('OVCC', 'cc21'), capacity: 4, leaderId: 'u-user', group: 'Grupo 1' });
  makeBooking(sToday, 'u-user', 'confirmada');
  makeBooking(sToday, 'u-8', 'confirmada');
  // 1b) Visita de ayer confirmada sin verificación (demo disponible a cualquier hora).
  const sYesterday = makeSlot(addDaysISO(iso0, -1), PROJECTS[3], ['17:30', '18:30'], { riskId: 'rm1', controlId: 'cc11', activityType: 'OVCC', title: activityTitle('OVCC', 'cc11'), capacity: 4 });
  makeBooking(sYesterday, 'u-user', 'confirmada');
  // 2) Próximas visitas confirmadas y pendientes.
  const s2 = makeSlot(addDaysISO(iso0, 2), p9, ['17:30', '19:00'], { riskId: 'rm5', controlId: 'cc51', activityType: 'OVCC', title: activityTitle('OVCC', 'cc51'), capacity: 5 });
  makeBooking(s2, 'u-user', 'confirmada');
  const s3 = makeSlot(addDaysISO(iso0, 5), p2, ['12:45', '13:45'], { riskId: 'rm4', controlId: 'cc41', activityType: 'CTP', title: activityTitle('CTP', 'cc41'), capacity: 3 });
  makeBooking(s3, 'u-user', 'pendiente');
  // 3) Un horario completo (para demostrar el control de sobrecupo).
  const sFull = makeSlot(addDaysISO(iso0, 3), PROJECTS[3], ['13:00', '14:00'], { capacity: 2 });
  makeBooking(sFull, 'u-4', 'confirmada');
  makeBooking(sFull, 'u-6', 'confirmada');

  // Las reservas futuras "confirmadas" del pasado sin verificación quedan como "pendientes de verificación" (alertas).

  slots.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  // FLP spot: actividades realizadas sin reserva (últimos ~5 meses, en días hábiles).
  const spots: SpotFlp[] = [];
  for (let back = 150; back >= 1; back--) {
    const day = addDays(t0, -back);
    if (isWeekend(day) || rnd() > 0.22) continue;
    const date = toISODate(day);
    spots.push({
      id: `sp-${spots.length + 1}`,
      userId: pick(participants).id,
      projectId: pick(activeProjects).id,
      activityType: rnd() < 0.7 ? 'OVCC' : 'CTP',
      date,
      note: '',
      createdAt: `${date}T15:00:00.000Z`,
    });
  }
  spots.push({ id: `sp-${spots.length + 1}`, userId: 'u-user', projectId: PROJECTS[2].id, activityType: 'OVCC', date: addDaysISO(iso0, -6), note: 'Pasé por el área y aproveché de observar los controles.', createdAt: `${addDaysISO(iso0, -6)}T15:00:00.000Z` });

  return {
    version: DATA_VERSION,
    seededAt: nowStamp,
    projects: PROJECTS.map((p) => ({ ...p })),
    users: USERS.map((u) => ({ ...u })),
    slots,
    bookings,
    verifications,
    actions,
    spots,
  };
}
