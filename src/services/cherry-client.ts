import { env } from '../lib/env';
import { AppError } from '../middleware/error';

interface CherryGroupResponse {
  success: boolean;
  message_id?: string;
  group_id: string;
  sent_count: number;
  error?: string;
}

interface CherryBulkResponse {
  success: boolean;
  message_id?: string;
  sent_count: number;
  failed_numbers?: string[];
  error?: string;
}

export class CherryClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl || env.CHERRY_BASE_URL).replace(/\/$/, '');
    this.apiKey = apiKey || env.CHERRY_API_KEY || '';

    // Only require API key in production or when actually making requests
    if (!this.apiKey && env.NODE_ENV === 'production') {
      throw new AppError(
        'Cherry API key is required in production',
        500,
        'CHERRY_API_KEY_MISSING'
      );
    }
  }

  private async makeRequest<T>(endpoint: string, body: object): Promise<T> {
    if (!this.apiKey) {
      throw new AppError(
        'Cherry API key is required for making requests',
        500,
        'CHERRY_API_KEY_MISSING'
      );
    }

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

      const responseData = await response.json();

      if (!response.ok) {
        throw new AppError(
          `Cherry API error: ${response.status}`,
          response.status >= 500 ? 503 : 422,
          'CHERRY_API_ERROR',
          responseData
        );
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        'Failed to communicate with Cherry SMS API',
        503,
        'CHERRY_CONNECTION_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async sendGroup(groupId: string, message: string): Promise<CherryGroupResponse> {
    if (!groupId.trim()) {
      throw new AppError(
        'Group ID is required',
        400,
        'INVALID_GROUP_ID'
      );
    }

    if (!message.trim()) {
      throw new AppError(
        'Message is required',
        400,
        'INVALID_MESSAGE'
      );
    }

    return this.makeRequest<CherryGroupResponse>('/send_group_sms', {
      group_id: groupId,
      message: message.trim(),
    });
  }

  async sendNumbers(numbers: string[], message: string): Promise<CherryBulkResponse> {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      throw new AppError(
        'At least one phone number is required',
        400,
        'INVALID_NUMBERS'
      );
    }

    if (!message.trim()) {
      throw new AppError(
        'Message is required',
        400,
        'INVALID_MESSAGE'
      );
    }

    // Validate phone number format (basic validation)
    const invalidNumbers = numbers.filter(num => {
      const cleaned = num.replace(/\D/g, '');
      return cleaned.length < 10 || cleaned.length > 15;
    });

    if (invalidNumbers.length > 0) {
      throw new AppError(
        `Invalid phone number format: ${invalidNumbers.join(', ')}`,
        400,
        'INVALID_PHONE_FORMAT',
        { invalid_numbers: invalidNumbers }
      );
    }

    return this.makeRequest<CherryBulkResponse>('/send_bulk_sms', {
      numbers: numbers.map(num => num.trim()),
      message: message.trim(),
    });
  }

  // Helper method to normalize phone numbers to E.164 format
  static normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it's a US number without country code, add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it's already 11 digits starting with 1, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it already starts with +, return as is (assume it's properly formatted)
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // For other lengths, assume international and add +
    return `+${digits}`;
  }
}

export const cherryClient = new CherryClient();