import React, { useState, useEffect } from 'react'
import { 
  analyzeParsedStatements, 
  evaluateDeclines, 
  suggestOffers, 
  toUiRows, 
  fmt,
  type Transaction,
  type AccountAnalysis,
  type DeclineFinding,
  type Offer,
  type DeclineRulesOptions,
  type OfferOptions 
} from '@/analysis/bankAnalysis'

interface BankAnalysisPanelProps {
  transactions: Transaction[]
  dealId?: string
}

export function BankAnalysisPanel({ transactions, dealId }: BankAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AccountAnalysis | null>(null)
  const [declines, setDeclines] = useState<DeclineFinding[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (transactions.length === 0) return

    setLoading(true)
    try {
      // Run the bank analysis engine
      const analysisResult = analyzeParsedStatements(transactions)
      setAnalysis(analysisResult)

      // Evaluate decline rules
      const declineRules: DeclineRulesOptions = {
        minimumRevenue3mo: 75000,
        negativeDayHardMax: 5,
        largeMoMDeltaPct: 0.5,
        poorDailyBalanceThreshold: 1000,
        poorDailyBalanceHardMax: 10
      }
      const declineFindings = evaluateDeclines(analysisResult, declineRules)
      setDeclines(declineFindings)

      // Generate MCA offers
      const offerOptions: OfferOptions = {
        factorTiers: [1.20, 1.30, 1.40],
        advanceMultiple: 0.8,
        holdbackPercents: [0.08, 0.10, 0.12],
        fixedDaily: true,
        fixedWeekly: true,
        termDays: 120,
        maxDebtServicePct: 0.25
      }
      const generatedOffers = suggestOffers(analysisResult, offerOptions)
      setOffers(generatedOffers)
    } catch (error) {
      console.error('Bank analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }, [transactions])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Analyzing bank statements...</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
        <p className="text-slate-500 text-center py-8">
          No transaction data available for analysis
        </p>
      </div>
    )
  }

  const { rows, averages } = toUiRows(analysis)

  return (
    <div className="space-y-6">
      {/* Bank Statement Monthly Averages KPIs */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Bank Statement Monthly Averages</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/50">
            <p className="text-sm font-medium text-emerald-700">Net Deposits</p>
            <p className="text-2xl font-bold text-emerald-800">{fmt(averages.netDeposits)}</p>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200/50">
            <p className="text-sm font-medium text-blue-700">Avg Daily Balance</p>
            <p className="text-2xl font-bold text-blue-800">{fmt(averages.averageBal)}</p>
          </div>
          
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/50">
            <p className="text-sm font-medium text-amber-700">Negative Days</p>
            <p className="text-2xl font-bold text-amber-800">{averages.negDays}</p>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200/50">
            <p className="text-sm font-medium text-purple-700">Deposit Count</p>
            <p className="text-2xl font-bold text-purple-800">{averages.numDeposits}</p>
          </div>
        </div>

        {/* Monthly Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-medium text-slate-700">Month</th>
                <th className="text-right py-2 px-3 font-medium text-slate-700">Total Deposits</th>
                <th className="text-right py-2 px-3 font-medium text-slate-700">Net Deposits</th>
                <th className="text-right py-2 px-3 font-medium text-slate-700">Avg Balance</th>
                <th className="text-right py-2 px-3 font-medium text-slate-700">Neg Days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-2 px-3 font-mono">{row.month}</td>
                  <td className="py-2 px-3 text-right font-mono">{fmt(row.totalDeposits)}</td>
                  <td className="py-2 px-3 text-right font-mono">{fmt(row.netDeposits)}</td>
                  <td className="py-2 px-3 text-right font-mono">{fmt(row.averageBal)}</td>
                  <td className="py-2 px-3 text-right font-mono">{row.negDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decline Rules Panel */}
      {declines.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Decline Rules</h3>
          <div className="space-y-3">
            {declines.map((decline, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border ${
                  decline.severity === 'decline' 
                    ? 'bg-red-50 border-red-200 text-red-800' 
                    : decline.severity === 'warn'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{decline.code}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    decline.severity === 'decline' 
                      ? 'bg-red-100 text-red-700' 
                      : decline.severity === 'warn'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {decline.severity}
                  </span>
                </div>
                <p className="text-sm mt-1">{decline.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MCA Offer Suggestions */}
      {offers.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">MCA Offer Suggestions</h3>
          <div className="grid gap-4">
            {offers.map((offer, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900">{offer.tier} - {offer.method}</h4>
                  <span className="text-sm px-3 py-1 bg-slate-100 rounded-full text-slate-700">
                    Factor: {offer.factor}x
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Advance</p>
                    <p className="font-semibold text-emerald-700">{fmt(offer.advance)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Payback</p>
                    <p className="font-semibold text-slate-700">{fmt(offer.payback)}</p>
                  </div>
                  {offer.method === 'fixed-daily' && (
                    <>
                      <div>
                        <p className="text-slate-600">Daily Payment</p>
                        <p className="font-semibold text-blue-700">{fmt(offer.dailyPayment)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Est. Term</p>
                        <p className="font-semibold text-slate-700">{offer.estTermDays} days</p>
                      </div>
                    </>
                  )}
                  {offer.method === 'fixed-weekly' && (
                    <>
                      <div>
                        <p className="text-slate-600">Weekly Payment</p>
                        <p className="font-semibold text-blue-700">{fmt(offer.weeklyPayment)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Est. Term</p>
                        <p className="font-semibold text-slate-700">{offer.estTermDays} days</p>
                      </div>
                    </>
                  )}
                  {offer.method === 'holdback' && (
                    <>
                      <div>
                        <p className="text-slate-600">Holdback %</p>
                        <p className="font-semibold text-purple-700">{(offer.holdbackPct! * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Est. Duration</p>
                        <p className="font-semibold text-slate-700">{offer.estHoldbackDurationDays} days</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV Download Button */}
      {dealId && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Export Data</h3>
              <p className="text-sm text-slate-600">Download complete monthly analysis</p>
            </div>
            <a
              href={`/api/statements/monthly.csv?deal_id=${dealId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Download CSV
            </a>
          </div>
        </div>
      )}
    </div>
  )
}