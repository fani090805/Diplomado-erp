'use strict';

const { EventEmitter } = require('events');
const { ENTITIES, SIDE_EFFECTS, ACTIONS } = require('./event.catalog');

/**
 * Bus de eventos EN MEMORIA (el backend corre en una sola instancia de Render).
 * Si algún día hay varias instancias, este módulo es el único que cambia
 * (p. ej. a MongoDB change streams o Redis pub/sub).
 *
 * Un evento interno lleva { companyId, scope, permission } para filtrar a
 * quién se le entrega; al cliente sólo sale { type, entity, id, action, at }
 * (SIN datos del documento: el cliente vuelve a pedirlo a la API).
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0); // una suscripción por conexión SSE abierta

function publish({ companyId = null, entity, id = null, action }) {
  const cfg = ENTITIES[entity];
  if (!cfg || !ACTIONS.includes(action)) return;
  const base = {
    companyId: companyId ? String(companyId) : null,
    scope: cfg.scope || 'company',
    permission: cfg.permission,
  };
  const at = new Date().toISOString();
  emitter.emit('event', { ...base, payload: { type: `${entity}.${action}`, entity, id: id ? String(id) : null, action, at } });

  for (const extra of SIDE_EFFECTS[`${entity}:${action}`] || []) {
    const extraCfg = ENTITIES[extra.entity];
    emitter.emit('event', {
      companyId: base.companyId,
      scope: extraCfg.scope || 'company',
      permission: extraCfg.permission,
      payload: { type: `${extra.entity}.${extra.action}`, entity: extra.entity, id: null, action: extra.action, at },
    });
  }
}

/** ¿El usuario de la conexión puede recibir este evento? */
function canReceive(user, event) {
  if (event.scope === 'platform') return Boolean(user.isPlatformAdmin);
  if (!user.companyId || event.companyId !== String(user.companyId)) return false;
  return !event.permission || (user.permissions || []).includes(event.permission);
}

function subscribe(listener) {
  emitter.on('event', listener);
  return () => emitter.off('event', listener);
}

module.exports = { publish, subscribe, canReceive, listenerCount: () => emitter.listenerCount('event') };
