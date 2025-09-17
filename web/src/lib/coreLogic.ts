import { FieldDefinition, FieldStatus, FieldId, Merchant, ResolverResult, Condition, Rule, RuleEngineResult } from '../types';
import { fieldRegistry } from './fieldRegistry';

// 1) "Ask-only-what's-missing" resolver
export function askOnlyWhatsMissing(
  merchant: Merchant, 
  now = new Date()
): ResolverResult {
  const toAsk: FieldId[] = [];
  const toConfirm: FieldId[] = [];

  // Get all required fields
  const requiredFields = Object.values(fieldRegistry).filter(f => f.required);

  for (const field of requiredFields) {
    const status = merchant.fields[field.id];
    
    if (!status?.value) {
      // No value → add to toAsk
      toAsk.push(field.id);
    } else if (isExpired(field, status, now)) {
      // Expired → add to toConfirm
      toConfirm.push(field.id);
    }
  }

  // Cap to max 2 prompts at a time (UX)
  const maxPrompts = 2;
  let totalPrompts = toAsk.length + toConfirm.length;
  
  if (totalPrompts > maxPrompts) {
    // Prioritize based on merchant status
    if (merchant.status === "new") {
      // New: prioritize business basics, then owner, then contact
      const priorityOrder: FieldId[] = [
        "business.legal_name", "business.address", "business.city", "business.state", "business.zip",
        "business.ein", "owner.first", "owner.last", "owner.dob", "owner.ssn_last4",
        "contact.phone", "contact.email"
      ];
      
      const sortedToAsk = toAsk.sort((a, b) => 
        priorityOrder.indexOf(a) - priorityOrder.indexOf(b)
      ).slice(0, maxPrompts);
      
      return { toAsk: sortedToAsk, toConfirm: [] };
    } else {
      // Existing: prioritize confirms first, then asks
      const limitedConfirm = toConfirm.slice(0, maxPrompts);
      const remaining = maxPrompts - limitedConfirm.length;
      const limitedAsk = remaining > 0 ? toAsk.slice(0, remaining) : [];
      
      return { toAsk: limitedAsk, toConfirm: limitedConfirm };
    }
  }

  return { toAsk, toConfirm };
}

// 2) Expiration check
export function isExpired(field: FieldDefinition, status?: FieldStatus, now = new Date()): boolean {
  if (!status?.lastVerifiedAt || !field.expiresDays) return false;
  const last = new Date(status.lastVerifiedAt);
  const ms = field.expiresDays * 86400000; // days to milliseconds
  return (now.getTime() - last.getTime()) > ms;
}

// 3) Simple rules engine
export function runRulesEngine(merchant: Merchant, rules: Rule[], now = new Date()): RuleEngineResult {
  // Sort rules by priority, skip disabled
  const activeRules = rules
    .filter(rule => rule.enabled)
    .sort((a, b) => a.priority - b.priority);

  // Evaluate conditions, return first match
  for (const rule of activeRules) {
    if (evaluateCondition(rule.when, merchant, now)) {
      return {
        matched: rule,
        actions: rule.then
      };
    }
  }

  return {
    matched: null,
    actions: []
  };
}

// Evaluate conditions recursively
function evaluateCondition(condition: Condition, merchant: Merchant, now: Date): boolean {
  switch (condition.kind) {
    case "equals":
      return getValueAtPath(merchant, condition.field) === condition.value;
      
    case "missingAny":
      return condition.fields.some(fieldId => !merchant.fields[fieldId]?.value);
      
    case "expiredAny":
      return condition.fields.some(fieldId => {
        const field = fieldRegistry[fieldId];
        const status = merchant.fields[fieldId];
        return field && isExpired(field, status, now);
      });
      
    case "notExpiredAll":
      return condition.fields.every(fieldId => {
        const field = fieldRegistry[fieldId];
        const status = merchant.fields[fieldId];
        return field && !isExpired(field, status, now);
      });
      
    case "and":
      return condition.all.every(c => evaluateCondition(c, merchant, now));
      
    case "or":
      return condition.any.some(c => evaluateCondition(c, merchant, now));
      
    default:
      return false;
  }
}

// Helper to get value from merchant at path (e.g., "merchant.status")
function getValueAtPath(merchant: Merchant, path: string): unknown {
  if (path === "merchant.status") return merchant.status;
  if (path === "merchant.id") return merchant.id;
  
  // Handle field paths like "business.legal_name"
  if (path.includes('.')) {
    const fieldId = path as FieldId;
    return merchant.fields[fieldId]?.value;
  }
  
  return undefined;
}

// Helper to check readiness (all required fields satisfied)
export function checkReadiness(merchant: Merchant, now = new Date()): boolean {
  const requiredFields = Object.values(fieldRegistry).filter(f => f.required);
  
  return requiredFields.every(field => {
    const status = merchant.fields[field.id];
    return status?.value && !isExpired(field, status, now);
  });
}