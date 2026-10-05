'use strict';

const https = require('https');
const logger = require('../config/logger');

const BRAND = {
  cream: '#F5EEDB',
  background: '#F7F3E8',
  olive: '#334024',
  sage: '#C0CB87',
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function renderEmail({ title, greeting, paragraphs = [], details = [], button }) {
  const detailRows = details
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#696B61;font-size:14px;font-weight:bold;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#1E2616;font-size:14px;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');
  const paragraphHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#55584F;font-size:15px;line-height:1.6;">${paragraph}</p>`
    )
    .join('');
  const buttonHtml = button
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 8px;">
        <tr><td align="center" bgcolor="${BRAND.olive}" style="border-radius:10px;">
          <a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 28px;color:${BRAND.cream};font-size:15px;font-weight:bold;text-decoration:none;border-radius:10px;">${escapeHtml(button.label)}</a>
        </td></tr>
      </table>`
    : '';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:${BRAND.background};font-family:Arial,Helvetica,sans-serif;color:#1E2616;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${BRAND.background}" style="width:100%;background-color:${BRAND.background};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="width:100%;max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
        <tr><td align="center" bgcolor="${BRAND.olive}" style="padding:28px 24px;background-color:${BRAND.olive};text-align:center;">
          <div style="color:${BRAND.cream};font-size:30px;font-weight:bold;line-height:1.1;">FAI</div>
          <div style="margin-top:6px;color:${BRAND.sage};font-size:10px;font-weight:bold;letter-spacing:3px;">SOLUTION ERP</div>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          <h1 style="margin:0 0 18px;color:${BRAND.olive};font-size:24px;line-height:1.3;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 16px;color:#1E2616;font-size:15px;line-height:1.6;">${greeting}</p>
          ${paragraphHtml}
          ${
            details.length
              ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-collapse:collapse;">${detailRows}</table>`
              : ''
          }
          ${buttonHtml}
        </td></tr>
        <tr><td align="center" style="padding:20px 24px;border-top:1px solid #E6E0D0;color:#696B61;font-size:12px;line-height:1.5;text-align:center;">
          FAI Solution ERP · Este es un correo automático, no respondas a este mensaje.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function getProviderConfig() {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  const apiKey =
    provider === 'brevo'
      ? process.env.BREVO_API_KEY
      : provider === 'resend'
        ? process.env.RESEND_API_KEY
        : undefined;
  const fromEmail = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME || 'FAI Solution ERP';
  return { provider, apiKey, fromEmail, fromName };
}

function sendEmail({ to, subject, html }) {
  const { provider, apiKey, fromEmail, fromName } = getProviderConfig();
  if (!apiKey || !fromEmail) {
    logger.info({ to, subject }, '[email.service] omitiendo envío; configuración de correo incompleta.');
    return Promise.resolve({ success: true, simulated: true });
  }

  if (provider !== 'resend' && provider !== 'brevo') {
    logger.error({ provider }, '[email.service] Proveedor de correo no válido.');
    return Promise.resolve({ success: false });
  }

  const recipients = (Array.isArray(to) ? to : [to]).filter((recipient) => recipient?.email);
  if (recipients.length === 0) {
    logger.info({ subject }, '[email.service] omitiendo envío; no hay destinatarios.');
    return Promise.resolve({ success: true, simulated: true });
  }

  const isBrevo = provider === 'brevo';
  const payload = JSON.stringify(
    isBrevo
      ? {
          sender: { name: fromName, email: fromEmail },
          to: recipients.map((recipient) => ({
            email: recipient.email,
            ...(recipient.name ? { name: recipient.name } : {}),
          })),
          subject,
          htmlContent: html,
        }
      : {
          from: `${fromName} <${fromEmail}>`,
          to: recipients.map((recipient) => recipient.email),
          subject,
          html,
        }
  );
  const options = {
    hostname: isBrevo ? 'api.brevo.com' : 'api.resend.com',
    path: isBrevo ? '/v3/smtp/email' : '/emails',
    method: 'POST',
    headers: {
      ...(isBrevo ? { 'api-key': apiKey } : { Authorization: `Bearer ${apiKey}` }),
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve) => {
    const request = https.request(options, (response) => {
      let responseBody = '';
      response.on('data', (chunk) => {
        responseBody += chunk;
      });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          logger.info({ provider, subject }, '[email.service] Correo enviado.');
          resolve({ success: true });
          return;
        }
        logger.error(
          { provider, statusCode: response.statusCode, response: responseBody },
          '[email.service] Falló el envío de correo.'
        );
        resolve({ success: false, statusCode: response.statusCode });
      });
    });

    request.on('error', (error) => {
      logger.error({ provider, error: error.message }, '[email.service] Falló la solicitud de correo.');
      resolve({ success: false, error: error.message });
    });
    request.write(payload);
    request.end();
  });
}

function sendRegistrationReceived({ email, name, companyName }) {
  return sendEmail({
    to: { email, name },
    subject: 'Recibimos tu solicitud',
    html: renderEmail({
      title: 'Recibimos tu solicitud',
      greeting: `Hola ${escapeHtml(name || 'te damos la bienvenida')},`,
      paragraphs: [
        `un administrador de ${escapeHtml(companyName || 'tu empresa')} revisará tu acceso. Te avisaremos cuando tu cuenta esté lista.`,
      ],
    }),
  });
}

function sendNewPendingUserToAdmins({ admins = [], userName, userEmail, companyName }) {
  return sendEmail({
    to: admins.map((admin) => ({
      email: admin.email,
      name: `${admin.name || ''} ${admin.lastName || ''}`.trim(),
    })),
    subject: 'Nueva solicitud de acceso',
    html: renderEmail({
      title: 'Nueva solicitud de acceso',
      greeting: `Hola,`,
      paragraphs: [
        `${escapeHtml(userName || 'Una persona')} (${escapeHtml(userEmail)}) solicitó acceso a ${escapeHtml(companyName || 'tu empresa')}.`,
      ],
      button: { label: 'Revisar solicitudes', url: process.env.APP_URL || '#' },
    }),
  });
}

function sendWelcomeEmail({ email, name, companyName, roleName }) {
  return sendEmail({
    to: { email, name },
    subject: 'Bienvenido a FAI Solution ERP',
    html: renderEmail({
      title: 'Bienvenido a FAI Solution ERP',
      greeting: `Hola ${escapeHtml(name || 'Colaborador')},`,
      paragraphs: ['Tu acceso a FAI Solution ERP ya está listo.'],
      details: [
        ['Correo', email],
        ['Empresa', companyName || ''],
        ['Rol', roleName || ''],
      ],
      button: { label: 'Ingresar', url: process.env.APP_URL || '#' },
    }),
  });
}

function sendPasswordResetEmail({ email, name, resetUrl }) {
  return sendEmail({
    to: { email, name },
    subject: 'Restablece tu contraseña',
    html: renderEmail({
      title: 'Restablece tu contraseña',
      greeting: `Hola ${escapeHtml(name || 'Colaborador')},`,
      paragraphs: [
        'Usa el siguiente botón para crear una nueva contraseña. El enlace vence en 30 minutos.',
        'Si no solicitaste este cambio, ignora este correo.',
      ],
      button: { label: 'Crear nueva contraseña', url: resetUrl },
    }),
  });
}

function sendPasswordChangedEmail({ email, name }) {
  return sendEmail({
    to: { email, name },
    subject: 'Tu contraseña fue cambiada',
    html: renderEmail({
      title: 'Tu contraseña fue cambiada',
      greeting: `Hola ${escapeHtml(name || 'Colaborador')},`,
      paragraphs: ['La contraseña de tu cuenta fue cambiada correctamente.', 'Si no fuiste tú, contacta a tu administrador.'],
    }),
  });
}

function sendLoginNotification({ email, name, ip }) {
  if (process.env.LOGIN_NOTIFICATIONS !== 'true') {
    return Promise.resolve({ success: true, skipped: true });
  }
  const date = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  return sendEmail({
    to: { email, name },
    subject: 'Notificación de inicio de sesión',
    html: renderEmail({
      title: 'Inicio de sesión detectado',
      greeting: `Hola ${escapeHtml(name || email)},`,
      paragraphs: ['Se inició sesión correctamente en tu cuenta de FAI Solution ERP.'],
      details: [
        ['Correo', email],
        ['Fecha y hora', date],
        ...(ip ? [['Dirección IP', ip]] : []),
      ],
    }),
  });
}

module.exports = {
  sendEmail,
  sendRegistrationReceived,
  sendNewPendingUserToAdmins,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendLoginNotification,
};
