import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

function readParam(key, fallback, allowed) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return fallback;
  const value = new URLSearchParams(window.location.search).get(key);
  if (value === null) return fallback;
  if (typeof fallback === 'number') {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : fallback;
  }
  return !allowed || allowed.includes(value) ? value : fallback;
}

export function writeParams(values) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  Object.entries(values).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined || value === 1) url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  });
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function useUrlState(key, fallback, allowed) {
  const [value, setValue] = useState(() => readParam(key, fallback, allowed));
  const update = useCallback((next) => {
    const normalized = typeof next === 'function' ? next(value) : next;
    let safe = allowed && !allowed.includes(normalized) ? fallback : normalized;
    if (typeof fallback === 'number') {
      const numeric = Number(normalized);
      safe = Number.isInteger(numeric) && numeric > 0 && numeric <= 100000 ? numeric : fallback;
    }
    setValue(safe);
    writeParams({ [key]: safe });
  }, [key, value, fallback, allowed]);
  return [value, update];
}

export function readUrlParam(key, fallback) {
  return readParam(key, fallback);
}
