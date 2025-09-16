import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

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
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://app.lendwizely.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.JSON_SIZE_LIMIT || '2mb' 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.JSON_SIZE_LIMIT || '2mb' 
}));

// File upload configuration
const upload = multer({
  limits: {
    fileSize: parseInt(process.env.FILE_SIZE_LIMIT?.replace('mb', '') || '25') * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  req.id = requestId;
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip} - ID: ${requestId}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ID: ${requestId}`);
  });
  
  next();
});

// Auth guard placeholder
app.use((req, res, next) => {
  // Skip auth for health endpoints and webhooks
  if (req.path === '/healthz' || req.path === '/readyz' || req.path === '/metrics' || req.path.startsWith('/sms/cherry/webhook') || req.path.startsWith('/sign/webhook')) {
    return next();
  }
  
  // TODO: Implement JWT verification
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  
  // For now, just pass through - will be implemented in Task 01
  next();
});

// Health endpoints
app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

app.get('/readyz', (_req, res) => {
  // TODO: Check database connectivity
  res.json({ ready: true });
});

app.get('/metrics', (_req, res) => {
  // TODO: Return Prometheus metrics
  res.set('Content-Type', 'text/plain');
  res.send('# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",endpoint="/healthz",status="200"} 1\n');
});

// Placeholder endpoints - will be implemented in cursor-tasks
app.post('/auth/token', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/01_scaffold_api.md' });
});

app.get('/clients', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/01_scaffold_api.md' });
});

app.post('/clients', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/01_scaffold_api.md' });
});

app.post('/sms/cherry/send', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/05_cherry_sms.md' });
});

app.post('/sms/cherry/webhook', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/05_cherry_sms.md' });
});

app.post('/intake', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/01_scaffold_api.md' });
});

app.post('/plaid/link/token', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/02_plaid_and_openai.md' });
});

app.post('/plaid/exchange', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/02_plaid_and_openai.md' });
});

app.get('/plaid/transactions', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/02_plaid_and_openai.md' });
});

app.get('/plaid/statements', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/02_plaid_and_openai.md' });
});

app.get('/plaid/statements/:statementId/download', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/02_plaid_and_openai.md' });
});

// PDF parsing endpoint - placeholder implementation
app.post('/bank/parse', upload.array('files', 3), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length !== 3) {
      return res.status(422).json({
        error: 'validation_error',
        message: 'Please upload exactly 3 PDF bank statements',
        details: {
          file_count: files?.length || 0,
          expected: 3
        }
      });
    }
    
    // TODO: Call OpenAI Responses with PDFs → normalized Metrics
    // This is a placeholder response
    const metrics = {
      avg_monthly_revenue: 0,
      avg_daily_balance_3m: 0,
      total_nsf_3m: 0,
      total_days_negative_3m: 0
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      request_id: req.id 
    });
  }
});

app.post('/offers', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/04_offers_logic.md' });
});

app.post('/background/check', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/07_background_check.md' });
});

app.get('/background/check/:checkId', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/07_background_check.md' });
});

app.post('/sign/send', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/06_signing_webhooks.md' });
});

app.post('/sign/webhook', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/06_signing_webhooks.md' });
});

app.get('/events', (req, res) => {
  res.status(501).json({ error: 'Not implemented - see cursor-tasks/06_signing_webhooks.md' });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'File size exceeds the maximum allowed limit',
        request_id: req.id
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(422).json({
        error: 'Too many files',
        message: 'Maximum 3 files allowed',
        request_id: req.id
      });
    }
  }
  
  res.status(500).json({
    error: 'Internal server error',
    request_id: req.id
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    request_id: req.id
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LendWizely AI Bot API running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/healthz`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`📚 OpenAPI spec: http://localhost:${PORT}/openapi.yaml`);
  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Copy .env.example to .env and configure API keys`);
  console.log(`   2. Run: npm run migrate`);
  console.log(`   3. Open cursor-tasks/01_scaffold_api.md in Cursor and click "Run (Agent)"`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;