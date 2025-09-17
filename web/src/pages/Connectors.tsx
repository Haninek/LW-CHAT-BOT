import React, { useState, useEffect } from 'react'

interface Connector {
  id: string
  name: string
  type: 'docusign' | 'dropbox_sign' | 'clear' | 'plaid' | 'cherry_sms'
  status: 'active' | 'inactive' | 'error'
  config: Record<string, any>
  last_tested_at?: string
  created_at: string
  updated_at: string
}

const connectorTypes = [
  { id: 'docusign', name: 'DocuSign', icon: '📝', description: 'Electronic signature platform' },
  { id: 'dropbox_sign', name: 'Dropbox Sign', icon: '✍️', description: 'HelloSign e-signature service' },
  { id: 'clear', name: 'CLEAR', icon: '🔍', description: 'Identity verification and background checks' },
  { id: 'plaid', name: 'Plaid', icon: '🏦', description: 'Bank account verification and data' },
  { id: 'cherry_sms', name: 'Cherry SMS', icon: '📱', description: 'SMS notifications and alerts' }
]

const Connectors: React.FC = () => {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [editingConnector, setEditingConnector] = useState<Partial<Connector> | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadConnectors()
  }, [])

  const loadConnectors = async () => {
    try {
      const response = await fetch('/api/connectors')
      if (response.ok) {
        const data = await response.json()
        setConnectors(data)
      }
    } catch (error) {
      console.error('Failed to load connectors:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConnector = async (connectorData: Partial<Connector>) => {
    try {
      const url = connectorData.id ? `/api/connectors/${connectorData.id}` : '/api/connectors'
      const method = connectorData.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(connectorData)
      })
      
      if (response.ok) {
        loadConnectors()
        setEditingConnector(null)
        setShowCreateModal(false)
        alert('Connector saved successfully')
      } else {
        alert('Failed to save connector')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save connector')
    }
  }

  const testConnector = async (connector: Connector) => {
    try {
      const response = await fetch(`/api/connectors/${connector.id}/validate`)
      if (response.ok) {
        const result = await response.json()
        if (result.valid) {
          alert(`✅ ${connector.name} connection successful`)
        } else {
          alert(`❌ ${connector.name} connection failed: ${result.error}`)
        }
        loadConnectors() // Refresh to update last_tested_at
      }
    } catch (error) {
      alert(`❌ Test failed: ${error}`)
    }
  }

  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 8) return key
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4)
  }

  const getConnectorTypeInfo = (type: string) => {
    return connectorTypes.find(t => t.id === type) || { icon: '🔗', name: type, description: '' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Connectors
            </h1>
            <p className="text-gray-600">
              Manage integrations with DocuSign, Dropbox Sign, CLEAR, Plaid, and Cherry SMS
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            ➕ Add Connector
          </button>
        </div>
      </div>

      {/* Available Connector Types */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {connectorTypes.map((type) => {
            const existing = connectors.find(c => c.type === type.id)
            return (
              <div
                key={type.id}
                className={`p-4 border rounded-lg text-center ${
                  existing 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 hover:border-blue-300 cursor-pointer'
                }`}
                onClick={() => !existing && setShowCreateModal(true)}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-medium text-gray-900">{type.name}</div>
                <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                {existing && (
                  <div className="mt-2">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      existing.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : existing.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {existing.status}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Configured Connectors */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Loading connectors...</p>
        </div>
      ) : connectors.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No connectors configured yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Click "Add Connector" to set up your first integration.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Configured Connectors</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {connectors.map((connector) => {
              const typeInfo = getConnectorTypeInfo(connector.type)
              return (
                <div key={connector.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{typeInfo.icon}</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {connector.name}
                        </h3>
                        <p className="text-sm text-gray-600">{typeInfo.description}</p>
                        {connector.last_tested_at && (
                          <p className="text-xs text-gray-500">
                            Last tested: {new Date(connector.last_tested_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        connector.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : connector.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {connector.status}
                      </span>
                      <button
                        onClick={() => testConnector(connector)}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                      >
                        🧪 Test
                      </button>
                      <button
                        onClick={() => setEditingConnector(connector)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                      >
                        ⚙️ Edit
                      </button>
                    </div>
                  </div>

                  {/* Masked Configuration Display */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {Object.entries(connector.config).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-600 capitalize">{key.replace('_', ' ')}: </span>
                        <span className="text-gray-900 font-mono">
                          {key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')
                            ? maskApiKey(String(value))
                            : String(value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingConnector) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingConnector ? 'Edit Connector' : 'Create Connector'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editingConnector?.name || ''}
                  onChange={(e) => setEditingConnector(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={editingConnector?.type || ''}
                  onChange={(e) => setEditingConnector(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type...</option>
                  {connectorTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Configuration (JSON)</label>
                <textarea
                  rows={4}
                  value={JSON.stringify(editingConnector?.config || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value)
                      setEditingConnector(prev => ({ ...prev, config }))
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder='{"api_key": "your_key_here"}'
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditingConnector(null)
                  setShowCreateModal(false)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => editingConnector && saveConnector(editingConnector)}
                disabled={!editingConnector?.name || !editingConnector?.type}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Connectors