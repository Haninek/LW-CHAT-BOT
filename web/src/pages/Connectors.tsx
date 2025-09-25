import React, { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Plug, 
  Edit,
  Trash2,
  TestTube,
  Shield,
  Zap,
  Code,
  Globe,
  Key,
  Copy,
  ExternalLink
} from 'lucide-react'

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
  { id: 'docusign', name: 'DocuSign', icon: '📝', color: 'from-blue-500 to-blue-600', description: 'Electronic signature platform' },
  { id: 'dropbox_sign', name: 'Dropbox Sign', icon: '✍️', color: 'from-purple-500 to-purple-600', description: 'HelloSign e-signature service' },
  { id: 'clear', name: 'CLEAR', icon: '🔍', color: 'from-emerald-500 to-emerald-600', description: 'Identity verification and background checks' },
  { id: 'plaid', name: 'Plaid', icon: '🏦', color: 'from-indigo-500 to-indigo-600', description: 'Bank account verification and data' },
  { id: 'cherry_sms', name: 'Cherry SMS', icon: '📱', color: 'from-pink-500 to-pink-600', description: 'SMS notifications and alerts' }
]

export default function Connectors() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [editingConnector, setEditingConnector] = useState<Partial<Connector> | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadConnectors()
  }, [])

  const loadConnectors = async () => {
    try {
      const response = await apiClient.getConnectors()
      if (response.success) {
        setConnectors(response.data || [])
      } else {
        // Demo data for UI purposes when API fails
        console.warn('Using demo connector data')
        setConnectors([
          {
            id: '1',
            name: 'DocuSign Production',
            type: 'docusign',
            status: 'active',
            config: { client_id: 'xxx', client_secret: 'xxx' },
            last_tested_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Plaid Sandbox',
            type: 'plaid',
            status: 'inactive',
            config: { client_id: 'test', secret: 'test' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      }
    } catch (error) {
      console.error('Failed to load connectors:', error)
      // Show demo data on error for UI purposes
      setConnectors([
        {
          id: '1',
          name: 'DocuSign Demo',
          type: 'docusign',
          status: 'inactive',
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const getConnectorType = (type: string) => {
    return connectorTypes.find(t => t.id === type) || connectorTypes[0]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between py-6"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center">
                <Plug className="w-8 h-8 mr-3 text-indigo-600" />
                Connectors
              </h1>
              <p className="text-slate-600 mt-1">
                Manage integrations with external services and APIs
              </p>
            </div>
            <motion.button
              onClick={() => setShowCreateModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Connector
            </motion.button>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Connectors</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{connectors.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Plug className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {connectors.filter(c => c.status === 'active').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Inactive</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {connectors.filter(c => c.status === 'inactive').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/25">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Errors</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {connectors.filter(c => c.status === 'error').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* REST API Integration Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <Code className="w-6 h-6 mr-2 text-indigo-600" />
                REST API Integration
              </h2>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Quick Start */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-emerald-600" />
                      Widget Integration
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Connect this platform to your proprietary software via REST API for seamless cash advance processing.
                    </p>
                    
                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-slate-900 mb-2">Quick Analysis Endpoint:</h4>
                      <div className="bg-slate-800 rounded-md p-3 text-sm">
                        <code className="text-green-400">POST</code> <code className="text-blue-400">/api/analysis/run</code>
                        <br />
                        <span className="text-slate-400">// Upload bank statements → get offers</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-medium text-slate-900 mb-2">Simple Offers Endpoint:</h4>
                      <div className="bg-slate-800 rounded-md p-3 text-sm">
                        <code className="text-green-400">POST</code> <code className="text-blue-400">/api/offers/simple</code>
                        <br />
                        <span className="text-slate-400">// Generate offers from metrics</span>
                      </div>
                    </div>
                  </div>

                  {/* Authentication & Examples */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                      <Key className="w-5 h-5 mr-2 text-blue-600" />
                      Authentication
                    </h3>
                    
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-slate-900 mb-2">Authorization Header:</h4>
                      <div className="bg-slate-800 rounded-md p-3 text-sm flex items-center justify-between">
                        <code className="text-yellow-400">Authorization: Bearer dev</code>
                        <button className="text-slate-400 hover:text-white transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">Use "Bearer dev" for development testing</p>
                    </div>

                    <div className="bg-emerald-50 rounded-lg p-4">
                      <h4 className="font-medium text-slate-900 mb-2">Example Widget Call:</h4>
                      <div className="bg-slate-800 rounded-md p-3 text-xs overflow-x-auto">
                        <pre className="text-slate-300">
{`fetch('/api/offers/simple', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer dev',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    metrics: {
      avg_monthly_revenue: 85000,
      total_nsf_3m: 2
    }
  })
})`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Documentation Links */}
                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <Globe className="w-5 h-5 mr-2 text-purple-600" />
                    Complete Documentation
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <a
                      href="/docs"
                      target="_blank"
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white p-4 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="font-semibold">Interactive API</h4>
                        <p className="text-xs opacity-90">Live testing interface</p>
                      </div>
                      <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>

                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-xl shadow-lg cursor-pointer hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200">
                      <div>
                        <h4 className="font-semibold">API_INSTRUCTIONS.md</h4>
                        <p className="text-xs opacity-90">Widget integration guide</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-lg cursor-pointer hover:from-purple-600 hover:to-purple-700 transition-all duration-200">
                      <div>
                        <h4 className="font-semibold">README.md</h4>
                        <p className="text-xs opacity-90">All 50+ endpoints</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Endpoints Summary */}
                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Key API Endpoints</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center text-slate-700">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-mono mr-3">POST</span>
                        <span>/api/analysis/run</span>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-mono mr-3">POST</span>
                        <span>/api/offers/simple</span>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-mono mr-3">POST</span>
                        <span>/api/documents/bank/upload</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-slate-700">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono mr-3">GET</span>
                        <span>/api/healthz</span>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono mr-3">GET</span>
                        <span>/api/statements/monthly</span>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono mr-3">GET</span>
                        <span>/api/public/deals</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Available Connector Types */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Available Connectors</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {connectorTypes.map((type) => (
                  <motion.div
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${type.color} rounded-xl flex items-center justify-center shadow-lg mb-3`}>
                      <span className="text-2xl">{type.icon}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{type.name}</h3>
                    <p className="text-xs text-slate-500">{type.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Configured Connectors */}
            {connectors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Configured Connectors</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {connectors.map((connector) => {
                    const type = getConnectorType(connector.type)
                    return (
                      <motion.div
                        key={connector.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 bg-gradient-to-r ${type.color} rounded-xl flex items-center justify-center shadow-sm mr-3`}>
                              <span className="text-lg">{type.icon}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{connector.name}</h3>
                              <p className="text-sm text-slate-500">{type.name}</p>
                            </div>
                          </div>
                          
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(connector.status)}`}>
                            {connector.status}
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">{type.description}</p>

                        {connector.last_tested_at && (
                          <p className="text-xs text-slate-500 mb-4">
                            Last tested: {new Date(connector.last_tested_at).toLocaleDateString()}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <div className="flex items-center space-x-2">
                            <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <TestTube className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="flex items-center text-xs text-slate-500">
                            <Shield className="w-3 h-3 mr-1" />
                            Secure
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {connectors.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center py-12"
              >
                <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <Plug className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No Connectors Configured</h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Get started by adding your first connector to integrate with external services and APIs
                </p>
                <motion.button
                  onClick={() => setShowCreateModal(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center mx-auto"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Connector
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}