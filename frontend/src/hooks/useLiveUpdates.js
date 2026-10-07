import { useEffect, useRef, useState } from 'react';
import { isLiveConnected, onLiveEvent, onLiveStatus } from '../lib/live';

/**
 * useLiveUpdates(entity | [entities] | '*' | null, onChange, { debounceMs })
 * Llama a onChange(lastEvent) cuando llega un evento en vivo de esas entidades
 * ('*' = todas; null = ninguna, p. ej. un listado sin eventos en vivo).
 * Agrupa ráfagas (p. ej. aprobar una venta emite venta + inventario + ingreso)
 * con un debounce de 1 s para no pedir los datos varias veces.
 */
export function useLiveUpdates(entities, onChange, { debounceMs = 1000 } = {}) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;
  const key = entities === null || entities === undefined ? '' : [].concat(entities).join(',');

  useEffect(() => {
    if (key === '') return undefined;
    let timer = null;
    let last = null;
    const unsubscribe = onLiveEvent(key === '*' ? null : key.split(','), (event) => {
      last = event;
      clearTimeout(timer);
      timer = setTimeout(() => callbackRef.current?.(last), debounceMs);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [key, debounceMs]);
}

/** true mientras la conexión en vivo está activa (para el indicador "En vivo"). */
export function useLiveStatus() {
  const [connected, setConnected] = useState(isLiveConnected());
  useEffect(() => onLiveStatus(setConnected), []);
  return connected;
}
