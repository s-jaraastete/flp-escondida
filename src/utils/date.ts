import { addDays, format, isBefore, parseISO, startOfDay, isSameDay, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * date-fns no incluye un locale "es-CL" separado; usamos `es` y formatos chilenos
 * (dd-MM-yyyy, 24 h, semana iniciando el lunes).
 */
export const locale = es;
export const WEEK_OPTS = { weekStartsOn: 1 as const, locale: es };

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');
export const today = () => startOfDay(new Date());
export const todayISO = () => toISODate(today());
export const fromISO = (iso: string) => parseISO(iso);

export const fmtDate = (iso: string) => format(parseISO(iso), 'dd-MM-yyyy');
export const fmtShort = (iso: string) => format(parseISO(iso), "EEE d MMM", { locale: es });
export const fmtLong = (iso: string) => format(parseISO(iso), "EEEE d 'de' MMMM yyyy", { locale: es });
export const fmtDayMonth = (iso: string) => format(parseISO(iso), "d 'de' MMMM", { locale: es });
export const fmtDateTime = (isoDateTime: string) => format(parseISO(isoDateTime), 'dd-MM-yyyy HH:mm');
export const fmtMonth = (d: Date) => format(d, 'MMMM yyyy', { locale: es });
export const weekdayShort = (d: Date) => format(d, 'EEE', { locale: es });

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function addDaysISO(iso: string, n: number) {
  return toISODate(addDays(parseISO(iso), n));
}

export function isPastDate(iso: string) {
  return isBefore(parseISO(iso), today());
}
export function isTodayISO(iso: string) {
  return isSameDay(parseISO(iso), today());
}
export function daysFromToday(iso: string) {
  return differenceInCalendarDays(parseISO(iso), today());
}

export function relativeDay(iso: string) {
  const d = daysFromToday(iso);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  if (d > 1 && d < 7) return `En ${d} días`;
  if (d < -1 && d > -7) return `Hace ${-d} días`;
  return capitalize(fmtShort(iso));
}

/** Minutos desde medianoche para "HH:mm". */
export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** ¿Se superponen dos intervalos [aStart,aEnd) y [bStart,bEnd) del mismo día? */
export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

export const nowISO = () => new Date().toISOString();
