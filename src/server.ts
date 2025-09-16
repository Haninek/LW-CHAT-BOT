import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './lib/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { handleIdempotency } from './middleware/idempotency';
import { authenticateApiKey } from './middleware/auth';
import healthRoutes from './routes/health';
import offersRoutes from './routes/offers';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Idempotency-Key'],
}));

// Logging middleware
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '50mb', // Allow larger payloads for PDF uploads
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    (req as any).rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Idempotency middleware
app.use(handleIdempotency);

// Health check routes (no auth required)
app.use('/', healthRoutes);

// API routes (auth required)
app.use('/api', authenticateApiKey);
app.use('/api', offersRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

const port = env.PORT;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${port}/healthz`);
  });
}

export default app;