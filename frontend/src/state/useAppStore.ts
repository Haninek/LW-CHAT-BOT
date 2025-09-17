import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ClientStatus = 'new' | 'existing'

export type Client = {
  status: ClientStatus
  firstName: string
  company: string
  lastContactDays: number
  consentOptedIn: boolean
  email?: string
  phone?: string
}

export type Metrics = {
  months: Array<{
    statement_month: string
    total_deposits: number
    avg_daily_balance: number
    ending_balance: number
    nsf_count: number
    days_negative: number
  }>
  avg_monthly_revenue: number
  avg_daily_balance_3m: number
  total_nsf_3m: number
  total_days_negative_3m: number
}

export type Persona = {
  style: 'friendly' | 'professional' | 'concise'
  readingLevel: '6th' | '8th' | '10th'
  emoji: 'low' | 'medium' | 'high'
  disclaimers: { smsOptOut: boolean }
}

export type RuleCondition = 
  | { field: 'client.status', op: 'eq', value: 'new' | 'existing' }
  | { field: 'client.lastContactDays', op: 'gt' | 'lt' | 'ge' | 'le', value: number }
  | { field: 'metrics.total_nsf_3m' | 'metrics.avg_monthly_revenue' | 'metrics.total_days_negative_3m', op: 'gt' | 'ge' | 'lt' | 'le', value: number }
  | { field: 'consentOptedIn', op: 'eq', value: boolean }

export type RuleAction = 
  | { type: 'sendMessage', templateId: string }
  | { type: 'setTone', persona: 'friendly' | 'professional' | 'concise' }
  | { type: 'askForStatements' }
  | { type: 'startPlaid' }
  | { type: 'generateOffers' }
  | { type: 'scheduleFollowUp', days: number }

export type Rule = {
  id: string
  name: string
  priority: number
  enabled: boolean
  when: { op: 'AND' | 'OR', conditions: RuleCondition[] }
  then: RuleAction[]
}

export type Template = {
  id: string
  name: string
  content: string
}

export type ChatMessage = {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  actions?: RuleAction[]
}

export type ApiConfig = {
  baseUrl: string
  apiKey?: string
  idempotencyEnabled: boolean
}

export type OfferOverrides = {
  tiers: Array<{ factor: number; fee: number; term_days: number; buy_rate?: number }>
  caps: { payback_to_monthly_rev: number }
  thresholds: { max_nsf_3m: number; max_negative_days_3m: number }
}

interface AppState {
  // API Configuration
  apiConfig: ApiConfig
  setApiConfig: (config: Partial<ApiConfig>) => void
  
  // Current Client
  currentClient: Client
  setCurrentClient: (client: Client) => void
  
  // Chat State
  chatMessages: ChatMessage[]
  addChatMessage: (message: Omit<ChatMessage, 'id'>) => void
  clearChat: () => void
  
  // Rules & Templates
  rules: Rule[]
  templates: Template[]
  persona: Persona
  setRules: (rules: Rule[]) => void
  setTemplates: (templates: Template[]) => void
  setPersona: (persona: Persona) => void
  addRule: (rule: Rule) => void
  updateRule: (id: string, rule: Partial<Rule>) => void
  deleteRule: (id: string) => void
  addTemplate: (template: Template) => void
  updateTemplate: (id: string, template: Partial<Template>) => void
  deleteTemplate: (id: string) => void
  
  // Offers
  currentMetrics?: Metrics
  offerOverrides: OfferOverrides
  setCurrentMetrics: (metrics?: Metrics) => void
  setOfferOverrides: (overrides: OfferOverrides) => void
  
  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  
  // Actions
  seedDemoData: () => void
}

const defaultPersona: Persona = {
  style: 'friendly',
  readingLevel: '8th',
  emoji: 'medium',
  disclaimers: { smsOptOut: true }
}

const defaultOfferOverrides: OfferOverrides = {
  tiers: [
    { factor: 0.6, fee: 1.25, term_days: 120, buy_rate: 0.15 },
    { factor: 0.8, fee: 1.30, term_days: 140, buy_rate: 0.18 },
    { factor: 1.0, fee: 1.35, term_days: 160, buy_rate: 0.20 }
  ],
  caps: { payback_to_monthly_rev: 0.25 },
  thresholds: { max_nsf_3m: 3, max_negative_days_3m: 6 }
}

const defaultClients: Client[] = [
  {
    status: 'new',
    firstName: 'Ava',
    company: 'Maple Deli',
    lastContactDays: 999,
    consentOptedIn: true,
    email: 'ava@mapledeli.com',
    phone: '+15551234567'
  },
  {
    status: 'existing',
    firstName: 'Luis',
    company: 'Bright Auto',
    lastContactDays: 3,
    consentOptedIn: true,
    email: 'luis@brightauto.com',
    phone: '+15559876543'
  }
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // API Configuration
      apiConfig: {
        baseUrl: import.meta.env.VITE_API_BASE || 'http://localhost:5000',
        apiKey: import.meta.env.VITE_API_KEY || '',
        idempotencyEnabled: true
      },
      setApiConfig: (config) => set((state) => ({
        apiConfig: { ...state.apiConfig, ...config }
      })),
      
      // Current Client
      currentClient: defaultClients[0],
      setCurrentClient: (client) => set({ currentClient: client }),
      
      // Chat State
      chatMessages: [],
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, { ...message, id: Date.now().toString() }]
      })),
      clearChat: () => set({ chatMessages: [] }),
      
      // Rules & Templates
      rules: [],
      templates: [],
      persona: defaultPersona,
      setRules: (rules) => set({ rules }),
      setTemplates: (templates) => set({ templates }),
      setPersona: (persona) => set({ persona }),
      addRule: (rule) => set((state) => ({ rules: [...state.rules, rule] })),
      updateRule: (id, rule) => set((state) => ({
        rules: state.rules.map(r => r.id === id ? { ...r, ...rule } : r)
      })),
      deleteRule: (id) => set((state) => ({
        rules: state.rules.filter(r => r.id !== id)
      })),
      addTemplate: (template) => set((state) => ({ templates: [...state.templates, template] })),
      updateTemplate: (id, template) => set((state) => ({
        templates: state.templates.map(t => t.id === id ? { ...t, ...template } : t)
      })),
      deleteTemplate: (id) => set((state) => ({
        templates: state.templates.filter(t => t.id !== id)
      })),
      
      // Offers
      currentMetrics: undefined,
      offerOverrides: defaultOfferOverrides,
      setCurrentMetrics: (metrics) => set({ currentMetrics: metrics }),
      setOfferOverrides: (overrides) => set({ offerOverrides: overrides }),
      
      // UI State
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      // Actions
      seedDemoData: () => {
        const demoTemplates: Template[] = [
          {
            id: 'outreach_new',
            name: 'New Client Outreach',
            content: 'Hey {{firstName}} — still looking for working capital? Quick approval: {{intakeLink}}. (Takes ~2 min) 💰'
          },
          {
            id: 'outreach_existing',
            name: 'Existing Client Follow-up',
            content: 'Hi {{firstName}}! Hope {{company}} is thriving. Need more capital? We have new competitive rates. 📈'
          },
          {
            id: 'request_docs',
            name: 'Document Request',
            content: 'To tailor options for {{company}}, please upload your 3 most recent bank statements. 📄'
          },
          {
            id: 'plaid_prompt',
            name: 'Plaid Connection',
            content: 'Prefer instant verification? Connect your bank securely to speed things up. 🔒'
          },
          {
            id: 'offer_summary',
            name: 'Offer Summary',
            content: 'Based on {{company}}\'s deposits/balances, here are a few options. We\'ll keep daily payments comfortable. 💼'
          }
        ]
        
        const demoRules: Rule[] = [
          {
            id: 'rule_new_outreach',
            name: 'New Client Outreach',
            priority: 10,
            enabled: true,
            when: {
              op: 'AND',
              conditions: [{ field: 'client.status', op: 'eq', value: 'new' }]
            },
            then: [
              { type: 'sendMessage', templateId: 'outreach_new' },
              { type: 'askForStatements' },
              { type: 'startPlaid' }
            ]
          },
          {
            id: 'rule_existing_followup',
            name: 'Existing Client Follow-up',
            priority: 20,
            enabled: true,
            when: {
              op: 'AND',
              conditions: [
                { field: 'client.status', op: 'eq', value: 'existing' },
                { field: 'client.lastContactDays', op: 'gt', value: 7 }
              ]
            },
            then: [
              { type: 'sendMessage', templateId: 'outreach_existing' },
              { type: 'generateOffers' }
            ]
          }
        ]
        
        set({
          templates: demoTemplates,
          rules: demoRules
        })
      }
    }),
    {
      name: 'lendwisely-chatbot-store',
      partialize: (state) => ({
        apiConfig: state.apiConfig,
        rules: state.rules,
        templates: state.templates,
        persona: state.persona,
        offerOverrides: state.offerOverrides
      })
    }
  )
)