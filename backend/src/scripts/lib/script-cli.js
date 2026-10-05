'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/** Ruta de backend/.env (este archivo vive en backend/src/scripts/lib). */
const BACKEND_ENV = path.resolve(__dirname, '../../../.env');

/** --company=FAI-XXXXXX --count=200 --dry-run → { company: 'FAI-XXXXXX', count: '200', 'dry-run': true } */
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(raw);
    if (match) args[match[1]] = match[2] === undefined ? true : match[2];
  }
  return args;
}

/**
 * Carga MONGO_URI desde backend/.env. Si no está configurada, detiene el
 * script con instrucciones (nunca adivina ni usa otra base de datos).
 */
function loadBackendEnv() {
  if (fs.existsSync(BACKEND_ENV)) {
    require('dotenv').config({ path: BACKEND_ENV });
  }
  if (!process.env.MONGO_URI) {
    throw new Error(
      'Falta MONGO_URI. Crea backend/.env con la línea MONGO_URI=<cadena de conexión de tu base> ' +
        '(no la subas al repositorio) y vuelve a ejecutar el script.'
    );
  }
  // config/env.js exige estas variables al cargar los módulos; el script no firma tokens.
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'script-sin-uso-de-jwt-0123456789';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'script-sin-uso-de-jwt-9876543210';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'warn';
}

/** Muestra la base de datos sin credenciales: mongodb+srv://***@cluster0.abc.mongodb.net/erp */
function describeMongoUri(uri) {
  return String(uri).replace(/\/\/[^@/]+@/, '//***@').replace(/\?.*$/, '');
}

/** Pide escribir "si" (o "sí") para continuar. */
async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return ['si', 'sí'].includes(String(answer).trim().toLowerCase());
}

function formatInt(n) {
  return Number(n).toLocaleString('en-US');
}

function formatMoney(n) {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Ejecuta `main` con manejo de errores y salida con código ≠ 0 si falla. */
function runCli(main) {
  main()
    .then((code) => process.exit(code || 0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`\n✖ ${err.message}`);
      process.exit(1);
    });
}

module.exports = { parseArgs, loadBackendEnv, describeMongoUri, confirm, formatInt, formatMoney, runCli };
