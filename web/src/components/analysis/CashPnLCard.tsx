import React from 'react'
import type { CashPnL } from '@/types/analysis'
const usd=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n)
export default function CashPnLCard({ pnl }: { pnl: CashPnL | null }) {
  if (!pnl) return null
  return (
    <div className="bg-white rounded-2xl p-4 border">
      <div className="font-medium mb-2">Cash-Basis P&L (summary)</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="[&>th]:px-3 [&>th]:py-2 text-slate-600"><th>Month</th><th>Revenue</th><th>Opex</th><th>Debt Service</th><th>Net Cash</th><th>End Bal</th></tr></thead>
          <tbody className="divide-y">
            {pnl.months.map((m,i)=>(
              <tr key={i} className="[&>td]:px-3 [&>td]:py-2">
                <td className="truncate max-w-[220px]" title={m.label}>{m.label}</td>
                <td>{usd(m.revenue_cash)}</td>
                <td>{usd(m.operating_expenses_cash)}</td>
                <td>{usd(m.debt_service_cash)}</td>
                <td className={m.net_cash>=0?'text-emerald-600':'text-red-600'}>{usd(m.net_cash)}</td>
                <td>{usd(m.ending_balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="font-semibold"><td>Totals</td><td>{usd(pnl.totals.revenue_cash)}</td><td>{usd(pnl.totals.operating_expenses_cash)}</td><td>{usd(pnl.totals.debt_service_cash)}</td><td className={pnl.totals.net_cash>=0?'text-emerald-600':'text-red-600'}>{usd(pnl.totals.net_cash)}</td><td>—</td></tr></tfoot>
        </table>
      </div>
    </div>
  )
}
