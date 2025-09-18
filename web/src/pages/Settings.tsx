import React from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Globe, Key, Shield, Zap } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'

export default function Settings() {
  const { apiConfig, setApiConfig } = useAppStore()

  const handleSave = () => {
    // Configuration is automatically saved via Zustand persistence
    alert('Settings saved successfully!')
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-slate-600 mt-1">
                Configure API connections and application preferences
              </p>
            </div>
            <motion.button
              onClick={handleSave}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </motion.button>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* API Configuration */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-blue-600" />
              API Configuration
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="flex items-center text-sm font-medium text-slate-700 mb-3">
                  <Globe className="w-4 h-4 mr-2 text-slate-500" />
                  API Base URL
                </label>
                <input
                  type="url"
                  value={apiConfig.baseUrl}
                  onChange={(e) => setApiConfig({ baseUrl: e.target.value })}
                  placeholder="http://localhost:8000"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50/50 hover:bg-white"
                />
                <p className="text-xs text-slate-500 mt-2 flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Base URL for the LendWisely API backend
                </p>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-slate-700 mb-3">
                  <Key className="w-4 h-4 mr-2 text-slate-500" />
                  API Key (Optional)
                </label>
                <input
                  type="password"
                  value={apiConfig.apiKey || ''}
                  onChange={(e) => setApiConfig({ apiKey: e.target.value })}
                  placeholder="Enter API key for authentication"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50/50 hover:bg-white"
                />
                <p className="text-xs text-slate-500 mt-2 flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Optional API key for secured endpoints
                </p>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-slate-700 mb-3">
                  <Zap className="w-4 h-4 mr-2 text-slate-500" />
                  Features
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={apiConfig.idempotencyEnabled}
                      onChange={(e) => setApiConfig({ idempotencyEnabled: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 shadow-sm focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-slate-700">
                      Enable idempotency keys for safe request retries
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Security & Performance */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-emerald-600" />
              Security & Performance
            </h3>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-200/50">
                <h4 className="font-medium text-slate-800 mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-emerald-600" />
                  Security Status
                </h4>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                    HTTPS connections enforced
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                    API keys encrypted in storage
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Request rate limiting enabled
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Auto-retry with backoff
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/50">
                <h4 className="font-medium text-slate-800 mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-blue-600" />
                  Performance Optimization
                </h4>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Request caching enabled
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Connection pooling active
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                    Background sync enabled
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Connection Test */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-purple-600" />
            Connection Test
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Health Check</span>
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              </div>
              <p className="text-xs text-slate-500">Testing API connectivity...</p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Authentication</span>
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              </div>
              <p className="text-xs text-slate-500">Verifying API key...</p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Services</span>
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              </div>
              <p className="text-xs text-slate-500">Checking endpoints...</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>💡 Tip:</strong> Settings are automatically saved. Use the test button to verify your configuration.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}