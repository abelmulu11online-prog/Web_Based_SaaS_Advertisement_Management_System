/**
 * email.service.js — Email delivery service using nodemailer.
 *
 * Handles SMTP configuration, branded HTML email templates, and delivery.
 * Separated from business logic for testability and reusability.
 */
import nodemailer from 'nodemailer'
import { config } from '../config/index.js'
import logger from '../utils/logger.js'

const APP_NAME   = 'GebetaPro'
const BRAND_COLOR = '#1a6b5e'   // matches --color-brand in the frontend theme
const BRAND_HOVER = '#155a4e'

// ── SMTP Transport Setup ─────────────────────────────────────────────────────

let transporter = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   config.smtp.host,
      port:   config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    })
  }
  return transporter
}

// ── Shared layout wrapper ────────────────────────────────────────────────────

/**
 * Wrap email body content in the shared GebetaPro layout.
 * @param {string} title    — <title> tag text
 * @param {string} body     — inner HTML (everything inside the card)
 * @returns {string} Complete HTML document
 */
function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #faf9f7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: #1a1917;
      padding: 40px 16px;
    }
    .wrapper { max-width: 560px; margin: 0 auto; }
    .logo {
      text-align: center;
      margin-bottom: 28px;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #1a1917;
    }
    .logo span { color: ${BRAND_COLOR}; }
    .card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e4e2dd;
      padding: 40px 36px;
    }
    h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1a1917;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
    }
    p { color: #5a5853; margin-bottom: 16px; font-size: 14px; }
    p:last-child { margin-bottom: 0; }
    .cta-wrap { text-align: center; margin: 28px 0; }
    .cta {
      display: inline-block;
      background: ${BRAND_COLOR};
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 14px 32px;
      border-radius: 10px;
      letter-spacing: 0.01em;
    }
    .url-fallback {
      background: #f5f4f1;
      border: 1px solid #e4e2dd;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      word-break: break-all;
      color: ${BRAND_COLOR};
      margin: 16px 0;
    }
    .notice {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      font-size: 13px;
      color: #92600a;
      margin: 20px 0;
    }
    .divider {
      border: none;
      border-top: 1px solid #e4e2dd;
      margin: 28px 0 20px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #9b9890;
      margin-top: 24px;
      line-height: 1.7;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">Gebeta<span>Pro</span></div>
    <div class="card">
      ${body}
      <hr class="divider" />
      <p style="font-size:12px;color:#9b9890;">
        This is an automated email from ${APP_NAME}. Please do not reply.<br/>
        If you need help, contact our support team.
      </p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} ${APP_NAME} · Ethiopia's discovery platform
    </div>
  </div>
</body>
</html>`
}

// ── Templates ────────────────────────────────────────────────────────────────

function verificationTemplate(verificationUrl, expirationHours) {
  return layout('Verify your email — GebetaPro', `
    <h2>Verify your email address</h2>
    <p>
      Welcome to <strong>${APP_NAME}</strong>! One quick step before you get started —
      please confirm your email address so we know it's really you.
    </p>
    <div class="cta-wrap">
      <a href="${verificationUrl}" class="cta">Verify my email</a>
    </div>
    <p style="font-size:13px;color:#9b9890;margin-bottom:8px;">
      Button not working? Copy and paste this link into your browser:
    </p>
    <div class="url-fallback">${verificationUrl}</div>
    <div class="notice">
      ⏱ This link expires in <strong>${expirationHours} hours</strong>.
      If it expires, you can request a new one from the verification page.
    </div>
    <p style="font-size:13px;color:#9b9890;">
      If you didn't create a ${APP_NAME} account, you can safely ignore this email.
    </p>
  `)
}

function passwordResetTemplate(resetUrl, expirationHours) {
  return layout('Reset your password — GebetaPro', `
    <h2>Reset your password</h2>
    <p>
      We received a request to reset the password for your <strong>${APP_NAME}</strong> account.
      Click the button below to choose a new password.
    </p>
    <div class="cta-wrap">
      <a href="${resetUrl}" class="cta">Reset my password</a>
    </div>
    <p style="font-size:13px;color:#9b9890;margin-bottom:8px;">
      Button not working? Copy and paste this link into your browser:
    </p>
    <div class="url-fallback">${resetUrl}</div>
    <div class="notice">
      ⏱ This link expires in <strong>${expirationHours} hour${expirationHours !== 1 ? 's' : ''}</strong>.
      After that, you'll need to request a new reset link.
    </div>
    <p style="font-size:13px;color:#9b9890;">
      If you didn't request a password reset, you can safely ignore this email.
      Your password will not be changed.
    </p>
  `)
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a verification email to the user.
 */
export async function sendVerificationEmail({ to, verificationUrl, expirationHours }) {
  try {
    const html = verificationTemplate(verificationUrl, Number(expirationHours) || 24)
    const info = await getTransporter().sendMail({
      from:    `"${APP_NAME}" <${config.smtp.from}>`,
      to,
      subject: `Verify your email — ${APP_NAME}`,
      html,
    })
    logger.info({ messageId: info.messageId, to }, 'Verification email sent')
    return true
  } catch (err) {
    logger.error({ to, error: err.message }, 'Failed to send verification email')
    return false
  }
}

/**
 * Send a password reset email to the user.
 */
export async function sendPasswordResetEmail({ to, resetUrl, expirationHours }) {
  try {
    const html = passwordResetTemplate(resetUrl, Number(expirationHours) || 1)
    const info = await getTransporter().sendMail({
      from:    `"${APP_NAME}" <${config.smtp.from}>`,
      to,
      subject: `Reset your password — ${APP_NAME}`,
      html,
    })
    logger.info({ messageId: info.messageId, to }, 'Password reset email sent')
    return true
  } catch (err) {
    logger.error({ to, error: err.message }, 'Failed to send password reset email')
    return false
  }
}

/**
 * Verify SMTP connection is working (used for health checks).
 */
export async function verifySmtpConnection() {
  try {
    await getTransporter().verify()
    logger.info('SMTP connection verified')
    return true
  } catch (err) {
    logger.error({ error: err.message }, 'SMTP connection verification failed')
    return false
  }
}
