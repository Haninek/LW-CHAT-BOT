import React, { useState, useEffect, useRef } from 'react'
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

const Chat: React.FC = () => {
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
      "true": true, // Fix for r0 rule condition
      firstName: merchant?.fields?.['owner.first']?.value || 'there',
      lenderName: "UW Wizard",
      intakeLink: window.location.origin + "/chat",
      recipientEmail: merchant?.fields?.['contact.email']?.value || "",
      ...Object.fromEntries(Object.entries(merchant?.fields || {}).map(([k,v]) => [k, v?.value || ""]))
    }

    setMerchantContext(ctx)

    // Use Chad's rules to determine initial response
    const actions = evaluateRules(ctx)
    if (actions.length > 0) {
      executeActions(actions, ctx)
    } else {
      // Fallback if no rules match
      const persona = getPersona()
      const greeting = `Hey! I'm ${persona.displayName || 'Chad'}. Are you a new merchant applying for the first time, or returning with an existing application?`
      addBotMessage(greeting, ['New merchant', 'Returning merchant'])
    }
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
            "merchant.status": "new"
          }
          setMerchantContext(updatedContext)
          
          const actions = evaluateRules(updatedContext)
          executeActions(actions, updatedContext)
        } else if (text.toLowerCase().includes('existing') || text.toLowerCase().includes('returning')) {
          const updatedContext = {
            ...merchantContext, 
            "merchant.status": "existing"
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
      {/* Main Chat Interface */}
      <div className="lg:col-span-2 glass-panel flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-700 text-white p-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 backdrop-blur-3xl"></div>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Chad</h2>
                <p className="text-indigo-100 text-sm font-medium">Your AI Funding Representative</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-indigo-100 font-medium mb-2">{getStateDisplay()}</p>
              <div className="w-36 bg-white/20 rounded-full h-2.5">
                <div 
                  className="bg-gradient-to-r from-white to-indigo-200 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
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
                <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-green-600 text-white'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
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
                            className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
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
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200">
                  <div className="flex space-x-1">
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
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

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isTyping}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-blue-600" />
          Application Progress
        </h3>

        {/* Current Field */}
        {pendingField && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-800">Collecting</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              {fieldRegistry[pendingField]?.label || pendingField}
            </p>
          </div>
        )}

        {/* Collected Fields */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Information Collected:</h4>
          {getCollectedFields().length > 0 ? (
            <div className="space-y-2">
              {getCollectedFields().map((field) => (
                <div key={field.fieldId} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-gray-900">{field.label}</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">
                    {((field.confidence || 1) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No information collected yet</p>
          )}
        </div>

        {/* Conversation State Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              currentState === 'complete' 
                ? 'bg-green-100 text-green-800'
                : currentState === 'collecting'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {getStateDisplay()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat