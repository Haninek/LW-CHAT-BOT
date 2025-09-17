// UW Wizard — Chad persona, templates, rules
// LocalStorage keys used below:
//   UW_PERSONA, UW_TEMPLATES, UW_RULES

export type Persona = { style: "friendly"|"professional"|"concise"; reading: "6th"|"8th"|"10th"; emoji: "low"|"med"|"high"; displayName: string; signature: string; disclaimer: string; };
export type Template = { id: string; channel: "sms"|"chat"; label: string; text: string; };
export type Condition =
  | { kind: "equals"; field: string; value: unknown }
  | { kind: "missingAny"; fields: string[] }
  | { kind: "notExpiredAll"; fields: string[] }
  | { kind: "or"; any: Condition[] }
  | { kind: "and"; all: Condition[] };
export type Action =
  | { type: "setPersona"; style: "friendly"|"professional"|"concise" }
  | { type: "message"; templateId: string }
  | { type: "ask"; fields: string[] }
  | { type: "confirm"; fields: string[] };
export type Rule = { id: string; name: string; enabled: boolean; priority: number; when: Condition; then: Action[]; };

export const personaChad: Persona = {
  style: "friendly",
  reading: "8th",
  emoji: "low",
  displayName: "Chad",
  signature: "— Chad, UW Wizard",
  disclaimer: "Reply STOP to opt out."
};

export const templatesChad: Template[] = [
  { id: "sms_outreach_potential", channel: "sms", label: "Cold/Potential Outreach",
    text: "Hi, this is Chad with {{lenderName}}. Still looking for working capital? We can review and decide fast. Start here: {{intakeLink}}. Reply STOP to opt out." },
  { id: "sms_outreach_existing", channel: "sms", label: "Existing Outreach",
    text: "Hey {{firstName}} — Chad at {{lenderName}}. Want me to refresh your options? Quick check here: {{intakeLink}}. Reply STOP to opt out." },

  { id: "chat_greeting_potential", channel: "chat", label: "Chat Greeting (Potential)",
    text: "Hey! I'm Chad. I'll keep this quick—just a few basics so I can line up options." },
  { id: "chat_greeting_existing",  channel: "chat", label: "Chat Greeting (Existing)",
    text: "Welcome back, {{firstName}}. I'll confirm what we have and only ask for anything missing." },

  { id: "chat_confirm_address", channel: "chat", label: "Confirm Address",
    text: "Still at {{business.address}}, {{business.city}}, {{business.state}} {{business.zip}}?" },
  { id: "chat_ask_ein", channel: "chat", label: "Ask EIN",
    text: "What's your EIN (9 digits)? If you don't have it handy, you can skip for now." },
  { id: "chat_ask_owner_dob", channel: "chat", label: "Ask Owner DOB",
    text: "What's the owner's date of birth (YYYY-MM-DD)?" },
  { id: "chat_ask_owner_ssn4", channel: "chat", label: "Ask Owner SSN4",
    text: "For identity checks, what are the last 4 of SSN?" },
  { id: "chat_docs_choice", channel: "chat", label: "Docs Choice",
    text: "Great—upload your last 3 bank statements or connect your bank securely with Plaid." },
  { id: "chat_hold_review", channel: "chat", label: "Soft Hold / Review",
    text: "Thanks for submitting. I'll have the team review and follow up shortly." },
  { id: "chat_offer_teaser", channel: "chat", label: "Offer Teaser",
    text: "Based on recent deposits and balances, here are a few options that keep daily payments comfortable." },
  { id: "chat_accept_followup", channel: "chat", label: "Accept Follow-Up",
    text: "Nice—I'll run the background checks now. If all clear, I'll send the contract to {{recipientEmail}}." }
];

export const rulesChad: Rule[] = [
  {
    id: "r0-set-persona-chad", 
    name: "Set persona: Chad",
    enabled: false, // Disable this rule - we handle greetings manually now
    priority: 1,
    when: { kind: "equals", field: "true", value: true },
    then: [ { type: "setPersona", style: "friendly" }, { type: "message", templateId: "chat_greeting_potential" } ]
  },
  {
    id: "r1-entry-potential",
    name: "Entry: Potential lead",
    enabled: true,
    priority: 5,
    when: { kind: "equals", field: "merchant.status", value: "new" },
    then: [
      { type: "message", templateId: "chat_greeting_potential" },
      { type: "ask", fields: ["business.legal_name","business.address","business.city","business.state","business.zip"] }
    ]
  },
  {
    id: "r2-entry-existing",
    name: "Entry: Existing client",
    enabled: true,
    priority: 6,
    when: { kind: "equals", field: "merchant.status", value: "existing" },
    then: [
      { type: "message", templateId: "chat_greeting_existing" },
      { type: "confirm", fields: ["business.address","business.city","business.state","business.zip","contact.phone","contact.email"] },
      { type: "ask", fields: ["business.ein","owner.dob","owner.ssn_last4"] }
    ]
  },
  {
    id: "r3-ask-only-missing",
    name: "Ask only what's missing/expired",
    enabled: true,
    priority: 9,
    when: { kind: "missingAny", fields: ["business.ein","owner.dob","owner.ssn_last4","contact.phone","contact.email"] },
    then: [ { type: "ask", fields: ["business.ein","owner.dob","owner.ssn_last4","contact.phone","contact.email"] } ]
  },
  {
    id: "r4-docs-step",
    name: "Docs step after basics",
    enabled: true,
    priority: 12,
    when: { kind: "notExpiredAll", fields: ["business.legal_name","contact.phone","contact.email"] },
    then: [ { type: "message", templateId: "chat_docs_choice" } ]
  }
];

// One-time bootstrap: merge (don't overwrite) if user already has content
export function bootstrapChadSeeds() {
  const merge = <T,>(key: string, add: T[], selector: (x:T)=>string) => {
    const cur = JSON.parse(localStorage.getItem(key) || "[]") as T[];
    const ids = new Set(cur.map(selector));
    const next = [...cur];
    add.forEach(a => { const id = selector(a); if (!ids.has(id)) next.push(a); });
    localStorage.setItem(key, JSON.stringify(next));
  };

  if (!localStorage.getItem("UW_PERSONA")) {
    localStorage.setItem("UW_PERSONA", JSON.stringify(personaChad));
  }
  merge<Template>("UW_TEMPLATES", templatesChad, (t)=>t.id);
  merge<Rule>("UW_RULES", rulesChad, (r)=>r.id);
}