import { Platform } from 'react-native';
import { api, getApiBaseUrl } from '../api/client';

/**
 * Canal de cambios EN VIVO (Server-Sent Events) — una sola conexión por app.
 *
 * - startLive(): pide un boleto de un solo uso (POST /events/ticket, con el JWT)
 *   y abre GET /events/stream?ticket=… (EventSource no puede mandar headers).
 * - Los eventos sólo dicen QUÉ cambió ({ type, entity, id, action, at }); cada
 *   pantalla vuelve a pedir sus datos a la API.
 * - Si se cae, reconecta con espera progresiva (1 s, 2 s, 4 s… hasta 30 s)
 *   pidiendo un boleto nuevo (el anterior ya se usó).
 * - Sólo web: en la app nativa de Expo no hay EventSource (la app Android es Kotlin).
 */

const MAX_DELAY_MS = 30000;
const listeners = new Set(); // { entities: Set<string> | null, fn }
const statusListeners = new Set();

let source = null;
let wanted = false;
let connected = false;
let attempt = 0;
let retryTimer = null;

const supported = () => Platform.OS === 'web' && typeof EventSource !== 'undefined';

function setConnected(value) {
  if (connected === value) return;
  connected = value;
  statusListeners.forEach((fn) => fn(value));
}

function scheduleRetry() {
  if (!wanted || retryTimer) return;
  const delay = Math.min(MAX_DELAY_MS, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
  attempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connect();
  }, delay);
}

async function connect() {
  if (!wanted || source) return;
  try {
    const { ticket } = await api('/events/ticket', { method: 'POST' });
    if (!wanted || source) return;
    const es = new EventSource(`${getApiBaseUrl()}/events/stream?ticket=${encodeURIComponent(ticket)}`);
    source = es;
    es.onopen = () => {
      attempt = 0;
      setConnected(true);
    };
    es.onmessage = (message) => {
      let event;
      try {
        event = JSON.parse(message.data);
      } catch {
        return;
      }
      listeners.forEach((l) => {
        if (!l.entities || l.entities.has(event.entity)) l.fn(event);
      });
    };
    es.onerror = () => {
      // El reintento automático del navegador reusaría el boleto (ya canjeado):
      // se cierra y se pide uno nuevo con espera progresiva.
      es.close();
      if (source === es) source = null;
      setConnected(false);
      scheduleRetry();
    };
  } catch {
    setConnected(false);
    scheduleRetry();
  }
}

function reconnectNow() {
  if (!wanted || source) return;
  clearTimeout(retryTimer);
  retryTimer = null;
  attempt = 0;
  connect();
}

if (supported() && typeof window !== 'undefined') {
  window.addEventListener('online', reconnectNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reconnectNow();
  });
}

/** Conecta (al iniciar sesión). Idempotente. */
export function startLive() {
  if (!supported()) return;
  wanted = true;
  connect();
}

/** Desconecta (al cerrar sesión). */
export function stopLive() {
  wanted = false;
  clearTimeout(retryTimer);
  retryTimer = null;
  attempt = 0;
  if (source) source.close();
  source = null;
  setConnected(false);
}

/** Suscribe `fn(event)` a una entidad, varias, o todas (null). Devuelve la baja. */
export function onLiveEvent(entities, fn) {
  const entry = { entities: entities ? new Set([].concat(entities)) : null, fn };
  listeners.add(entry);
  return () => listeners.delete(entry);
}

export function onLiveStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

export const isLiveConnected = () => connected;

/** Entidad de los eventos según la ruta de un listado de la API. */
const PATH_ENTITIES = [
  ['/sales-orders', 'sales-order'],
  ['/purchase-orders', 'purchase-order'],
  ['/products', 'product'],
  ['/inventory', 'inventory'],
  ['/customers', 'customer'],
  ['/suppliers', 'supplier'],
  ['/finance/incomes', 'income'],
  ['/finance/expenses', 'expense'],
  ['/users', 'user'],
  ['/platform/companies', 'company'],
  ['/platform/company-requests', 'company'],
];

export function entityForPath(path) {
  const found = PATH_ENTITIES.find(([prefix]) => path === prefix || String(path).startsWith(`${prefix}/`) || String(path).startsWith(`${prefix}?`));
  return found ? found[1] : null;
}
