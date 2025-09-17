import { FieldDefinition, FieldId } from '../types';

// Field registry with sensible expiresDays and required flags
export const fieldRegistry: Record<FieldId, FieldDefinition> = {
  // Business fields - required
  "business.legal_name": {
    id: "business.legal_name",
    label: "Legal Business Name",
    required: true,
    expiresDays: 9999, // rarely changes
    validator: (s) => s.trim().length >= 2
  },
  "business.dba": {
    id: "business.dba",
    label: "DBA / Trading Name",
    required: false,
    expiresDays: 365
  },
  "business.address": {
    id: "business.address",
    label: "Business Address",
    required: true,
    expiresDays: 365,
    validator: (s) => s.trim().length >= 10
  },
  "business.city": {
    id: "business.city",
    label: "City",
    required: true,
    expiresDays: 365,
    validator: (s) => s.trim().length >= 2
  },
  "business.state": {
    id: "business.state",
    label: "State",
    required: true,
    expiresDays: 365,
    validator: (s) => /^[A-Z]{2}$/.test(s.toUpperCase())
  },
  "business.zip": {
    id: "business.zip",
    label: "ZIP Code",
    required: true,
    expiresDays: 365,
    validator: (s) => /^\d{5}(-\d{4})?$/.test(s)
  },
  "business.ein": {
    id: "business.ein",
    label: "EIN (Tax ID)",
    required: true,
    expiresDays: 9999, // never expires
    validator: (s) => /^\d{9}$/.test(s.replace(/\D/g, ''))
  },
  "business.start_date": {
    id: "business.start_date",
    label: "Business Start Date",
    required: false,
    expiresDays: 9999
  },
  "business.website": {
    id: "business.website",
    label: "Website",
    required: false,
    expiresDays: 365
  },

  // Owner fields - required
  "owner.first": {
    id: "owner.first",
    label: "Owner First Name",
    required: true,
    expiresDays: 9999,
    validator: (s) => s.trim().length >= 2
  },
  "owner.last": {
    id: "owner.last",
    label: "Owner Last Name",
    required: true,
    expiresDays: 9999,
    validator: (s) => s.trim().length >= 2
  },
  "owner.dob": {
    id: "owner.dob",
    label: "Date of Birth",
    required: true,
    expiresDays: 9999, // never expires
    pii: true,
    validator: (s) => {
      const date = new Date(s);
      return !isNaN(date.getTime()) && date < new Date();
    }
  },
  "owner.ssn_last4": {
    id: "owner.ssn_last4",
    label: "Last 4 digits of SSN",
    required: true,
    expiresDays: 9999,
    pii: true,
    validator: (s) => /^\d{4}$/.test(s)
  },

  // Contact fields - required  
  "contact.phone": {
    id: "contact.phone",
    label: "Phone Number",
    required: true,
    expiresDays: 365,
    validator: (s) => /^\d{10}$/.test(s.replace(/\D/g, ''))
  },
  "contact.email": {
    id: "contact.email",
    label: "Email Address",
    required: true,
    expiresDays: 365,
    validator: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
  }
};

// Helper to get all required fields
export const getRequiredFields = (): FieldId[] => {
  return Object.values(fieldRegistry)
    .filter(field => field.required)
    .map(field => field.id);
};

// Helper to get fields by category
export const getFieldsByCategory = () => {
  const business: FieldId[] = [];
  const owner: FieldId[] = [];
  const contact: FieldId[] = [];

  Object.keys(fieldRegistry).forEach(fieldId => {
    const id = fieldId as FieldId;
    if (id.startsWith('business.')) business.push(id);
    else if (id.startsWith('owner.')) owner.push(id);
    else if (id.startsWith('contact.')) contact.push(id);
  });

  return { business, owner, contact };
};