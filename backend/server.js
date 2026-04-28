'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path         = require('path');

const connectDB        = require('./config/db');
const { swaggerUi, swaggerSpec } = require('./config/swagger');
const logger           = require('./utils/logger');
const errorHandler     = require('./middlewares/errorHandler');

// ─── Route imports ───────────────────────────────────────────────────────────
const authRoutes          = require('./routes/auth');
const lettersRoutes       = require('./routes/letters');
const disputesRoutes      = require('./routes/disputes');
const securityRoutes      = require('./routes/security');
const illicitRoutes       = require('./routes/illicit');
const announcementsRoutes = require('./routes/announcements');
const adminRoutes         = require('./routes/admin');
const notificationsRoutes = require('./routes/notifications');

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

const app = express();
app.disable('x-powered-by');

// ─── Trust proxy (needed behind Nginx / load balancer) ───────────────────────
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow file downloads
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowVercelPreviews = String(process.env.ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';
const extraOriginRegex = process.env.ALLOWED_ORIGIN_REGEX
  ? new RegExp(process.env.ALLOWED_ORIGIN_REGEX)
  : null;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (allowVercelPreviews && /\.vercel\.app$/i.test(origin)) return callback(null, true);
    if (extraOriginRegex && extraOriginRegex.test(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit hit: ${req.ip} → ${req.originalUrl}`);
    res.status(429).json(options.message);
  },
});
app.use(globalLimiter);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Sanitize MongoDB query injection ────────────────────────────────────────
app.use(mongoSanitize());

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Request Logging ──────────────────────────────────────────────────────────
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === '/health',
}));

// ─── Static Files (uploaded evidence & generated PDFs) ───────────────────────
const uploadPath = path.resolve(process.env.UPLOAD_PATH || (process.env.VERCEL === '1' ? '/tmp/uploads' : path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(uploadPath));

// ─── Swagger API Docs ─────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background: #1B4332; }',
  customSiteTitle: 'Jimo East API Docs',
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status:  'OK',
    service: 'Jimo East Chief Digital Services API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/letters',       lettersRoutes);
app.use('/api/disputes',      disputesRoutes);
app.use('/api/security',      securityRoutes);
app.use('/api/illicit',       illicitRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationsRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Centralized Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

let server;

// ─── Start Server (non-serverless runtime) ───────────────────────────────────
const startServer = () => {
  const PORT = process.env.PORT || 5000;
  server = app.listen(PORT, () => {
    logger.info(`🚀 Jimo East API running on port ${PORT} [${process.env.NODE_ENV}]`);
    logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    logger.info(`💚 Health:   http://localhost:${PORT}/health`);
  });
};

// Vercel / serverless environments should export the app without opening a port.
if (process.env.VERCEL !== '1') {
  startServer();
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  if (!server) return process.exit(0);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─── Unhandled Promise Rejections ─────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  if (!server) return process.exit(1);
  server.close(() => process.exit(1));
});

module.exports = app; // for testing
