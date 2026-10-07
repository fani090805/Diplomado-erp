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

const MX_TIMEZONE = 'America/Mexico_City';
let mxFormatter = null;

/** Partes de fecha y hora de un instante en hora del centro de México. */
function mexicoParts(date) {
  try {
    mxFormatter =
      mxFormatter ||
      new Intl.DateTimeFormat('en-US', {
        timeZone: MX_TIMEZONE,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    const p = Object.fromEntries(mxFormatter.formatToParts(date).map((x) => [x.type, x.value]));
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
  } catch {
    // Sin soporte de zonas horarias: México centro es UTC-6 todo el año (sin horario de verano desde 2022).
    const t = new Date(date.getTime() - 6 * 3600 * 1000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() };
  }
}

/** Instante UTC de una fecha/hora "de pared" en México. */
function mexicoInstant(y, m, d, h = 0, mi = 0, s = 0, ms = 0) {
  const wall = Date.UTC(y, m - 1, d, h, mi, s, ms);
  const offsetAt = (t) => {
    const p = mexicoParts(new Date(t));
    return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(t / 1000) * 1000;
  };
  const first = wall - offsetAt(wall);
  return new Date(wall - offsetAt(first));
}

/**
 * "Periodo a la fecha" en hora de México, para comparar meses de forma justa:
 *  - current:  del día 1 (00:00) del mes en curso hasta este momento.
 *  - previous: del día 1 del mes anterior hasta el MISMO día y hora de ese mes;
 *    si el mes anterior es más corto (p. ej. 31 de marzo → febrero), hasta el
 *    final de su último día.
 */
export function monthToDateRanges(now = new Date()) {
  const p = mexicoParts(now);
  const prevY = p.m === 1 ? p.y - 1 : p.y;
  const prevM = p.m === 1 ? 12 : p.m - 1;
  const prevLastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
  const currentStart = mexicoInstant(p.y, p.m, 1);
  const previousTo =
    p.d > prevLastDay
      ? new Date(currentStart.getTime() - 1)
      : mexicoInstant(prevY, prevM, p.d, p.h, p.mi, p.s, now.getMilliseconds());
  return {
    current: { from: currentStart.toISOString(), to: now.toISOString() },
    previous: { from: mexicoInstant(prevY, prevM, 1).toISOString(), to: previousTo.toISOString() },
  };
}

/** % de cambio contra el periodo anterior; null si el anterior es 0 (sin comparativo). */
export function percentChange(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (!prev) return null;
  return Number((((cur - prev) / prev) * 100).toFixed(1));
}

/** Clave "AAAA-MM" del mes `monthsAgo` meses atrás (misma forma que la API). */
export function monthKey(monthsAgo = 0, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
