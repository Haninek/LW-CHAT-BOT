import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Check, Clock } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'
import { ConversationManager, ConversationState } from '../lib/conversation/manager'
import { fieldRegistry } from '../lib/fieldRegistry'
import { FieldId } from '../types'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { updateMerchantField } = useAppStore()

  useEffect(() => {
    // Chad S. introduces himself
    const greeting = conversationManager.getGreeting()
    addBotMessage(greeting.message, greeting.options)
    setCurrentState('greeting')
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
      const response = conversationManager.processUserInput(text)
      
      addBotMessage(response.message, response.options)
      
      if (response.state) {
        setCurrentState(response.state)
      }
      
      if (response.pendingField !== undefined) {
        setPendingField(response.pendingField)
      }

      // Update merchant data if we have a field update
      const context = conversationManager.getContext()
      if (context.merchant && pendingField && !response.pendingField) {
        const fieldValue = context.merchant.fields[pendingField]?.value
        if (fieldValue) {
          updateMerchantField(pendingField, fieldValue, 'chat')
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Main Chat Interface */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Chad S.</h2>
                <p className="text-blue-100 text-sm">Your LendWisely Assistant</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">{getStateDisplay()}</p>
              <div className="w-32 bg-white/20 rounded-full h-2 mt-1">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500"
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