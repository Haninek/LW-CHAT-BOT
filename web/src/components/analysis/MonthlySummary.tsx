import React from 'react'
import type { MonthlyCsvRow } from '@/types/analysis'

const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

type Props = { rows: MonthlyCsvRow[] }
export default function MonthlySummary({ rows }: Props) {
  if (!rows?.length) return null
  // Sort newest first by filename inference (crude; uses label fallback)
  const sorted = [...rows].sort((a, b) => (a.file > b.file ? -1 : 1))

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/50">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">High-level snapshot (by month)</h3>
      <div className="space-y-6">
        {sorted.map((r, idx) => {
          const label = monthLabelRange(r.file, r.period ?? undefined) // e.g., "August 2025 (Aug 1–31, 2025)"
          const totalOut = Math.abs(r.total_withdrawals || 0)
          const mcaOut = Math.abs(r.withdrawals_PFSINGLE_PT || 0)
          const mcaPct = totalOut ? (mcaOut / totalOut) : 0

          const deposits = r.total_deposits || 0
          const depRAD = Math.abs(r.deposits_from_RADOVANOVIC || 0)
          const depMobile = Math.abs(r.mobile_check_deposits || 0)
          const depWire = Math.abs(r.wire_credits || 0)

          const minEnd = r.min_daily_ending_balance
          const maxEnd = r.max_daily_ending_balance

          // RTR proxy ~ outflows to PFSINGLE PT / deposits, capped 0-1
          const rtrProxy = deposits ? (mcaOut / deposits) : 0

          const flags: string[] = []
          if (mcaPct >= 0.7) flags.push('Heavy MCA load')
          if (depWire > 0) flags.push('One-time wire inflow present')
          if ((r.withdrawals_CADENCE_BANK || 0) > 0 || (r.withdrawals_SBA_EIDL || 0) > 0) {
            flags.push('Other fixed obligations (bank loan, SBA EIDL)')
          }

          const nonMcaDebits = [
            debitLabel('CADENCE BANK', r.withdrawals_CADENCE_BANK),
            debitLabel('SBA EIDL', r.withdrawals_SBA_EIDL),
            debitLabel('CHASE credit card', r.withdrawals_CHASE_CC),
            debitLabel('AMEX', r.withdrawals_AMEX),
            debitLabel('Nav Tech fees', r.withdrawals_Nav_Technologies),
            debitLabel('Zelle', r.withdrawals_Zelle),
          ].filter(Boolean) as string[]

          return (
            <div key={idx} className="space-y-2">
              <h4 className="font-medium text-slate-900">{label}</h4>

              <p className="text-slate-700">
                <strong>Deposits:</strong> {usd(deposits)} across {r.deposit_count || 0} credits
                {depRAD || depMobile ? <> (mix of {depRAD ? <>ACH “From RADOVANOVIC CORP” {usd(depRAD)}</> : null}{depRAD && depMobile ? ' and ' : ''}{depMobile ? <>mobile check deposits {usd(depMobile)}</> : null}{depWire ? <>, plus wire(s) {usd(depWire)}</> : null}).</> : '.'}
                <div className="text-xs text-slate-500 truncate">{r.file}</div>
              </p>

              <p className="text-slate-700">
                <strong>Withdrawals:</strong> {usd(totalOut)} total. Of this, {usd(mcaOut)}
                {totalOut ? <> ({Math.round(mcaPct*100)}%)</> : null}
                {' '}are recurring “Electronic Settlement — SETTLMT PFSINGLE PT”. Non-MCA debits include {nonMcaDebits.length ? nonMcaDebits.join(', ') : 'other operating expenses'}.
                <div className="text-xs text-slate-500 truncate">{r.file}</div>
              </p>

              <p className="text-slate-700">
                <strong>Balances:</strong> {minEnd != null && maxEnd != null ? <>min {usd(minEnd)}, max {usd(maxEnd)}; </> : null}
                period ending balance {usd(r.ending_balance)} (net change {usd(r.net_change)} from beginning {usd(r.beginning_balance)}).
                <div className="text-xs text-slate-500 truncate">{r.file}</div>
              </p>

              <div className="text-slate-800 mt-2">
                <strong>Quick ratios & flags:</strong>{' '}
                RTR proxy ≈ {Math.round(rtrProxy*100)}% {rtrProxy >= 0.9 ? '(very high risk)' : rtrProxy >= 0.8 ? '(high)' : ''}.
                {flags.length ? <> {' '}<em>{flags.join(' · ')}</em></> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function debitLabel(label: string, value?: number) {
  const val = Math.abs(value || 0)
  return val ? `${label} ${usd(val)}` : null
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const

function monthLabelRange(file: string, period?: string | null) {
  // Example outputs: "August 2025 (Aug 1–31, 2025)" or fallback to filename
  const full = inferPeriod(period) ?? (period ? inferMonthYear(period) : null) ?? inferMonthYear(file)
  if (!full) return period || file
  const [monthName, year] = full
  const monthIndex = MONTH_NAMES.findIndex((name) => name === monthName)
  const endDay = monthIndex >= 0 ? new Date(Number(year), monthIndex + 1, 0).getDate() : 30
  const short = monthName.slice(0,3)
  return `${monthName} ${year} (${short} 1–${endDay}, ${year})`
}
function inferPeriod(period?: string | null): [string, string] | null {
  if (!period) return null
  const iso = period.match(/^(\d{4})[-_\/\s]?(\d{2})/)
  if (iso) {
    const year = iso[1]
    const monthIndex = Number(iso[2]) - 1
    const monthName = MONTH_NAMES[monthIndex]
    return monthName ? [monthName, year] : null
  }
  const alt = period.match(/^(\d{2})[-_\/\s]?(\d{4})/)
  if (alt) {
    const monthIndex = Number(alt[1]) - 1
    const year = alt[2]
    const monthName = MONTH_NAMES[monthIndex]
    return monthName ? [monthName, year] : null
  }
  return null
}
function inferMonthYear(file: string): [string,string] | null {
  const m = file.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[\s_]+(\d{2,4})/i)
  if (m) return [cap(m[1]), m[2].length === 2 ? `20${m[2]}` : m[2]]
  const m2 = file.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[_\- ]?(\d{2})/i)
  if (m2) return [expand(m2[1]), `20${m2[2]}`]
  return null
}
function cap(s: string){ return s[0].toUpperCase()+s.slice(1).toLowerCase() }
function expand(abbr: string) {
  const map: Record<string,string> = {Jan:'January',Feb:'February',Mar:'March',Apr:'April',May:'May',Jun:'June',Jul:'July',Aug:'August',Sep:'September',Oct:'October',Nov:'November',Dec:'December'}
  return map[abbr] || abbr
}
