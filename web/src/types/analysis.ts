export type MonthlyRow = {
  file: string; period?: string|null;
  beginning_balance: number; ending_balance: number; net_change: number;
  total_deposits: number; deposit_count: number;
  deposits_from_RADOVANOVIC?: number; mobile_check_deposits?: number; wire_credits?: number;
  total_withdrawals: number; withdrawal_count?: number;
  withdrawals_PFSINGLE_PT?: number; withdrawals_Zelle?: number; withdrawals_AMEX?: number;
  withdrawals_CHASE_CC?: number; withdrawals_CADENCE_BANK?: number; withdrawals_SBA_EIDL?: number; withdrawals_Nav_Technologies?: number;
  min_daily_ending_balance?: number; max_daily_ending_balance?: number;
}
export type RiskPack = {
  risk_score: number; risk_flags: string[]; pros: string[]; cons: string[];
  follow_up_questions: string[]; required_docs: string[];
  eligibility: 'approve'|'decline'|'review'; reason?: string;
}
export type CashPnL = {
  months: { label: string; revenue_cash: number; operating_expenses_cash: number; debt_service_cash: number; net_cash: number; ending_balance: number }[];
  totals: { revenue_cash: number; operating_expenses_cash: number; debt_service_cash: number; net_cash: number };
}
