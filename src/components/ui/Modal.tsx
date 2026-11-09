import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './primitives';
import { cx } from '@/utils/misc';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  container,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Contenedor alternativo (p. ej. el marco del teléfono en la app móvil). */
  container?: HTMLElement | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
      (el ?? panelRef.current)?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const inPhone = Boolean(container);
  const node = (
    <div className={cx(inPhone ? 'absolute' : 'fixed', 'inset-0 z-50 flex items-end justify-center sm:items-center', !inPhone && 'sm:p-6')}>
      <div className="animate-fade absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'animate-pop relative flex max-h-[92%] w-full flex-col bg-surface shadow-[var(--shadow-pop)] outline-none',
          inPhone ? 'rounded-t-3xl' : 'rounded-t-3xl sm:max-h-[88vh] sm:rounded-2xl',
          !inPhone && size === 'sm' && 'sm:max-w-md',
          !inPhone && size === 'md' && 'sm:max-w-xl',
          !inPhone && size === 'lg' && 'sm:max-w-3xl',
          !inPhone && size === 'xl' && 'sm:max-w-5xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button data-close onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
  return createPortal(node, container ?? document.body);
}

/** Diálogo de confirmación con motivo opcional. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  tone = 'danger',
  reasonLabel,
  reasonRequired,
  container,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary' | 'success';
  reasonLabel?: string;
  reasonRequired?: boolean;
  container?: HTMLElement | null;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      container={container}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            variant={tone}
            onClick={() => {
              if (reasonRequired && !reason.trim()) {
                setError('Este campo es obligatorio.');
                return;
              }
              onConfirm(reason);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-50 text-danger">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
        )}
        <div className="text-sm text-graphite">{message}</div>
      </div>
      {reasonLabel && (
        <div className="mt-4">
          <label className="label" htmlFor="confirm-reason">
            {reasonLabel}
            {reasonRequired && <span className="text-brand"> *</span>}
          </label>
          <textarea
            id="confirm-reason"
            className="input min-h-20"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            aria-invalid={Boolean(error)}
          />
          {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
