'use strict';

const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs   = require('fs');

const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors, json } = format;

// ── Human-readable format for console ────────────────────────────────────────
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// ── Rotating file transport (daily) ──────────────────────────────────────────
const fileRotateTransport = new DailyRotateFile({
  dirname:       logDir,
  filename:      'jimo-east-%DATE%.log',
  datePattern:   'YYYY-MM-DD',
  maxSize:       '20m',
  maxFiles:      '30d',
  zippedArchive: true,
  format:        combine(timestamp(), errors({ stack: true }), json()),
});

const errorRotateTransport = new DailyRotateFile({
  dirname:       logDir,
  filename:      'errors-%DATE%.log',
  datePattern:   'YYYY-MM-DD',
  maxSize:       '20m',
  maxFiles:      '90d',
  level:         'error',
  zippedArchive: true,
  format:        combine(timestamp(), errors({ stack: true }), json()),
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    fileRotateTransport,
    errorRotateTransport,
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      dirname:  logDir,
      filename: 'exceptions-%DATE%.log',
      format:   combine(timestamp(), errors({ stack: true }), json()),
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname:  logDir,
      filename: 'rejections-%DATE%.log',
      format:   combine(timestamp(), errors({ stack: true }), json()),
    }),
  ],
});

// ── Console transport (dev only) ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'HH:mm:ss' }),
      errors({ stack: true }),
      consoleFormat,
    ),
  }));
}

// Add http level (used by morgan)
logger.http = (msg) => logger.log('http', msg);

module.exports = logger;
