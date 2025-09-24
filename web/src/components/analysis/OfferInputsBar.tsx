import React from 'react'
const usd = (n:number)=> new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0)
export default function OfferInputsBar({ depAvg, wiresAvg, eligibleInflow, holdbackCap, cadence }:{
  depAvg:number; wiresAvg:number; eligibleInflow:number; holdbackCap:number; cadence:'Daily'|'Weekly'
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border">
      <div className="flex flex-wrap gap-4 items-center">
        <div><div className="text-xs text-slate-500">Avg Total Deposits</div><div className="font-semibold">{usd(depAvg)}</div></div>
        <div><div className="text-xs text-slate-500">Avg Wires (excluded)</div><div className="font-semibold">{usd(wiresAvg)}</div></div>
        <div><div className="text-xs text-slate-500">Eligible Inflow</div><div className="font-semibold">{usd(eligibleInflow)}</div></div>
        <div><div className="text-xs text-slate-500">Holdback Cap</div><div className="font-semibold">{Math.round(holdbackCap*100)}%</div></div>
        <div><div className="text-xs text-slate-500">Cadence</div><div className="font-semibold">{cadence}</div></div>
      </div>
    </div>
  )
}
