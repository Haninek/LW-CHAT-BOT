import { env } from '../lib/env';
import { AppError } from '../middleware/error';
import { Metrics, MetricsSchema } from '../types/metrics';

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenAIService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = env.OPENAI_API_KEY;
    this.model = env.OPENAI_MODEL_PARSE;
  }

  private async makeRequest<T>(endpoint: string, body: object): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          `OpenAI API error: ${response.status}`,
          response.status >= 500 ? 503 : 422,
          'OPENAI_API_ERROR',
          errorData
        );
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Failed to communicate with OpenAI API',
        503,
        'OPENAI_CONNECTION_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async analyzeWithRetry(files: Buffer[], maxRetries = 3): Promise<Metrics> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.performAnalysis(files);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new AppError(
      `Failed to analyze statements after ${maxRetries} attempts`,
      503,
      'ANALYSIS_RETRY_EXHAUSTED',
      lastError?.message
    );
  }

  private async performAnalysis(files: Buffer[]): Promise<Metrics> {
    // Convert buffers to base64 for API
    const base64Files = files.map(buffer => buffer.toString('base64'));

    const systemPrompt = `You are a financial analyst. Analyze the 3 bank statement PDFs and extract the following metrics in strict JSON format.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON, no markdown formatting or explanations
2. Numbers must be raw numbers (no $ signs, no commas)
3. All monetary values should be positive numbers representing absolute amounts
4. statement_month format: YYYY-MM
5. If data is unclear or missing, use reasonable estimates based on available information

Expected JSON structure:
{
  "months": [
    {
      "statement_month": "2024-01",
      "total_deposits": 5000.00,
      "avg_daily_balance": 2500.00,
      "ending_balance": 3000.00,
      "nsf_count": 0,
      "days_negative": 0
    }
  ],
  "avg_monthly_revenue": 5000.00,
  "avg_daily_balance_3m": 2500.00,
  "total_nsf_3m": 0,
  "total_days_negative_3m": 0
}`;

    const userPrompt = `Please analyze these 3 bank statement PDFs and extract the financial metrics. The files are provided as base64-encoded PDFs.

PDF 1: ${base64Files[0]?.substring(0, 100)}...
PDF 2: ${base64Files[1]?.substring(0, 100)}...
PDF 3: ${base64Files[2]?.substring(0, 100)}...

Return the metrics in the exact JSON format specified.`;

    const response = await this.makeRequest<OpenAIResponse>('/chat/completions', {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(
        'No content received from OpenAI',
        422,
        'OPENAI_NO_CONTENT'
      );
    }

    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      throw new AppError(
        'Invalid JSON response from OpenAI',
        422,
        'OPENAI_INVALID_JSON',
        content
      );
    }

    // Validate the response matches our schema
    const validationResult = MetricsSchema.safeParse(parsedContent);
    if (!validationResult.success) {
      throw new AppError(
        'OpenAI response does not match expected schema',
        422,
        'OPENAI_SCHEMA_MISMATCH',
        {
          errors: validationResult.error.errors,
          response: parsedContent
        }
      );
    }

    return validationResult.data;
  }

  async analyzeStatements(files: Buffer[]): Promise<Metrics> {
    if (files.length !== 3) {
      throw new AppError(
        'Exactly 3 PDF files are required for analysis',
        400,
        'INVALID_FILE_COUNT'
      );
    }

    // Validate file sizes (25MB limit each)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    for (let i = 0; i < files.length; i++) {
      if (files[i]!.length > maxSize) {
        throw new AppError(
          `File ${i + 1} exceeds 25MB limit`,
          400,
          'FILE_TOO_LARGE'
        );
      }
    }

    return this.analyzeWithRetry(files);
  }
}

export const openaiService = new OpenAIService();