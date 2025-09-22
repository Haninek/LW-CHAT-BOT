import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, DollarSign, Calculator, Download, Zap, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import MonthlySummary from '@/components/analysis/MonthlySummary'
import CsvTable from '@/components/analysis/CsvTable'
import { DynamicCsvTable } from '@/components/analysis/DynamicCsvTable'
import { BankAnalysisPanel } from '@/components/analysis/BankAnalysisPanel'
import { readCsvFile, parseCsv, coerceMonthlyRows } from '@/lib/csv'
import type { MonthlyCsvRow } from '@/types/analysis'
import type { Transaction } from '@/analysis/bankAnalysis'
import { useAppStore } from '../state/useAppStore'
import { apiClient } from '../lib/api'

type ToastTone = 'info' | 'warning' | 'error'

type ToastState = {
  message: string
  tone: ToastTone
}


type MerchantSummary = {
  id: string
  name: string
  status?: string
  reused?: boolean
}

type DealSummary = {
  id: string
  status?: string
  reused?: boolean
}

const toastToneStyles: Record<ToastTone, { container: string; icon: string; button: string }> = {
  info: {
    container: 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-slate-900/30 backdrop-blur',
    icon: 'text-emerald-300',
    button: 'text-slate-200 hover:text-white'
  },
  warning: {
    container: 'bg-amber-50 text-amber-800 border-amber-200 shadow-amber-200/60',
    icon: 'text-amber-500',
    button: 'text-amber-600 hover:text-amber-700'
  },
  error: {
    container: 'bg-red-50 text-red-800 border-red-200 shadow-red-200/60',
    icon: 'text-red-500',
    button: 'text-red-600 hover:text-red-700'
  }
}

function computeOfferOverrides(rows: MonthlyCsvRow[]) {
  if (!rows?.length) return undefined
  const months = rows.length
  let totalEligible = 0
  let totalDeposits = 0
  let totalMcaOut = 0

  for (const r of rows) {
    const dep = Math.max(0, r.total_deposits || 0)
    const wires = Math.max(0, r.wire_credits || 0)
    const eligible = Math.max(0, dep - wires)
    totalEligible += eligible
    totalDeposits += dep
    totalMcaOut += Math.max(0, r.withdrawals_PFSINGLE_PT || 0)
  }

  const avgEligible = months ? totalEligible / months : 0
  const mcaLoad = totalDeposits ? (totalMcaOut / totalDeposits) : 0

  const holdbackPct = mcaLoad >= 0.9 ? 0.08 : mcaLoad >= 0.8 ? 0.10 : 0.12

  return {
    normalization: { exclude_wires: true, avg_eligible_inflow: avgEligible },
    holdback_cap: holdbackPct,
    factor_tiers: [1.20, 1.30, 1.45],
    remit_frequency: 'daily',
  }
}

export default function OffersLab() {
  const { currentMetrics, setCurrentMetrics, offerOverrides } = useAppStore()
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [generatedOffers, setGeneratedOffers] = useState<any[]>([])
  const [csvRows, setCsvRows] = useState<MonthlyCsvRow[]>([])
  const [monthlyRows, setMonthlyRows] = useState<MonthlyCsvRow[]>([])
  const [loadingMonthly, setLoadingMonthly] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  // State for new transaction analysis
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [merchantInfo, setMerchantInfo] = useState<MerchantSummary | null>(null)
  const [dealInfo, setDealInfo] = useState<DealSummary | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = null
      }
    }
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = null
    }
    setToast(null)
  }, [])

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = null
    }
    setToast({ message, tone })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 5000)
  }, [])

  const ensureMerchantAndDeal = useCallback(async () => {
    let merchantId = merchantInfo?.id
    let dealId = dealInfo?.id

    if (!merchantId) {
      const uniqueSuffix = Date.now().toString().slice(-6)
      const fallbackName = `Demo Merchant ${uniqueSuffix}`
      const response: any = await apiClient.createMerchant({
        legalName: fallbackName,
        phone: `555${uniqueSuffix.padStart(7, '0')}`,
        email: `owner+${uniqueSuffix}@demo.mca`,
        state: 'NY',
        city: 'New York',
      })
      const created = response?.merchant
      if (!created?.id) {
        throw new Error('Unable to create merchant')
      }
      merchantId = created.id
      setMerchantInfo({
        id: created.id,
        name: created.legal_name || created.legalName || fallbackName,
        status: created.status,
        reused: Boolean(response?.reused)
      })
    }

    if (!dealId && merchantId) {
      const dealResponse: any = await apiClient.startDeal({ merchantId })
      if (!dealResponse?.deal_id) {
        throw new Error('Unable to start deal')
      }
      dealId = dealResponse.deal_id
      setDealInfo({
        id: dealResponse.deal_id,
        status: dealResponse.status,
        reused: Boolean(dealResponse.reused)
      })
    }

    if (!merchantId || !dealId) {
      throw new Error('Missing merchant or deal identifiers')
    }

    return { merchantId, dealId }
  }, [dealInfo, merchantInfo])

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
    // Automatically start analysis when files are dropped
    handleParseStatements(acceptedFiles)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    minFiles: 3,
    maxFiles: 12,
    multiple: true
  })

  const handleParseStatements = async (filesToAnalyze?: File[]) => {
    const selectedFiles = filesToAnalyze || uploadedFiles
    if (selectedFiles.length < 3) {
      alert('Please upload minimum 3 bank statements (3+ months required)')
      return
    }

    setUploading(true)
    setError(null)
    dismissToast()

    try {
      const { merchantId, dealId } = await ensureMerchantAndDeal()
      setGeneratedOffers([])

      console.log('Analyzing files:', selectedFiles.map(f => f.name))

      const uploadResult = await apiClient.uploadBankStatements({
        merchantId,
        dealId,
        files: selectedFiles
      })
      if (uploadResult && 'metrics' in uploadResult && uploadResult.metrics) {
        setCurrentMetrics(uploadResult.metrics)
      }

      const parseResult = await apiClient.parseStatements({
        merchantId,
        dealId
      })

      if (parseResult && 'metrics' in parseResult && parseResult.metrics) {
        setCurrentMetrics(parseResult.metrics)
        setError(null)
        
        // Fetch monthly rows for analysis
        setLoadingMonthly(true)
        try {
          const r = await apiClient.getMonthlyRows(dealId)
          if (r?.success && (r.data as any)?.rows) {
            setMonthlyRows((r.data as any).rows as MonthlyCsvRow[])
          }
        } catch (error) {
          console.warn('Could not fetch monthly rows:', error)
        } finally {
          setLoadingMonthly(false)
        }

        // Fetch transactions for new analysis engine
        setLoadingTransactions(true)
        try {
          const transactionResponse = await apiClient.getTransactions(dealId)
          if (transactionResponse.success && transactionResponse.data && 
              typeof transactionResponse.data === 'object' && 
              'transactions' in transactionResponse.data) {
            setTransactions((transactionResponse.data as any).transactions)
          }
        } catch (error) {
          console.warn('Could not fetch transactions:', error)
        } finally {
          setLoadingTransactions(false)
        }
        
        await handleGenerateOffers((parseResult as any).metrics)
      }
    } catch (error: any) {
      console.error('Failed to parse statements:', error)
      const fallbackMessage = error?.message || 'Parse failed'
      setError(fallbackMessage)
      setGeneratedOffers([])
      showToast('Parser unavailable – showing demo metrics instead.', 'warning')

      const monthsCount = selectedFiles.length
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
        avg_daily_balance_3m: 46667,
        total_nsf_fees: 2,
        total_nsf_3m: 2,
        days_negative_balance: 6,
        total_days_negative_3m: 6,
        months_analyzed: monthsCount,
        statements_processed: monthsCount,
        gpt_analysis: false
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCsvUpload = async (file: File) => {
    const text = await readCsvFile(file)
    const rawRows = parseCsv(text)
    const rows = coerceMonthlyRows(rawRows)
    setCsvRows(rows)
  }

  const handleGenerateOffers = async (metricsOverride?: any) => {
    const metricsToUse = metricsOverride ?? currentMetrics
    if (!metricsToUse) return

    setGenerating(true)
    try {
      // Use monthly rows data if available, otherwise fall back to CSV or defaults
    const overrides = monthlyRows.length ? computeOfferOverrides(monthlyRows) : 
                     csvRows.length ? computeOfferOverrides(csvRows) : offerOverrides
      const response = await apiClient.generateOffers(metricsToUse, overrides)
      if (response.success && response.data?.offers) {
        setGeneratedOffers(response.data.offers)
      }
    } catch (error) {
      console.error('Failed to generate offers:', error)
      // Show demo cash advance offers for UI purposes matching real CA structure
      setGeneratedOffers([
        {
          id: 'cash-advance-1',
          tier: 1,
          type: 'Cash Advance',
          amount: 68000,
          factor: 0.8,  // Revenue factor (80% of monthly revenue)
          fee: 1.12,    // Fee multiplier (12% fee)
          payback_amount: 76160,
          term_days: 120,
          daily_payment: 634,
          risk_score: 0.3,
          underwriting_decision: 'approved',
          terms_compliant: true,
          qualification_score: 85,
          rationale: 'Demo cash advance - Tier 1',
          advantages: ['Fast funding', 'Revenue-based repayment', 'No fixed monthly payments']
        },
        {
          id: 'cash-advance-2',
          tier: 2,
          type: 'Cash Advance',
          amount: 85000,
          factor: 1.0,  // 100% of monthly revenue
          fee: 1.15,    // 15% fee
          payback_amount: 97750,
          term_days: 150,
          daily_payment: 652,
          risk_score: 0.3,
          underwriting_decision: 'approved',
          terms_compliant: true,
          qualification_score: 82,
          rationale: 'Demo cash advance - Tier 2',
          advantages: ['Higher amount', 'Revenue-based repayment', 'Flexible terms']
        },
        {
          id: 'cash-advance-3',
          tier: 3,
          type: 'Cash Advance',
          amount: 102000,
          factor: 1.2,  // 120% of monthly revenue
          fee: 1.18,    // 18% fee
          payback_amount: 120360,
          term_days: 180,
          daily_payment: 669,
          risk_score: 0.3,
          underwriting_decision: 'approved',
          terms_compliant: true,
          qualification_score: 75,
          rationale: 'Demo cash advance - Tier 3',
          advantages: ['Maximum funding', 'Longer term', 'Revenue-based repayment']
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
              {merchantInfo && (
                <div className="hidden sm:flex flex-col items-end text-xs text-slate-500 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 truncate" title={merchantInfo.name}>{merchantInfo.name}</span>
                    {merchantInfo.status && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          merchantInfo.status === 'existing'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-blue-200 bg-blue-50 text-blue-700'
                        }`}
                      >
                        {merchantInfo.status === 'existing' ? 'Existing' : 'New'}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 truncate" title={merchantInfo.id}>
                    Merchant ID: {merchantInfo.id}
                  </span>
                  {dealInfo && (
                    <span className="font-mono text-[11px] text-slate-400 truncate" title={dealInfo.id}>
                      Deal ID: {dealInfo.id}
                    </span>
                  )}
                </div>
              )}
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
            {/* File Upload - Modern & Responsive */}
            <motion.div 
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50"
              animate={uploading ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 2, repeat: uploading ? Infinity : 0 }}
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-blue-600" />
                Upload Bank Statements
                {uploading && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="ml-2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"
                  />
                )}
              </h3>

              {error && (
                <div className="mb-4 flex items-start space-x-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {(merchantInfo || dealInfo) && (
                <div className="mb-4 rounded-xl border border-slate-200/60 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                  {merchantInfo && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate">
                          <span className="text-[11px] uppercase tracking-wide text-slate-400">Merchant</span>
                          <div className="font-medium text-slate-700 truncate" title={merchantInfo.name}>
                            {merchantInfo.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {merchantInfo.status && (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                merchantInfo.status === 'existing'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-blue-200 bg-blue-50 text-blue-700'
                              }`}
                            >
                              {merchantInfo.status === 'existing' ? 'Existing' : 'New'}
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-slate-400 truncate" title={merchantInfo.id}>
                            {merchantInfo.id}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {dealInfo && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">Deal</span>
                        <div className="font-medium text-slate-700 truncate">
                          {(dealInfo.status || 'open').toUpperCase()}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 truncate" title={dealInfo.id}>
                        {dealInfo.id}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <motion.div
                {...getRootProps()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer transform
                  ${isDragActive 
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 scale-105 shadow-lg' 
                    : uploadedFiles.length > 0
                    ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md'
                    : 'border-slate-300 bg-gradient-to-r from-slate-50/50 to-gray-50/50 hover:bg-gradient-to-r hover:from-slate-50 hover:to-gray-50 hover:border-slate-400 hover:shadow-md'
                  }`}
              >
                <input {...getInputProps()} />
                <motion.div 
                  className="space-y-4"
                  animate={uploading ? { y: [0, -5, 0] } : {}}
                  transition={{ duration: 2, repeat: uploading ? Infinity : 0 }}
                >
                  <motion.div 
                    className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
                      uploading ? 'bg-gradient-to-r from-blue-100 to-indigo-100' :
                      uploadedFiles.length > 0 ? 'bg-gradient-to-r from-emerald-100 to-green-100' : 'bg-gradient-to-r from-slate-100 to-gray-100'
                    }`}
                    whileHover={{ rotate: 10 }}
                    animate={uploading ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1, repeat: uploading ? Infinity : 0 }}
                  >
                    {uploading ? (
                      <Zap className="w-10 h-10 text-blue-600" />
                    ) : uploadedFiles.length > 0 ? (
                      <CheckCircle className="w-10 h-10 text-emerald-600" />
                    ) : (
                      <FileText className="w-10 h-10 text-slate-500" />
                    )}
                  </motion.div>
                  
                  {uploading ? (
                    <div>
                      <motion.p 
                        className="text-xl font-bold text-blue-700"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        🧠 AI Analyzing Your Statements...
                      </motion.p>
                      <p className="text-sm text-blue-600 mt-2">
                        Extracting NSF counts, cash flow patterns, and generating insights
                      </p>
                      <div className="flex justify-center mt-4">
                        <div className="flex space-x-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 bg-blue-500 rounded-full"
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : uploadedFiles.length > 0 ? (
                    <div>
                      <p className="text-xl font-bold text-emerald-700">
                        ✅ {uploadedFiles.length} Statement{uploadedFiles.length > 1 ? 's' : ''} Ready
                      </p>
                      <div className="mt-3 max-h-24 overflow-y-auto">
                        {uploadedFiles.map((file, index) => (
                          <motion.div 
                            key={index} 
                            className="flex items-center justify-center text-sm text-slate-600 py-1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <FileText className="w-4 h-4 mr-2 text-emerald-500" />
                            <span className="truncate max-w-xs">{file.name}</span>
                          </motion.div>
                        ))}
                      </div>
                      {currentMetrics && (
                        <motion.div 
                          className="mt-4 text-sm font-medium text-emerald-700"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          ✨ Analysis Complete - Ready for Offers!
                        </motion.div>
                      )}
                    </div>
                  ) : isDragActive ? (
                    <div>
                      <motion.p 
                        className="text-xl font-bold text-blue-700"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        📁 Drop Your Bank Statements Here!
                      </motion.p>
                      <p className="text-sm text-blue-600">
                        PDF files • 3-12 months • Instant AI analysis
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-bold text-slate-700">
                        🏦 Drop Bank Statements for Instant Analysis
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Drag & drop PDF statements or click to browse<br/>
                        <span className="font-semibold text-blue-600">3-12 months • Real NSF & cash flow analysis</span>
                      </p>
                      <div className="flex justify-center items-center mt-4 space-x-4 text-xs text-slate-400">
                        <span className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                          Secure
                        </span>
                        <span className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                          AI-Powered
                        </span>
                        <span className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                          Instant
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>

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

              </motion.div>
            )}

            {/* Monthly Analysis Section */}
            {!loadingMonthly && monthlyRows.length > 0 && dealInfo?.id && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/50"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Monthly Analysis</h3>
                  <a
                    href={apiClient.getMonthlyCsvUrl(dealInfo.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1.5 rounded-md border bg-slate-50 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </a>
                </div>

                {loadingMonthly && <div className="text-sm text-slate-500 mt-2">Loading monthly analysis…</div>}
                {loadingTransactions && <div className="text-sm text-slate-500 mt-2">Loading transactions for analysis…</div>}

                {/* New Bank Analysis Panel - Transaction-level analysis */}
                {transactions.length > 0 && (
                  <div className="mt-6">
                    <BankAnalysisPanel transactions={transactions} dealId={dealInfo?.id} />
                  </div>
                )}

                <MonthlySummary rows={monthlyRows} />
                <div className="mt-6">
                  <DynamicCsvTable rowsRaw={
                    monthlyRows.map(r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, String(v ?? '')])))
                  } />
                </div>
              </motion.div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Monthly CSV (optional)</h3>
              <input
                type="file"
                accept=".csv"
                onChange={e => e.target.files?.[0] && handleCsvUpload(e.target.files[0])}
                className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <p className="text-xs text-slate-500 mt-1">Tip: Use the exported CSV with columns like total_deposits, withdrawals_PFSINGLE_PT, wire_credits, etc.</p>
            </div>

            {csvRows.length > 0 && <MonthlySummary rows={csvRows} />}

            {csvRows.length > 0 && <CsvTable rows={csvRows} />}

            {currentMetrics && (
              <motion.button
                onClick={handleGenerateOffers}
                disabled={generating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-medium shadow-lg shadow-emerald-600/25 transition-all duration-200 flex items-center justify-center"
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
                        <h4 className="text-lg font-semibold text-slate-900">
                          {offer.type} - Tier {offer.tier}
                        </h4>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getQualificationColor(offer.qualification_score)}`}>
                          {offer.qualification_score}% Qualified
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-slate-600">Cash Advance</p>
                          <p className="text-xl font-bold text-slate-900">{formatCurrency(offer.amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Fee Rate</p>
                          <p className="text-xl font-bold text-slate-900">{(offer.fee * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Payback Amount</p>
                          <p className="text-xl font-bold text-slate-900">{formatCurrency(offer.payback_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Term</p>
                          <p className="text-xl font-bold text-slate-900">{offer.term_days} days</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Daily Payment</p>
                          <p className="text-xl font-bold text-slate-900">{formatCurrency(offer.daily_payment)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Revenue Factor</p>
                          <p className="text-xl font-bold text-slate-900">{(offer.factor * 100).toFixed(0)}%</p>
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
                          <p className="text-sm font-medium text-slate-700 mb-2">Underwriting Details:</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Risk Score:</span>
                              <span className="font-medium text-slate-900">{(offer.risk_score * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Decision:</span>
                              <span className={`font-medium capitalize ${
                                offer.underwriting_decision === 'approved' ? 'text-green-600' : 'text-yellow-600'
                              }`}>
                                {offer.underwriting_decision?.replace('_', ' ')}
                              </span>
                            </div>
                            {offer.expected_margin && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Expected Margin:</span>
                                <span className="font-medium text-slate-900">{formatCurrency(offer.expected_margin)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-600">Compliance:</span>
                              <span className={`font-medium ${
                                offer.terms_compliant ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {offer.terms_compliant ? 'Compliant' : 'Issues Found'}
                              </span>
                            </div>
                          </div>
                          {offer.rationale && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">{offer.rationale}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200">
                          Accept Offer
                        </button>
                        <button className="flex-1 py-2 px-4 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-all duration-200">
                          View Details
                        </button>
                      </div>
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

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-4 right-4 z-50 flex max-w-sm items-start space-x-3 rounded-xl border px-4 py-3 shadow-lg ${toastToneStyles[toast.tone].container}`}
        >
          <div className="mt-0.5">
            {toast.tone === 'info' ? (
              <CheckCircle className={`h-5 w-5 ${toastToneStyles[toast.tone].icon}`} />
            ) : (
              <AlertCircle className={`h-5 w-5 ${toastToneStyles[toast.tone].icon}`} />
            )}
          </div>
          <div className="flex-1 text-sm leading-snug">{toast.message}</div>
          <button
            type="button"
            onClick={dismissToast}
            className={`ml-2 text-xs font-semibold uppercase tracking-wide transition ${toastToneStyles[toast.tone].button}`}
          >
            Close
          </button>
        </motion.div>
      )}
    </div>
  )
}
