import { ClearClient } from '../services/clear-client';
import { Person } from '../types/background';

describe('ClearClient', () => {
  let clearClient: ClearClient;

  beforeEach(() => {
    clearClient = new ClearClient();
  });

  describe('searchPerson', () => {
    it('should return clean results for normal person', async () => {
      const person: Person = {
        first: 'John',
        last: 'Doe',
        dob: '1990-01-01',
        ssn4: '1234',
        email: 'john.doe@example.com',
        phone: '+15551234567',
        address: '123 Main St, City, ST 12345'
      };

      const result = await clearClient.searchPerson(person);

      expect(result).toMatchObject({
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
          provider: 'CLEAR_STUB',
        },
      });

      expect(result.search_metadata.search_id).toMatch(/^search_\d+$/);
      expect(result.search_metadata.timestamp).toBeDefined();
    });

    it('should return criminal record for person with "criminal" in name', async () => {
      const person: Person = {
        first: 'Criminal',
        last: 'Test',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.records.criminal).toHaveLength(1);
      expect(result.records.criminal[0]).toMatchObject({
        id: 'crim_001',
        type: 'Misdemeanor',
        description: 'Theft under $500',
        date: '2020-03-15',
        jurisdiction: 'County Court',
      });
    });

    it('should return multiple criminal records for person with "repeat" in name', async () => {
      const person: Person = {
        first: 'Repeat',
        last: 'Offender',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.records.criminal).toHaveLength(2);
      expect(result.records.criminal[0].type).toBe('Felony');
      expect(result.records.criminal[1].type).toBe('Misdemeanor');
    });

    it('should return OFAC hit for person with "sanctions" in name', async () => {
      const person: Person = {
        first: 'Sanctions',
        last: 'Test',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.records.OFAC).toHaveLength(1);
      expect(result.records.OFAC[0]).toMatchObject({
        id: 'ofac_001',
        list_name: 'SDN List',
        match_type: 'Strong',
        score: 95,
      });
    });

    it('should return OFAC hit for person with "ofac" in name', async () => {
      const person: Person = {
        first: 'John',
        last: 'OFAC',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.records.OFAC).toHaveLength(1);
      expect(result.records.OFAC[0].list_name).toBe('SDN List');
    });

    it('should return liens and judgments for person with "liens" in name', async () => {
      const person: Person = {
        first: 'Liens',
        last: 'Test',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.records.liens_judgments).toHaveLength(1);
      expect(result.records.liens_judgments[0]).toMatchObject({
        id: 'lj_001',
        type: 'Tax Lien',
        amount: 15000,
        date: '2022-06-30',
        jurisdiction: 'IRS',
      });
    });

    it('should return liens and judgments for person with "judgment" in name', async () => {
      const person: Person = {
        first: 'John',
        last: 'Judgment',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.records.liens_judgments).toHaveLength(1);
      expect(result.records.liens_judgments[0].type).toBe('Tax Lien');
    });

    it('should return identity mismatch for person with "mismatch" in name', async () => {
      const person: Person = {
        first: 'Identity',
        last: 'Mismatch',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.identity.name_match).toBe(false);
      expect(result.identity.dob_match).toBe(false);
      expect(result.identity.address_match).toBe(true); // Only name/dob affected
    });

    it('should return identity mismatch for person with special DOB', async () => {
      const person: Person = {
        first: 'John',
        last: 'Doe',
        dob: '1900-01-01', // Special test DOB
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.identity.name_match).toBe(false);
      expect(result.identity.dob_match).toBe(false);
    });

    it('should return address mismatch for person with "nomatch" in address', async () => {
      const person: Person = {
        first: 'John',
        last: 'Doe',
        dob: '1990-01-01',
        ssn4: '1234',
        address: '123 NoMatch Street'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.identity.name_match).toBe(true);
      expect(result.identity.dob_match).toBe(true);
      expect(result.identity.address_match).toBe(false);
    });

    it('should handle person without optional fields', async () => {
      const person: Person = {
        first: 'John',
        last: 'Doe',
        dob: '1990-01-01'
        // No ssn4, email, phone, or address
      };

      const result = await clearClient.searchPerson(person);

      expect(result).toMatchObject({
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
      });
    });

    it('should be case insensitive for trigger words', async () => {
      const person: Person = {
        first: 'CRIMINAL',
        last: 'TEST',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      expect(result.records.criminal).toHaveLength(1);
    });

    it('should handle multiple trigger conditions', async () => {
      const person: Person = {
        first: 'Criminal',
        last: 'Sanctions',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const result = await clearClient.searchPerson(person);

      // Should have both criminal record and OFAC hit
      expect(result.records.criminal).toHaveLength(1);
      expect(result.records.OFAC).toHaveLength(1);
    });

    it('should simulate network latency', async () => {
      const person: Person = {
        first: 'John',
        last: 'Doe',
        dob: '1990-01-01',
        ssn4: '1234'
      };

      const startTime = Date.now();
      await clearClient.searchPerson(person);
      const endTime = Date.now();

      // Should take at least 50ms due to simulated latency
      expect(endTime - startTime).toBeGreaterThanOrEqual(45); // Allow some tolerance
    });
  });
});