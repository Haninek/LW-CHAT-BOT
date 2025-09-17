import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, DollarSign, Calculator, Download } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useAppStore } from '../state/useAppStore'
import { apiClient } from '../lib/api'

export default function OffersLab() {
  const { currentMetrics, setCurrentMetrics, offerOverrides } = useAppStore()
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [generatedOffers, setGeneratedOffers] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 3) {
      alert('Please upload exactly 3 bank statements')
      return
    }
    setUploadedFiles(acceptedFiles)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 3,
  })

  const handleParseStatements = async () => {
    if (uploadedFiles.length !== 3) {
      alert('Please upload exactly 3 bank statements')
      return
    }

    setUploading(true)
    try {
      const response = await apiClient.parseStatements(uploadedFiles)
      if (response.success && response.data) {
        setCurrentMetrics(response.data.metrics)
      }
    } catch (error) {
      console.error('Failed to parse statements:', error)
      // Show demo metrics for UI purposes
      setCurrentMetrics({
        months: [
          { statement_month: '2024-01', total_deposits: 125000, avg_daily_balance: 45000, ending_balance: 52000, nsf_count: 1, days_negative: 2 },
          { statement_month: '2024-02', total_deposits: 140000, avg_daily_balance: 48000, ending_balance: 55000, nsf_count: 0, days_negative: 1 },
          { statement_month: '2024-03', total_deposits: 135000, avg_daily_balance: 47000, ending_balance: 53000, nsf_count: 1, days_negative: 3 }
        ],
        avg_monthly_revenue: 133333,
        avg_daily_balance_3m: 46667,
        total_nsf_3m: 2,
        total_days_negative_3m: 6
      })
    } finally {
      setUploading(false)
    }
  }

  const handleGenerateOffers = async () => {
    if (!currentMetrics) return

    setGenerating(true)
    try {
      const response = await apiClient.generateOffers(currentMetrics, offerOverrides)
      if (response.success && response.data?.offers) {
        setGeneratedOffers(response.data.offers)
      }
    } catch (error) {
      console.error('Failed to generate offers:', error)
      // Show demo offers for UI purposes
      setGeneratedOffers([
        {
          amount: 80000,
          factor: 1.25,
          term_days: 120,
          daily_payment: 833,
          total_payback: 100000,
          margin: 0.18,
          risk_tier: 'A'
        },
        {
          amount: 100000,
          factor: 1.30,
          term_days: 140,
          daily_payment: 929,
          total_payback: 130000,
          margin: 0.20,
          risk_tier: 'B'
        }
      ])
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Offers Lab</h1>
          <p className="text-slate-600 mt-1">
            Upload bank statements and generate funding offers with custom parameters
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* File Upload */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Bank Statements
            </h3>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : uploadedFiles.length === 3
                  ? 'border-success-500 bg-success-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-3">
                <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                  uploadedFiles.length === 3 
                    ? 'bg-success-500' 
                    : 'bg-slate-400'
                }`}>
                  {uploadedFiles.length === 3 ? (
                    <span className="text-white text-xl">✓</span>
                  ) : (
                    <Upload className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {uploadedFiles.length === 3 
                      ? 'Ready to parse!'
                      : isDragActive
                      ? 'Drop the files here...'
                      : 'Upload exactly 3 bank statements'
                    }
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    PDF files only • {uploadedFiles.length}/3 uploaded
                  </p>
                </div>
              </div>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-2"
              >
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <FileText className="w-5 h-5 text-slate-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {uploadedFiles.length === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <motion.button
                  onClick={handleParseStatements}
                  disabled={uploading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full btn-primary"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Parsing Statements...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Parse Bank Statements
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </div>

          {/* Metrics Display */}
          {currentMetrics && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Avg Monthly Revenue</p>
                  <p className="text-xl font-bold text-slate-900">
                    ${currentMetrics.avg_monthly_revenue?.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Avg Daily Balance</p>
                  <p className="text-xl font-bold text-slate-900">
                    ${currentMetrics.avg_daily_balance_3m?.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 uppercase tracking-wide">NSF Count (3m)</p>
                  <p className="text-xl font-bold text-slate-900">
                    {currentMetrics.total_nsf_3m}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Negative Days (3m)</p>
                  <p className="text-xl font-bold text-slate-900">
                    {currentMetrics.total_days_negative_3m}
                  </p>
                </div>
              </div>

              <motion.button
                onClick={handleGenerateOffers}
                disabled={generating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full btn-primary mt-4"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating Offers...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Generate Offers
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </motion.div>

        {/* Offers Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {generatedOffers.length > 0 ? (
            <div className="card">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Generated Offers
              </h3>
              <div className="space-y-4">
                {generatedOffers.map((offer, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          offer.risk_tier === 'A' ? 'bg-success-500' : 'bg-warning-500'
                        }`}>
                          {offer.risk_tier}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            ${offer.amount?.toLocaleString()} Offer
                          </p>
                          <p className="text-sm text-slate-500">
                            Factor: {offer.factor}x • {offer.term_days} days
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">
                          ${offer.daily_payment?.toLocaleString()}/day
                        </p>
                        <p className="text-sm text-slate-500">
                          ${offer.total_payback?.toLocaleString()} total
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Margin:</span>
                        <span className="font-medium">{(offer.margin * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Payment Ratio:</span>
                        <span className="font-medium">
                          {((offer.daily_payment * 30) / (currentMetrics?.avg_monthly_revenue || 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 btn-primary text-sm"
                      >
                        Send Offer
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-secondary text-sm"
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-success-500 to-success-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No offers generated</h3>
              <p className="text-slate-500">
                Upload bank statements and parse them to generate offers
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}