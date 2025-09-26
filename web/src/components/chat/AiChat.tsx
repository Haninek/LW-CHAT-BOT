import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Upload, FileText, X, Sparkles } from 'lucide-react'
import { useAppStore } from '../../state/useAppStore'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggested_actions?: string[]
  next_steps?: string[]
}

interface AiChatProps {
  merchantId?: string
  dealId?: string
}

export default function AiChat({ merchantId, dealId }: AiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { apiConfig } = useAppStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm Chad, your AI funding assistant. I'm here to help you navigate the funding process, analyze your financial documents, and guide you through your application. How can I help you today?",
        timestamp: new Date(),
        suggested_actions: [
          "Start funding application",
          "Upload bank statements", 
          "Learn about requirements",
          "Check application status"
        ]
      }])
    }

    // Load suggestions
    loadSuggestions()
  }, [])

  const loadSuggestions = async () => {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/api/chat/suggestions?merchant_id=${merchantId}&deal_id=${dealId}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.quick_actions || [])
      }
    } catch (error) {
      console.error('Error loading suggestions:', error)
    }
  }

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() && uploadedFiles.length === 0) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText || 'I uploaded some documents',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    try {
      let response

      if (uploadedFiles.length > 0) {
        // Handle file upload with message
        const formData = new FormData()
        uploadedFiles.forEach(file => formData.append('file', file))
        formData.append('message', messageText || 'Please analyze this document')
        if (merchantId) formData.append('merchant_id', merchantId)
        if (dealId) formData.append('deal_id', dealId)

        response = await fetch(`${apiConfig.baseUrl}/api/chat/analyze-document`, {
          method: 'POST',
          headers: {
            ...(apiConfig.apiKey && { 'Authorization': `Bearer ${apiConfig.apiKey}` })
          },
          body: formData
        })
        
        setUploadedFiles([]) // Clear files after upload
      } else {
        // Regular chat message
        const conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))

        response = await fetch(`${apiConfig.baseUrl}/api/chat/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiConfig.apiKey && { 'Authorization': `Bearer ${apiConfig.apiKey}` })
          },
          body: JSON.stringify({
            message: messageText,
            conversation_history: conversationHistory,
            merchant_id: merchantId,
            deal_id: dealId
          })
        })
      }

      if (response.ok) {
        const data = await response.json()
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          suggested_actions: data.suggested_actions,
          next_steps: data.next_steps
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSendMessage = () => {
    sendMessage(inputText)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="p-2 bg-blue-100 rounded-full">
          <Bot className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Chad - AI Funding Assistant</h2>
          <p className="text-sm text-gray-600">Powered by OpenAI • Ready to help with your funding needs</p>
        </div>
        <Sparkles className="w-5 h-5 text-blue-500 ml-auto" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="p-2 bg-blue-100 rounded-full h-fit">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                <div className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {/* Suggested Actions */}
                {message.suggested_actions && message.suggested_actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.suggested_actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(action)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                {/* Next Steps */}
                {message.next_steps && message.next_steps.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium">Next steps:</p>
                    <ul className="list-disc list-inside">
                      {message.next_steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="p-2 bg-blue-600 rounded-full h-fit">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="p-2 bg-blue-100 rounded-full">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {suggestions.length > 0 && messages.length <= 1 && (
        <div className="p-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Upload Area */}
      {uploadedFiles.length > 0 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Files to analyze:</p>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-3 items-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            title="Upload documents"
          >
            <Upload className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about funding, upload documents, or get help with your application..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '40px' }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() && uploadedFiles.length === 0}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
