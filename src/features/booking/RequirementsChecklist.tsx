import { BadgeCheck, CheckCircle2, Circle, Cpu, GraduationCap, HardHat, IdCard, Lock, UserCheck, type LucideIcon } from 'lucide-react';
import type { RequirementKey } from '@/types';
import { REQUIREMENTS } from '@/data/catalogs';
import { cx } from '@/utils/misc';

export const REQUIREMENT_ICON: Record<RequirementKey, LucideIcon> = {
  epp_especial: HardHat,
  candado: Lock,
  curso: GraduationCap,
  chip: Cpu,
  identificacion: IdCard,
  autorizacion_area: BadgeCheck,
  confirmacion_co: UserCheck,
};

/**
 * Lista de requisitos previos. En modo interactivo el usuario marca lo que ya tiene listo;
 * los no marcados se muestran como pendientes, pero no impiden reservar.
 */
export function RequirementsChecklist({
  requirements,
  checked = [],
  onToggle,
  large,
}: {
  requirements: RequirementKey[];
  checked?: RequirementKey[];
  onToggle?: (k: RequirementKey) => void;
  large?: boolean;
}) {
  return (
    <ul className="grid gap-2">
      {requirements.map((k) => {
        const Icon = REQUIREMENT_ICON[k];
        const done = checked.includes(k);
        const content = (
          <>
            <span className={cx('grid shrink-0 place-items-center rounded-xl', large ? 'size-11' : 'size-9', done ? 'bg-success-50 text-success' : 'bg-brand-50 text-brand')}>
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-semibold text-ink">{REQUIREMENTS[k].label}</span>
              <span className="block text-xs text-muted">{REQUIREMENTS[k].description}</span>
            </span>
            {onToggle &&
              (done ? <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden /> : <Circle className="size-6 shrink-0 text-line" aria-hidden />)}
          </>
        );
        return (
          <li key={k}>
            {onToggle ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                onClick={() => onToggle(k)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl border p-2.5 transition active:scale-[0.995]',
                  large && 'p-3',
                  done ? 'border-success/30 bg-success-50/40' : 'border-line bg-surface hover:border-graphite/30',
                )}
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
