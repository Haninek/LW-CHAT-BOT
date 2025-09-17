import { Rule, Merchant, Template, Persona } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { defaultTemplates, defaultPersona } from './templates';

// Seed rules as specified in the brief
export const defaultRules: Rule[] = [
  {
    id: "r-existing",
    name: "Existing: confirm + ask missing",
    enabled: true,
    priority: 10,
    when: { kind: "equals", field: "merchant.status", value: "existing" },
    then: [
      { type: "message", templateId: "intake_welcome" },
      { type: "confirm", fields: ["business.address", "contact.email", "contact.phone"] },
      { type: "ask", fields: ["business.ein", "owner.dob", "owner.ssn_last4"] }
    ]
  },
  {
    id: "r-new",
    name: "New: basics → owner → contact",
    enabled: true,
    priority: 20,
    when: { kind: "equals", field: "merchant.status", value: "new" },
    then: [
      { type: "message", templateId: "intake_welcome" },
      { type: "ask", fields: ["business.legal_name", "business.address", "business.city", "business.state", "business.zip"] },
      { type: "ask", fields: ["business.ein", "owner.first", "owner.last", "owner.dob", "owner.ssn_last4"] },
      { type: "ask", fields: ["contact.phone", "contact.email"] }
    ]
  }
];

// Sample merchant records for testing
export const sampleMerchants: Merchant[] = [
  // New merchant - minimal data
  {
    id: "m-new-1",
    status: "new",
    fields: {}
  },
  
  // Existing merchant - partially filled, some expired
  {
    id: "m-existing-1", 
    status: "existing",
    fields: {
      "business.legal_name": {
        value: "Acme Coffee Shop LLC",
        source: "crm",
        lastVerifiedAt: "2024-01-15T10:00:00Z",
        confidence: 0.9
      },
      "business.address": {
        value: "123 Main Street",
        source: "crm", 
        lastVerifiedAt: "2023-09-15T10:00:00Z", // Expired (> 365 days)
        confidence: 0.8
      },
      "business.city": {
        value: "Anytown",
        source: "crm",
        lastVerifiedAt: "2023-09-15T10:00:00Z", // Expired
        confidence: 0.8
      },
      "business.state": {
        value: "CA",
        source: "crm",
        lastVerifiedAt: "2023-09-15T10:00:00Z", // Expired
        confidence: 0.8
      },
      "business.zip": {
        value: "12345",
        source: "crm",
        lastVerifiedAt: "2023-09-15T10:00:00Z", // Expired
        confidence: 0.8
      },
      "owner.first": {
        value: "John",
        source: "crm",
        lastVerifiedAt: "2024-01-15T10:00:00Z",
        confidence: 0.9
      },
      "owner.last": {
        value: "Smith", 
        source: "crm",
        lastVerifiedAt: "2024-01-15T10:00:00Z",
        confidence: 0.9
      },
      "contact.phone": {
        value: "5551234567",
        source: "crm",
        lastVerifiedAt: "2024-06-15T10:00:00Z",
        confidence: 0.85
      },
      "contact.email": {
        value: "john@acmecoffee.com",
        source: "crm", 
        lastVerifiedAt: "2024-06-15T10:00:00Z",
        confidence: 0.85
      }
    }
  }
];

// Initialize application with seed data
export function initializeSeedData() {
  // Check if already initialized
  if (localStorage.getItem('rules-app-initialized')) {
    return;
  }

  // Load seed data into localStorage
  localStorage.setItem('rules', JSON.stringify(defaultRules));
  localStorage.setItem('templates', JSON.stringify(defaultTemplates));
  localStorage.setItem('persona', JSON.stringify(defaultPersona));
  localStorage.setItem('merchants', JSON.stringify(sampleMerchants));
  
  // Mark as initialized
  localStorage.setItem('rules-app-initialized', 'true');
  
  console.log('✅ Rules + Intake Simulator initialized with seed data');
}

// Helper functions for localStorage operations
export const storage = {
  getRules(): Rule[] {
    try {
      return JSON.parse(localStorage.getItem('rules') || '[]');
    } catch {
      return defaultRules;
    }
  },

  setRules(rules: Rule[]) {
    localStorage.setItem('rules', JSON.stringify(rules));
  },

  getTemplates(): Template[] {
    try {
      return JSON.parse(localStorage.getItem('templates') || '[]');
    } catch {
      return defaultTemplates;
    }
  },

  setTemplates(templates: Template[]) {
    localStorage.setItem('templates', JSON.stringify(templates));
  },

  getPersona(): Persona {
    try {
      return JSON.parse(localStorage.getItem('persona') || '{}');
    } catch {
      return defaultPersona;
    }
  },

  setPersona(persona: Persona) {
    localStorage.setItem('persona', JSON.stringify(persona));
  },

  getMerchants(): Merchant[] {
    try {
      return JSON.parse(localStorage.getItem('merchants') || '[]');
    } catch {
      return sampleMerchants;
    }
  },

  setMerchants(merchants: Merchant[]) {
    localStorage.setItem('merchants', JSON.stringify(merchants));
  },

  getCurrentMerchant(): Merchant | null {
    try {
      return JSON.parse(localStorage.getItem('current-merchant') || 'null');
    } catch {
      return null;
    }
  },

  setCurrentMerchant(merchant: Merchant | null) {
    localStorage.setItem('current-merchant', JSON.stringify(merchant));
  }
};