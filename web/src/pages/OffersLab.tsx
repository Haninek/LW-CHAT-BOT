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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <h1 className="text-2xl font-semibold">Offers Lab</h1>
          <p className="text-slate-600 text-sm">Drop 3 bank statements → Parse → Summary + Risk + P&L → Offers.</p>
          <div className="mt-3 flex items-center gap-3">
            <input type="file" multiple accept="application/pdf" onChange={e=> setFiles(e.target.files ? Array.from(e.target.files) : [])} />
            <button onClick={analyze} disabled={!files.length || loading} className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50">{loading ? 'Analyzing…' : 'Analyze Statements'}</button>
          </div>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </div>
        {rows.length > 0 && <MonthlySummary rows={rows} />}
        {snapshot && <ScrubSnapshotCard snap={snapshot} cleanPdfPath={cleanPdf} />}
        {rows.length > 0 && <DynamicCsvTable rowsRaw={rows.map(r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, String(v ?? '')])))} />}
        <RiskProsCons risk={risk} />
        <FollowUpsAndDocs risk={risk} />
        <CashPnLCard pnl={pnl} />
        {offers?.length ? (
          <div className="bg-white rounded-2xl p-4 border">
            <div className="font-medium mb-2">Generated Offers</div>
            <div className="grid md:grid-cols-3 gap-3">
              {offers.map((o:any)=>(
                <div key={o.id} className="rounded-xl border p-3">
                  <div className="text-sm text-slate-500">Factor</div>
                  <div className="text-xl font-semibold">{o.factor}</div>
                  <div className="text-sm mt-1">Advance: ${o.advance?.toLocaleString()}</div>
                  <div className="text-sm">Payback: ${o.payback?.toLocaleString()}</div>
                  {o.est_daily ? <div className="text-sm">Est. Daily: ${o.est_daily?.toLocaleString()}</div> : null}
                  <div className="text-xs text-slate-500 mt-1">{o.notes}</div>
                </div>
              ))}
            </div>
          </div>
        ):null}
      </div>
    </div>
  )
}
