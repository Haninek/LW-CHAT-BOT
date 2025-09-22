// Core data models for Rules + Intake Simulator

export type FieldId =
  | "business.legal_name" | "business.dba"
  | "business.address" | "business.city" | "business.state" | "business.zip"
  | "business.ein" | "business.start_date" | "business.website"
  | "owner.first" | "owner.last" | "owner.dob" | "owner.ssn_last4"
  | "contact.phone" | "contact.email";

export type FieldDefinition = {
  id: FieldId;
  label: string;
  required: boolean;        // for initial decisioning
  pii?: boolean;            // render secure input
  expiresDays?: number;     // e.g., address 365, email 365, EIN 9999
  validator?: (s: string) => boolean;
};

export type FieldStatus = {
  value?: string;                  // known value (if any)
  source?: "crm" | "intake" | "plaid" | "esign" | "unknown";
  lastVerifiedAt?: string;         // ISO
  confidence?: number;             // 0..1
};

export type Merchant = {
  id: string;
  status: "new" | "existing";
  fields: Partial<Record<FieldId, FieldStatus>>;
};

export type Condition =
  | { kind: "equals"; field: string; value: unknown }                      // e.g., merchant.status == "existing"
  | { kind: "missingAny"; fields: FieldId[] }                              // any field missing
  | { kind: "expiredAny"; fields: FieldId[] }                              // any field expired per registry
  | { kind: "notExpiredAll"; fields: FieldId[] }                           // all not expired
  | { kind: "and"; all: Condition[] }
  | { kind: "or"; any: Condition[] };

export type Action =
  | { type: "ask"; fields: FieldId[] }             // ask for these
  | { type: "confirm"; fields: FieldId[] }         // confirm if present
  | { type: "message"; templateId: string }        // render with tokens
  | { type: "setPersona"; style: "friendly"|"professional"|"concise" };

export type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;               // lower = earlier
  when: Condition;
  then: Action[];
};

export type Persona = { 
  id: string;
  style: "friendly"|"professional"|"concise"; 
  reading: "6th"|"8th"|"10th"; 
  emoji: "low"|"med"|"high";
  displayName: string;
  signature: string;
  disclaimer?: string;
};

export type MessageTemplate = { 
  id: string; 
  channel: "sms" | "chat";
  label: string; 
  text: string;
};  // tokens like {{business.legal_name}} {{owner.first}}

// Alias for backwards compatibility
export type Template = MessageTemplate;

// UI types
export type ResolverResult = {
  toAsk: FieldId[];
  toConfirm: FieldId[];
};

export type RuleEngineResult = {
  matched: Rule | null;
  actions: Action[];
};

export * from './analysis';
