import React from 'react'
import { motion } from 'framer-motion'
import { UserCheck, Play } from 'lucide-react'

export default function BackgroundMonitor() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Background Monitor</h1>
          <p className="text-slate-600 mt-1">
            Track background check jobs and compliance verification
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary"
        >
          <Play className="w-4 h-4 mr-2" />
          Start Check
        </motion.button>
      </motion.div>

      <div className="card text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No background checks running</h3>
        <p className="text-slate-500 mb-4">Start a new background check to monitor progress</p>
        <button className="btn-primary">
          <Play className="w-4 h-4 mr-2" />
          Start First Check
        </button>
      </div>
    </div>
  )
}