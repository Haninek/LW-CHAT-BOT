// web/src/components/analysis/MonthlySummary.tsx
import React, { useMemo } from 'react'
import type { MonthlyRow } from '../../types/analysis' // <-- relative import (no '@/')

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number.isFinite(n) ? n : 0)

function inferMonthYear(file: string): [string, string] | null {
  // Full month name + year, e.g. "August 2025" or "August_2025"
  const m = file.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)[\s_]+(\d{2,4})/i
  )
  if (m) return [cap(m[1]), m[2].length === 2 ? `20${m[2]}` : m[2]]

  // Abbrev + optional sep + 2-digit year, e.g. "Aug-25" / "Aug_25" / "Aug 25"
  const m2 = file.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:[_\s-])?(\d{2})\b/i)
  if (m2) return [expand(m2[1]), `20${m2[2]}`]

  return null
}
function cap(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s
}
function expand(abbr: string) {
  const map: Record<string, string> = {
    Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
    Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
  }
  return map[abbr] || abbr
}
function monthLabelRange(file: string) {
  const full = inferMonthYear(file)
  if (!full) return file
  const [name, year] = full
  const short = name.slice(0, 3)
  const end = ['January', 'March', 'May', 'July', 'August', 'October', 'December'].includes(name) ? 31 : (name === 'February' ? 28 : 30)
  return `${name} ${year} (${short} 1-${end}, ${year})`
}
function lineIf(v?: number, label?: string) {
  const val = Math.abs(v || 0)
  return val ? ` ${label} ${usd(val)},` : ''
}

export default function MonthlySummary({ rows }: { rows: MonthlyRow[] }) {
  if (!rows || !rows.length) return null
  const sorted = [...rows].sort((a, b) => (a.file > b.file ? -1 : 1))

  // --- Totals & Averages across all months ---
  const S = useMemo(() => {
    const n = rows.length
    const num = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0)

    const depositsSum = rows.reduce((a, r) => a + num(r.total_deposits), 0)
    const withdrawalsSumAbs = rows.reduce((a, r) => a + Math.abs(num(r.total_withdrawals)), 0)
    const mcaSum = rows.reduce((a, r) => a + Math.abs(num(r.withdrawals_PFSINGLE_PT)), 0)
    const depCountSum = rows.reduce((a, r) => a + num(r.deposit_count), 0)

    const avgDeposits = n ? depositsSum / n : 0
    const avgWithdrawals = n ? withdrawalsSumAbs / n : 0
    const avgMCA = n ? mcaSum / n : 0
    const avgDepCount = n ? depCountSum / n : 0

    const rtrWeighted = depositsSum > 0 ? mcaSum / depositsSum : 0
    const rtrSimple = (() => {
      const per = rows
        .map(r => {
          const dep = num(r.total_deposits)
          const mca = Math.abs(num(r.withdrawals_PFSINGLE_PT))
          return dep > 0 ? mca / dep : null
        })
        .filter((x): x is number => x !== null)
      return per.length ? per.reduce((a, b) => a + b, 0) / per.length : 0
    })()

    return { n, depositsSum, withdrawalsSumAbs, mcaSum, depCountSum, avgDeposits, avgWithdrawals, avgMCA, avgDepCount, rtrWeighted, rtrSimple }
  }, [rows])

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/50">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">High-level snapshot (by month)</h3>

      {/* Totals & Averages */}
      <div className="mb-4 rounded-xl border p-3 bg-slate-50">
        <div className="text-sm text-slate-700 font-medium mb-2">
          Totals & Averages (across {S.n} month{S.n === 1 ? '' : 's'})
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <StatCard title="Total deposits" main={usd(S.depositsSum)} sub={`Avg / month: ${usd(S.avgDeposits)}`} />
          <StatCard title="Total withdrawals" main={usd(S.withdrawalsSumAbs)} sub={`Avg / month: ${usd(S.avgWithdrawals)}`} />
          <StatCard title="MCA settlements (PFSINGLE)" main={usd(S.mcaSum)} sub={`Avg / month: ${usd(S.avgMCA)}`} />
          <StatCard title="Deposit count" main={Math.round(S.depCountSum).toLocaleString()} sub={`Avg / month: ${Math.round(S.avgDepCount).toLocaleString()}`} />
          <StatCard title="RTR (weighted)" main={`${Math.round(S.rtrWeighted * 100)}%`} sub="MCA ÷ deposits (combined)" emphasis={S.rtrWeighted} />
          <StatCard title="RTR (simple avg)" main={`${Math.round(S.rtrSimple * 100)}%`} sub="Average of per-month RTR" emphasis={S.rtrSimple} />
        </div>
      </div>

      {/* Per-month details */}
      <div className="space-y-6">
        {sorted.map((r, idx) => {
          const label = monthLabelRange(r.file)
          const totalOut = Math.abs(r.total_withdrawals || 0)
          const mcaOut = Math.abs(r.withdrawals_PFSINGLE_PT || 0)
          const mcaPct = totalOut ? (mcaOut / totalOut) : 0
          const deposits = r.total_deposits || 0
          const depRAD = Math.abs(r.deposits_from_RADOVANOVIC || 0)
          const depMobile = Math.abs(r.mobile_check_deposits || 0)
          const depWire = Math.abs(r.wire_credits || 0)
          const minEnd = r.min_daily_ending_balance
          const maxEnd = r.max_daily_ending_balance
          const rtrProxy = deposits ? (mcaOut / deposits) : 0

          const flags: string[] = []
          if (mcaPct >= 0.7) flags.push('Heavy MCA load')
          if (depWire > 0) flags.push('One-time wire inflow present')
          if ((r.withdrawals_CADENCE_BANK || 0) > 0 || (r.withdrawals_SBA_EIDL || 0) > 0) flags.push('Other fixed obligations (bank/SBA)')

          return (
            <div key={idx} className="space-y-2">
              <h4 className="font-medium text-slate-900">{label}</h4>

              <p className="text-slate-700">
                <strong>Deposits:</strong> {usd(deposits)} across {r.deposit_count || 0} credits
                {depRAD || depMobile ? (
                  <> (mix of {depRAD ? <>ACH "From RADOVANOVIC CORP" {usd(depRAD)}</> : null}
                    {depRAD && depMobile ? ' and ' : ''}
                    {depMobile ? <>mobile check deposits {usd(depMobile)}</> : null}
                    {depWire ? <>, plus wire(s) {usd(depWire)}</> : null}).</>
                ) : '.'}
                <br />
                <small className="text-xs text-slate-500">{r.file}</small>
              </p>

              <p className="text-slate-700">
                <strong>Withdrawals:</strong> {usd(totalOut)} total. Of this, {usd(mcaOut)}
                {totalOut ? <> ({Math.round(mcaPct * 100)}%)</> : null}
                {' '}are recurring "Electronic Settlement — SETTLMT PFSINGLE PT". Non-MCA debits include
                {lineIf(r.withdrawals_CADENCE_BANK, 'CADENCE BANK')}
                {lineIf(r.withdrawals_SBA_EIDL, 'SBA EIDL')}
                {lineIf(r.withdrawals_CHASE_CC, 'CHASE credit card')}
                {lineIf(r.withdrawals_AMEX, 'AMEX')}
                {lineIf(r.withdrawals_Nav_Technologies, 'Nav Tech fees')}
                {lineIf(r.withdrawals_Zelle, 'Zelle')}
                .
                <br />
                <small className="text-xs text-slate-500">{r.file}</small>
              </p>

              <p className="text-slate-700">
                <strong>Balances:</strong> {minEnd != null && maxEnd != null ? <>min {usd(minEnd)}, max {usd(maxEnd)}; </> : null}
                period ending balance {usd(r.ending_balance)} (net change {usd(r.net_change)} from beginning {usd(r.beginning_balance)}).
                <br />
                <small className="text-xs text-slate-500">{r.file}</small>
              </p>

              <div className="text-slate-800 mt-2">
                <strong>Quick ratios & flags:</strong>{' '}
                RTR proxy ≈ {Math.round(rtrProxy * 100)}% {rtrProxy >= 0.9 ? '(very high risk)' : rtrProxy >= 0.8 ? '(high)' : ''}.
                {flags.length ? <> {' '}<em>{flags.join(' · ')}</em></> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Small stat cell (no illegal <div> inside <p>)
function StatCard({
  title, main, sub, emphasis
}: { title: string; main: string; sub?: string; emphasis?: number }) {
  const tone =
    emphasis != null
      ? emphasis >= 0.9
        ? 'text-red-600'
        : emphasis >= 0.8
        ? 'text-orange-600'
        : 'text-slate-900'
      : 'text-slate-900'
  return (
    <div className="bg-white border rounded-lg p-3">
      <div className="text-slate-500">{title}</div>
      <div className={`font-semibold ${tone}`}>{main}</div>
      {sub ? <div className="text-slate-500 mt-1">{sub}</div> : null}
    </div>
  )
}