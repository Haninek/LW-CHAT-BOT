import React from 'react'
type Offer = {
  id: string; name: string; factor: number; advance: number; payback: number;
  cadence: 'Daily'|'Weekly'; term_units: number; est_remit: number; holdback_cap: number; notes?: string
}
const usd = (n:number)=> new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0)
export default function OffersGrid({ offers, mcaLoad }: { offers: Offer[]; mcaLoad?: number }) {
  if (!offers?.length) return <div className="bg-white rounded-2xl p-6 border text-slate-600">No eligible offers.</div>
  return (
    <div className="bg-white rounded-2xl p-4 border">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">MCA Offers</div>
        {typeof mcaLoad === 'number' && <div className="text-xs text-slate-500">Observed MCA Load: {Math.round(mcaLoad*100)}%</div>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {offers.map(o=>(
          <div key={o.id} className="rounded-xl border p-4 hover:shadow-sm transition">
            <div className="flex items-start justify-between">
              <div className="text-sm text-slate-500">{o.name}</div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border">{o.cadence}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div><div className="text-xs text-slate-500">Factor</div><div className="font-semibold">{o.factor.toFixed(2)}</div></div>
              <div><div className="text-xs text-slate-500">Advance</div><div className="font-semibold">{usd(o.advance)}</div></div>
              <div><div className="text-xs text-slate-500">Payback</div><div className="font-semibold">{usd(o.payback)}</div></div>
              <div><div className="text-xs text-slate-500">{o.cadence==='Daily'?'Term (days)':'Term (weeks)'}</div><div className="font-semibold">{o.term_units}</div></div>
              <div><div className="text-xs text-slate-500">Est. {o.cadence} Remit</div><div className="font-semibold">{usd(o.est_remit)}</div></div>
              <div><div className="text-xs text-slate-500">Holdback Cap</div><div className="font-semibold">{Math.round(o.holdback_cap*100)}%</div></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white">Select</button>
              <button className="px-3 py-1.5 text-sm rounded-md border">Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
