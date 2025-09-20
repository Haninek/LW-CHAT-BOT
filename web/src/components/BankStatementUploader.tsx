import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle2, AlertCircle, Zap, TrendingUp } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface BankStatementUploaderProps {
  onFilesSelected: (files: File[]) => void
  onAnalyze: () => void
  uploadedFiles: File[]
  uploading: boolean
  analysisResults?: any
}

export default function BankStatementUploader({ 
  onFilesSelected, 
  onAnalyze, 
  uploadedFiles, 
  uploading, 
  analysisResults 
}: BankStatementUploaderProps) {
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Allow 3-12 statements (minimum 3 months)
    if (acceptedFiles.length < 3) {
      alert('Please upload minimum 3 bank statements (3+ months required)')
      return
    }
    if (acceptedFiles.length > 12) {
      alert('Maximum 12 bank statements allowed (12 months max)')
      return
    }
    onFilesSelected(acceptedFiles)
  }, [onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    minFiles: 3,
    maxFiles: 12,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  })

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    onFilesSelected(newFiles)
  }

  const formatFileSize = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <motion.div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
          ${isDragActive || dragActive 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }`}
        whileHover={{ scale: uploadedFiles.length === 0 ? 1.02 : 1 }}
        whileTap={{ scale: 0.98 }}
      >
        <input {...getInputProps()} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Upload className="w-10 h-10 text-white" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900">
              Upload Bank Statements
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Drop your PDF bank statements here or click to browse. 
              <span className="font-semibold text-blue-600"> Minimum 3 months</span> required, up to 12 months supported.
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
              PDF Only
            </span>
            <span className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
              3-12 Months
            </span>
            <span className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
              Secure Upload
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                Uploaded Statements ({uploadedFiles.length} months)
              </h4>
              <div className="text-sm text-gray-500">
                {uploadedFiles.length >= 3 ? (
                  <span className="text-green-600 font-medium">
                    ✓ Ready for analysis
                  </span>
                ) : (
                  <span className="text-orange-600 font-medium">
                    Need {3 - uploadedFiles.length} more files
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid gap-3">
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • PDF
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Button */}
      {uploadedFiles.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <button
            onClick={onAnalyze}
            disabled={uploading}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {uploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                />
                Analyzing Statements...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-3" />
                Analyze {uploadedFiles.length} Months of Statements
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Analysis Results */}
      {analysisResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Analysis Complete</h3>
              <p className="text-sm text-gray-600">
                {analysisResults.statements_processed} months analyzed • 
                {analysisResults.gpt_analysis ? ' GPT-powered' : ' Demo mode'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                ${(analysisResults.avg_monthly_revenue || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Avg Monthly Revenue</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                ${(analysisResults.avg_daily_balance || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Avg Daily Balance</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {(analysisResults.analysis_confidence * 100 || 0).toFixed(0)}%
              </p>
              <p className="text-sm text-gray-600">Confidence</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {analysisResults.months_analyzed || 0}
              </p>
              <p className="text-sm text-gray-600">Months Analyzed</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}