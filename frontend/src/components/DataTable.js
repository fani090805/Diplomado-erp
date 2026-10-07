import React from 'react';
import { TTTable } from '../design-system/components/TTTable';
import LiveIndicator from './LiveIndicator';

/**
 * Re-exportación / Adaptador de DataTable hacia TTTable
 * Mantiene compatibilidad total con todas las pantallas de módulos.
 * Agrega junto al título el indicador "En vivo" (las listas se refrescan
 * solas con useList cuando llega un evento de su entidad).
 */
export default function DataTable(props) {
  return <TTTable titleAccessory={<LiveIndicator />} {...props} />;
}
