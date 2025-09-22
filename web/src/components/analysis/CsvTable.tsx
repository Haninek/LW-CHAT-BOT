import React from 'react'
import type { MonthlyCsvRow } from '@/types/analysis'

function fmt(n?: number, opts: Intl.NumberFormatOptions = {}) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, ...opts }).format(n)
}

type Props = { rows: MonthlyCsvRow[] }

export default function CsvTable({ rows }: Props) {
  if (!rows?.length) return null

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/50">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">Parsed Monthly Metrics (CSV)</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600">
            <tr className="[&>th]:px-3 [&>th]:py-2">
              <th>File</th>
              <th>Month</th>
              <th>Beg Bal</th>
              <th>End Bal</th>
              <th>Net</th>
              <th>Deposits</th>
              <th>Deposit Cnt</th>
              <th>RADOVANOVIC</th>
              <th>Mobile Checks</th>
              <th>Wires</th>
              <th>Withdrawals</th>
              <th>PFSINGLE PT</th>
              <th>CADENCE</th>
              <th>SBA EIDL</th>
              <th>AMEX</th>
              <th>CHASE</th>
              <th>Zelle</th>
              <th>Nav</th>
              <th>Min End Bal</th>
              <th>Max End Bal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => {
              const totalOut = Math.abs(r.total_withdrawals || 0)
              const monthLabel = formatMonthLabel(r.period, r.file)
              return (
                <tr key={i} className="[&>td]:px-3 [&>td]:py-2">
                  <td className="truncate max-w-[220px]" title={r.file}>{r.file}</td>
                  <td>{monthLabel}</td>
                  <td>{fmt(r.beginning_balance)}</td>
                  <td>{fmt(r.ending_balance)}</td>
                  <td className={r.net_change >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(r.net_change)}</td>
                  <td>{fmt(r.total_deposits)}</td>
                  <td>{r.deposit_count || '—'}</td>
                  <td>{fmt(r.deposits_from_RADOVANOVIC)}</td>
                  <td>{fmt(r.mobile_check_deposits)}</td>
                  <td>{fmt(r.wire_credits)}</td>
                  <td>{fmt(totalOut)}</td>
                  <td>{fmt(r.withdrawals_PFSINGLE_PT)}</td>
                  <td>{fmt(r.withdrawals_CADENCE_BANK)}</td>
                  <td>{fmt(r.withdrawals_SBA_EIDL)}</td>
                  <td>{fmt(r.withdrawals_AMEX)}</td>
                  <td>{fmt(r.withdrawals_CHASE_CC)}</td>
                  <td>{fmt(r.withdrawals_Zelle)}</td>
                  <td>{fmt(r.withdrawals_Nav_Technologies)}</td>
                  <td>{fmt(r.min_daily_ending_balance)}</td>
                  <td>{fmt(r.max_daily_ending_balance)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function inferLabelFromFile(file: string) {
  // e.g., "…_Months_Bank_Statement__August_25_…pdf" → "August 2025"
  const m = file.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[\s_]+(\d{2,4})/i)
  if (m) {
    const month = m[1]
    const year = m[2].length === 2 ? `20${m[2]}` : m[2]
    return `${month} ${year}`
  }
  // fallback try: Aug_25 → Aug 2025
  const m2 = file.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[_\- ]?(\d{2})/i)
  if (m2) return `${expand(m2[1])} 20${m2[2]}`
  return '—'
}
function formatMonthLabel(period: string | null | undefined, file: string) {
  const fromPeriod = labelFromPeriod(period)
  if (fromPeriod) return fromPeriod
  const fallback = inferLabelFromFile(file)
  if (fallback !== '—') return fallback
  return period || '—'
}
const TABLE_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const
function labelFromPeriod(period?: string | null): string | null {
  if (!period) return null
  const iso = period.match(/^(\d{4})[-_\/\s]?(\d{2})/)
  if (iso) {
    const year = iso[1]
    const monthName = tableMonthName(Number(iso[2]) - 1)
    return monthName ? `${monthName} ${year}` : `${iso[2]}/${year}`
  }
  const alt = period.match(/^(\d{2})[-_\/\s]?(\d{4})/)
  if (alt) {
    const monthName = tableMonthName(Number(alt[1]) - 1)
    const year = alt[2]
    return monthName ? `${monthName} ${year}` : `${alt[1]}/${year}`
  }
  const textual = inferLabelFromFile(period)
  return textual !== '—' ? textual : null
}
function tableMonthName(index: number) {
  return index >= 0 && index < TABLE_MONTH_NAMES.length ? TABLE_MONTH_NAMES[index] : null
}
function expand(abbr: string) {
  const map: Record<string,string> = {Jan:'January',Feb:'February',Mar:'March',Apr:'April',May:'May',Jun:'June',Jul:'July',Aug:'August',Sep:'September',Oct:'October',Nov:'November',Dec:'December'}
  return map[abbr] || abbr
}
