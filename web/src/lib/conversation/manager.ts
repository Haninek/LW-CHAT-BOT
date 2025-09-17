import { Merchant, FieldId } from '../../types'
import { fieldRegistry } from '../fieldRegistry'
import { askOnlyWhatsMissing } from '../coreLogic'

export type ConversationState = 
  | 'greeting' 
  | 'identifying' 
  | 'collecting' 
  | 'confirming' 
  | 'complete'

export interface ConversationContext {
  state: ConversationState
  merchant: Merchant | null
  askedFields: Set<FieldId>
  pendingField: FieldId | null
  lastPromptId: string | null
  retryCount: number
  conversationMemory: string[]
  isNewMerchant: boolean
}

export interface BotResponse {
  message: string
  state?: ConversationState
  pendingField?: FieldId | null
  requiresInput?: boolean
  options?: string[]
}

export class ConversationManager {
  private context: ConversationContext

  constructor(initialMerchant?: Merchant) {
    this.context = {
      state: 'greeting',
      merchant: initialMerchant || null,
      askedFields: new Set(),
      pendingField: null,
      lastPromptId: null,
      retryCount: 0,
      conversationMemory: [],
      isNewMerchant: !initialMerchant
    }
  }

  public getContext(): ConversationContext {
    return { ...this.context }
  }

  public processUserInput(input: string): BotResponse {
    this.context.conversationMemory.push(`USER: ${input}`)
    
    switch (this.context.state) {
      case 'greeting':
        return this.handleGreeting(input)
      case 'identifying':
        return this.handleIdentification(input)
      case 'collecting':
        return this.handleFieldCollection(input)
      case 'confirming':
        return this.handleConfirmation(input)
      case 'complete':
        return this.handleComplete(input)
      default:
        return this.getGreeting()
    }
  }

  private handleGreeting(input: string): BotResponse {
    const lowerInput = input.toLowerCase()
    
    if (lowerInput.includes('new') || lowerInput.includes('first time')) {
      this.context.isNewMerchant = true
      this.context.state = 'collecting'
      return {
        message: "Great! Since you're new, I'll collect some basic info. Let's start with the essentials and keep it quick. What's your business legal name?",
        state: 'collecting',
        pendingField: 'business.legal_name',
        requiresInput: true
      }
    }
    
    if (lowerInput.includes('existing') || lowerInput.includes('returning') || lowerInput.includes('back')) {
      this.context.isNewMerchant = false
      this.context.state = 'identifying'
      return {
        message: "Welcome back! To pull up your info, I'll need either your email address or phone number.",
        state: 'identifying',
        requiresInput: true
      }
    }

    if (lowerInput.includes('@') || /\d{3}/.test(input)) {
      // Looks like they provided contact info directly
      this.context.isNewMerchant = false
      this.context.state = 'identifying'
      return this.handleIdentification(input)
    }

    // Default response for unclear input
    return {
      message: "No problem! Are you a new merchant applying for the first time, or are you returning with an existing application?",
      requiresInput: true,
      options: ['New merchant', 'Returning merchant']
    }
  }

  private handleIdentification(input: string): BotResponse {
    // Simple email/phone detection
    const emailMatch = input.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)
    const phoneMatch = input.match(/\d{3}.*\d{3}.*\d{4}/)

    if (emailMatch || phoneMatch) {
      // In real implementation, this would call the resolve API
      // For now, simulate found merchant
      const resolvedMerchant = this.simulateResolvedMerchant(emailMatch?.[0] || phoneMatch?.[0] || '')
      this.context.merchant = resolvedMerchant
      this.context.state = 'collecting'
      
      const { toAsk, toConfirm } = askOnlyWhatsMissing(resolvedMerchant)
      
      if (toConfirm.length > 0) {
        const fieldToConfirm = toConfirm[0]
        const field = fieldRegistry[fieldToConfirm]
        const currentValue = resolvedMerchant.fields[fieldToConfirm]?.value
        
        this.context.state = 'confirming'
        this.context.pendingField = fieldToConfirm
        
        return {
          message: `Found your account! Quick verification: ${field.label} is still "${currentValue}", right?`,
          state: 'confirming',
          pendingField: fieldToConfirm,
          requiresInput: true,
          options: ['Yes, correct', 'No, needs updating']
        }
      }
      
      if (toAsk.length > 0) {
        return this.askNextField(toAsk[0])
      }
      
      return {
        message: `Perfect! I have all your info, ${resolvedMerchant.fields['owner.first']?.value}. You're all set for your application!`,
        state: 'complete'
      }
    }

    this.context.retryCount++
    if (this.context.retryCount > 2) {
      // After too many failed attempts, treat as new merchant
      this.context.isNewMerchant = true
      this.context.state = 'collecting'
      return {
        message: "No worries! Let's start fresh. What's your business legal name?",
        state: 'collecting',
        pendingField: 'business.legal_name',
        requiresInput: true
      }
    }

    return {
      message: "I need your email address or phone number to look up your account. Can you provide one of those?",
      requiresInput: true
    }
  }

  private handleFieldCollection(input: string): BotResponse {
    // Create merchant if needed (for new merchant flow)
    if (!this.context.merchant) {
      this.context.merchant = this.createNewMerchant()
    }

    if (!this.context.pendingField) {
      return this.getNextStep()
    }

    const fieldId = this.context.pendingField
    const field = fieldRegistry[fieldId]
    
    // Validate the input
    if (field.validator && !field.validator(input.trim())) {
      this.context.retryCount++
      const errorMsg = this.getFieldErrorMessage(fieldId)
      return {
        message: `${errorMsg} Let's try that again.`,
        pendingField: fieldId,
        requiresInput: true
      }
    }

    // Store the field value
    this.updateMerchantField(fieldId, input.trim())
    this.context.askedFields.add(fieldId)
    this.context.pendingField = null
    this.context.retryCount = 0

    // Get next step
    return this.getNextStep()
  }

  private handleConfirmation(input: string): BotResponse {
    if (!this.context.pendingField) {
      return this.getNextStep()
    }

    const lowerInput = input.toLowerCase()
    const isConfirmed = lowerInput.includes('yes') || lowerInput.includes('correct') || lowerInput.includes('right')
    
    if (isConfirmed) {
      // Mark as verified and continue
      this.context.askedFields.add(this.context.pendingField)
      this.context.pendingField = null
      this.context.state = 'collecting'
      return this.getNextStep()
    } else {
      // Need to ask for updated value
      const fieldId = this.context.pendingField
      this.context.state = 'collecting'
      this.context.pendingField = fieldId
      
      return {
        message: `Got it. What's the correct ${fieldRegistry[fieldId].label}?`,
        state: 'collecting',
        pendingField: fieldId,
        requiresInput: true
      }
    }
  }

  private handleComplete(_input: string): BotResponse {
    return {
      message: "You're all set! Is there anything else I can help you with regarding your application?",
      state: 'complete'
    }
  }

  private getNextStep(): BotResponse {
    if (!this.context.merchant) {
      // Create new merchant for new applications
      this.context.merchant = this.createNewMerchant()
    }

    const { toAsk } = askOnlyWhatsMissing(this.context.merchant)
    const unaskedFields = toAsk.filter(fieldId => !this.context.askedFields.has(fieldId))
    
    if (unaskedFields.length > 0) {
      return this.askNextField(unaskedFields[0])
    }

    // All required fields collected
    const firstName = this.context.merchant.fields['owner.first']?.value || 'there'
    this.context.state = 'complete'
    
    return {
      message: `Perfect! I have everything I need, ${firstName}. Your application info is complete and ready to go!`,
      state: 'complete'
    }
  }

  private askNextField(fieldId: FieldId): BotResponse {
    const templates = this.getFieldPrompts(fieldId)
    const promptIndex = Math.min(this.context.retryCount, templates.length - 1)
    const prompt = templates[promptIndex] || templates[0]

    this.context.pendingField = fieldId
    this.context.lastPromptId = `${fieldId}_${promptIndex}`
    
    return {
      message: prompt,
      state: 'collecting',
      pendingField: fieldId,
      requiresInput: true
    }
  }

  private getFieldPrompts(fieldId: FieldId): string[] {
    // Enhanced prompts for different fields
    const prompts: Partial<Record<FieldId, string[]>> = {
      'business.legal_name': [
        "What's your business legal name?",
        "I need the legal name of your business.",
        "What's the official legal name for your business?"
      ],
      'business.address': [
        "What's your business address?",
        "I need your business street address.",
        "Where is your business located? (Street address)"
      ],
      'business.city': [
        "What city is your business in?",
        "Which city?",
        "City name?"
      ],
      'business.state': [
        "What state?",
        "Which state is your business in?",
        "State (2 letters)?"
      ],
      'business.zip': [
        "ZIP code?",
        "What's the ZIP code?",
        "ZIP?"
      ],
      'business.ein': [
        "What's your EIN? (9 digits, optional)",
        "Do you have your EIN handy?"
      ],
      'owner.first': [
        "What's your first name?",
        "First name?",
        "Your first name?"
      ],
      'owner.last': [
        "And your last name?",
        "Last name?",
        "Your last name?"
      ],
      'owner.dob': [
        "Date of birth? (MM/DD/YYYY)",
        "I need your date of birth in MM/DD/YYYY format.",
        "DOB (MM/DD/YYYY)?"
      ],
      'owner.ssn_last4': [
        "Last 4 digits of your social security number?",
        "Last 4 of your SSN?",
        "Social security number (last 4 digits only)?"
      ],
      'contact.phone': [
        "What's the best phone number to reach you?",
        "Phone number?",
        "Your phone number?"
      ],
      'contact.email': [
        "What's your email address?",
        "Email?",
        "Your email address?"
      ]
    }

    return prompts[fieldId] || [fieldRegistry[fieldId]?.label || "Please provide this information:"]
  }

  private getFieldErrorMessage(fieldId: FieldId): string {
    const errorMessages: Partial<Record<FieldId, string>> = {
      'business.legal_name': "Business name should be at least 2 characters.",
      'business.address': "Please provide a complete street address.",
      'business.state': "Please use 2-letter state code (e.g., CA, NY).",
      'business.zip': "Please enter a valid ZIP code (e.g., 12345).",
      'owner.dob': "Please use MM/DD/YYYY format (e.g., 01/15/1980).",
      'owner.ssn_last4': "Please enter exactly 4 digits.",
      'contact.phone': "Please enter a valid 10-digit phone number.",
      'contact.email': "Please enter a valid email address.",
      'business.ein': "EIN should be 9 digits."
    }

    return errorMessages[fieldId] || "That doesn't look right."
  }

  private createNewMerchant(): Merchant {
    return {
      id: 'new-merchant-' + Date.now(),
      status: 'new',
      fields: {}
    }
  }

  private simulateResolvedMerchant(contact: string): Merchant {
    // This would normally call the API, but for now return a mock merchant
    return {
      id: 'merchant-123',
      status: 'existing',
      fields: {
        'contact.email': {
          value: contact.includes('@') ? contact : '',
          source: 'intake',
          lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          confidence: 0.9
        },
        'contact.phone': {
          value: contact.includes('@') ? '' : contact,
          source: 'intake', 
          lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          confidence: 0.9
        },
        'business.legal_name': {
          value: 'Acme Coffee Co',
          source: 'crm',
          lastVerifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          confidence: 1.0
        },
        'owner.first': {
          value: 'John',
          source: 'crm',
          lastVerifiedAt: new Date().toISOString(),
          confidence: 1.0
        }
      }
    }
  }

  private updateMerchantField(fieldId: FieldId, value: string): void {
    if (!this.context.merchant) return

    this.context.merchant.fields[fieldId] = {
      value,
      source: 'intake',
      lastVerifiedAt: new Date().toISOString(),
      confidence: 1.0
    }
  }

  public getGreeting(): BotResponse {
    return {
      message: "Hi there! I'm Chad S., your LendWisely assistant. I'll help you with your funding application. Are you a new merchant or returning with an existing application?",
      state: 'greeting',
      requiresInput: true,
      options: ['New merchant', 'Returning merchant']
    }
  }
}