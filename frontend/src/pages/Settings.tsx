import React from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'

export default function Settings() {
  const { apiConfig, setApiConfig } = useAppStore()

  const handleSave = () => {
    // Configuration is automatically saved via Zustand persistence
    alert('Settings saved successfully!')
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">
            Configure API connections and application preferences
          </p>
        </div>
        <motion.button
          onClick={handleSave}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" />
            API Configuration
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                API Base URL
              </label>
              <input
                type="url"
                value={apiConfig.baseUrl}
                onChange={(e) => setApiConfig({ baseUrl: e.target.value })}
                placeholder="http://localhost:5000"
                className="input-field w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Base URL for the LendWisely API backend
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                API Key (Optional)
              </label>
              <input
                type="password"
                value={apiConfig.apiKey || ''}
                onChange={(e) => setApiConfig({ apiKey: e.target.value })}
                placeholder="Enter API key for authentication"
                className="input-field w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Optional API key for authenticated requests
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="idempotency"
                checked={apiConfig.idempotencyEnabled}
                onChange={(e) => setApiConfig({ idempotencyEnabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="idempotency" className="text-sm text-slate-700">
                Enable Idempotency Keys
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Add unique request IDs to prevent duplicate operations
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Connection Status</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">API Endpoint</p>
                <p className="text-sm text-slate-500">{apiConfig.baseUrl}</p>
              </div>
              <div className="w-3 h-3 bg-success-500 rounded-full"></div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Authentication</p>
                <p className="text-sm text-slate-500">
                  {apiConfig.apiKey ? 'API Key configured' : 'No API key'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                apiConfig.apiKey ? 'bg-success-500' : 'bg-warning-500'
              }`}></div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Idempotency</p>
                <p className="text-sm text-slate-500">
                  {apiConfig.idempotencyEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                apiConfig.idempotencyEnabled ? 'bg-success-500' : 'bg-slate-400'
              }`}></div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}