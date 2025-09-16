import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { openaiService } from '../services/openai';
import { AppError } from '../middleware/error';
import { ApiResponse } from '../types/global';
import { Metrics } from '../types/metrics';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
    files: 3, // Maximum 3 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

router.post('/parse', upload.array('files', 3), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length !== 3) {
      throw new AppError(
        'Exactly 3 PDF files are required',
        400,
        'INVALID_FILE_COUNT'
      );
    }

    // Validate file types
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      if (file.mimetype !== 'application/pdf') {
        throw new AppError(
          `File ${i + 1} must be a PDF`,
          400,
          'INVALID_FILE_TYPE'
        );
      }
    }

    // Convert files to buffers for analysis
    const fileBuffers = files.map(file => file.buffer);

    // Analyze statements using OpenAI
    const metrics = await openaiService.analyzeStatements(fileBuffers);

    // Return metrics directly (not wrapped in ApiResponse for frontend compatibility)
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

export default router;