import { useState } from 'react';
import { CheckCircle2, ClipboardCopy, Link2, Send } from 'lucide-react';
import type { Verification } from '@/types';
import { ACTIVITY_TYPES, VERIFICATION_QUESTIONS, controlById, riskById } from '@/data/catalogs';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { setFlpActivityId } from '@/services/flpService';
import { Button } from '@/components/ui/primitives';
import { cx } from '@/utils/misc';

/** Texto listo para pegar en FLP mientras no exista integración directa. */
export function flpSummary(v: Verification, projectName: string): string {
  const t = ACTIVITY_TYPES[v.verificationType];
  const risk = riskById(v.riskId);
  const control = controlById(v.controlId);
  const lines = [
    `Actividad ${t.flp} (${t.label}) — ${v.activityName}`,
    `Fecha: ${v.completedAt.slice(0, 10)} · Proyecto: ${projectName}`,
    `Riesgo material: ${risk ? `${risk.code} ${risk.name}` : '—'}`,
    `Control crítico: ${control ? `${control.code} ${control.name}` : '—'}`,
    `Cumplimiento: ${v.compliance}% · Realizada por contratista: ${v.contractorObserved ? 'Sí' : 'No'}`,
    '',
    'Hallazgos:',
    ...v.answers
      .filter((a) => a.response === 'NO')
      .map((a) => `- ${VERIFICATION_QUESTIONS.find((q) => q.id === a.questionId)?.text ?? ''} → ${a.comment}`),
  ];
  if (!v.answers.some((a) => a.response === 'NO')) lines.push('- Sin hallazgos');
  const p = v.postVisit;
  if (p?.immediateActions) lines.push('', `Acciones inmediatas: ${p.immediateActions}`);
  if (p?.followUp) lines.push(`Seguimiento: ${p.followUp}`);
  if (p && p.eventProposal !== 'ninguno') lines.push(`Propuesta de evento: ${p.eventProposal}${p.eventId ? ` (${p.eventId})` : ''}`);
  return lines.join('\n');
}

/** Estado del registro en FLP de una verificación: vinculada (con ID) o pendiente, con copia del resumen. */
export function FlpRegistryCard({ verification, projectName, className }: { verification: Verification; projectName: string; className?: string }) {
  const { data, commit } = useData();
  const toast = useToast();
  const v = data.verifications.find((x) => x.id === verification.id) ?? verification;
  const t = ACTIVITY_TYPES[v.verificationType];
  const linked = v.postVisit?.flpActivityId;
  const [draft, setDraft] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(flpSummary(v, projectName));
      toast.success('Resumen copiado. Pégalo al crear la actividad en FLP.');
    } catch {
      toast.error('No se pudo copiar al portapapeles en este navegador.');
    }
  };

  return (
    <div className={cx('rounded-2xl border p-4 text-left', linked ? 'border-success/30 bg-success-50' : 'border-warning/30 bg-warning-50', className)}>
      <p className={cx('flex items-center gap-2 text-sm font-bold', linked ? 'text-success' : 'text-warning')}>
        {linked ? <CheckCircle2 className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
        {linked ? 'Registrada en FLP' : `Pendiente de registro en FLP (${t.flp})`}
      </p>
      {linked ? (
        <p className="mt-1 font-mono text-sm text-ink">{linked}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-graphite">Copia el resumen, créala en FLP y luego pega aquí el ID que te entrega.</p>
          <div className="mt-3 flex gap-2">
            <input
              aria-label="ID actividad FLP"
              className="input font-mono uppercase"
              placeholder={`${t.flp}-2026-11-4068392`}
              value={draft}
              maxLength={30}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button variant="secondary" icon={Link2} onClick={() => commit(setFlpActivityId(data, v.id, draft, v.userId)) && setDraft('')} disabled={!draft.trim()}>
              Vincular
            </Button>
          </div>
        </>
      )}
      <button type="button" onClick={copy} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol hover:underline">
        <ClipboardCopy className="size-4" aria-hidden /> Copiar resumen para FLP
      </button>
    </div>
  );
}
