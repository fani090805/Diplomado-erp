import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { setStatusCatalog } from '../design-system/components/TTBadge';

/**
 * Configuración compartida con la app Android (GET /api/v1/meta):
 * etiquetas y tonos de estado, módulos del menú, moneda.
 *
 * Se carga al iniciar sesión y se guarda en sessionStorage (dura la sesión
 * del navegador). Si /meta falla, las pantallas usan sus valores por defecto
 * (STATUS_MAP de TTBadge y MENU_CATEGORIES de Layout).
 */
const STORAGE_KEY = 'fai.meta';
const subscribers = new Set();
let meta = null;

function readCache() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeCache(value) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (value) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* almacenamiento bloqueado: queda sólo en memoria */
  }
}

/** { entity: [{ code, label, tone }] } → { CODE: { label, tone } } (el primero gana). */
function flattenStatuses(statuses = {}) {
  const catalog = {};
  for (const list of Object.values(statuses)) {
    for (const { code, label, tone } of list || []) if (!catalog[code]) catalog[code] = { label, tone };
  }
  return catalog;
}

function apply(value) {
  meta = value;
  setStatusCatalog(value ? flattenStatuses(value.statuses) : null);
  subscribers.forEach((fn) => fn(meta));
}

/** Carga /meta (usa la copia de la sesión mientras llega). */
export async function loadMeta() {
  if (!meta) {
    const cached = readCache();
    if (cached) apply(cached);
  }
  try {
    const fresh = await api('/meta');
    writeCache(fresh);
    apply(fresh);
  } catch {
    /* sin /meta: siguen los valores por defecto o la copia de la sesión */
  }
  return meta;
}

export function clearMeta() {
  writeCache(null);
  apply(null);
}

export const getMeta = () => meta;

/** Hook: meta actual (null hasta que cargue o si /meta falló). */
export function useMeta() {
  const [value, setValue] = useState(meta);
  useEffect(() => {
    subscribers.add(setValue);
    setValue(meta);
    return () => subscribers.delete(setValue);
  }, []);
  return value;
}
