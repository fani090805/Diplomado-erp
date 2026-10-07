/**
 * Cliente HTTP mínimo para la API del ERP (sin dependencias extra).
 *
 * - URL base: variable de entorno EXPO_PUBLIC_API_URL (ver .env.example).
 * - Adjunta el access token automáticamente.
 * - `withMeta: true` devuelve { data, meta } (los listados paginan con meta.total).
 * - apiText() descarga respuesta en texto (exportación CSV de reportes).
 * - Ante un 401 TOKEN_EXPIRED intenta UNA renovación con el refresh token
 *   (promesa única: si varios requests fallan a la vez, sólo se refresca una vez).
 * - Si el refresh falla, invoca onSessionExpired (AuthContext cierra la sesión).
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

let accessToken = null;
let refreshToken = null;
let onSessionExpired = null;
let refreshPromise = null;
const SESSION_KEY = 'fai.session.v1';

function saveTokens() {
  if (typeof window === 'undefined') return;
  try {
    if (!window.localStorage) return;
    if (accessToken && refreshToken) window.localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken, refreshToken }));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch { /* almacenamiento no disponible */ }
}

export function restoreTokens() {
  if (typeof window === 'undefined') return false;
  try {
    if (!window.localStorage) return false;
    const saved = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
    if (!saved?.accessToken || !saved?.refreshToken) return false;
    accessToken = saved.accessToken;
    refreshToken = saved.refreshToken;
    return true;
  } catch { return false; }
}

export function setTokens({ access = null, refresh = null } = {}) {
  accessToken = access;
  refreshToken = refresh;
  saveTokens();
}

export function getAccessToken() {
  return accessToken;
}

export function setOnSessionExpired(fn) {
  onSessionExpired = fn;
}

export async function warmUp() {
  const healthUrl = `${BASE_URL.replace(/\/api\/v1\/?$/, '')}/health`;
  try {
    await fetch(healthUrl, { method: 'GET' });
  } catch {
    // Warming the server is best-effort and should never interrupt the app.
  }
}

async function tryRefresh() {
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const body = await res.json();
      setTokens({ access: body.data.accessToken, refresh: body.data.refreshToken });
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * petición('/users', { method, body, query })
 * @returns data (ya desempaquetada) o lanza Error con .status y .code
 */
export async function api(path, { method = 'GET', body, query, auth = true, withMeta = false, signal } = {}) {
  // Construcción manual de la query: URL/searchParams no está garantizado en RN/Hermes.
  const params = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')
    : '';
  const url = `${BASE_URL}${path}${params ? `?${params}` : ''}`;

  const doFetch = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  };

  let res = await doFetch();

  // Renovación transparente una sola vez.
  if (res.status === 401 && auth && (await safeRefresh())) {
    res = await doFetch();
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* respuesta sin JSON */
  }

  if (!res.ok) {
    if (res.status === 401 && auth && onSessionExpired) onSessionExpired();
    const error = new Error(payload?.error?.message || 'Error de red. Intente de nuevo.');
    error.status = res.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }

  if (withMeta) {
    return { data: payload?.data, meta: payload?.meta };
  }
  return payload?.data;
}

/** GET en texto plano (reportes CSV). Misma renovación de token que api(). */
export async function apiText(path, { auth = true } = {}) {
  const url = `${BASE_URL}${path}`;
  const doFetch = () => {
    const headers = {};
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(url, { headers });
  };

  let res = await doFetch();
  if (res.status === 401 && auth && (await safeRefresh())) {
    res = await doFetch();
  }
  if (!res.ok) {
    if (res.status === 401 && auth && onSessionExpired) onSessionExpired();
    const error = new Error('No se pudo descargar el reporte.');
    error.status = res.status;
    throw error;
  }
  return res.text();
}

/** Nombre del archivo desde Content-Disposition (prefiere filename* UTF-8). */
function filenameFrom(disposition, fallback) {
  const header = String(disposition || '');
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      /* cae al filename simple */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : fallback;
}

/**
 * GET binario (reportes PDF / Excel): devuelve { blob, filename } con el
 * nombre que manda el servidor. Misma renovación de token que api().
 * Si el servidor responde error JSON, lanza su mensaje.
 */
export async function apiBlob(path, { query, fallbackName = 'reporte' } = {}) {
  const params = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')
    : '';
  const url = `${BASE_URL}${path}${params ? `?${params}` : ''}`;
  const doFetch = () => {
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(url, { headers });
  };

  let res = await doFetch();
  if (res.status === 401 && (await safeRefresh())) {
    res = await doFetch();
  }
  if (!res.ok) {
    if (res.status === 401 && onSessionExpired) onSessionExpired();
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      /* respuesta sin JSON */
    }
    const error = new Error(payload?.error?.message || 'No se pudo generar el reporte.');
    error.status = res.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }
  const blob = await res.blob();
  return { blob, filename: filenameFrom(res.headers.get('Content-Disposition'), fallbackName) };
}

async function safeRefresh() {
  try {
    return await tryRefresh();
  } catch {
    return false;
  }
}
