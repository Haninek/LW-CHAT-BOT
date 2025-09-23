import React from 'react'
import type { RiskPack } from '@/types/analysis'
export default function FollowUpsAndDocs({ risk }: { risk: RiskPack | null }) {
  if (!risk) return null
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl p-4 border">
        <div className="font-medium mb-2">Follow-up Questions</div>
        <ol className="list-decimal pl-5 space-y-1 text-sm">{risk.follow_up_questions?.map((q,i)=><li key={i}>{q}</li>)}</ol>
      </div>
      <div className="bg-white rounded-2xl p-4 border">
        <div className="font-medium mb-2">Required Docs</div>
        <ul className="list-disc pl-5 space-y-1 text-sm">{risk.required_docs?.map((d,i)=><li key={i}>{d}</li>)}</ul>
      </div>
    </div>
  )
}
