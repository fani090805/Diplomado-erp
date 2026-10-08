#!/usr/bin/env node
'use strict';

/**
 * Copia los ejemplos de respuesta de la API (backend/tests/contracts/fixtures)
 * a las pruebas de contrato de Android (android/app/src/test/resources/contracts).
 *
 * Uso (desde la raíz del repo):  node scripts/sync-contract-fixtures.js
 * Los fixtures se generan con:  cd backend && UPDATE_CONTRACTS=1 npx jest tests/contracts
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'backend', 'tests', 'contracts', 'fixtures');
const target = path.join(root, 'android', 'app', 'src', 'test', 'resources', 'contracts');

if (!fs.existsSync(source)) {
  console.error(`No existe ${path.relative(root, source)}. Genera los fixtures primero.`);
  process.exit(1);
}

const fixtures = fs.readdirSync(source).filter((name) => name.endsWith('.json'));
fs.mkdirSync(target, { recursive: true });

// Quita los que ya no existen en el backend para que Android no pruebe contratos viejos.
const stale = fs.readdirSync(target).filter((name) => name.endsWith('.json') && !fixtures.includes(name));
stale.forEach((name) => fs.unlinkSync(path.join(target, name)));

fixtures.forEach((name) => fs.copyFileSync(path.join(source, name), path.join(target, name)));

console.log(`Contratos sincronizados: ${fixtures.length} copiados, ${stale.length} eliminados → ${path.relative(root, target)}`);
