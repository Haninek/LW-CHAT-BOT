import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, RotateCcw, User, Building, Phone, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../state/useAppStore'
import { askOnlyWhatsMissing, runRulesEngine, checkReadiness } from '../lib/coreLogic'
import { renderTemplateById } from '../lib/templates'
import { fieldRegistry } from '../lib/fieldRegistry'
import { apiClient } from '../lib/api'
import { FieldId, Merchant, Action } from '../types'

const IntakeSimulator: React.FC = () => {
  const {
    currentMerchant,
    setCurrentMerchant,
    updateMerchantField,
    rules,
    templates,
    persona,
    chatMessages,
    addChatMessage,
    clearChat,
    lastRuleResult,
    setLastRuleResult
  } = useAppStore()

  const [merchantStatus, setMerchantStatus] = useState<'new' | 'existing'>('new')
  const [isProcessing, setIsProcessing] = useState(false)
  const [readinessScore, setReadinessScore] = useState(0)

  // Calculate readiness whenever merchant data changes
  useEffect(() => {
    if (currentMerchant) {
      const isReady = checkReadiness(currentMerchant)
      const requiredFields = Object.values(fieldRegistry).filter(f => f.required)
      const satisfiedFields = requiredFields.filter(field => {
        const status = currentMerchant.fields[field.id]
        return status?.value && !isExpired(field, status)
      })
      setReadinessScore(Math.round((satisfiedFields.length / requiredFields.length) * 100))
    }
  }, [currentMerchant])

  const isExpired = (field: any, status: any) => {
    if (!status?.lastVerifiedAt || !field.expiresDays) return false
    const last = new Date(status.lastVerifiedAt)
    const ms = field.expiresDays * 86400000
    return (Date.now() - last.getTime()) > ms
  }

  const handleMerchantStatusChange = async (status: 'new' | 'existing') => {
    setMerchantStatus(status)
    clearChat()
    setIsProcessing(true)

    try {
      if (status === 'existing') {
        // Resolve existing merchant from mock CRM
        const response = await apiClient.resolveMerchant('5551234567', 'existing@example.com')
        const merchant = response.data || response
        setCurrentMerchant({ ...merchant, status: 'existing' })
        
        addChatMessage({
          type: 'bot',
          content: 'Great! I found your information. Let me confirm a few details.',
          timestamp: new Date()
        })
      } else {
        // Create new merchant
        const newMerchant: Merchant = {
          id: `m-new-${Date.now()}`,
          status: 'new',
          fields: {}
        }
        setCurrentMerchant(newMerchant)
        
        addChatMessage({
          type: 'bot', 
          content: 'Welcome! I\'ll help you get started. This will just take a few minutes.',
          timestamp: new Date()
        })
      }
    } catch (error) {
      console.error('Error setting up merchant:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRunRules = () => {
    if (!currentMerchant) return

    const result = runRulesEngine(currentMerchant, rules)
    setLastRuleResult(result)

    if (result.matched) {
      addChatMessage({
        type: 'bot',
        content: `🎯 Rule fired: "${result.matched.name}"`,
        timestamp: new Date(),
        actions: result.actions.map(a => a.type)
      })

      // Execute actions
      result.actions.forEach(action => {
        executeAction(action)
      })
    } else {
      addChatMessage({
        type: 'bot',
        content: 'No rules matched the current merchant state.',
        timestamp: new Date()
      })
    }
  }

  const executeAction = (action: Action) => {
    if (!currentMerchant) return

    switch (action.type) {
      case 'message':
        const message = renderTemplateById(action.templateId, currentMerchant, persona, templates)
        addChatMessage({
          type: 'bot',
          content: message,
          timestamp: new Date()
        })
        break

      case 'ask':
        const fieldsToAsk = action.fields.slice(0, 2) // Max 2 at a time
        const askMessage = `I need the following information: ${fieldsToAsk.map(f => fieldRegistry[f]?.label).join(', ')}`
        addChatMessage({
          type: 'bot',
          content: askMessage,
          timestamp: new Date()
        })
        break

      case 'confirm':
        const fieldsToConfirm = action.fields.slice(0, 2) // Max 2 at a time
        const confirmMessage = `Please confirm: ${fieldsToConfirm.map(f => 
          `${fieldRegistry[f]?.label}: ${currentMerchant.fields[f]?.value || 'Not provided'}`
        ).join(', ')}`
        addChatMessage({
          type: 'bot',
          content: confirmMessage,
          timestamp: new Date()
        })
        break

      case 'setPersona':
        // Update persona (would be handled by store)
        break
    }
  }

  const handleFieldUpdate = (fieldId: FieldId, value: string) => {
    updateMerchantField(fieldId, value)
    
    addChatMessage({
      type: 'user',
      content: `${fieldRegistry[fieldId]?.label}: ${value}`,
      timestamp: new Date()
    })

    // Check if we should ask for more fields
    if (currentMerchant) {
      const { toAsk, toConfirm } = askOnlyWhatsMissing(currentMerchant)
      
      if (toAsk.length === 0 && toConfirm.length === 0) {
        addChatMessage({
          type: 'bot',
          content: '✅ Perfect! I have all the information I need.',
          timestamp: new Date()
        })
      }
    }
  }

  const getCurrentFieldsToCollect = () => {
    if (!currentMerchant) return { toAsk: [], toConfirm: [] }
    return askOnlyWhatsMissing(currentMerchant)
  }

  const { toAsk, toConfirm } = getCurrentFieldsToCollect()

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/rules">
              <button className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Intake Simulator</h1>
              <p className="text-gray-600">Test your rules with New vs Existing merchant scenarios</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => clearChat()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Merchant Status Toggle */}
            <motion.div 
              className="bg-white rounded-xl shadow-sm border p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-lg font-semibold mb-4">Merchant Type</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMerchantStatusChange('new')}
                  disabled={isProcessing}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    merchantStatus === 'new' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <User className="w-4 h-4" />
                  New
                </button>
                <button
                  onClick={() => handleMerchantStatusChange('existing')}
                  disabled={isProcessing}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    merchantStatus === 'existing' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  Existing
                </button>
              </div>
            </motion.div>

            {/* Readiness Bar */}
            <motion.div 
              className="bg-white rounded-xl shadow-sm border p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold mb-4">Readiness Score</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Required fields satisfied</span>
                  <span className="font-medium">{readinessScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      readinessScore === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${readinessScore}%` }}
                  />
                </div>
                {readinessScore === 100 && (
                  <div className="text-green-600 text-sm font-medium">
                    ✅ Ready for next step
                  </div>
                )}
              </div>
            </motion.div>

            {/* Current Data Panel */}
            {currentMerchant && (
              <motion.div 
                className="bg-white rounded-xl shadow-sm border p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-lg font-semibold mb-4">Current Data</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(currentMerchant.fields).map(([fieldId, status]) => (
                    <div key={fieldId} className="flex justify-between">
                      <span className="text-gray-600">{fieldRegistry[fieldId as FieldId]?.label}:</span>
                      <span className="font-medium">{status?.value || 'N/A'}</span>
                    </div>
                  ))}
                  {Object.keys(currentMerchant.fields).length === 0 && (
                    <div className="text-gray-500 italic">No data collected yet</div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <motion.div 
              className="bg-white rounded-xl shadow-sm border flex flex-col h-[600px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Intake Conversation</h3>
                  <button
                    onClick={handleRunRules}
                    disabled={!currentMerchant}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Run Rules
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatMessages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div>{message.content}</div>
                      {message.actions && message.actions.length > 0 && (
                        <div className="text-xs mt-1 opacity-75">
                          Actions: {message.actions.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t bg-gray-50 rounded-b-xl">
                {(toAsk.length > 0 || toConfirm.length > 0) && currentMerchant && (
                  <div className="space-y-3">
                    {toAsk.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Please provide:
                        </div>
                        {toAsk.slice(0, 2).map(fieldId => (
                          <div key={fieldId} className="flex items-center gap-2 mb-2">
                            <label className="text-sm w-32 text-gray-600">
                              {fieldRegistry[fieldId]?.label}:
                            </label>
                            <input
                              type={fieldRegistry[fieldId]?.pii ? 'password' : 'text'}
                              className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
                              placeholder={`Enter ${fieldRegistry[fieldId]?.label.toLowerCase()}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const value = (e.target as HTMLInputElement).value
                                  if (value.trim()) {
                                    handleFieldUpdate(fieldId, value.trim())
                                    ;(e.target as HTMLInputElement).value = ''
                                  }
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {toConfirm.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Please confirm:
                        </div>
                        {toConfirm.slice(0, 2).map(fieldId => (
                          <div key={fieldId} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded-md mb-2">
                            <div className="text-sm">
                              <span className="font-medium">{fieldRegistry[fieldId]?.label}:</span>
                              <span className="ml-2">{currentMerchant.fields[fieldId]?.value}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleFieldUpdate(fieldId, currentMerchant.fields[fieldId]?.value || '')}
                                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                              >
                                ✓ Confirm
                              </button>
                              <button className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400">
                                Change
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Rule Result Display */}
            {lastRuleResult && (
              <motion.div 
                className="mt-6 bg-white rounded-xl shadow-sm border p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-lg font-semibold mb-4">Last Rule Execution</h3>
                {lastRuleResult.matched ? (
                  <div>
                    <div className="mb-2">
                      <span className="font-medium">Rule:</span> {lastRuleResult.matched.name}
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">Priority:</span> {lastRuleResult.matched.priority}
                    </div>
                    <div>
                      <span className="font-medium">Actions:</span>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {lastRuleResult.actions.map((action, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            {action.type} 
                            {action.type === 'message' && ` (${(action as any).templateId})`}
                            {(action.type === 'ask' || action.type === 'confirm') && 
                              ` (${(action as any).fields?.join(', ')})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No rules matched</div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default IntakeSimulator