import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Rule, Persona, Merchant, FieldId, RuleEngineResult } from '../types'
import { storage, initializeSeedData } from '../lib/seedData'

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
  persona: Persona
  setRules: (rules: Rule[]) => void
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
  
  // Initialization
  initialize: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // API Configuration
      apiConfig: {
        baseUrl: (typeof window !== 'undefined' && (window as any).ENV?.VITE_API_BASE) || 'http://localhost:8000',
        apiKey: (typeof window !== 'undefined' && (window as any).ENV?.VITE_API_KEY) || '',
        idempotencyEnabled: true
      },
      setApiConfig: (config) => set((state) => ({
        apiConfig: { ...state.apiConfig, ...config }
      })),

      // Rules - core data
      rules: [],
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
        storage.setRules(rules);
      },
      setPersona: (persona) => {
        set({ persona });
        storage.setPersona(persona);
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
        storage.setCurrentMerchant(merchant);
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

      // Initialization
      initialize: () => {
        initializeSeedData();
        const rules = storage.getRules();
        const templates = storage.getTemplates();
        const persona = storage.getPersona();
        const currentMerchant = storage.getCurrentMerchant();
        
        set({
          rules,
          templates,
          persona,
          currentMerchant
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