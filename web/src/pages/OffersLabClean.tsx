import React from 'react'
import ScrubSnapshotCard from '@/components/analysis/ScrubSnapshotCard'
import OfferInputsBar from '@/components/analysis/OfferInputsBar'
import OffersGrid from '@/components/analysis/OffersGrid'

const usd = (n:number)=> new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0)

export default function OffersLabClean(){
  const [files,setFiles] = React.useState<File[]>([])
  const [rows,setRows] = React.useState<any[]>([])
  const [snapshot,setSnapshot] = React.useState<any|null>(null)
  const [offers,setOffers] = React.useState<any[]>([])
  const [cleanPdf,setCleanPdf] = React.useState<string|null>(null)
  const [loading,setLoading] = React.useState(false)
  const [cadence,setCadence] = React.useState<'Daily'|'Weekly'>('Daily')

  const onUpload = async () => {
    if (!files.length) return
    setLoading(true)
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    fd.append('remit', cadence.toLowerCase())
    const res = await fetch('/api/offerlab/analyze', { method:'POST', body: fd })
    const data = await res.json().catch(()=> ({}))
    setLoading(false)
    if (!res.ok || !data?.ok) { alert('Analysis failed'); return }
    setRows(data.monthly_rows||[])
    setSnapshot(data.snapshot||null)
    setOffers(data.offers||[])
    setCleanPdf(data.downloads?.clean_scrub_pdf_path || null)
  }

  const depAvg = React.useMemo(()=>{
    if (!rows.length) return 0
    return rows.reduce((a:any,r:any)=>a+Number(r.total_deposits||0),0)/rows.length
  },[rows])
  const wiresAvg = React.useMemo(()=>{
    if (!rows.length) return 0
    return rows.reduce((a:any,r:any)=>a+Number(r.wire_credits||0),0)/rows.length
  },[rows])
  const eligibleInflow = Math.max(0, depAvg - wiresAvg)
  const mcaLoad = React.useMemo(()=>{
    if (!rows.length) return undefined
    const mca = rows.reduce((a:any,r:any)=>a+Math.abs(Number(r.withdrawals_PFSINGLE_PT||0)),0)
    const dep = rows.reduce((a:any,r:any)=>a+Number(r.total_deposits||0),0)
    return dep ? (mca/dep) : undefined
  },[rows])
  const holdbackCap = (()=>{
    if (mcaLoad==null) return 0.1
    return mcaLoad >= 0.90 ? 0.08 : (mcaLoad >= 0.80 ? 0.10 : 0.12)
  })()

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" multiple accept="application/pdf" onChange={e=> setFiles(Array.from(e.target.files||[]))} />
          <select value={cadence} onChange={e=> setCadence(e.target.value as any)} className="border rounded-md p-1 text-sm">
            <option>Daily</option><option>Weekly</option>
          </select>
          <button onClick={onUpload} disabled={loading} className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm">
            {loading ? 'Analyzing…' : 'Analyze & Generate Offers'}
          </button>
          {cleanPdf && <a className="text-sm underline ml-auto" href={cleanPdf} target="_blank" rel="noreferrer">Download Clean Scrub (PDF)</a>}
        </div>
      </div>

      {snapshot && <ScrubSnapshotCard snap={snapshot} cleanPdfPath={cleanPdf} />}
      {rows.length > 0 && (
        <OfferInputsBar
          depAvg={depAvg}
          wiresAvg={wiresAvg}
          eligibleInflow={eligibleInflow}
          holdbackCap={holdbackCap}
          cadence={cadence}
        />
      )}
      <OffersGrid offers={offers||[]} mcaLoad={mcaLoad} />
    </div>
  )
}
