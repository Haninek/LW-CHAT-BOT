import { env } from '../lib/env';
import { AppError } from '../middleware/error';

interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
  request_id: string;
}

interface PlaidExchangeTokenResponse {
  access_token: string;
  item_id: string;
  request_id: string;
}

interface PlaidTransactionsResponse {
  accounts: Array<{
    account_id: string;
    balances: {
      available: number | null;
      current: number | null;
      iso_currency_code: string;
      limit: number | null;
      unofficial_currency_code: string | null;
    };
    mask: string;
    name: string;
    official_name: string | null;
    subtype: string;
    type: string;
  }>;
  transactions: Array<{
    account_id: string;
    amount: number;
    iso_currency_code: string;
    unofficial_currency_code: string | null;
    category: string[] | null;
    category_id: string | null;
    date: string;
    datetime: string | null;
    authorized_date: string | null;
    authorized_datetime: string | null;
    location: object;
    name: string;
    merchant_name: string | null;
    payment_meta: object;
    payment_channel: string;
    pending: boolean;
    pending_transaction_id: string | null;
    account_owner: string | null;
    transaction_id: string;
    transaction_code: string | null;
    transaction_type: string;
  }>;
  total_transactions: number;
  request_id: string;
}

class PlaidService {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly secret: string;

  constructor() {
    this.clientId = env.PLAID_CLIENT_ID;
    this.secret = env.PLAID_SECRET;
    
    switch (env.PLAID_ENV) {
      case 'sandbox':
        this.baseUrl = 'https://sandbox.plaid.com';
        break;
      case 'development':
        this.baseUrl = 'https://development.plaid.com';
        break;
      case 'production':
        this.baseUrl = 'https://production.plaid.com';
        break;
      default:
        throw new AppError('Invalid PLAID_ENV configuration', 500, 'INVALID_PLAID_ENV');
    }
  }

  private async makeRequest<T>(endpoint: string, body: object): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          client_id: this.clientId,
          secret: this.secret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          `Plaid API error: ${response.status}`,
          response.status,
          'PLAID_API_ERROR',
          errorData
        );
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Failed to communicate with Plaid API',
        503,
        'PLAID_CONNECTION_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async createLinkToken(userId: string): Promise<PlaidLinkTokenResponse> {
    return this.makeRequest<PlaidLinkTokenResponse>('/link/token/create', {
      user: {
        client_user_id: userId,
      },
      client_name: 'LendWisely Chat Bot',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });
  }

  async exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    const response = await this.makeRequest<PlaidExchangeTokenResponse>('/link/token/exchange', {
      public_token: publicToken,
    });

    return {
      accessToken: response.access_token,
      itemId: response.item_id,
    };
  }

  async getTransactions(
    accessToken: string,
    startISO: string,
    endISO: string
  ): Promise<PlaidTransactionsResponse> {
    return this.makeRequest<PlaidTransactionsResponse>('/transactions/get', {
      access_token: accessToken,
      start_date: startISO,
      end_date: endISO,
    });
  }
}

export const plaidService = new PlaidService();