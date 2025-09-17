import React, { useState, useEffect } from 'react'

interface Agreement {
  id: string
  merchant_id: string
  template_id: string
  title: string
  status: 'draft' | 'sent' | 'signed' | 'declined' | 'expired'
  provider: 'docusign' | 'dropbox_sign'
  envelope_id?: string
  signing_url?: string
  signed_at?: string
  created_at: string
}

const Sign: React.FC = () => {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [newAgreement, setNewAgreement] = useState({
    merchant_id: '',
    template_id: '',
    title: '',
    provider: 'docusign' as 'docusign' | 'dropbox_sign'
  })
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadAgreements()
  }, [])

  const loadAgreements = async () => {
    try {
      const response = await fetch('/api/sign')
      if (response.ok) {
        const data = await response.json()
        setAgreements(data)
      }
    } catch (error) {
      console.error('Failed to load agreements:', error)
    } finally {
      setLoading(false)
    }
  }

  const createAgreement = async () => {
    if (!newAgreement.merchant_id.trim() || !newAgreement.title.trim()) {
      alert('Please fill in required fields')
      return
    }

    try {
      const response = await fetch('/api/sign/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAgreement)
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Agreement created: ${result.agreement_id}`)
        setNewAgreement({
          merchant_id: '',
          template_id: '',
          title: '',
          provider: 'docusign'
        })
        setShowCreateModal(false)
        loadAgreements()
      } else {
        const error = await response.json()
        alert(`Failed to create agreement: ${error.detail}`)
      }
    } catch (error) {
      console.error('Create agreement error:', error)
      alert('Failed to create agreement')
    }
  }

  const sendForSigning = async (agreement: Agreement) => {
    try {
      const response = await fetch(`/api/sign/${agreement.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Agreement sent for signing. Envelope ID: ${result.envelope_id}`)
        loadAgreements()
      } else {
        const error = await response.json()
        alert(`Failed to send agreement: ${error.detail}`)
      }
    } catch (error) {
      console.error('Send agreement error:', error)
      alert('Failed to send agreement')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-100 text-green-800'
      case 'declined': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'docusign': return '📝'
      case 'dropbox_sign': return '✍️'
      default: return '📄'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Digital Signatures
            </h1>
            <p className="text-gray-600">
              Manage contracts and agreements via DocuSign and Dropbox Sign integrations
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            📄 Create Agreement
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {['draft', 'sent', 'signed', 'declined'].map(status => {
          const count = agreements.filter(a => a.status === status).length
          return (
            <div key={status} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                  status === 'signed' ? 'bg-green-100' :
                  status === 'sent' ? 'bg-blue-100' :
                  status === 'declined' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  <span className="text-sm font-semibold">
                    {status === 'signed' ? '✅' :
                     status === 'sent' ? '📤' :
                     status === 'declined' ? '❌' : '📝'}
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 capitalize">{status}</p>
                  <p className="text-2xl font-semibold text-gray-900">{count}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Agreements List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Agreements</h2>
          <button
            onClick={loadAgreements}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Loading agreements...</p>
          </div>
        ) : agreements.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No agreements found.</p>
            <p className="text-sm text-gray-400 mt-2">
              Create your first agreement using the button above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {agreements.map((agreement) => (
              <div key={agreement.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xl">{getProviderIcon(agreement.provider)}</span>
                      <h3 className="text-lg font-medium text-gray-900">
                        {agreement.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(agreement.status)}`}>
                        {agreement.status}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Merchant ID: <span className="font-mono">{agreement.merchant_id}</span></p>
                      {agreement.template_id && (
                        <p>Template: <span className="font-mono">{agreement.template_id}</span></p>
                      )}
                      {agreement.envelope_id && (
                        <p>Envelope: <span className="font-mono">{agreement.envelope_id}</span></p>
                      )}
                      <p>Created: {new Date(agreement.created_at).toLocaleString()}</p>
                      {agreement.signed_at && (
                        <p>Signed: {new Date(agreement.signed_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex space-x-2">
                    {agreement.status === 'draft' && (
                      <button
                        onClick={() => sendForSigning(agreement)}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                      >
                        📤 Send
                      </button>
                    )}
                    
                    {agreement.signing_url && agreement.status === 'sent' && (
                      <button
                        onClick={() => window.open(agreement.signing_url, '_blank')}
                        className="px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                      >
                        👁️ Preview
                      </button>
                    )}
                    
                    {agreement.status === 'signed' && (
                      <button
                        onClick={() => alert('Download functionality would be implemented here')}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                      >
                        📥 Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Agreement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Agreement</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Merchant ID *</label>
                <input
                  type="text"
                  value={newAgreement.merchant_id}
                  onChange={(e) => setNewAgreement(prev => ({ ...prev, merchant_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter merchant ID..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Agreement Title *</label>
                <input
                  type="text"
                  value={newAgreement.title}
                  onChange={(e) => setNewAgreement(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Funding Agreement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Template ID</label>
                <input
                  type="text"
                  value={newAgreement.template_id}
                  onChange={(e) => setNewAgreement(prev => ({ ...prev, template_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional template ID..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Provider</label>
                <select
                  value={newAgreement.provider}
                  onChange={(e) => setNewAgreement(prev => ({ ...prev, provider: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="docusign">📝 DocuSign</option>
                  <option value="dropbox_sign">✍️ Dropbox Sign</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createAgreement}
                disabled={!newAgreement.merchant_id.trim() || !newAgreement.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sign