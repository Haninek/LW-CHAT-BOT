import { Person } from '../types/background';
import { AppError } from '../middleware/error';

// Raw provider response interface (what CLEAR or similar would return)
interface ClearSearchResponse {
  records: {
    criminal: Array<{
      id: string;
      type: string;
      description: string;
      date: string;
      jurisdiction: string;
    }>;
    liens_judgments: Array<{
      id: string;
      type: string;
      amount: number;
      date: string;
      jurisdiction: string;
    }>;
    OFAC: Array<{
      id: string;
      list_name: string;
      match_type: string;
      score: number;
    }>;
  };
  identity: {
    name_match: boolean;
    dob_match: boolean;
    address_match: boolean;
    ssn_match?: boolean;
  };
  search_metadata: {
    search_id: string;
    timestamp: string;
    provider: string;
  };
}

export class ClearClient {
  // Simulate async search with controlled deterministic responses for testing
  async searchPerson(person: Person): Promise<ClearSearchResponse> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 50));

    // Generate deterministic response based on person data for testing
    const response: ClearSearchResponse = {
      records: {
        criminal: [],
        liens_judgments: [],
        OFAC: [],
      },
      identity: {
        name_match: true,
        dob_match: true,
        address_match: true,
        ssn_match: true,
      },
      search_metadata: {
        search_id: `search_${Date.now()}`,
        timestamp: new Date().toISOString(),
        provider: 'CLEAR_STUB',
      },
    };

    // Create deterministic test scenarios based on person data
    const fullName = `${person.first} ${person.last}`.toLowerCase();
    
    // Test scenario: Criminal record for specific names
    if (fullName.includes('criminal') || fullName.includes('felon')) {
      response.records.criminal.push({
        id: 'crim_001',
        type: 'Misdemeanor',
        description: 'Theft under $500',
        date: '2020-03-15',
        jurisdiction: 'County Court',
      });
    }

    // Test scenario: Multiple criminal records
    if (fullName.includes('repeat')) {
      response.records.criminal.push(
        {
          id: 'crim_002',
          type: 'Felony',
          description: 'Fraud',
          date: '2019-08-22',
          jurisdiction: 'State Court',
        },
        {
          id: 'crim_003',
          type: 'Misdemeanor',
          description: 'DUI',
          date: '2021-01-10',
          jurisdiction: 'Municipal Court',
        }
      );
    }

    // Test scenario: OFAC/Sanctions hit
    if (fullName.includes('sanctions') || fullName.includes('ofac')) {
      response.records.OFAC.push({
        id: 'ofac_001',
        list_name: 'SDN List',
        match_type: 'Strong',
        score: 95,
      });
    }

    // Test scenario: Liens and judgments
    if (fullName.includes('liens') || fullName.includes('judgment')) {
      response.records.liens_judgments.push({
        id: 'lj_001',
        type: 'Tax Lien',
        amount: 15000,
        date: '2022-06-30',
        jurisdiction: 'IRS',
      });
    }

    // Test scenario: Identity mismatch
    if (fullName.includes('mismatch') || person.dob === '1900-01-01') {
      response.identity.name_match = false;
      response.identity.dob_match = false;
    }

    // Test scenario: Address mismatch
    if (person.address && person.address.toLowerCase().includes('nomatch')) {
      response.identity.address_match = false;
    }

    return response;
  }

  // In production, this would implement real CLEAR API calls:
  /*
  async searchPersonProduction(person: Person): Promise<ClearSearchResponse> {
    try {
      const response = await fetch('https://api.clearme.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLEAR_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Permissible-Purpose': 'credit_eligibility', // FCRA compliance
        },
        body: JSON.stringify({
          first_name: person.first,
          last_name: person.last,
          date_of_birth: person.dob,
          ssn_last_four: person.ssn4,
          email: person.email,
          phone: person.phone,
          address: person.address,
        }),
      });

      if (!response.ok) {
        throw new Error(`CLEAR API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new AppError(
        'Failed to search CLEAR database',
        503,
        'CLEAR_SEARCH_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
  */
}

export const clearClient = new ClearClient();