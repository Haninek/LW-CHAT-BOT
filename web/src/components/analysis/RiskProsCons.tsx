import React from 'react'
import type { RiskPack } from '@/types/analysis'
export default function RiskProsCons({ risk }: { risk: RiskPack | null }) {
  if (!risk) return null
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl p-4 border">
        <div className="text-sm text-slate-500">Risk Score</div>
        <div className={`text-2xl font-semibold ${risk.risk_score>=80?'text-red-600':risk.risk_score>=60?'text-orange-500':'text-emerald-600'}`}>{risk.risk_score}/100</div>
        <div className="text-xs text-slate-500 mt-1">{risk.eligibility.toUpperCase()} {risk.reason?`– ${risk.reason}`:''}</div>
        <div className="mt-2 text-xs text-slate-600">Flags: {risk.risk_flags?.join(' · ')||'—'}</div>
      </div>
      <div className="bg-white rounded-2xl p-4 border">
        <div className="font-medium mb-2">Pros</div>
        <ul className="list-disc pl-5 space-y-1 text-sm">{risk.pros?.map((p,i)=><li key={i}>{p}</li>)}</ul>
      </div>
      <div className="bg-white rounded-2xl p-4 border">
        <div className="font-medium mb-2">Cons</div>
        <ul className="list-disc pl-5 space-y-1 text-sm">{risk.cons?.map((p,i)=><li key={i}>{p}</li>)}</ul>
      </div>
    </div>
  )
}