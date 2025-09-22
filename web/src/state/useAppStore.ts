import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Rule, Persona, Merchant, FieldId, RuleEngineResult, Template } from '../types'
// Simplified state management without external dependencies

const getEnvValue = (key: string): string | undefined => {
  if (typeof window !== 'undefined') {
    const win = window as any
    if (win.ENV?.[key]) return win.ENV[key]
    if (win[key]) return win[key]
  }

  try {
    const meta = import.meta as any
    if (meta?.env?.[key]) {
      return meta.env[key]
    }
  } catch (error) {
    // Ignore environments where import.meta is undefined
  }

  const globalAny = globalThis as any
  if (globalAny?.ENV?.[key]) return globalAny.ENV[key]
  if (globalAny?.[key]) return globalAny[key]

  return undefined
}

// Use Replit domain for API calls in cloud environment
const getApiBaseUrl = () => {
  const replitDomain = getEnvValue('REPLIT_DEV_DOMAIN') || getEnvValue('REPLIT_DOMAINS')
  if (replitDomain) {
    return `https://${replitDomain.split(',')[0]}:8000`
  }
  return getEnvValue('VITE_API_BASE') || 'http://localhost:8000'
}

const defaultBaseUrl = getApiBaseUrl()
const defaultApiKey = getEnvValue('VITE_API_KEY') || ''

export type ChatMessage = {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  actions?: string[] // action types that were triggered
}

export type ApiConfig = {
  baseUrl: string
  apiKey?: string
  idempotencyEnabled: boolean
}

export type IntakeStep = {
  id: string
  type: 'message' | 'ask' | 'confirm'
  content: string
  fields?: FieldId[]
  completed: boolean
}

interface AppState {
  // API Configuration
  apiConfig: ApiConfig
  setApiConfig: (config: Partial<ApiConfig>) => void
  
  // Rules - core data
  rules: Rule[]
  templates: Template[]
  persona: Persona
  setRules: (rules: Rule[]) => void
  setTemplates: (templates: Template[]) => void
  setPersona: (persona: Persona) => void
  addRule: (rule: Rule) => void
  updateRule: (id: string, rule: Partial<Rule>) => void
  deleteRule: (id: string) => void
  reorderRules: (rules: Rule[]) => void
  
  // Merchant Management
  currentMerchant: Merchant | null
  setCurrentMerchant: (merchant: Merchant | null) => void
  updateMerchantField: (fieldId: FieldId, value: string, source?: string) => void
  
  // Intake Simulator State
  intakeSteps: IntakeStep[]
  currentStepIndex: number
  chatMessages: ChatMessage[]
  addChatMessage: (message: Omit<ChatMessage, 'id'>) => void
  clearChat: () => void
  setIntakeSteps: (steps: IntakeStep[]) => void
  advanceStep: () => void
  resetIntake: () => void
  
  // Rules Engine Testing
  lastRuleResult: RuleEngineResult | null
  setLastRuleResult: (result: RuleEngineResult) => void
  
  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  
  // Metrics and Offers State
  currentMetrics: any
  setCurrentMetrics: (metrics: any) => void
  offerOverrides: any
  setOfferOverrides: (overrides: any) => void
  
  // Initialization
  initialize: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // API Configuration - Use direct backend connection for Replit
      apiConfig: {
        baseUrl: defaultBaseUrl,
        apiKey: defaultApiKey,
        idempotencyEnabled: true
      },
      setApiConfig: (config) => set((state) => ({
        apiConfig: { ...state.apiConfig, ...config }
      })),

      // Rules - core data
      rules: [],
      templates: [],
      persona: { 
        id: 'default',
        displayName: 'Chad - AI Assistant',
        signature: 'Best regards,\nChad',
        style: "friendly", 
        reading: "8th", 
        emoji: "med" 
      },
      setRules: (rules) => {
        set({ rules });
        // Rules stored in memory
      },
      setTemplates: (templates) => {
        set({ templates });
        // Templates stored in memory
      },
      setPersona: (persona) => {
        set({ persona });
        // Persona stored in memory
      },
      addRule: (rule) => {
        const newRules = [...get().rules, rule];
        get().setRules(newRules);
      },
      updateRule: (id, rule) => {
        const newRules = get().rules.map(r => r.id === id ? { ...r, ...rule } : r);
        get().setRules(newRules);
      },
      deleteRule: (id) => {
        const newRules = get().rules.filter(r => r.id !== id);
        get().setRules(newRules);
      },
      reorderRules: (rules) => {
        get().setRules(rules);
      },

      // Merchant Management
      currentMerchant: null,
      setCurrentMerchant: (merchant) => {
        set({ currentMerchant: merchant });
        // Merchant stored in memory"
      },
      updateMerchantField: (fieldId, value, source = 'intake') => {
        const merchant = get().currentMerchant;
        if (!merchant) return;

        const updatedMerchant: Merchant = {
          ...merchant,
          fields: {
            ...merchant.fields,
            [fieldId]: {
              value,
              source,
              lastVerifiedAt: new Date().toISOString(),
              confidence: 1.0
            }
          }
        };
        get().setCurrentMerchant(updatedMerchant);
      },

      // Intake Simulator State
      intakeSteps: [],
      currentStepIndex: 0,
      chatMessages: [],
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, { ...message, id: Date.now().toString() }]
      })),
      clearChat: () => set({ chatMessages: [], intakeSteps: [], currentStepIndex: 0 }),
      setIntakeSteps: (steps) => set({ intakeSteps: steps, currentStepIndex: 0 }),
      advanceStep: () => set((state) => ({
        currentStepIndex: Math.min(state.currentStepIndex + 1, state.intakeSteps.length - 1)
      })),
      resetIntake: () => set({ intakeSteps: [], currentStepIndex: 0 }),

      // Rules Engine Testing
      lastRuleResult: null,
      setLastRuleResult: (result) => set({ lastRuleResult: result }),

      // UI State
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      // Metrics and Offers State
      currentMetrics: null,
      setCurrentMetrics: (metrics) => set({ currentMetrics: metrics }),
      offerOverrides: {},
      setOfferOverrides: (overrides) => set({ offerOverrides: overrides }),

      // Initialization
      initialize: () => {
        // Initialize with default values
        set({
          rules: [],
          templates: [],
          persona: { id: 'default', name: 'Chad', role: 'AI Assistant' },
          currentMerchant: null
        });
      }
    }),
    {
      name: 'rules-intake-store',
      partialize: (state) => ({
        apiConfig: state.apiConfig,
        sidebarOpen: state.sidebarOpen
      })
    }
  )
)