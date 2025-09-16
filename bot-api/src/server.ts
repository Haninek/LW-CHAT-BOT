import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './lib/error-handler.js';
import { requestLogger } from './lib/request-logger.js';
import { authMiddleware } from './lib/auth.js';

// Import routes
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { clientRoutes } from './routes/clients.js';
import { smsRoutes } from './routes/sms.js';
import { intakeRoutes } from './routes/intake.js';
import { plaidRoutes } from './routes/plaid.js';
import { bankRoutes } from './routes/bank.js';
import { offerRoutes } from './routes/offers.js';
import { backgroundRoutes } from './routes/background.js';
import { signRoutes } from './routes/sign.js';
import { eventRoutes } from './routes/events.js';
import { metricsRoutes } from './routes/metrics.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: config.server.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.server.maxRequestSize }));

// Request logging
app.use(requestLogger);

// Health check routes (no auth required)
app.use('/healthz', healthRoutes);
app.use('/readyz', healthRoutes);
app.use('/metrics', metricsRoutes);

// Authentication routes (no auth required)
app.use('/auth', authRoutes);

// Webhook routes (no auth required, but signature verification)
app.use('/sms/cherry/webhook', smsRoutes);
app.use('/sign/webhook', signRoutes);

// Protected routes
app.use(authMiddleware);

// API routes
app.use('/clients', clientRoutes);
app.use('/sms/cherry', smsRoutes);
app.use('/intake', intakeRoutes);
app.use('/plaid', plaidRoutes);
app.use('/bank', bankRoutes);
app.use('/offers', offerRoutes);
app.use('/background', backgroundRoutes);
app.use('/sign', signRoutes);
app.use('/events', eventRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.server.port, () => {
  logger.info(`🚀 LendWizely AI Bot API running on port ${config.server.port}`);
  logger.info(`📊 Environment: ${config.server.nodeEnv}`);
  logger.info(`🔗 CORS origin: ${config.cors.origin}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;