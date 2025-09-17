import React, { useState, useEffect } from 'react'

interface Merchant {
  id: string
  legal_name: string
  dba?: string
  phone?: string
  email?: string
  ein?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status: string
  updated_at: string
}

const Merchants: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)

  useEffect(() => {
    loadMerchants()
  }, [])

  const loadMerchants = async () => {
    try {
      const response = await fetch('/api/merchants')
      if (response.ok) {
        const data = await response.json()
        setMerchants(data)
      }
    } catch (error) {
      console.error('Failed to load merchants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/merchants/import', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Imported ${result.imported} merchants successfully`)
        loadMerchants() // Reload the list
      } else {
        alert('Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed')
    }

    // Reset the input
    event.target.value = ''
  }

  const openChatForMerchant = (merchant: Merchant) => {
    // This would typically navigate to chat with pre-populated merchant
    // For now, just show an alert
    alert(`Would open chat for ${merchant.legal_name}`)
  }

  const filteredMerchants = merchants.filter(merchant =>
    merchant.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.phone?.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Merchants
            </h1>
            <p className="text-gray-600">
              Manage merchant database, import CSV data, and access individual chat sessions
            </p>
          </div>
          <div className="flex space-x-3">
            <label className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer">
              📥 Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvImport}
                className="hidden"
              />
            </label>
            <button
              onClick={loadMerchants}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredMerchants.length} of {merchants.length} merchants
          </div>
        </div>
      </div>

      {/* Merchants Grid */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Loading merchants...</p>
        </div>
      ) : filteredMerchants.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            {searchTerm ? 'No merchants found matching your search.' : 'No merchants found.'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Import a CSV file or create merchants through the chat interface.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMerchants.map((merchant) => (
            <div
              key={merchant.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedMerchant(merchant)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {merchant.legal_name}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  merchant.status === 'existing' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {merchant.status}
                </span>
              </div>

              {merchant.dba && merchant.dba !== merchant.legal_name && (
                <p className="text-sm text-gray-600 mb-2">DBA: {merchant.dba}</p>
              )}

              <div className="space-y-1 text-sm text-gray-600">
                {merchant.email && (
                  <p>📧 {merchant.email}</p>
                )}
                {merchant.phone && (
                  <p>📞 {merchant.phone}</p>
                )}
                {merchant.city && merchant.state && (
                  <p>📍 {merchant.city}, {merchant.state}</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Updated: {new Date(merchant.updated_at).toLocaleDateString()}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openChatForMerchant(merchant)
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                >
                  💬 Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merchant Detail Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedMerchant.legal_name}
              </h2>
              <button
                onClick={() => setSelectedMerchant(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Legal Name</label>
                <p className="text-sm text-gray-900">{selectedMerchant.legal_name}</p>
              </div>
              
              {selectedMerchant.dba && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">DBA</label>
                  <p className="text-sm text-gray-900">{selectedMerchant.dba}</p>
                </div>
              )}

              {selectedMerchant.ein && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">EIN</label>
                  <p className="text-sm text-gray-900">{selectedMerchant.ein}</p>
                </div>
              )}

              {selectedMerchant.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedMerchant.email}</p>
                </div>
              )}

              {selectedMerchant.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedMerchant.phone}</p>
                </div>
              )}

              {selectedMerchant.address && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="text-sm text-gray-900">
                    {selectedMerchant.address}
                    {selectedMerchant.city && `, ${selectedMerchant.city}`}
                    {selectedMerchant.state && `, ${selectedMerchant.state}`}
                    {selectedMerchant.zip && ` ${selectedMerchant.zip}`}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <span className={`px-3 py-1 text-sm rounded-full ${
                selectedMerchant.status === 'existing' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {selectedMerchant.status}
              </span>
              <button
                onClick={() => openChatForMerchant(selectedMerchant)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                💬 Start Chat Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Merchants