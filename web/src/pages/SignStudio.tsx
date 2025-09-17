import React from 'react'
import { motion } from 'framer-motion'
import { FileSignature, Send } from 'lucide-react'

export default function SignStudio() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">E-Signature Studio</h1>
          <p className="text-slate-600 mt-1">
            Send documents for electronic signature and track status
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary"
        >
          <Send className="w-4 h-4 mr-2" />
          Send Document
        </motion.button>
      </motion.div>

      <div className="card text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileSignature className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No signature requests</h3>
        <p className="text-slate-500 mb-4">Send your first document for electronic signature</p>
        <button className="btn-primary">
          <Send className="w-4 h-4 mr-2" />
          Send First Document
        </button>
      </div>
    </div>
  )
}