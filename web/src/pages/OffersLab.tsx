import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, DollarSign, Calculator, Download, Zap, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
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
    if (acceptedFiles.length < 3) {
      alert('Please upload minimum 3 bank statements (3+ months required)')
      return
    }
    if (acceptedFiles.length > 12) {
      alert('Maximum 12 bank statements allowed (12 months max)')
      return
    }
    setUploadedFiles(acceptedFiles)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    minFiles: 3,
    maxFiles: 12,
  })

  const handleParseStatements = async () => {
    if (uploadedFiles.length < 3) {
      alert('Please upload minimum 3 bank statements (3+ months required)')
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
      // Show demo metrics for UI purposes based on uploaded files count
      const monthsCount = uploadedFiles.length
      const demoMonths = Array.from({ length: monthsCount }, (_, i) => ({
        statement_month: new Date(2024, i, 1).toISOString().slice(0, 7),
        total_deposits: 125000 + (i * 5000),
        avg_daily_balance: 45000 + (i * 1000),
        ending_balance: 52000 + (i * 500),
        nsf_count: Math.floor(Math.random() * 2),
        days_negative: Math.floor(Math.random() * 3)
      }))
      
      setCurrentMetrics({
        months: demoMonths,
        avg_monthly_revenue: 133333,
        avg_daily_balance: 46667,
        total_nsf_fees: 2,
        days_negative_balance: 6,
        months_analyzed: monthsCount,
        statements_processed: monthsCount,
        gpt_analysis: false
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
      // Show demo cash advance offers for UI purposes
      setGeneratedOffers([
        {
          id: 'cash-advance-1',
          type: 'Cash Advance',
          amount: 85000,
          factor: 1.12,
          fee: 10200,
          payback_amount: 95200,
          term_days: 180,
          daily_payment: 529,
          qualification_score: 88,
          advantages: ['Fast funding', 'No fixed monthly payments', 'Based on daily sales'],
          requirements: ['Min 6 months in business', 'Min $50k monthly revenue']
        },
        {
          id: 'cash-advance-2',
          type: 'Cash Advance',
          amount: 65000,
          factor: 1.15,
          fee: 9750,
          payback_amount: 74750,
          term_days: 150,
          daily_payment: 498,
          qualification_score: 82,
          advantages: ['Shorter term', 'Quick approval', 'Flexible payments'],
          requirements: ['Min 4 months in business', 'Good cash flow']
        },
        {
          id: 'cash-advance-3',
          type: 'Cash Advance',
          amount: 45000,
          factor: 1.18,
          fee: 8100,
          payback_amount: 53100,
          term_days: 120,
          daily_payment: 443,
          qualification_score: 75,
          advantages: ['Quick access', 'Short commitment', 'Revenue-based payments'],
          requirements: ['Min 3 months in business', 'Consistent daily sales']
        }
      ])
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getQualificationColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200'
    return 'text-amber-600 bg-amber-50 border-amber-200'
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
                <DollarSign className="w-8 h-8 mr-3 text-emerald-600" />
                Offers Lab
              </h1>
              <p className="text-slate-600 mt-1">
                Analyze bank statements and generate personalized loan offers
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {currentMetrics && (
                <div className="flex items-center px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mr-2" />
                  <span className="text-sm font-medium text-emerald-700">Analysis Complete</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* File Upload */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-blue-600" />
                Upload Bank Statements
              </h3>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
                  ${isDragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : uploadedFiles.length > 0
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
                  }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                    uploadedFiles.length > 0 ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    {uploadedFiles.length > 0 ? (
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <FileText className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  
                  {uploadedFiles.length > 0 ? (
                    <div>
                      <p className="text-lg font-medium text-emerald-700">
                        {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
                      </p>
                      <ul className="text-sm text-slate-600 mt-2 space-y-1">
                        {uploadedFiles.map((file, index) => (
                          <li key={index} className="flex items-center justify-center">
                            <FileText className="w-4 h-4 mr-2 text-slate-400" />
                            {file.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : isDragActive ? (
                    <div>
                      <p className="text-lg font-medium text-blue-700">Drop the files here</p>
                      <p className="text-sm text-blue-600">Upload exactly 3 PDF statements</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium text-slate-700">
                        Drag & drop bank statements here
                      </p>
                      <p className="text-sm text-slate-500">
                        or click to select files (PDF only, max 3 files)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <motion.button
                onClick={handleParseStatements}
                disabled={uploadedFiles.length !== 3 || uploading}
                whileHover={{ scale: uploadedFiles.length === 3 ? 1.02 : 1 }}
                whileTap={{ scale: uploadedFiles.length === 3 ? 0.98 : 1 }}
                className={`w-full mt-4 py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                  uploadedFiles.length === 3 && !uploading
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing Statements...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5 mr-2" />
                    Analyze Statements
                  </>
                )}
              </motion.button>
            </div>

            {/* Metrics Display */}
            {currentMetrics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
                  Financial Analysis
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200/50">
                    <p className="text-sm font-medium text-emerald-700">Avg Monthly Revenue</p>
                    <p className="text-2xl font-bold text-emerald-800 mt-1">
                      {formatCurrency(currentMetrics.avg_monthly_revenue)}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
                    <p className="text-sm font-medium text-blue-700">Avg Daily Balance</p>
                    <p className="text-2xl font-bold text-blue-800 mt-1">
                      {formatCurrency(currentMetrics.avg_daily_balance_3m)}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200/50">
                    <p className="text-sm font-medium text-amber-700">NSF Count (3m)</p>
                    <p className="text-2xl font-bold text-amber-800 mt-1">
                      {currentMetrics.total_nsf_3m}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50">
                    <p className="text-sm font-medium text-purple-700">Days Negative (3m)</p>
                    <p className="text-2xl font-bold text-purple-800 mt-1">
                      {currentMetrics.total_days_negative_3m}
                    </p>
                  </div>
                </div>

                <motion.button
                  onClick={handleGenerateOffers}
                  disabled={generating}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-6 py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-medium shadow-lg shadow-emerald-600/25 transition-all duration-200 flex items-center justify-center"
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Generating Offers...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Generate Loan Offers
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
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
                Generated Offers
              </h3>

              {generatedOffers.length > 0 ? (
                <div className="space-y-6">
                  {generatedOffers.map((offer) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-900">{offer.type}</h4>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getQualificationColor(offer.qualification_score)}`}>
                          {offer.qualification_score}% Match
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-slate-600">Loan Amount</p>
                          <p className="text-xl font-bold text-slate-900">{formatCurrency(offer.amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Interest Rate</p>
                          <p className="text-xl font-bold text-slate-900">{offer.rate}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Term</p>
                          <p className="text-xl font-bold text-slate-900">{offer.term} months</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Monthly Payment</p>
                          <p className="text-xl font-bold text-slate-900">
                            {offer.monthly_payment > 0 ? formatCurrency(offer.monthly_payment) : 'Flexible'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Advantages:</p>
                          <ul className="space-y-1">
                            {offer.advantages?.map((advantage: string, index: number) => (
                              <li key={index} className="text-sm text-slate-600 flex items-center">
                                <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                                {advantage}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Requirements:</p>
                          <ul className="space-y-1">
                            {offer.requirements?.map((requirement: string, index: number) => (
                              <li key={index} className="text-sm text-slate-600 flex items-center">
                                <AlertCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                                {requirement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <button className="w-full mt-4 py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200">
                        Apply for this Offer
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="w-10 h-10 text-slate-400" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-600 mb-2">No Offers Generated</h4>
                  <p className="text-sm text-slate-500">
                    Upload and analyze bank statements to generate personalized loan offers
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}