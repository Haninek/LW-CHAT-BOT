import React, { useState, useEffect } from 'react'

interface BackgroundJob {
  id: string
  merchant_id: string
  type: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  results?: any
  error_message?: string
  created_at: string
  completed_at?: string
}

const Background: React.FC = () => {
  const [jobs, setJobs] = useState<BackgroundJob[]>([])
  const [loading, setLoading] = useState(true)
  const [testMode, setTestMode] = useState<'mock' | 'live'>('mock')
  const [newCheck, setNewCheck] = useState({
    merchant_id: '',
    type: 'identity_verification'
  })

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/background?limit=50')
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Failed to load background jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const startBackgroundCheck = async () => {
    if (!newCheck.merchant_id.trim()) {
      alert('Please enter a merchant ID')
      return
    }

    try {
      const response = await fetch('/api/background/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newCheck,
          mock_mode: testMode === 'mock'
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Background check started: ${result.job_id}`)
        setNewCheck({ merchant_id: '', type: 'identity_verification' })
        loadJobs()
      } else {
        const error = await response.json()
        alert(`Failed to start check: ${error.detail}`)
      }
    } catch (error) {
      console.error('Start check error:', error)
      alert('Failed to start background check')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start)
    const endTime = end ? new Date(end) : new Date()
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.round(duration / 60)}m`
    return `${Math.round(duration / 3600)}h`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Background Checks
        </h1>
        <p className="text-gray-600">
          CLEAR identity verification and background check integration
        </p>
      </div>

      {/* Test Mode Toggle */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Test Mode</h2>
            <p className="text-sm text-gray-600">
              Use mock responses for testing without consuming real API calls
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center">
              <input
                type="radio"
                value="mock"
                checked={testMode === 'mock'}
                onChange={(e) => setTestMode(e.target.value as 'mock' | 'live')}
                className="mr-2"
              />
              Mock Mode
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="live"
                checked={testMode === 'live'}
                onChange={(e) => setTestMode(e.target.value as 'mock' | 'live')}
                className="mr-2"
              />
              Live Mode
            </label>
          </div>
        </div>
      </div>

      {/* Start New Check */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Start Background Check</h2>
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merchant ID
            </label>
            <input
              type="text"
              value={newCheck.merchant_id}
              onChange={(e) => setNewCheck(prev => ({ ...prev, merchant_id: e.target.value }))}
              placeholder="Enter merchant ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check Type
            </label>
            <select
              value={newCheck.type}
              onChange={(e) => setNewCheck(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="identity_verification">Identity Verification</option>
              <option value="background_check">Full Background Check</option>
              <option value="sanctions_screening">Sanctions Screening</option>
            </select>
          </div>
          <button
            onClick={startBackgroundCheck}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            🔍 Start Check
          </button>
        </div>
        
        {testMode === 'mock' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Mock Mode:</strong> Will return simulated responses for testing purposes.
              No real API calls will be made to CLEAR.
            </p>
          </div>
        )}
      </div>

      {/* Jobs History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Background Check History</h2>
          <button
            onClick={loadJobs}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Loading background checks...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No background checks found.</p>
            <p className="text-sm text-gray-400 mt-2">
              Start your first background check using the form above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <div key={job.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {job.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      Merchant ID: <span className="font-mono">{job.merchant_id}</span>
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Started: {new Date(job.created_at).toLocaleString()}</span>
                      {job.completed_at && (
                        <span>Duration: {formatDuration(job.created_at, job.completed_at)}</span>
                      )}
                      {job.status === 'in_progress' && (
                        <span>Running: {formatDuration(job.created_at)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <div className="text-right">
                      {job.status === 'completed' && job.results && (
                        <button 
                          onClick={() => alert(JSON.stringify(job.results, null, 2))}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                        >
                          📊 View Results
                        </button>
                      )}
                      
                      {job.status === 'failed' && job.error_message && (
                        <button 
                          onClick={() => alert(`Error: ${job.error_message}`)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        >
                          ❌ View Error
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Results Preview */}
                {job.status === 'completed' && job.results && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {Object.entries(job.results).slice(0, 6).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-600 capitalize">
                            {key.replace('_', ' ')}: 
                          </span>
                          <span className="text-gray-900 ml-1">
                            {typeof value === 'boolean' ? (value ? '✅' : '❌') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Background