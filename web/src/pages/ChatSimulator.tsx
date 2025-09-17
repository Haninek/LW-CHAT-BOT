import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Settings, RotateCcw, Zap } from 'lucide-react'
import { ChatWindow } from '../components/ChatWindow'
import { ChatComposer } from '../components/ChatComposer'
import { useAppStore } from '../state/useAppStore'
import { runRulesEngine } from '../lib/rulesEngine'

const defaultClients = [
  {
    status: 'new' as const,
    firstName: 'Ava',
    company: 'Maple Deli',
    lastContactDays: 999,
    consentOptedIn: true,
    email: 'ava@mapledeli.com',
    phone: '+15551234567'
  },
  {
    status: 'existing' as const,
    firstName: 'Luis',
    company: 'Bright Auto',
    lastContactDays: 3,
    consentOptedIn: true,
    email: 'luis@brightauto.com',
    phone: '+15559876543'
  }
]

export default function ChatSimulator() {
  const { 
    currentClient, 
    setCurrentClient, 
    chatMessages, 
    addChatMessage, 
    clearChat,
    currentMetrics,
    persona
  } = useAppStore()
  
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = async (content: string) => {
    // Add user message
    addChatMessage({
      type: 'user',
      content,
      timestamp: new Date()
    })

    // Simulate typing delay
    setIsTyping(true)
    
    setTimeout(() => {
      // Run rules engine
      const context = {
        client: currentClient,
        metrics: currentMetrics,
        lastBotAction: chatMessages.filter(m => m.type === 'bot').pop()?.actions?.[0]?.type
      }
      
      const result = runRulesEngine(context)
      
      // Add bot response
      addChatMessage({
        type: 'bot',
        content: result.message || "I'm here to help! What can I do for you today?",
        timestamp: new Date(),
        actions: result.actions
      })
      
      setIsTyping(false)
    }, 1000 + Math.random() * 2000) // Random delay between 1-3 seconds
  }

  const handleClientChange = (clientIndex: number) => {
    setCurrentClient(defaultClients[clientIndex])
    clearChat()
  }

  const handleClearChat = () => {
    clearChat()
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-6">
      {/* Chat Area */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 card p-0 overflow-hidden flex flex-col"
      >
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold">🤖</span>
              </div>
              <div>
                <h2 className="font-semibold">LendWisely Assistant</h2>
                <p className="text-sm text-primary-100">
                  {persona.style} • {persona.readingLevel} grade • {persona.emoji} emoji
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={handleClearChat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Clear chat"
              >
                <RotateCcw className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col">
          <ChatWindow messages={chatMessages} isTyping={isTyping} />
          <ChatComposer 
            onSendMessage={handleSendMessage}
            disabled={isTyping}
            placeholder={`Message ${currentClient.firstName}...`}
          />
        </div>
      </motion.div>

      {/* Client Profile Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="w-80 space-y-6"
      >
        {/* Client Selector */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Client Profile
          </h3>
          
          <div className="space-y-3">
            {defaultClients.map((client, index) => (
              <motion.button
                key={index}
                onClick={() => handleClientChange(index)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  currentClient.firstName === client.firstName
                    ? 'border-primary-500 bg-primary-50 shadow-glow'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{client.firstName}</p>
                    <p className="text-sm text-slate-600">{client.company}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    client.status === 'new' 
                      ? 'bg-warning-100 text-warning-800' 
                      : 'bg-success-100 text-success-800'
                  }`}>
                    {client.status}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Last contact: {client.lastContactDays === 999 ? 'Never' : `${client.lastContactDays} days ago`}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Client Details */}
        <div className="card">
          <h4 className="font-semibold text-slate-900 mb-3">Current Client</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-lg">
                  {currentClient.firstName[0]}
                </span>
              </div>
              <div>
                <p className="font-medium text-slate-900">{currentClient.firstName}</p>
                <p className="text-sm text-slate-600">{currentClient.company}</p>
              </div>
            </div>
            
            <div className="space-y-2 pt-3 border-t border-slate-200">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <span className={`status-indicator ${
                  currentClient.status === 'new' ? 'status-warning' : 'status-success'
                }`}>
                  {currentClient.status}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Last Contact</span>
                <span className="text-sm text-slate-900">
                  {currentClient.lastContactDays === 999 ? 'Never' : `${currentClient.lastContactDays}d ago`}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Consent</span>
                <span className={`status-indicator ${
                  currentClient.consentOptedIn ? 'status-success' : 'status-error'
                }`}>
                  {currentClient.consentOptedIn ? 'Opted In' : 'Opted Out'}
                </span>
              </div>

              {currentClient.email && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Email</span>
                  <span className="text-sm text-slate-900 truncate ml-2">
                    {currentClient.email}
                  </span>
                </div>
              )}

              {currentClient.phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Phone</span>
                  <span className="text-sm text-slate-900">
                    {currentClient.phone}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Quick Actions
          </h4>
          <div className="space-y-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSendMessage("Hi, I'm interested in working capital options.")}
              className="w-full btn-secondary text-left justify-start"
            >
              💬 Simulate Interest
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSendMessage("Can you help me understand my options?")}
              className="w-full btn-secondary text-left justify-start"
            >
              ❓ Ask for Help
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSendMessage("I have my bank statements ready to upload.")}
              className="w-full btn-secondary text-left justify-start"
            >
              📄 Ready to Upload
            </motion.button>
          </div>
        </div>

        {/* Metrics Preview */}
        {currentMetrics && (
          <div className="card">
            <h4 className="font-semibold text-slate-900 mb-3">Financial Metrics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Avg Monthly Revenue</span>
                <span className="font-medium text-slate-900">
                  ${currentMetrics.avg_monthly_revenue?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">NSF Count (3m)</span>
                <span className="font-medium text-slate-900">
                  {currentMetrics.total_nsf_3m}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Negative Days (3m)</span>
                <span className="font-medium text-slate-900">
                  {currentMetrics.total_days_negative_3m}
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}