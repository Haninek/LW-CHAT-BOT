import type { MonthlyCsvRow } from '@/types/analysis'

export async function readCsvFile(file: File): Promise<string> {
  const text = await file.text()
  return text
}

// Minimal CSV parser for simple, comma-separated no-quote rows
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length === 0) return []
  const headers = lines[0].split(",").map(h => h.trim())
  return lines.slice(1).map(line => {
    const cols = line.split(",")
    const row: Record<string,string> = {}
    headers.forEach((h, i) => row[h] = (cols[i] ?? "").trim())
    return row
  })
}

export function coerceMonthlyRows(rows: Record<string,string>[]): MonthlyCsvRow[] {
  const num = (v: string | undefined) => {
    if (v == null || v === "") return 0
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return rows.map(r => ({
    file: r.file || '',
    period: r.period ?? null,
    beginning_balance: num(r.beginning_balance),
    ending_balance: num(r.ending_balance),
    net_change: num(r.net_change),

    total_deposits: num(r.total_deposits),
    deposit_count: num(r.deposit_count),

    deposits_from_RADOVANOVIC: num(r.deposits_from_RADOVANOVIC),
    mobile_check_deposits: num(r.mobile_check_deposits),
    wire_credits: num(r.wire_credits),

    total_withdrawals: num(r.total_withdrawals), // likely negative
    withdrawal_count: num(r.withdrawal_count),

    withdrawals_PFSINGLE_PT: num(r.withdrawals_PFSINGLE_PT),
    withdrawals_Zelle: num(r.withdrawals_Zelle),
    withdrawals_AMEX: num(r.withdrawals_AMEX),
    withdrawals_CHASE_CC: num(r.withdrawals_CHASE_CC),
    withdrawals_CADENCE_BANK: num(r.withdrawals_CADENCE_BANK),
    withdrawals_SBA_EIDL: num(r.withdrawals_SBA_EIDL),
    withdrawals_Nav_Technologies: num(r.withdrawals_Nav_Technologies),

    min_daily_ending_balance: num(r.min_daily_ending_balance),
    max_daily_ending_balance: num(r.max_daily_ending_balance),
  }))
}
