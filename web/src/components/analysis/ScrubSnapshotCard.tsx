import React from 'react'

export type ScrubSnapshot = {
  avg_deposit_amount: number
  other_advances: number
  transfer_amount: number
  misc_deduction: number
  number_of_deposits: number
  negative_days: number
  avg_daily_balance: number
  avg_beginning_balance: number
  avg_ending_balance: number
}
const usd = (n:number)=> new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0)

export default function ScrubSnapshotCard({ snap, cleanPdfPath }: { snap: ScrubSnapshot|null, cleanPdfPath?: string|null }) {
  if (!snap) return null
  const Item = ({label, value}:{label:string, value:string}) => (
    <div className="bg-white border rounded-lg p-3">
      <div className="text-slate-500 text-xs">{label}</div>
      <div className="text-slate-900 font-semibold">{value}</div>
    </div>
  )
  return (
    <div className="bg-white rounded-2xl p-4 border">
      <div className="flex items-center justify-between">
        <div className="font-medium">Scrub Snapshot</div>
        {cleanPdfPath ? <a className="text-sm underline" href={cleanPdfPath} target="_blank" rel="noreferrer">Download Clean Scrub (PDF)</a> : null}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 text-sm">
        <Item label="Avg Deposit Amount" value={usd(snap.avg_deposit_amount)} />
        <Item label="Other Advances" value={usd(snap.other_advances)} />
        <Item label="Transfer Amount" value={usd(snap.transfer_amount)} />
        <Item label="Misc Deduction" value={usd(snap.misc_deduction)} />
        <Item label="Number of Deposits" value={String(snap.number_of_deposits)} />
        <Item label="Negative Days" value={String(snap.negative_days)} />
        <Item label="Avg Daily Balance" value={usd(snap.avg_daily_balance)} />
        <Item label="Avg Beginning Balance" value={usd(snap.avg_beginning_balance)} />
        <Item label="Avg Ending Balance" value={usd(snap.avg_ending_balance)} />
      </div>
    </div>
  )
}