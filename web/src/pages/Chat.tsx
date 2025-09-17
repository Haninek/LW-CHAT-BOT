import React, { useState, useEffect } from 'react'

interface Merchant {
  id: string
  legal_name: string
  status: string
  phone?: string
  email?: string
}

interface FieldState {
  field_id: string
  value: string
  last_verified_at: string
  confidence: number
  source: string
}

interface Message {
  id: string
  type: 'bot' | 'user'
  text: string
  timestamp: Date
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [currentMerchant, setCurrentMerchant] = useState<Merchant | null>(null)
  const [fieldStates, setFieldStates] = useState<FieldState[]>([])
  const [isNewMerchant, setIsNewMerchant] = useState(true)

  useEffect(() => {
    // Welcome message
    addBotMessage("Hi! I'm here to help with your underwriting application. Are you a new merchant or returning?")
  }, [])

  const addBotMessage = (text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'bot',
      text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const addUserMessage = (text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'user',
      text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    addUserMessage(inputText)
    const userInput = inputText.toLowerCase()
    setInputText('')

    // Simple conversation flow for demo
    if (userInput.includes('new')) {
      setIsNewMerchant(true)
      addBotMessage("Great! Since you're a new merchant, I'll need to collect some information. What's your business legal name?")
    } else if (userInput.includes('existing') || userInput.includes('returning')) {
      setIsNewMerchant(false)
      addBotMessage("Welcome back! Can you provide your email or phone number so I can look up your information?")
    } else if (userInput.includes('@') && !isNewMerchant) {
      // Try to resolve existing merchant
      await resolveMerchant(userInput)
    } else {
      addBotMessage("I understand. Let me help you with the next step in your application.")
    }
  }

  const resolveMerchant = async (email: string) => {
    try {
      const response = await fetch(`/api/merchants/resolve?email=${encodeURIComponent(email)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.found) {
          setCurrentMerchant(data.merchant)
          setFieldStates(Object.entries(data.fields).map(([field_id, field]: [string, any]) => ({
            field_id,
            value: field.value,
            last_verified_at: field.last_verified_at,
            confidence: field.confidence,
            source: field.source
          })))
          
          addBotMessage(`Great! I found your business: ${data.merchant.legal_name}. Let me check what information we still need...`)
          
          // Ask only what's missing logic
          setTimeout(() => {
            const missingFields = []
            const requiredFields = ['owner.dob', 'owner.ssn_last4']
            
            for (const field of requiredFields) {
              const hasField = Object.keys(data.fields).includes(field)
              if (!hasField) {
                missingFields.push(field)
              }
            }
            
            if (missingFields.length > 0) {
              if (missingFields.includes('owner.dob')) {
                addBotMessage("I need to verify the business owner's date of birth. Can you provide that? (MM/DD/YYYY)")
              }
            } else {
              addBotMessage("Perfect! I have all the required information. Would you like to proceed with document upload or Plaid connection?")
            }
          }, 1000)
        } else {
          addBotMessage("I couldn't find a merchant with that email. Let's start fresh - what's your business legal name?")
        }
      }
    } catch (error) {
      addBotMessage("Sorry, I had trouble looking up your information. Let's start with your business legal name.")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Chat Interface */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Underwriting Chat</h2>
          <p className="text-sm text-gray-600">Human-friendly automated underwriting assistant</p>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p>{message.text}</p>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Merchant Profile Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Merchant Profile</h3>
        
        {currentMerchant ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Legal Name</label>
              <p className="text-sm text-gray-900">{currentMerchant.legal_name}</p>
            </div>
            
            {currentMerchant.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{currentMerchant.phone}</p>
              </div>
            )}
            
            {currentMerchant.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{currentMerchant.email}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                currentMerchant.status === 'existing' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {currentMerchant.status}
              </span>
            </div>

            {fieldStates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Field Status</label>
                <div className="space-y-2">
                  {fieldStates.map((field) => (
                    <div key={field.field_id} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{field.field_id}</span>
                      <span className="text-green-600">✓ {field.confidence * 100}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>Start a conversation to see merchant information</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat