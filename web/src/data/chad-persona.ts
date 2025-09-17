import { Persona, MessageTemplate, Rule } from '../types'

// Chad's professional persona
export const chadPersona: Persona = {
  id: "persona_chad",
  style: "friendly",
  reading: "8th",
  emoji: "low",
  displayName: "Chad",
  signature: "— Chad, UW Wizard",
  disclaimer: "Reply STOP to opt out."
}

// Professional message templates
export const chadTemplates: MessageTemplate[] = [
  {
    id: "sms_outreach_potential",
    channel: "sms",
    label: "Cold/Potential Outreach",
    text: "Hi, this is Chad with {{lenderName}}. Still looking for working capital? We can review and decide fast. Start here: {{intakeLink}}. Reply STOP to opt out."
  },
  {
    id: "sms_outreach_existing",
    channel: "sms",
    label: "Existing Outreach", 
    text: "Hey {{firstName}} — Chad at {{lenderName}}. Want me to refresh your options? Quick check here: {{intakeLink}}. Reply STOP to opt out."
  },
  {
    id: "chat_greeting_potential",
    channel: "chat",
    label: "Chat Greeting (Potential)",
    text: "Hey! I'm Chad. I'll keep this quick—just a few basics so I can line up options."
  },
  {
    id: "chat_greeting_existing",
    channel: "chat",
    label: "Chat Greeting (Existing)",
    text: "Welcome back, {{firstName}}. I'll confirm what we have and only ask for anything missing."
  },
  {
    id: "chat_confirm_address",
    channel: "chat",
    label: "Confirm Address",
    text: "Still at {{business.address}}, {{business.city}}, {{business.state}} {{business.zip}}?"
  },
  {
    id: "chat_ask_ein",
    channel: "chat",
    label: "Ask EIN",
    text: "What's your EIN (9 digits)? If you don't have it handy, you can skip for now."
  },
  {
    id: "chat_ask_owner_dob",
    channel: "chat",
    label: "Ask Owner DOB",
    text: "What's the owner's date of birth (YYYY-MM-DD)?"
  },
  {
    id: "chat_ask_owner_ssn4",
    channel: "chat",
    label: "Ask Owner SSN4", 
    text: "For identity checks, what are the last 4 of SSN?"
  },
  {
    id: "chat_docs_choice",
    channel: "chat",
    label: "Docs Choice",
    text: "Great—upload your last 3 bank statements or connect your bank securely with Plaid."
  },
  {
    id: "chat_hold_review",
    channel: "chat",
    label: "Soft Hold / Review",
    text: "Thanks for submitting. I'll have the team review and follow up shortly."
  },
  {
    id: "chat_offer_teaser",
    channel: "chat",
    label: "Offer Teaser",
    text: "Based on recent deposits and balances, here are a few options that keep daily payments comfortable."
  },
  {
    id: "chat_accept_followup",
    channel: "chat",
    label: "Accept Follow-Up",
    text: "Nice—I'll run the background checks now. If all clear, I'll send the contract to {{recipientEmail}}."
  }
]

// Professional conversation rules
export const chadRules: Rule[] = [
  {
    id: "r0-set-persona-chad",
    name: "Set persona: Chad",
    enabled: true,
    priority: 1,
    when: { kind: "equals", field: "true", value: true },
    then: [
      { type: "setPersona", style: "friendly" },
      { type: "message", templateId: "chat_greeting_potential" }
    ]
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
    then: [
      { type: "ask", fields: ["business.ein","owner.dob","owner.ssn_last4","contact.phone","contact.email"] }
    ]
  },
  {
    id: "r4-docs-step",
    name: "Docs step after basics",
    enabled: true,
    priority: 12,
    when: { kind: "notExpiredAll", fields: ["business.legal_name","contact.phone","contact.email"] },
    then: [
      { type: "message", templateId: "chat_docs_choice" }
    ]
  },
  {
    id: "r5-guardrails-hold",
    name: "Guardrails: red flags → hold",
    enabled: true,
    priority: 20,
    when: { 
      kind: "or", 
      any: [
        { kind: "equals", field: "metrics.total_nsf_3m>3", value: true },
        { kind: "equals", field: "metrics.total_days_negative_3m>6", value: true }
      ]
    },
    then: [
      { type: "message", templateId: "chat_hold_review" }
    ]
  },
  {
    id: "r6-generate-offers",
    name: "Generate offers",
    enabled: true,
    priority: 30,
    when: { 
      kind: "and", 
      all: [
        { kind: "equals", field: "docs.ready", value: true },
        { kind: "equals", field: "guardrails.clear", value: true }
      ]
    },
    then: [
      { type: "message", templateId: "chat_offer_teaser" },
      { type: "ask", fields: [] },
      { type: "message", templateId: "chat_accept_followup" }
    ]
  }
]