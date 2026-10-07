'use strict';

/**
 * Utilidades de la exportación de ventas (PDF / Excel): fechas en hora de
 * México, formato de moneda, etiquetas y nombre de archivo.
 */

const path = require('path');

const REPORT_TIMEZONE = 'America/Mexico_City';

/** Logo FAI (copia de frontend/assets/fai-icono.png) para PDF y Excel. */
const LOGO_PATH = path.join(__dirname, 'assets', 'fai-icono.png');
const MAX_RANGE_MONTHS = 24;

/** Identidad FAI (mismos valores que frontend/src/design-system/tokens/colors.js). */
const BRAND = {
  olive: '#334024',
  oliveLight: '#45552F',
  cream: '#F5EEDB',
  creamRow: '#F7F3E8',
  border: '#E6E0D0',
  text: '#1E2616',
  muted: '#696B61',
  terracotta: '#CB623B',
};

const STATUS_LABELS = { APPROVED: 'Aprobada', DRAFT: 'Borrador', REJECTED: 'Rechazada', all: 'Todos' };

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const zoneFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: REPORT_TIMEZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Diferencia (ms) entre la hora de México y UTC en un instante dado. */
function zoneOffsetMs(date) {
  const p = Object.fromEntries(zoneFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-10-05" → { y, m, d } si es una fecha de calendario real; si no, null. */
function parseYmd(ymd) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** Instante UTC de las 00:00 en México del día (y, m, d). Respeta horarios de verano históricos. */
function mexicoMidnight({ y, m, d }) {
  const guess = Date.UTC(y, m - 1, d);
  let instant = guess - zoneOffsetMs(new Date(guess));
  instant = guess - zoneOffsetMs(new Date(instant));
  return new Date(instant);
}

/**
 * Rango [start, end) en UTC que cubre del día `from` al día `to` COMPLETOS en
 * hora de México. Devuelve { error } si el rango es inválido o excede 24 meses.
 */
function mexicoDayRange(from, to) {
  const a = parseYmd(from);
  const b = parseYmd(to);
  if (!a || !b) return { error: 'Las fechas deben tener el formato AAAA-MM-DD y ser válidas.' };
  const start = mexicoMidnight(a);
  const nextDay = new Date(Date.UTC(b.y, b.m - 1, b.d + 1));
  const end = mexicoMidnight({ y: nextDay.getUTCFullYear(), m: nextDay.getUTCMonth() + 1, d: nextDay.getUTCDate() });
  if (end <= start) return { error: 'El rango de fechas es inválido: "desde" debe ser anterior o igual a "hasta".' };

  const limit = new Date(Date.UTC(a.y, a.m - 1 + MAX_RANGE_MONTHS, a.d));
  const toDay = new Date(Date.UTC(b.y, b.m - 1, b.d));
  if (toDay > limit) return { error: `El rango máximo es de ${MAX_RANGE_MONTHS} meses.` };
  return { start, end };
}

/** "2026-10-05T14:30:00" (hora local México, viene de $dateToString) → "05/10/2026". */
function dmy(localIso) {
  const [y, m, d] = String(localIso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** "2026-10-05" → "05/10/2026". */
const ymdToDmy = (ymd) => dmy(ymd);

/**
 * Fecha "de pared" de México como Date UTC: Excel no tiene zona horaria y
 * exceljs escribe el valor en UTC, así que se desplaza para que muestre el día local.
 */
function excelDate(localIso) {
  // Sólo la fecha (medianoche): la celda no lleva hora oculta.
  return new Date(`${String(localIso).slice(0, 10)}T00:00:00Z`);
}

/** "2026-10" → "oct 26". */
function monthLabel(ym) {
  const [y, m] = String(ym).split('-');
  return `${MONTHS_SHORT[Number(m) - 1]} ${y.slice(2)}`;
}

/** Fecha y hora actuales en México: "06/10/2026 14:05". */
function nowInMexico(now = new Date()) {
  const p = Object.fromEntries(zoneFormatter.formatToParts(now).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

const moneyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const intFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const money = (n) => moneyFormatter.format(Number(n) || 0);
const int = (n) => intFormatter.format(Number(n) || 0);

/** Monto abreviado para etiquetas de la gráfica: $1.2 M, $350 k. */
function moneyShort(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)} M`;
  if (Math.abs(v) >= 1e3) return `$${Math.round(v / 1e3)} k`;
  return `$${Math.round(v)}`;
}

/** "Fai Fai, S.A." → "fai-fai-s-a" (sin acentos ni caracteres especiales). */
function slug(text) {
  return (
    String(text || 'empresa')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'empresa'
  );
}

function exportFilename(companyName, from, to, format) {
  return `ventas_${slug(companyName)}_${from}_${to}.${format}`;
}

module.exports = {
  REPORT_TIMEZONE,
  LOGO_PATH,
  MAX_RANGE_MONTHS,
  BRAND,
  STATUS_LABELS,
  mexicoDayRange,
  dmy,
  ymdToDmy,
  excelDate,
  monthLabel,
  nowInMexico,
  money,
  int,
  moneyShort,
  slug,
  exportFilename,
};
