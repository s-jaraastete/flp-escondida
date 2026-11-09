import { useData } from '@/contexts/DataContext';
import { findBooking, toggleChecklistItem } from '@/services/flpService';
import { RequirementsChecklist } from './RequirementsChecklist';

/** Checklist previo a la visita: el usuario marca los requisitos que ya tiene listos. */
export function PrecheckEditor({ bookingId, editable, large }: { bookingId: string; editable: boolean; large?: boolean }) {
  const { data, commit } = useData();
  const booking = findBooking(data, bookingId);
  const slot = booking ? data.slots.find((s) => s.id === booking.slotId) : undefined;
  if (!booking || !slot) return null;
  return (
    <RequirementsChecklist
      requirements={slot.requirements}
      checked={booking.checklist}
      large={large}
      onToggle={editable ? (k) => commit(toggleChecklistItem(data, booking.id, k), { silent: true }) : undefined}
    />
  );
}
