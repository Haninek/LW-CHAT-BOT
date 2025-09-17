import React, { useState } from 'react'
import { useAppStore } from '../state/useAppStore'
import { v4 as uuidv4 } from 'uuid'

const SimpleRules: React.FC = () => {
  const { rules, addRule, deleteRule } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [ruleName, setRuleName] = useState('')
  const [condition, setCondition] = useState('new_merchant')
  const [message, setMessage] = useState('')

  const handleAddRule = () => {
    if (ruleName && message) {
      const newRule = {
        id: uuidv4(),
        name: ruleName,
        enabled: true,
        priority: rules.length + 1,
        when: { kind: 'equals' as const, field: 'merchant.status', value: condition === 'new_merchant' ? 'new' : 'existing' },
        then: [{ type: 'message' as const, templateId: 'custom_message', customText: message }]
      }
      addRule(newRule)
      setRuleName('')
      setMessage('')
      setShowForm(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Simple Rules Manager</h1>
          
          {/* Add Rule Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              {showForm ? 'Cancel' : '+ Add New Rule'}
            </button>
          </div>

          {/* Add Rule Form */}
          {showForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Rule</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Welcome New Customers"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">When to trigger</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="new_merchant">New merchant signs up</option>
                    <option value="existing_merchant">Existing merchant returns</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message to send</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-20"
                    placeholder="Enter the message you want to send..."
                  />
                </div>

                <button
                  onClick={handleAddRule}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  Save Rule
                </button>
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Your Rules ({rules.length})</h3>
            
            {rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No rules created yet. Click "Add New Rule" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{rule.name}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {rule.when.kind === 'equals' && rule.when.value === 'new' ? 'New Merchants' : 'Existing Merchants'}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          Message: "{(rule.then[0] as any)?.customText || 'Welcome!'}"
                        </div>
                      </div>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleRules