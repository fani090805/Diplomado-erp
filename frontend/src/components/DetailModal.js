import React from 'react';
import { TTDetailModal } from '../design-system/components/TTDetailModal';
export { dateOf, invert, labelFor, money } from '../lib/format';

/**
 * DetailModal - Adaptador de FAI Solution ERP
 */
export default function DetailModal(props) {
  return <TTDetailModal {...props} />;
}
