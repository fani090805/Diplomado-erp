'use strict';

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const emailService = require('../services/email.service');

async function main() {
  const redirectTo = (process.env.EMAIL_REDIRECT_TO || '').trim();
  if (!redirectTo) {
    console.error('No se envió el correo: configura EMAIL_REDIRECT_TO en backend/.env.');
    process.exitCode = 1;
    return;
  }

  const provider = process.env.EMAIL_PROVIDER || 'resend';
  const apiKey = provider === 'brevo' ? process.env.BREVO_API_KEY : process.env.RESEND_API_KEY;
  if (!apiKey || !process.env.EMAIL_FROM) {
    console.error(`No se envió el correo: faltan la API key o EMAIL_FROM para ${provider}.`);
    process.exitCode = 1;
    return;
  }

  const result = await emailService.sendTestEmail();
  if (result.success) {
    console.log(`Correo de prueba enviado a ${redirectTo} mediante ${provider}.`);
    return;
  }

  const message = String(result.error || 'El proveedor rechazó el correo.').replaceAll(apiKey, '[clave ocultada]');
  console.error(`No se pudo enviar el correo de prueba${result.statusCode ? ` (HTTP ${result.statusCode})` : ''}: ${message}`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`No se pudo enviar el correo de prueba: ${error.message}`);
  process.exitCode = 1;
});
