import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ 
  origin: ["https://app.lendwizely.com"], 
  credentials: true 
}));

// Body parsing middleware
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Auth guard placeholder
app.use((req, res, next) => {
  // Skip auth for health checks and webhooks
  const publicPaths = ["/healthz", "/readyz", "/auth/token", "/sms/cherry/webhook", "/sign/webhook"];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // TODO: Verify Bearer JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }
  
  // Placeholder: In real implementation, verify JWT here
  next();
});

// Health check endpoints
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.get("/readyz", async (_req, res) => {
  // TODO: Check actual service dependencies
  res.json({
    ready: true,
    services: {
      database: true,
      plaid: true,
      openai: true
    }
  });
});

// Auth endpoint
app.post("/auth/token", async (req, res) => {
  const { api_key } = req.body;
  
  if (!api_key || api_key !== process.env.API_KEY_PARTNER) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  
  // TODO: Generate actual JWT
  res.json({
    token: "jwt_placeholder",
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  });
});

// File upload configuration
const upload = multer({ 
  limits: { 
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});

// Bank parsing endpoint
app.post("/bank/parse", upload.array("files", 3), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length !== 3) {
    return res.status(422).json({ 
      error: "Please upload exactly 3 PDF statements.",
      hints: ["Ensure all files are PDF format", "Upload exactly 3 bank statements"]
    });
  }
  
  // TODO: Call OpenAI Responses API with PDFs → normalized Metrics
  res.json({ 
    avg_monthly_revenue: 0, 
    avg_daily_balance_3m: 0, 
    total_nsf_3m: 0, 
    total_days_negative_3m: 0 
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File size exceeds 25MB limit" });
    }
    return res.status(400).json({ error: "File upload error" });
  }
  
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`LendWizely Bot API running on port ${PORT}`);
});