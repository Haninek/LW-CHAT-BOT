import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Check, Clock } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'
import { ConversationManager, ConversationState } from '../lib/conversation/manager'
import { fieldRegistry } from '../lib/fieldRegistry'
import { FieldId } from '../types'
import { Persona, Template, Rule, Action } from '../seeds_chad'

interface ChatMessage {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  options?: string[]
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationManager] = useState(() => new ConversationManager())
  const [currentState, setCurrentState] = useState<ConversationState>('greeting')
  const [pendingField, setPendingField] = useState<FieldId | null>(null)
  const [pendingFields, setPendingFields] = useState<FieldId[]>([])
  const [merchantContext, setMerchantContext] = useState<Record<string, any>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { updateMerchantField } = useAppStore()

  // Chad seeds helpers
  const getPersona = (): Persona => JSON.parse(localStorage.getItem("UW_PERSONA") || "{}")
  const getTemplates = (): Template[] => JSON.parse(localStorage.getItem("UW_TEMPLATES") || "[]")
  const getRules = (): Rule[] => JSON.parse(localStorage.getItem("UW_RULES") || "[]")

  const render = (tplId: string, ctx: Record<string, any>) => {
    const tpl = getTemplates().find(t => t.id === tplId)
    if (!tpl) return ""
    return tpl.text.replace(/\{\{([^}]+)\}\}/g, (_, k) => (ctx[k.trim()] ?? ""))
  }

  // Rule evaluator: runs first enabled rule whose condition matches
  function evaluateRules(context: Record<string, any>): Action[] {
    const rules = getRules().filter(r => r.enabled)
      .sort((a,b)=> a.priority - b.priority)
    
    const has = (path: string) => {
      const value = context[path]
      return value !== undefined && value !== null && value !== ""
    }
    
    const missingAny = (fields: string[]) => fields.some(f => !has(f))
    const notExpiredAll = (fields: string[]) => fields.every(f => has(f))

    const test = (c:any):boolean => {
      if (c.kind === "equals") return (context[c.field] ?? null) === c.value
      if (c.kind === "missingAny") return missingAny(c.fields)
      if (c.kind === "notExpiredAll") return notExpiredAll(c.fields)
      if (c.kind === "and") return c.all.every(test)
      if (c.kind === "or")  return c.any.some(test)
      return false
    }

    for (const r of rules) if (test(r.when)) return r.then as Action[]
    return []
  }

  // Execute Chad's rule-based actions
  const executeActions = (actions: Action[], context: Record<string, any>) => {
    for (const action of actions) {
      if (action.type === "message") {
        const message = render(action.templateId, context)
        addBotMessage(message)
      }
      if (action.type === "ask" || action.type === "confirm") {
        // Queue max 2 fields at a time
        const fields = action.fields.slice(0, 2) as FieldId[]
        if (fields.length > 0) {
          setPendingFields(fields)
          setCurrentState('collecting')
          
          // Ask for the first field
          const fieldId = fields[0]
          const field = fieldRegistry[fieldId]
          if (field) {
            const prompt = action.type === "ask" 
              ? `What's your ${field.label.toLowerCase()}?`
              : `I have your ${field.label.toLowerCase()} as ${context[fieldId] || 'unknown'}. Is this correct?`
            
            addBotMessage(prompt)
            setPendingField(fieldId)
          }
        }
        break // Only handle first ask/confirm action
      }
    }
  }

  useEffect(() => {
    // Initialize Chad with seed-based conversation
    const context = conversationManager.getContext()
    const merchant = context.merchant
    
    // Build context for rule evaluation  
    const ctx = {
      "merchant.status": merchant?.status || "new", 
      "conversation.started": false, // Track if we've started the conversation
      firstName: merchant?.fields?.['owner.first']?.value || 'there',
      lenderName: "UW Wizard", 
      intakeLink: window.location.origin + "/chat",
      recipientEmail: merchant?.fields?.['contact.email']?.value || "",
      ...Object.fromEntries(Object.entries(merchant?.fields || {}).map(([k,v]) => [k, v?.value || ""]))
    }

    setMerchantContext(ctx)

    // Start conversation with appropriate greeting
    const persona = getPersona()
    const greeting = `Hey! I'm ${persona.displayName || 'Chad'}. Are you a new merchant applying for the first time, or returning with an existing application?`
    addBotMessage(greeting, ['New merchant', 'Returning merchant'])
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const addBotMessage = (content: string, options?: string[]) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
      options
    }
    setMessages(prev => [...prev, message])
  }

  const addUserMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputText.trim()
    if (!text) return

    addUserMessage(text)
    setInputText('')
    setIsTyping(true)

    // Simulate typing delay for more natural feel
    setTimeout(() => {
      // Handle seed-driven conversation
      if (pendingField) {
        // Store the field value
        const updatedContext = {
          ...merchantContext,
          [pendingField]: text
        }
        setMerchantContext(updatedContext)
        updateMerchantField(pendingField, text, 'chat')

        // Move to next field or re-evaluate rules
        const remainingFields = pendingFields.slice(1)
        if (remainingFields.length > 0) {
          const nextFieldId = remainingFields[0]
          const field = fieldRegistry[nextFieldId]
          if (field) {
            addBotMessage(`What's your ${field.label.toLowerCase()}?`)
            setPendingField(nextFieldId)
            setPendingFields(remainingFields)
          }
        } else {
          // All fields collected, re-evaluate rules
          setPendingField(null)
          setPendingFields([])
          
          const actions = evaluateRules(updatedContext)
          if (actions.length > 0) {
            executeActions(actions, updatedContext)
          } else {
            addBotMessage("Thanks! Let me review your information.")
            setCurrentState('complete')
          }
        }
      } else {
        // Handle initial responses (new vs existing merchant)
        if (text.toLowerCase().includes('new') || text.toLowerCase().includes('first time')) {
          const updatedContext = {
            ...merchantContext,
            "merchant.status": "new",
            "conversation.started": true
          }
          setMerchantContext(updatedContext)
          
          const actions = evaluateRules(updatedContext)
          executeActions(actions, updatedContext)
        } else if (text.toLowerCase().includes('existing') || text.toLowerCase().includes('returning')) {
          const updatedContext = {
            ...merchantContext, 
            "merchant.status": "existing",
            "conversation.started": true
          }
          setMerchantContext(updatedContext)
          
          const actions = evaluateRules(updatedContext)
          executeActions(actions, updatedContext)
        } else {
          // Use legacy conversation manager for unhandled cases
          const response = conversationManager.processUserInput(text)
          addBotMessage(response.message, response.options)
          
          if (response.state) {
            setCurrentState(response.state)
          }
        }
      }
      
      setIsTyping(false)
    }, 800 + Math.random() * 1200) // Random delay for natural feel
  }

  const handleQuickReply = (option: string) => {
    handleSendMessage(option)
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getStateDisplay = () => {
    const stateLabels: Record<ConversationState, string> = {
      greeting: 'Welcome',
      identifying: 'Looking up account',
      collecting: 'Collecting information',
      confirming: 'Verifying details',
      complete: 'Application ready'
    }
    return stateLabels[currentState] || 'Chatting'
  }

  const getProgressPercentage = () => {
    const progressMap: Record<ConversationState, number> = {
      greeting: 0,
      identifying: 20,
      collecting: 60,
      confirming: 80,
      complete: 100
    }
    return progressMap[currentState] || 0
  }

  const getCollectedFields = () => {
    const context = conversationManager.getContext()
    if (!context.merchant) return []

    return Object.entries(context.merchant.fields).map(([fieldId, fieldStatus]) => ({
      fieldId: fieldId as FieldId,
      label: fieldRegistry[fieldId as FieldId]?.label || fieldId,
      value: fieldStatus.value,
      confidence: fieldStatus.confidence
    }))
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 w-full bg-slate-50">
      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-white border-r border-slate-200">
        {/* Clean Chat Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Chad</h2>
                <p className="text-sm text-slate-500">AI Funding Representative</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentState === 'complete' 
                  ? 'bg-success-100 text-success-700'
                  : currentState === 'collecting'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {getStateDisplay()}
              </div>
              <div className="w-24 bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={`${message.id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end space-x-3 max-w-sm lg:max-w-md ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  {/* Avatar */}
                  {message.type === 'bot' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
                  }`}>
                    <p className="text-sm break-words">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-primary-100' : 'text-slate-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                    
                    {/* Quick Reply Options */}
                    {message.options && message.type === 'bot' && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickReply(option)}
                            className="px-3 py-1 bg-primary-50 text-primary-700 text-xs rounded-full border border-primary-200 hover:bg-primary-100 transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-end space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-sm">
                  <div className="flex space-x-1">
                    <motion.div
                      className="w-2 h-2 bg-slate-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-slate-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-slate-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Clean Message Input */}
        <div className="border-t border-slate-200 p-6 bg-white">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message to Chad..."
                disabled={isTyping}
                className="input"
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
              className="btn-primary"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Application Progress Sidebar */}
      <div className="w-full lg:w-80 bg-white border-l border-slate-200 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center">
            <User className="w-5 h-5 mr-2 text-primary-600" />
            Application Progress
          </h3>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">

          {/* Current Field */}
          {pendingField && (
            <div className="card border-l-4 border-l-warning-500 bg-warning-50">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-warning-600 mr-2" />
                <span className="text-sm font-medium text-warning-800">Collecting</span>
              </div>
              <p className="text-sm text-warning-700 mt-1">
                {fieldRegistry[pendingField]?.label || pendingField}
              </p>
            </div>
          )}

          {/* Collected Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700">Information Collected</h4>
            {getCollectedFields().length > 0 ? (
              <div className="space-y-2">
                {getCollectedFields().map((field) => (
                  <div key={field.fieldId} className="flex items-center justify-between p-3 bg-success-50 rounded-lg border border-success-200">
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-success-600 mr-2" />
                      <span className="text-sm text-slate-900">{field.label}</span>
                    </div>
                    <span className="text-xs text-success-600 font-medium bg-success-100 px-2 py-1 rounded-full">
                      {((field.confidence || 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No information collected yet</p>
            )}
          </div>

          {/* Application Status */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Application Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentState === 'complete' 
                  ? 'bg-success-100 text-success-800'
                  : currentState === 'collecting'
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {getStateDisplay()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Removed duplicate export