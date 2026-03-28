'use strict';

const logger = require('../utils/logger');

// Lazy-load AfricasTalking to avoid crash when credentials are absent in dev
let _at = null;

const getAT = () => {
  if (_at) return _at;
  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
    logger.warn('Africa\'s Talking credentials not set — SMS will be mocked');
    return null;
  }
  const AfricasTalking = require('africastalking');
  _at = AfricasTalking({
    apiKey:   process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
  });
  return _at;
};

/**
 * Normalise a Kenyan phone number to +2547XXXXXXXX format.
 * @param {string} phone
 * @returns {string}
 */
const normalisePhone = (phone) => {
  const clean = phone.replace(/\s+/g, '');
  if (clean.startsWith('+254')) return clean;
  if (clean.startsWith('07') || clean.startsWith('01')) {
    return '+254' + clean.slice(1);
  }
  return clean;
};

/**
 * Send an SMS message.
 * Falls back to console log in dev when credentials are missing.
 *
 * @param {string|string[]} to    - recipient phone(s)
 * @param {string}          message
 * @returns {Promise<{success: boolean, message_id?: string}>}
 */
const sendSMS = async (to, message) => {
  const recipients = (Array.isArray(to) ? to : [to]).map(normalisePhone);
  const sender     = process.env.AT_SENDER_ID || 'JIMOEAST';

  const at = getAT();

  // ── Mock in development ───────────────────────────────────────────────────
  if (!at || process.env.NODE_ENV === 'development') {
    logger.info(`[SMS MOCK] To: ${recipients.join(', ')}`);
    logger.info(`[SMS MOCK] Message: ${message}`);
    return { success: true, mock: true, message_id: `MOCK-${Date.now()}` };
  }

  try {
    const result = await at.SMS.send({
      to:      recipients,
      message,
      from:    sender,
    });

    const res = result.SMSMessageData?.Recipients?.[0];
    logger.info(`SMS sent to ${recipients.join(', ')} — status: ${res?.status}`);
    return { success: true, message_id: res?.messageId };
  } catch (err) {
    logger.error(`SMS send failed to ${recipients.join(', ')}: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// ─── Templated message senders ────────────────────────────────────────────────

const sendOtpSms = (phone, otp) =>
  sendSMS(phone,
    `Your Jimo East Portal verification code is: ${otp}. Valid for 10 minutes. Do NOT share this code. - Jimo East NGAO`
  );

const sendLetterApprovedSms = (phone, refNumber, letterType) =>
  sendSMS(phone,
    `Jimo East Portal: Your ${letterType} request (Ref: ${refNumber}) has been APPROVED. Log in to download your letter: jimoeast.go.ke`
  );

const sendLetterRejectedSms = (phone, refNumber, reason) =>
  sendSMS(phone,
    `Jimo East Portal: Your letter request (Ref: ${refNumber}) was not approved. Reason: ${reason || 'See portal for details'}. Visit jimoeast.go.ke to re-apply.`
  );

const sendHearingScheduledSms = (phone, refNumber, date, venue) =>
  sendSMS(phone,
    `Jimo East Portal: Your dispute (Ref: ${refNumber}) hearing is scheduled for ${date} at ${venue}. Attend with all parties and relevant documents.`
  );

const sendUrgentSecurityAlertSms = (adminPhone, type, village) =>
  sendSMS(adminPhone,
    `URGENT ALERT — Jimo East Portal: A ${type} incident has been reported in ${village}. Log in to the admin dashboard immediately: jimoeast.go.ke/admin`
  );

const sendRegistrationWelcomeSms = (phone, name) =>
  sendSMS(phone,
    `Welcome to Jimo East Chief Digital Services Portal, ${name}! You can now request letters, report issues, and track your cases at jimoeast.go.ke`
  );

module.exports = {
  sendSMS,
  sendOtpSms,
  sendLetterApprovedSms,
  sendLetterRejectedSms,
  sendHearingScheduledSms,
  sendUrgentSecurityAlertSms,
  sendRegistrationWelcomeSms,
  normalisePhone,
};
