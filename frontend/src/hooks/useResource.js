import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { readUrlParam, writeParams } from '../nav/urlState';
import { entityForPath } from '../lib/live';
import { useLiveUpdates } from './useLiveUpdates';

/**
 * Hooks de datos para las pantallas FASE 7.
 *  - useList(path, query): listado paginado del backend (data + meta.total).
 *    Se refresca solo (en silencio) cuando llega un evento en vivo de su entidad.
 *  - usePicklist(path): opciones para los <select> (hasta 100 registros).
 */

const LIMIT = 20;

export function useList(path, query = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(() => {
    const parsed = Number(readUrlParam('page', 1));
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : 1;
  });
  const [search, setSearchState] = useState(() => readUrlParam('search', ''));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Recarga silenciosa (eventos en vivo): sin "Cargando…" ni vaciar la tabla.
  const silentRef = useRef(false);

  const queryKey = JSON.stringify(query);

  useEffect(() => {
    let cancelled = false;
    const silent = silentRef.current;
    silentRef.current = false;
    if (!silent) setLoading(true);
    api(path, {
      query: { page, limit: LIMIT, search: search || undefined, ...query },
      withMeta: true,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(Array.isArray(res.data) ? res.data : []);
        setTotal(res.meta?.total ?? 0);
        setError(null);
      })
      .catch((e) => {
        if (cancelled || silent) return; // un fallo en segundo plano no borra lo que se ve
        setItems([]);
        setTotal(0);
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // query se serializa para no re-petir el request en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, page, search, queryKey, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const silentReload = useCallback(() => {
    silentRef.current = true;
    setReloadKey((k) => k + 1);
  }, []);
  useLiveUpdates(entityForPath(path), silentReload);

  const setSearch = useCallback((value) => {
    setSearchState(value);
    setPageState(1);
    writeParams({ search: value, page: 1 });
  }, []);
  const setPage = useCallback((value) => {
    const next = typeof value === 'function' ? value(page) : value;
    const numeric = Number(next);
    const safe = Number.isInteger(numeric) && numeric > 0 && numeric <= 100000 ? numeric : 1;
    setPageState(safe);
    writeParams({ page: safe });
  }, [page]);

  return {
    items,
    total,
    page,
    limit: LIMIT,
    loading,
    error,
    search,
    setSearch,
    setPage,
    reload,
  };
}

/**
 * Descarga todas las páginas de un listado (de 100 en 100, tope `maxPages`).
 * Para pantallas que necesitan totales o cruces que la API no pagina por ellas.
 */
export async function fetchAll(path, query = {}, { maxPages = 20 } = {}) {
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await api(path, { query: { ...query, page, limit: 100 }, withMeta: true });
    const data = Array.isArray(res.data) ? res.data : [];
    items.push(...data);
    const total = res.meta?.total ?? items.length;
    if (data.length === 0 || items.length >= total) break;
  }
  return items;
}

const defaultLabel =(r) => r.name || r.sku || r.code || r.email || r.documentId || String(r._id);

/** Catálogo para selects: se carga una vez por recurso. */
export function usePicklist(path, labelOf = defaultLabel) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const labelRef = useRef(labelOf);
  labelRef.current = labelOf;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(path, { query: { limit: 100 } })
      .then((rows) => {
        if (cancelled) return;
        setOptions(
          (Array.isArray(rows) ? rows : []).map((r) => ({
            value: String(r._id),
            label: labelRef.current(r),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { options, loading };
}
