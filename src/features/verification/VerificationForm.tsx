import { useRef, useState } from 'react';
import { CircleAlert, ClipboardCheck, Crosshair, FileImage, Lock, MessageCircleQuestion, Paperclip, Radio, Send, Trash2 } from 'lucide-react';
import type { Answer, PostVisit, Verification, VerificationAnswer } from '@/types';
import { ACTION_OWNERS, ACTIVITY_TYPES, ENGAGEMENT_QUESTIONS, EVENT_PROPOSALS, VERIFICATION_QUESTIONS } from '@/data/catalogs';
import { AnswerToggle, Button, ProgressBar } from '@/components/ui/primitives';
import { TypeBadge } from '@/components/ui/status';
import { useData } from '@/contexts/DataContext';
import { Glossary } from '@/features/guide/Glossary';
import { FLP_ID_PATTERN, submitVerification, validateVerification, type ActionDraft } from '@/services/flpService';
import type { BookingView } from '@/services/selectors';
import { addDaysISO, capitalize, fmtLong, todayISO } from '@/utils/date';
import { cx } from '@/utils/misc';

const ANSWERS: Array<{ value: Answer; label: string }> = [
  { value: 'SI', label: 'SÍ' },
  { value: 'NO', label: 'NO' },
  { value: 'NA', label: 'N/A' },
];
const YESNO: Array<{ value: 'yes' | 'no'; label: string }> = [
  { value: 'yes', label: 'SÍ' },
  { value: 'no', label: 'NO' },
];

export function VerificationForm({ booking, onDone, mobile }: { booking: BookingView; onDone: (v: Verification) => void; mobile?: boolean }) {
  const { data, commitWith } = useData();
  const slot = booking.slot;
  const [answers, setAnswers] = useState<VerificationAnswer[]>(() =>
    VERIFICATION_QUESTIONS.map((q) => ({ questionId: q.id, response: null, comment: '', evidence: [], actionRequired: false })),
  );
  const [actions, setActions] = useState<Record<string, ActionDraft>>({});
  const [contractor, setContractor] = useState<'yes' | 'no'>('yes');
  const [post, setPost] = useState<PostVisit>({ flpActivityId: '', eventProposal: 'ninguno', eventId: '', immediateActions: '', followUp: '' });
  const patchPost = (patch: Partial<PostVisit>) => setPost((p) => ({ ...p, ...patch }));
  const flpType = ACTIVITY_TYPES[slot.activityType];
  const [errors, setErrors] = useState<string[]>([]);
  const errRef = useRef<HTMLDivElement>(null);

  const answered = answers.filter((a) => a.response).length;
  const progress = Math.round((answered / answers.length) * 100);

  const update = (qid: string, patch: Partial<VerificationAnswer>) =>
    setAnswers((list) => list.map((a) => (a.questionId === qid ? { ...a, ...patch } : a)));

  const setActionRequired = (qid: string, required: boolean) => {
    update(qid, { actionRequired: required });
    if (required && !actions[qid])
      setActions((m) => ({ ...m, [qid]: { questionId: qid, description: '', responsible: '', dueDate: addDaysISO(todayISO(), 14), completedOnSpot: false } }));
  };
  const patchAction = (qid: string, patch: Partial<ActionDraft>) => setActions((m) => ({ ...m, [qid]: { ...m[qid], ...patch } }));

  const submit = () => {
    const input = { bookingId: booking.id, userId: booking.userId, contractorObserved: contractor === 'yes', answers, actions: Object.values(actions), postVisit: post };
    const errs = validateVerification(data, input);
    const flpId = post.flpActivityId.trim();
    if (flpId && !FLP_ID_PATTERN.test(flpId)) errs.push(`ID actividad FLP: formato no válido (ejemplo: ${flpType.flp}-2026-11-4068392). Puedes dejarlo vacío y agregarlo después.`);
    setErrors(errs);
    if (errs.length) {
      window.setTimeout(() => errRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 20);
      return;
    }
    const r = commitWith(submitVerification(data, input));
    if (r) onDone(r.verification);
  };

  return (
    <div className="grid gap-4">
      {/* Encabezado de la actividad */}
      <section className={cx('rounded-2xl bg-ink p-4 text-white', !mobile && 'p-5')}>
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={slot.activityType} withFlp />
          <span className="text-xs text-white/60">{capitalize(fmtLong(slot.date))} · {slot.start}–{slot.end}</span>
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/50">Nombre de la actividad</p>
        <h2 className="text-lg font-bold leading-snug">{slot.title}</h2>
        <dl className={cx('mt-3 grid gap-2 text-sm', !mobile && 'sm:grid-cols-2')}>
          <div>
            <dt className="text-xs text-white/50">Proyecto</dt>
            <dd className="font-medium">{slot.project.code} · {slot.project.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">Tipo de verificación</dt>
            <dd className="font-medium">
              {flpType.label} — {flpType.name}
              <span className="block text-xs font-normal text-white/60">En FLP: {flpType.flp} · {flpType.flpName}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">Riesgo material</dt>
            <dd className="font-medium">{slot.riskCode} · {slot.riskName}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">Empresa</dt>
            <dd className="font-medium">{slot.companyName}</dd>
          </div>
        </dl>
      </section>

      <section className="card p-4">
        <div className="flex items-center gap-2 text-brand">
          <Radio className="size-4" aria-hidden />
          <span className="text-sm font-semibold">Control crítico</span>
        </div>
        <p className="mt-1 flex items-start gap-2 font-bold text-ink">
          <Crosshair className="mt-0.5 size-4 shrink-0 text-petrol" aria-hidden />
          {slot.controlCode} · {slot.controlName}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={progress} label="Avance de la verificación" tone={progress === 100 ? 'success' : 'brand'} />
          <span className="shrink-0 text-xs font-semibold tabular-nums text-graphite">
            {answered}/{answers.length}
          </span>
        </div>
      </section>

      <Glossary />

      {/* Las 3 preguntas de engagement de FLP */}
      <section className="card border-brand/30 bg-brand-50/40 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-700">
          <MessageCircleQuestion className="size-4" aria-hidden /> Antes de verificar: conversa con el equipo
        </p>
        <p className="mt-1 text-xs text-graphite">Usa las 3 preguntas de engagement de FLP para explorar el entendimiento de los riesgos antes de revisar los controles específicos.</p>
        <ol className="mt-2 grid gap-1.5 text-sm font-medium text-ink">
          {ENGAGEMENT_QUESTIONS.map((q, i) => (
            <li key={q} className="flex gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
              {q}
            </li>
          ))}
        </ol>
      </section>

      {/* Preguntas */}
      {VERIFICATION_QUESTIONS.map((q, i) => {
        const a = answers.find((x) => x.questionId === q.id)!;
        const act = actions[q.id];
        const showError = errors.some((e) => e.startsWith(`Pregunta ${i + 1}:`));
        return (
          <section key={q.id} className={cx('card p-4', showError && 'border-danger/50')} aria-labelledby={`${q.id}-t`}>
            <p id={`${q.id}-t`} className="text-sm font-semibold leading-snug text-ink">
              <span className="mr-1.5 text-brand">{i + 1}.</span>
              {q.text}
            </p>
            <p className="mt-1 text-xs italic text-muted">{q.hint}</p>

            <div className={cx('mt-3 flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5')}>
              <span className="text-sm font-medium text-graphite">Respuesta</span>
              <AnswerToggle
                ariaLabel={`Respuesta pregunta ${i + 1}`}
                value={a.response}
                large={mobile}
                options={ANSWERS}
                onChange={(v) => {
                  update(q.id, { response: v });
                  if (v === 'NO' && !a.actionRequired) setActionRequired(q.id, true);
                }}
              />
            </div>

            <label className="label mt-3" htmlFor={`${q.id}-c`}>
              Comentarios {a.response === 'NO' && <span className="text-brand">*</span>}
            </label>
            <textarea
              id={`${q.id}-c`}
              className="input min-h-16"
              value={a.comment}
              maxLength={600}
              placeholder={a.response === 'NO' ? 'Describe el hallazgo observado…' : 'Observaciones (opcional)'}
              onChange={(e) => update(q.id, { comment: e.target.value })}
            />

            <EvidencePicker files={a.evidence} onChange={(evidence) => update(q.id, { evidence })} />

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-graphite">¿Se requieren acciones?</span>
              <AnswerToggle
                ariaLabel={`¿Se requieren acciones? pregunta ${i + 1}`}
                value={a.actionRequired ? 'yes' : 'no'}
                large={mobile}
                options={YESNO}
                onChange={(v) => setActionRequired(q.id, v === 'yes')}
              />
            </div>

            {a.actionRequired && act && (
              <div className="mt-3 rounded-xl border border-brand/40 bg-brand-50/50 p-3">
                <div className="flex items-center justify-between border-b border-brand/20 pb-2">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-brand-700">
                    <CircleAlert className="size-4" aria-hidden /> Plan de acción
                  </p>
                  <span className="text-xs font-bold uppercase text-brand-700">{act.completedOnSpot ? 'Cerrada' : 'Abierta'}</span>
                </div>
                <label className="label mt-3" htmlFor={`${q.id}-ad`}>
                  Descripción de la acción <span className="text-brand">*</span>
                </label>
                <textarea
                  id={`${q.id}-ad`}
                  className="input min-h-16"
                  value={act.description}
                  maxLength={400}
                  onChange={(e) => patchAction(q.id, { description: e.target.value })}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-graphite">¿Acción completada en el lugar?</span>
                  <AnswerToggle
                    ariaLabel="Acción completada en el lugar"
                    value={act.completedOnSpot ? 'yes' : 'no'}
                    options={YESNO}
                    onChange={(v) => patchAction(q.id, { completedOnSpot: v === 'yes' })}
                  />
                </div>
                <div className={cx('mt-3 grid gap-3', !mobile && 'sm:grid-cols-2')}>
                  <div>
                    <label className="label" htmlFor={`${q.id}-ar`}>
                      Responsable <span className="text-brand">*</span>
                    </label>
                    <select id={`${q.id}-ar`} className="input" value={act.responsible} onChange={(e) => patchAction(q.id, { responsible: e.target.value })}>
                      <option value="">Selecciona…</option>
                      {ACTION_OWNERS.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  {!act.completedOnSpot && (
                    <div>
                      <label className="label" htmlFor={`${q.id}-due`}>
                        Fecha compromiso <span className="text-brand">*</span>
                      </label>
                      <input id={`${q.id}-due`} type="date" min={todayISO()} className="input" value={act.dueDate} onChange={(e) => patchAction(q.id, { dueDate: e.target.value })} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <section className="card flex items-center justify-between gap-3 p-4">
        <span className="text-sm font-medium text-graphite">¿La tarea observada era realizada por una empresa contratista?</span>
        <AnswerToggle ariaLabel="Tarea realizada por contratista" value={contractor} options={YESNO} large={mobile} onChange={setContractor} />
      </section>

      {/* Cierre post-visita: columnas "Post visita de terreno" de la planilla + puente con FLP */}
      <section className="card p-4" aria-labelledby="post-t">
        <p id="post-t" className="flex items-center gap-2 text-sm font-bold text-ink">
          <Send className="size-4 text-brand" aria-hidden /> Cierre post-visita y registro en FLP
        </p>
        <p className="mt-1 text-xs text-muted">
          Si ya cargaste la actividad en FLP como <strong>{flpType.flp}</strong>, ingresa su ID. Si no, déjalo vacío: la visita queda como <em>pendiente de registro en FLP</em> y puedes vincularla después.
        </p>
        <div className={cx('mt-3 grid gap-3', !mobile && 'sm:grid-cols-2')}>
          <div>
            <label className="label" htmlFor="pv-flp">ID actividad FLP</label>
            <input id="pv-flp" className="input font-mono uppercase" placeholder={`${flpType.flp}-2026-11-4068392`} value={post.flpActivityId} maxLength={30} onChange={(e) => patchPost({ flpActivityId: e.target.value })} />
          </div>
          <div>
            <span className="label">Propuesta de evento (Hz / LM)</span>
            <AnswerToggle ariaLabel="Propuesta de evento" value={post.eventProposal} options={EVENT_PROPOSALS} onChange={(v) => patchPost({ eventProposal: v })} />
          </div>
          {post.eventProposal !== 'ninguno' && (
            <div>
              <label className="label" htmlFor="pv-ev">ID evento {post.eventProposal}</label>
              <input id="pv-ev" className="input font-mono" placeholder="Opcional" value={post.eventId} maxLength={30} onChange={(e) => patchPost({ eventId: e.target.value })} />
            </div>
          )}
        </div>
        <label className="label mt-3" htmlFor="pv-ia">Acciones inmediatas</label>
        <textarea id="pv-ia" className="input min-h-14" maxLength={400} placeholder="Qué se corrigió o detuvo en el momento (opcional)" value={post.immediateActions} onChange={(e) => patchPost({ immediateActions: e.target.value })} />
        <label className="label mt-3" htmlFor="pv-fu">Oportunidades para seguimiento de la actividad y/o área</label>
        <textarea id="pv-fu" className="input min-h-14" maxLength={400} placeholder="Opcional" value={post.followUp} onChange={(e) => patchPost({ followUp: e.target.value })} />
      </section>

      {errors.length > 0 && (
        <div ref={errRef} role="alert" className="rounded-2xl border border-danger/30 bg-danger-50 p-4 text-sm text-danger">
          <p className="font-semibold">Completa la información para registrar la verificación:</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {errors.slice(0, 8).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={cx(mobile && 'sticky bottom-0 -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur')}>
        <Button size="lg" block icon={ClipboardCheck} onClick={submit}>
          Registrar verificación
        </Button>
      </div>
    </div>
  );
}

/** Carga de evidencia SIMULADA: solo se guardan nombres de archivo; nada se sube ni se almacena. */
function EvidencePicker({ files, onChange }: { files: string[]; onChange: (f: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-3">
      <span className="label">Evidencia (simulada)</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line px-3 py-3 text-center text-sm text-graphite hover:border-brand/50"
      >
        <span className="flex items-center gap-1.5">
          <Paperclip className="size-4" aria-hidden /> <span className="font-semibold text-petrol">Seleccionar archivos</span> (no obligatorio)
        </span>
        <span className="text-xs italic text-muted">No incluyas datos personales (nombres, RUT). Prototipo: solo se registra el nombre del archivo.</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const names = Array.from(e.target.files ?? []).map((f) => f.name);
          if (names.length) onChange([...files, ...names].slice(0, 6));
          e.target.value = '';
        }}
      />
      {files.length > 0 && (
        <ul className="mt-2 grid gap-1">
          {files.map((f, i) => (
            <li key={`${f}-${i}`} className="flex items-center gap-2 rounded-lg bg-canvas px-2.5 py-1.5 text-sm">
              <FileImage className="size-4 text-muted" aria-hidden />
              <span className="flex-1 truncate">{f}</span>
              <Lock className="size-3.5 text-muted" aria-label="Simulado" />
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="text-muted hover:text-danger" aria-label={`Quitar ${f}`}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
