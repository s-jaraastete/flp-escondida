import type {
  ActivityType,
  Company,
  CriticalControl,
  MaterialRisk,
  RequirementKey,
  VerificationQuestion,
} from '@/types';

/** Requisitos previos a una visita en terreno. */
export const REQUIREMENTS: Record<RequirementKey, { label: string; description: string }> = {
  epp_especial: {
    label: 'EPP especial',
    description: 'Equipo de protección adicional al básico (p. ej. respirador con prueba de ajuste, protección auditiva doble).',
  },
  candado: {
    label: 'Candado de bloqueo',
    description: 'Candado personal y tarjeta de bloqueo para aislamiento de energías.',
  },
  curso: {
    label: 'Curso o capacitación',
    description: 'Inducción del área / curso de riesgo específico vigente.',
  },
  chip: {
    label: 'Chip de acceso',
    description: 'Chip o tarjeta de acceso habilitado para el área.',
  },
  identificacion: {
    label: 'Identificación',
    description: 'Credencial vigente y cédula de identidad.',
  },
  autorizacion_area: {
    label: 'Autorización del área',
    description: 'Autorización de ingreso emitida por el dueño del área.',
  },
  confirmacion_co: {
    label: 'Confirmación CO / ITO / Jefe de terreno',
    description: 'Coordinación previa confirmada con Contract Owner, ITO o jefe de terreno.',
  },
};

export const REQUIREMENT_KEYS = Object.keys(REQUIREMENTS) as RequirementKey[];

export const ACTIVITY_TYPES: Record<ActivityType, { label: string; description: string }> = {
  OVCC: {
    label: 'OVCC',
    description: 'Observación y verificación de controles críticos asociados a un Riesgo Material.',
  },
  CTP: {
    label: 'CTP',
    description: 'Actividad de liderazgo en terreno CTP con el equipo del proyecto y la empresa contratista.',
  },
};

export const AREAS = ['Mina', 'Coloso'] as const;

export const COMPANIES: Company[] = [
  { id: 'c1', name: 'Constructora Altiplano SpA', specialty: 'Obras civiles' },
  { id: 'c2', name: 'Montajes Pacífico Norte Ltda.', specialty: 'Montaje electromecánico' },
  { id: 'c3', name: 'Servicios Mineros Atacama S.A.', specialty: 'Equipos mina' },
  { id: 'c4', name: 'Ingeniería Salar Ltda.', specialty: 'Ingeniería y proyectos' },
  { id: 'c5', name: 'Transportes Cordillera SpA', specialty: 'Transporte de personal y carga' },
  { id: 'c6', name: 'Eléctrica Desierto SpA', specialty: 'Sistemas eléctricos' },
  { id: 'c7', name: 'Mantenciones Andinas S.A.', specialty: 'Mantenimiento industrial' },
  { id: 'c8', name: 'Perforaciones del Norte Ltda.', specialty: 'Perforación y drenaje' },
];

export const RISKS: MaterialRisk[] = [
  { id: 'rm1', code: 'RM-01', name: 'Contacto con energía eléctrica / Arco eléctrico' },
  { id: 'rm2', code: 'RM-02', name: 'Choque, colisión o volcamiento en mina, pila, botadero o stock' },
  { id: 'rm3', code: 'RM-03', name: 'Caída de objetos desde altura' },
  { id: 'rm4', code: 'RM-04', name: 'Accidente en maniobras de izaje' },
  { id: 'rm5', code: 'RM-05', name: 'Liberación descontrolada de energía' },
  { id: 'rm6', code: 'RM-06', name: 'Accidente en ruta' },
  { id: 'rm7', code: 'RM-07', name: 'Incendio en equipos e instalaciones' },
  { id: 'rm8', code: 'RM-08', name: 'Exposición a sílice cristalina y MP10' },
  { id: 'rm9', code: 'RM-09', name: 'Caída de personas desde altura' },
];

export const CONTROLS: CriticalControl[] = [
  { id: 'cc11', riskId: 'rm1', code: 'CC-01.1', name: 'Protecciones eléctricas y conexiones de puesta a tierra' },
  { id: 'cc12', riskId: 'rm1', code: 'CC-01.2', name: 'Aislamiento, bloqueo y verificación de energía cero' },
  { id: 'cc21', riskId: 'rm2', code: 'CC-02.1', name: 'Segregación / delimitación entre vehículos y peatones' },
  { id: 'cc22', riskId: 'rm2', code: 'CC-02.2', name: 'Comunicación efectiva entre equipos' },
  { id: 'cc23', riskId: 'rm2', code: 'CC-02.3', name: 'Diseño y mantención de bermas y pretiles' },
  { id: 'cc31', riskId: 'rm3', code: 'CC-03.1', name: 'Elementos de contención para caída de objetos' },
  { id: 'cc32', riskId: 'rm3', code: 'CC-03.2', name: 'Segregación de áreas bajo trabajos en altura' },
  { id: 'cc41', riskId: 'rm4', code: 'CC-04.1', name: 'Segregación / delimitación de las áreas de izaje' },
  { id: 'cc42', riskId: 'rm4', code: 'CC-04.2', name: 'Plan de izaje y certificación de elementos' },
  { id: 'cc51', riskId: 'rm5', code: 'CC-05.1', name: 'Aislamiento de energías neumática, hidráulica y mecánica' },
  { id: 'cc52', riskId: 'rm5', code: 'CC-05.2', name: 'Verificación de energía residual' },
  { id: 'cc61', riskId: 'rm6', code: 'CC-06.1', name: 'Sistema de monitoreo del comportamiento del conductor' },
  { id: 'cc62', riskId: 'rm6', code: 'CC-06.2', name: 'Certificación, mantención y calibración de vehículos' },
  { id: 'cc71', riskId: 'rm7', code: 'CC-07.1', name: 'Sistemas operativos contra incendio' },
  { id: 'cc81', riskId: 'rm8', code: 'CC-08.1', name: 'Protección respiratoria y pruebas de ajuste' },
  { id: 'cc91', riskId: 'rm9', code: 'CC-09.1', name: 'Sistema de protección contra caídas' },
];

/** Preguntas de verificación RM / CC (lista genérica de verificación en terreno). */
export const VERIFICATION_QUESTIONS: VerificationQuestion[] = [
  {
    id: 'q1',
    text: '¿Existe un procedimiento específico de trabajo que considere el Riesgo Material designado y sus controles críticos?',
    hint: 'Solicitar el procedimiento vigente y verificar que el RM y los CC estén explícitos.',
  },
  {
    id: 'q2',
    text: '¿Existe evidencia de entrenamiento del personal sobre los Riesgos Materiales y los Controles Críticos asociados?',
    hint: 'Revisar registros de capacitación de la cuadrilla en terreno.',
  },
  {
    id: 'q3',
    text: '¿Se cuenta con un programa FLP mensual que considere el RM y CC designados?',
    hint: 'Verificar el programa de liderazgo en terreno de la empresa contratista.',
  },
  {
    id: 'q4',
    text: '¿Se realizó el análisis previo (CIS) y la evaluación de riesgos de la actividad específica en ejecución?',
    hint: 'Contrastar el análisis con las condiciones reales observadas.',
  },
  {
    id: 'q5',
    text: '¿Existe una instrucción de seguridad asociada al Riesgo Material a verificar?',
    hint: 'Confirmar difusión y firma de la instrucción por el equipo.',
  },
  {
    id: 'q6',
    text: '¿Los trabajadores conocen el Riesgo Material y los controles críticos que deben implementar?',
    hint: 'Conversar con al menos dos trabajadores de la cuadrilla.',
  },
  {
    id: 'q7',
    text: '¿Los controles críticos están implementados en terreno?',
    hint: 'Verificar en terreno la implementación de los controles derivados del inventario y procedimiento.',
  },
];

/** Responsables ficticios para planes de acción. */
export const ACTION_OWNERS = [
  'Supervisor HSE — Empresa contratista',
  'Jefe de terreno — Empresa contratista',
  'ITO del contrato',
  'Contract Owner del contrato',
  'Administrador de contrato EECC',
  'Coordinador de proyectos',
];

export function riskById(id: string) {
  return RISKS.find((r) => r.id === id);
}
export function controlById(id: string) {
  return CONTROLS.find((c) => c.id === id);
}
export function controlsForRisk(riskId: string) {
  return CONTROLS.filter((c) => c.riskId === riskId);
}
export function companyById(id: string) {
  return COMPANIES.find((c) => c.id === id);
}
