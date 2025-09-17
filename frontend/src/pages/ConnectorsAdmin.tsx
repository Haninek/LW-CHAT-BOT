import React from 'react'
import { motion } from 'framer-motion'
import { Plug, Plus } from 'lucide-react'

export default function ConnectorsAdmin() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Connectors Admin</h1>
          <p className="text-slate-600 mt-1">
            Manage external service integrations and API connections
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Connector
        </motion.button>
      </motion.div>

      <div className="card text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plug className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No connectors configured</h3>
        <p className="text-slate-500 mb-4">Add your first external service integration</p>
        <button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add First Connector
        </button>
      </div>
    </div>
  )
}