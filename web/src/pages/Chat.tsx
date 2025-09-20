import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Check, Clock, MessageSquare, Sparkles, Zap } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'
// Simplified chat without external dependencies
import { FieldId } from '../types'

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
  // Simplified conversation state without external manager
  const [currentState, setCurrentState] = useState('greeting')
  const [pendingField, setPendingField] = useState<FieldId | null>(null)
  const [pendingFields, setPendingFields] = useState<FieldId[]>([])
  const [merchantContext, setMerchantContext] = useState<Record<string, any>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { updateMerchantField } = useAppStore()

  // Simplified seed helpers - removed external dependencies
  const getPersona = () => ({ id: 'chad', name: 'Chad', role: 'AI Assistant' })
  const getTemplates = () => []
  const getRules = () => []

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
        const fieldsToQueue = action.fields?.slice(0, 2) || []
        setPendingFields(prev => [...prev, ...fieldsToQueue])
        
        if (!pendingField && fieldsToQueue.length > 0) {
          setPendingField(fieldsToQueue[0])
        }
      }
    }
  }

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const addBotMessage = (content: string, options?: string[]) => {
    addMessage({
      type: 'bot',
      content,
      timestamp: new Date(),
      options
    })
  }

  const addUserMessage = (content: string) => {
    addMessage({
      type: 'user', 
      content,
      timestamp: new Date()
    })
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const message = inputText.trim()
    addUserMessage(message)
    setInputText('')
    setIsTyping(true)

    // Process field if pending
    if (pendingField) {
      // Field registry removed - using simple field handling
      const field = { label: 'Field', type: 'text' }
      if (field) {
        // Store the field value
        updateMerchantField(pendingField, message)
        setMerchantContext(prev => ({ ...prev, [pendingField]: message }))
        
        // Move to next field
        const nextFields = pendingFields.slice(1)
        setPendingFields(nextFields)
        setPendingField(nextFields[0] || null)
        
        if (nextFields.length === 0) {
          // No more pending fields, evaluate rules with updated context
          const updatedContext = { ...merchantContext, [pendingField]: message }
          const actions = evaluateRules(updatedContext)
          
          setTimeout(() => {
            setIsTyping(false)
            executeActions(actions, updatedContext)
          }, 1000)
        } else {
          // Ask for next field
          // Field registry removed
          const nextField = { label: 'Next Field' }
          setTimeout(() => {
            setIsTyping(false)
            addBotMessage(`Great! Now I need to know: ${nextField.label}`)
          }, 800)
        }
      }
    } else {
      // No pending field, evaluate rules normally
      const actions = evaluateRules(merchantContext)
      
      setTimeout(() => {
        setIsTyping(false)
        if (actions.length === 0) {
          addBotMessage("I understand. Let me help you with that.")
        } else {
          executeActions(actions, merchantContext)
        }
      }, 1000)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    // Initial greeting
    if (messages.length === 0) {
      addBotMessage("Hi! I'm Chad, your AI funding representative. I'm here to help you get the funding you need for your business. What can I help you with today?")
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between py-6"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center">
                <MessageSquare className="w-8 h-8 mr-3 text-blue-600" />
                Chat with Chad
              </h1>
              <p className="text-slate-600 mt-1">
                Your AI funding representative is here to help
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-700">Chad Online</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
          {/* Chat Messages */}
          <div className="h-[600px] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-slate-50/30">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] p-4 rounded-2xl shadow-sm ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-4'
                        : 'bg-white border border-slate-200/50 text-slate-800 mr-4'
                    }`}
                  >
                    <div className="flex items-start">
                      {message.type === 'bot' && (
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${
                            message.type === 'user' ? 'text-blue-100' : 'text-slate-400'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {message.type === 'user' && (
                            <Check className="w-4 h-4 text-blue-100" />
                          )}
                        </div>
                      </div>
                      {message.type === 'user' && (
                        <div className="flex-shrink-0 ml-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-slate-600 rounded-full flex items-center justify-center shadow-sm">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start"
              >
                <div className="max-w-[75%] p-4 rounded-2xl bg-white border border-slate-200/50 text-slate-800 mr-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm mr-3">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-slate-200/50">
            {pendingField && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center">
                  <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
                  <p className="text-sm text-blue-800">
                    <strong>Chad is asking for:</strong> {fieldRegistry[pendingField]?.label}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={pendingField ? `Enter ${fieldRegistry[pendingField]?.label.toLowerCase()}...` : "Type your message..."}
                  className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50/50 hover:bg-white"
                  disabled={isTyping}
                />
              </div>
              <motion.button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-3 rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
            
            <div className="mt-3 flex items-center text-xs text-slate-500">
              <Zap className="w-3 h-3 mr-1" />
              Chad is powered by advanced AI and responds in real-time
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}