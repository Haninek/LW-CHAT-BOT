import React, { useState } from 'react'
import { useAppStore } from '../state/useAppStore'

const SimpleChat: React.FC = () => {
  const { rules } = useAppStore()
  const [merchantType, setMerchantType] = useState<'new' | 'existing'>('new')
  const [messages, setMessages] = useState<Array<{id: string, type: 'bot' | 'user', text: string}>>([])

  const handleTest = () => {
    // Clear previous messages
    setMessages([])
    
    // Find matching rule
    const matchingRule = rules.find(rule => 
      rule.when.kind === 'equals' && 
      rule.when.field === 'merchant.status' && 
      rule.when.value === merchantType
    )

    if (matchingRule) {
      const messageText = (matchingRule.then[0] as any)?.customText || 'Welcome!'
      setMessages([
        { id: '1', type: 'bot', text: messageText }
      ])
    } else {
      setMessages([
        { id: '1', type: 'bot', text: 'No rule found for this merchant type.' }
      ])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Test Chat</h1>
          
          {/* Controls */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Merchant Type</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="new"
                    checked={merchantType === 'new'}
                    onChange={(e) => setMerchantType(e.target.value as 'new')}
                    className="mr-2"
                  />
                  New Merchant
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="existing"
                    checked={merchantType === 'existing'}
                    onChange={(e) => setMerchantType(e.target.value as 'existing')}
                    className="mr-2"
                  />
                  Existing Merchant
                </label>
              </div>
            </div>

            <button
              onClick={handleTest}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Test Rules
            </button>
          </div>

          {/* Chat Area */}
          <div className="border border-gray-200 rounded-lg h-64 p-4 bg-gray-50 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                Click "Test Rules" to see what message will be sent
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <div key={message.id} className="flex">
                    <div className="bg-blue-100 rounded-lg px-3 py-2 max-w-xs">
                      <div className="text-xs text-gray-600 mb-1">Bot</div>
                      <div>{message.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {rules.length === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-yellow-800 text-sm">
                No rules created yet. Go to Rules to create some first.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SimpleChat