import { Template, Persona, Merchant } from '../types';

// Template system with persona-based token rendering

export const defaultTemplates: Template[] = [
  {
    id: "intake_welcome",
    label: "Welcome Message",
    text: "Great to meet you! I'll grab just the basics and keep it quick."
  },
  {
    id: "confirm_address", 
    label: "Address Confirmation",
    text: "Still at {{business.address}}, {{business.city}}, {{business.state}} {{business.zip}}?"
  },
  {
    id: "ask_ein",
    label: "EIN Request",
    text: "What's your EIN (9 digits)? You can skip if you don't have it handy."
  },
  {
    id: "ask_business_name",
    label: "Business Name Request", 
    text: "What's the legal name of your business?"
  },
  {
    id: "ask_owner_info",
    label: "Owner Information Request",
    text: "I'll need some basic info about the business owner."
  },
  {
    id: "ask_contact_info",
    label: "Contact Information Request",
    text: "Finally, let's get your contact details."
  },
  {
    id: "confirm_phone",
    label: "Phone Confirmation",
    text: "Is {{contact.phone}} still the best number to reach you?"
  },
  {
    id: "confirm_email", 
    label: "Email Confirmation",
    text: "Should I send updates to {{contact.email}}?"
  },
  {
    id: "intake_complete",
    label: "Intake Complete",
    text: "Perfect! I have everything I need. {{owner.first}}, you're all set!"
  }
];

export const defaultPersona: Persona = {
  style: "friendly",
  reading: "8th", 
  emoji: "med"
};

// Token rendering with persona application
export function renderTemplate(
  templateText: string, 
  merchant: Merchant, 
  persona: Persona = defaultPersona
): string {
  // Replace tokens like {{business.legal_name}} with actual values
  let rendered = templateText.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getFieldValue(merchant, path.trim());
    return value || "";
  });

  // Apply persona styling
  rendered = applyPersona(rendered, persona);

  return rendered;
}

function getFieldValue(merchant: Merchant, path: string): string {
  // Handle field paths like "business.legal_name"
  if (path.includes('.')) {
    const fieldId = path as keyof typeof merchant.fields;
    return merchant.fields[fieldId]?.value || "";
  }
  
  // Handle merchant properties
  if (path === "merchant.status") return merchant.status;
  if (path === "merchant.id") return merchant.id;
  
  return "";
}

function applyPersona(text: string, persona: Persona): string {
  let result = text;
  
  // Apply style modifications
  switch (persona.style) {
    case "friendly":
      // Add contractions and casual tone
      result = result
        .replace(/\bI will\b/g, "I'll")
        .replace(/\bYou are\b/g, "You're") 
        .replace(/\bWe will\b/g, "We'll")
        .replace(/\bThat is\b/g, "That's")
        .replace(/\bIt is\b/g, "It's");
      break;
      
    case "professional":
      // Ensure formal tone, remove contractions
      result = result
        .replace(/\bI'll\b/g, "I will")
        .replace(/\bYou're\b/g, "You are")
        .replace(/\bWe'll\b/g, "We will")  
        .replace(/\bThat's\b/g, "That is")
        .replace(/\bIt's\b/g, "It is");
      break;
      
    case "concise":
      // Shorter sentences, remove filler words
      result = result
        .replace(/\bGreat to meet you!\s*/g, "")
        .replace(/\bI'll grab just\b/g, "Need")
        .replace(/\band keep it quick\b/g, "");
      break;
  }
  
  // Apply reading level (simplified implementation)
  switch (persona.reading) {
    case "6th":
      // Use simpler words
      result = result
        .replace(/\bestablishment\b/g, "business")
        .replace(/\binformation\b/g, "info")
        .replace(/\brequire\b/g, "need");
      break;
    case "10th":
      // Use more sophisticated vocabulary  
      result = result
        .replace(/\binfo\b/g, "information")
        .replace(/\bget\b/g, "obtain")
        .replace(/\bneed\b/g, "require");
      break;
    // 8th grade is default, no changes needed
  }
  
  // Apply emoji level
  if (persona.emoji === "high") {
    // Add emojis to friendly messages
    if (persona.style === "friendly") {
      if (result.includes("Great to meet you")) result = result.replace("Great to meet you!", "Great to meet you! 👋");
      if (result.includes("Perfect!")) result = result.replace("Perfect!", "Perfect! ✅");  
      if (result.includes("you're all set")) result = result.replace("you're all set!", "you're all set! 🎉");
    }
  } else if (persona.emoji === "low") {
    // Remove any emojis
    result = result.replace(/[\u{1F600}-\\u{1F64F}]|[\\u{1F300}-\\u{1F5FF}]|[\\u{1F680}-\u{1F6FF}]|[\\u{1F1E0}-\\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\\u{2700}-\u{27BF}]/gu, '').trim();
  }
  // Med emoji level keeps existing emojis but doesn't add new ones
  
  return result;
}

// Helper to get template by ID
export function getTemplate(templateId: string, templates: Template[] = defaultTemplates): Template | null {
  return templates.find(t => t.id === templateId) || null;
}

// Helper to render a template by ID
export function renderTemplateById(
  templateId: string,
  merchant: Merchant,
  persona: Persona = defaultPersona,
  templates: Template[] = defaultTemplates  
): string {
  const template = getTemplate(templateId, templates);
  if (!template) return `Template '${templateId}' not found`;
  
  return renderTemplate(template.text, merchant, persona);