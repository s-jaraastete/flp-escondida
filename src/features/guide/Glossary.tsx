import { BookOpen, ChevronDown } from 'lucide-react';
import { cx } from '@/utils/misc';

/** Siglas que aparecen en la app, explicadas en palabras simples. */
export const GLOSSARY: Array<{ term: string; meaning: string }> = [
  { term: 'FLP', meaning: 'Field Leadership Program: programa de liderazgo en terreno de BHP.' },
  { term: 'OVCC', meaning: 'Observación y verificación de controles críticos (en FLP se registra como CCO).' },
  { term: 'CTP', meaning: 'Confirmación de tarea planificada: revisar que el trabajo se hace según su procedimiento (en FLP: PTC).' },
  { term: 'RM', meaning: 'Riesgo material: lo que puede causar una fatalidad (ej. caída de altura, energía eléctrica).' },
  { term: 'CC', meaning: 'Control crítico: la barrera que evita que ese riesgo material ocurra.' },
  { term: 'EPP', meaning: 'Equipo de protección personal.' },
  { term: 'CO / ITO', meaning: 'Contract Owner (dueño del contrato) / Inspector técnico de obra.' },
];

/** Bloque plegable "¿Qué significan las siglas?". */
export function Glossary({ className, open }: { className?: string; open?: boolean }) {
  return (
    <details className={cx('group card overflow-hidden', className)} open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-bold text-ink [&::-webkit-details-marker]:hidden">
        <BookOpen className="size-5 text-brand" aria-hidden />
        <span className="flex-1">¿Qué significan las siglas?</span>
        <ChevronDown className="size-5 text-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="grid gap-2 border-t border-line p-4 pt-3">
        {GLOSSARY.map((g) => (
          <div key={g.term} className="grid grid-cols-[4.5rem_1fr] gap-3 text-sm">
            <dt className="font-extrabold text-brand-700">{g.term}</dt>
            <dd className="text-graphite">{g.meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
