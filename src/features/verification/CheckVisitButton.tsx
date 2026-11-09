import { CheckCircle2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button, type ButtonProps } from '@/components/ui/primitives';
import { checkVisit } from '@/services/flpService';

/** Un solo toque: marca la visita como realizada (reemplaza el formulario de verificación). */
export function CheckVisitButton({ bookingId, userId, label = 'Marcar como realizada', ...rest }: { bookingId: string; userId: string; label?: string } & Omit<ButtonProps, 'onClick' | 'children'>) {
  const { data, commit } = useData();
  return (
    <Button
      icon={CheckCircle2}
      {...rest}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        commit(checkVisit(data, bookingId, userId));
      }}
    >
      {label}
    </Button>
  );
}
