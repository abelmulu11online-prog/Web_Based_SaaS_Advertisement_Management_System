/**
 * email.service.js — Email delivery service using nodemailer.
 *
 * Handles SMTP configuration, email templates, and delivery.
 * Separated from business logic for testability and reusability.
 */
import nodemailer from 'nodemailer'
import { config } from '../config/index.js'
import logger from '../utils/logger.js'

// ── SMTP Transport Setup ─────────────────────────────────────────────────────

/**
 * Create and configure the SMTP transporter.
 * Lazily initialized to avoid connection issues during startup.
 */
let transporter = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    })
  }
  return transporter
}

// ── Email Templates ───────────────────────────────────────────────────────────

/**
 * Generate the HTML verification email template.
 * @param {string} appName - Application name
 * @param {string} verificationUrl - Full verification URL with token
 * @param {string} expirationHours - Token expiration in hours
 * @returns {string} HTML email content
 */
function generateVerificationEmail(appName, verificationUrl, expirationHours) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #1d4ed8;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Email Address</h1>
    </div>
    
    <div class="content">
      <p>Thank you for registering with <strong>${appName}</strong>!</p>
      
      <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${verificationUrl}</p>
      
      <div class="warning">
        <strong>Important:</strong> This verification link will expire in ${expirationHours} hours.
      </div>
      
      <p>If you did not create an account with ${appName}, please ignore this email or contact our support team if you have concerns.</p>
      
      <p>For your security, never share your verification link with anyone.</p>
    </div>
    
    <div class="footer">
      <p>This is an automated email from ${appName}. Please do not reply to this message.</p>
      <p>If you need assistance, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a verification email to the user.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.verificationUrl - Full verification URL with token
 * @param {string} options.expirationHours - Token expiration time in hours
 * @returns {Promise<boolean>} True if email sent successfully
 */
export async function sendVerificationEmail({ to, verificationUrl, expirationHours }) {
  try {
    const transporter = getTransporter()
    
    const appName = 'Local Discovery'
    const html = generateVerificationEmail(appName, verificationUrl, expirationHours)
    
    const info = await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: `Verify Your Email - ${appName}`,
      html,
    })
    
    logger.info({ messageId: info.messageId, to }, 'Verification email sent successfully')
    return true
  } catch (err) {
    // Log error without exposing sensitive details
    logger.error(
      { 
        to,
        error: err.message,
        // Never log SMTP password or verification URL
      },
      'Failed to send verification email',
    )
    return false
  }
}

/**
 * Generate the HTML password reset email template.
 * @param {string} appName - Application name
 * @param {string} resetUrl - Full reset URL with token
 * @param {string} expirationHours - Token expiration in hours
 * @returns {string} HTML email content
 */
function generatePasswordResetEmail(appName, resetUrl, expirationHours) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #1d4ed8;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    
    <div class="content">
      <p>We received a request to reset your password for your <strong>${appName}</strong> account.</p>
      
      <p>To reset your password, click the button below:</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${resetUrl}</p>
      
      <div class="warning">
        <strong>Important:</strong> This password reset link will expire in ${expirationHours} hour(s).
      </div>
      
      <p>If you did not request a password reset, please ignore this email or contact our support team if you have concerns.</p>
      
      <p>For your security, never share your password reset link with anyone.</p>
    </div>
    
    <div class="footer">
      <p>This is an automated email from ${appName}. Please do not reply to this message.</p>
      <p>If you need assistance, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send a password reset email to the user.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.resetUrl - Full reset URL with token
 * @param {string} options.expirationHours - Token expiration time in hours
 * @returns {Promise<boolean>} True if email sent successfully
 */
export async function sendPasswordResetEmail({ to, resetUrl, expirationHours }) {
  try {
    const transporter = getTransporter()
    
    const appName = 'Local Discovery'
    const html = generatePasswordResetEmail(appName, resetUrl, expirationHours)
    
    const info = await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: `Reset Your Password - ${appName}`,
      html,
    })
    
    logger.info({ messageId: info.messageId, to }, 'Password reset email sent successfully')
    return true
  } catch (err) {
    // Log error without exposing sensitive details
    logger.error(
      { 
        to,
        error: err.message,
        // Never log SMTP password or reset URL
      },
      'Failed to send password reset email',
    )
    return false
  }
}

/**
 * Verify SMTP connection is working.
 * Useful for health checks and startup validation.
 * @returns {Promise<boolean>} True if connection successful
 */
export async function verifySmtpConnection() {
  try {
    const transporter = getTransporter()
    await transporter.verify()
    logger.info('SMTP connection verified successfully')
    return true
  } catch (err) {
    logger.error({ error: err.message }, 'SMTP connection verification failed')
    return false
  }
}
