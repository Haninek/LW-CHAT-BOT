import React, { useState } from 'react'
import type { MonthlyRow, RiskPack, CashPnL } from '@/types/analysis'
import MonthlySummary from '@/components/analysis/MonthlySummary'
import DynamicCsvTable from '@/components/analysis/DynamicCsvTable'
import RiskProsCons from '@/components/analysis/RiskProsCons'
import FollowUpsAndDocs from '@/components/analysis/FollowUpsAndDocs'
import CashPnLCard from '@/components/analysis/CashPnLCard'
import ScrubSnapshotCard from '@/components/analysis/ScrubSnapshotCard'

export default function OffersLab() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<MonthlyRow[]>([])
  const [risk, setRisk] = useState<RiskPack|null>(null)
  const [pnl, setPnL] = useState<CashPnL|null>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [snapshot, setSnapshot] = useState<any|null>(null)
  const [cleanPdf, setCleanPdf] = useState<string| null>(null)
  const [error, setError] = useState<string| null>(null)

  const analyze = async () => {
    setError(null)
    try {
      setLoading(true)
      const form = new FormData()
      form.append('merchant_id','unknown-merchant')
      form.append('deal_id','unknown-deal')
      files.forEach(f => form.append('files', f))
      const res = await fetch('/api/analysis/run', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.detail || data?.error || 'Analysis failed')
      setRows(data.monthly_rows || [])
      setRisk(data.risk || null)
      setPnL(data.cash_pnl || null)
      setOffers(data.offers || [])
      setSnapshot(data.snapshot || null)
      setCleanPdf(data.downloads?.clean_scrub_pdf_path || null)
    } catch (e:any) {
      setError(e?.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const hasResults = rows.length > 0 || risk || pnl || offers?.length || snapshot

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Offers Lab</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload bank statements to generate instant underwriting analysis and funding offers
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-12">
          <div className="max-w-2xl mx-auto">
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-400 transition-colors">
              <div className="space-y-6">
                <div className="text-6xl">📄</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Bank Statements</h3>
                  <p className="text-gray-500 mb-6">Upload 2-3 recent monthly bank statements (PDF format)</p>
                  
                  <input 
                    type="file" 
                    multiple 
                    accept="application/pdf" 
                    onChange={e=> setFiles(e.target.files ? Array.from(e.target.files) : [])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 cursor-pointer font-medium"
                  >
                    Choose Files
                  </label>
                </div>
                
                {files.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">{files.length} file(s) selected:</p>
                    <div className="space-y-1">
                      {files.map((f, i) => (
                        <p key={i} className="text-sm text-blue-700">{f.name}</p>
                      ))}
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={analyze} 
                  disabled={!files.length || loading}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analyzing...
                    </span>
                  ) : (
                    'Generate Analysis & Offers'
                  )}
                </button>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {hasResults && (
          <div className="space-y-8">
            
            {/* Key Metrics Row */}
            {(snapshot || pnl) && (
              <div className="grid lg:grid-cols-2 gap-8">
                {snapshot && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                      <h2 className="text-xl font-bold text-white">Business Snapshot</h2>
                    </div>
                    <div className="p-6">
                      <ScrubSnapshotCard snap={snapshot} cleanPdfPath={cleanPdf} />
                    </div>
                  </div>
                )}
                {pnl && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                      <h2 className="text-xl font-bold text-white">Cash Flow Analysis</h2>
                    </div>
                    <div className="p-6">
                      <CashPnLCard pnl={pnl} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Risk Assessment */}
            {risk && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Risk Assessment</h2>
                </div>
                <div className="p-6">
                  <RiskProsCons risk={risk} />
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <FollowUpsAndDocs risk={risk} />
                  </div>
                </div>
              </div>
            )}

            {/* Generated Offers */}
            {offers?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Funding Offers</h2>
                </div>
                <div className="p-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {offers.map((offer, index) => (
                      <div key={offer.id || index} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                        <div className="text-center mb-4">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-2">
                            <span className="text-emerald-600 font-bold text-lg">{index + 1}</span>
                          </div>
                          <h3 className="font-bold text-gray-900">{offer.factor}x Factor</h3>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600 text-sm">Advance Amount</span>
                            <span className="font-bold text-green-600">${offer.advance?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600 text-sm">Total Payback</span>
                            <span className="font-bold text-gray-900">${offer.payback?.toLocaleString()}</span>
                          </div>
                          {offer.est_daily && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-gray-600 text-sm">Est. Daily Payment</span>
                              <span className="font-medium text-gray-700">${offer.est_daily?.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600 text-sm">Holdback</span>
                            <span className="font-medium text-gray-700">{(offer.holdback_cap * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        {offer.notes && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-700">{offer.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Summary */}
            {rows.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Monthly Analysis</h2>
                </div>
                <div className="p-6">
                  <MonthlySummary rows={rows} />
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Transaction Data</h3>
                    <DynamicCsvTable rowsRaw={rows.map(r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, String(v ?? '')])))} />
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}