/**
 * Rangos de fechas para los reportes.
 *
 * El backend compara `createdAt <= to`. Una fecha sin hora ("2026-10-05") se
 * interpreta como medianoche UTC, lo que deja fuera las ventas de ese día.
 * Por eso aquí se envían instantes ISO completos: inicio y fin del día LOCAL.
 */

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseYmd(ymd) {
  const match = YMD_RE.exec(String(ymd || ''));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "2026-10-05" → instante de las 00:00:00.000 locales de ese día (ISO). */
export function startOfDayISO(ymd) {
  const date = parseYmd(ymd);
  return date ? date.toISOString() : undefined;
}

/** "2026-10-05" → instante de las 23:59:59.999 locales de ese día (ISO). */
export function endOfDayISO(ymd) {
  const date = parseYmd(ymd);
  if (!date) return undefined;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

/** Primer instante local del mes `monthsAgo` meses atrás (0 = mes actual). */
export function startOfMonthISO(monthsAgo = 0, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1).toISOString();
}

/** Primer instante local del día `days` días atrás. */
export function startOfDaysAgoISO(days, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days).toISOString();
}

/** Clave de semana ISO "AAAA-Www" (lunes a domingo) de una fecha local. */
export function isoWeekKey(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - weekday + 3); // jueves de esa semana define el año ISO
  const isoYear = d.getFullYear();
  const dayOfYear = Math.round((d - new Date(isoYear, 0, 1)) / 86400000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** Clave "AAAA-MM" del mes `monthsAgo` meses atrás (misma forma que la API). */
export function monthKey(monthsAgo = 0, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
