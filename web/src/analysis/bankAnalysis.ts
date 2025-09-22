// === ANALYSIS ENGINE (framework-agnostic) ===
export type TxType = "credit" | "debit";
export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: TxType;
  endingBalance?: number | null;
  categoryHint?: string;
}
export interface MonthKey { year: number; month: number; }
export interface MonthlyMetrics {
  monthKey: MonthKey;
  totalDeposits: number;
  transferAmount: number;
  otherAdvances: number;
  miscDeductions: number;
  netDeposits: number;
  depositCount: number;
  negativeDays: number;
  averageDailyBalance: number;
  beginningBalance?: number;
  endingBalance?: number;
}
export interface RecurringPattern {
  name: string; totalAmount: number; count: number; avgAmount: number; firstSeen: string; lastSeen: string;
}
export interface AccountAnalysis {
  byMonth: MonthlyMetrics[];
  averages: MonthlyMetrics;
  recurringDebits: RecurringPattern[];
  monthsInRange: number;
  totalNetDeposits: number;
}
export interface DeclineFinding { code: string; message: string; severity: "info"|"warn"|"decline"; }
export interface DeclineRulesOptions {
  minimumRevenue3mo: number;
  constructionMin3mo?: number;
  negativeDayHardMax?: number;
  largeMoMDeltaPct?: number;
  poorDailyBalanceThreshold?: number;
  poorDailyBalanceHardMax?: number;
  remitToDepositDeclineOver?: number;
}
export interface Offer {
  tier: string; factor: number; advance: number; payback: number;
  method: "fixed-daily" | "fixed-weekly" | "holdback";
  dailyPayment?: number; weeklyPayment?: number; estTermDays?: number;
  holdbackPct?: number; estHoldbackDurationDays?: number;
}
export interface OfferOptions {
  factorTiers?: number[]; advanceMultiple?: number; excludeWires?: boolean;
  holdbackPercents?: number[]; fixedDaily?: boolean; fixedWeekly?: boolean;
  daysPerWeek?: number; termDays?: number; maxDebtServicePct?: number;
}

const RX = {
  transferCredit: /(transfer|xfer|internal)/i,
  otherAdvanceCredit: /(wire credit|funding|capital|advance)/i,
  miscDeduction: /(analysis fee|service fee|maintenance fee)/i,
  existingMCADebit: /(SETTLMT.*PFSINGLE PT|settlement.*pf|merchant.*funding|capital.*repay|loan.*payment)/i,
  cardPayments: /(AMEX|CHASE CREDIT CRD|EPAYMENT)/i,
  bankLoans: /(SBA EIDL|CADENCE BANK)/i,
  zelle: /zelle/i,
};
const sum = (a:number[]) => a.reduce((x,y)=>x+y,0);
const avg = (a:number[]) => a.length ? sum(a)/a.length : 0;
const ymKey = (d:Date) => ({year:d.getUTCFullYear(), month:d.getUTCMonth()+1});
const keyStr = (k:MonthKey) => `${k.year}-${String(k.month).padStart(2,"0")}`;
const norm = (s:string) => s.toUpperCase().replace(/\s+/g," ").trim();

function groupByMonth(txs: Transaction[]){
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const d = new Date(t.date); if (isNaN(d.getTime())) continue;
    const k = keyStr(ymKey(d)); if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  for (const [,arr] of map) arr.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
  return map;
}
function classifyCredit(desc:string): "transfer"|"otherAdvance"|"regular" {
  const d = norm(desc);
  if (RX.transferCredit.test(d)) return "transfer";
  if (RX.otherAdvanceCredit.test(d)) return "otherAdvance";
  return "regular";
}
function classifyDebit(desc:string): "mca"|"miscFee"|"card"|"bankLoan"|"zelle"|"other" {
  const d = norm(desc);
  if (RX.existingMCADebit.test(d)) return "mca";
  if (RX.miscDeduction.test(d)) return "miscFee";
  if (RX.cardPayments.test(d)) return "card";
  if (RX.bankLoans.test(d)) return "bankLoan";
  if (RX.zelle.test(d)) return "zelle";
  return "other";
}

export function analyzeParsedStatements(transactions: Transaction[]): AccountAnalysis {
  const txs = transactions.slice().sort((a,b)=> new Date(a.date).getTime()-new Date(b.date).getTime());
  const byMonth = groupByMonth(txs);
  const monthly: MonthlyMetrics[] = [];

  for (const [k, arr] of Array.from(byMonth.entries()).sort()) {
    const [y,m] = k.split("-").map(Number);
    const credits = arr.filter(t=>t.type==="credit");
    const debits  = arr.filter(t=>t.type==="debit");

    const totalDeposits  = sum(credits.map(c=>+c.amount));
    const transferAmount = sum(credits.filter(c=>classifyCredit(c.description)==="transfer").map(c=>+c.amount));
    const otherAdvances  = sum(credits.filter(c=>classifyCredit(c.description)==="otherAdvance").map(c=>+c.amount));
    const miscDeductions = sum(debits.filter(d=>classifyDebit(d.description)==="miscFee").map(d=>+d.amount));
    const netDeposits    = Math.max(0, totalDeposits - transferAmount - otherAdvances);
    const depositCount   = credits.filter(c=>classifyCredit(c.description)==="regular").length;

    // daily ending balances if provided
    const byDay = new Map<string, Transaction[]>();
    for (const t of arr) {
      const day = t.date.slice(0,10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(t);
    }
    const dailies:number[] = [];
    for (const [_, list] of Array.from(byDay.entries()).sort()){
      const eb = list.map(t=>t.endingBalance).filter(v=>typeof v==="number") as number[];
      if (eb.length) dailies.push(eb[eb.length-1]);
    }
    const averageDailyBalance = dailies.length ? avg(dailies) : 0;
    const negativeDays = dailies.filter(v=>v<0).length;

    const beginningBalance = arr.find(t=>t.endingBalance!=null)?.endingBalance ?? undefined;
    const endingBalance    = arr.slice().reverse().find(t=>t.endingBalance!=null)?.endingBalance ?? undefined;

    monthly.push({
      monthKey:{year:y,month:m},
      totalDeposits, transferAmount, otherAdvances, miscDeductions,
      netDeposits, depositCount, negativeDays, averageDailyBalance,
      beginningBalance, endingBalance
    });
  }

  const averages: MonthlyMetrics = {
    monthKey:{year:0,month:0},
    totalDeposits: avg(monthly.map(m=>m.totalDeposits)),
    transferAmount: avg(monthly.map(m=>m.transferAmount)),
    otherAdvances: avg(monthly.map(m=>m.otherAdvances)),
    miscDeductions: avg(monthly.map(m=>m.miscDeductions)),
    netDeposits: avg(monthly.map(m=>m.netDeposits)),
    depositCount: Math.round(avg(monthly.map(m=>m.depositCount))),
    negativeDays: Math.round(avg(monthly.map(m=>m.negativeDays))),
    averageDailyBalance: avg(monthly.map(m=>m.averageDailyBalance)),
  };

  // recurring debits
  const groups = new Map<string,{sum:number,count:number,first:string,last:string,amts:number[]}>();
  for (const d of txs.filter(t=>t.type==="debit")) {
    const key = norm(d.description).replace(/\d{4,}/g,"").replace(/\b(PMT|PAYMENT|PMT\.)\b/g,"PMT");
    if (!groups.has(key)) groups.set(key,{sum:0,count:0,first:d.date,last:d.date,amts:[]});
    const g = groups.get(key)!;
    g.sum += d.amount; g.count++; g.amts.push(d.amount);
    if (d.date<g.first) g.first=d.date; if (d.date>g.last) g.last=d.date;
  }
  const recurringDebits: RecurringPattern[] = [];
  for (const [name,g] of groups.entries()) if (g.count>=3)
    recurringDebits.push({name,totalAmount:g.sum,count:g.count,avgAmount:avg(g.amts),firstSeen:g.first,lastSeen:g.last});

  return { byMonth: monthly, averages, recurringDebits, monthsInRange: monthly.length, totalNetDeposits: sum(monthly.map(m=>m.netDeposits)) };
}

export function evaluateDeclines(a: AccountAnalysis, o: DeclineRulesOptions): DeclineFinding[] {
  const f: DeclineFinding[] = [];
  const last = a.byMonth.at(-1);
  const total3mo = a.byMonth.slice(-3).reduce((acc,m)=>acc+m.netDeposits,0);
  if (total3mo < o.minimumRevenue3mo) f.push({code:"MIN_REVENUE", severity:"decline", message:`Need ≥ $${o.minimumRevenue3mo.toLocaleString()} net deposits over 3 months. Have $${Math.round(total3mo).toLocaleString()}.`});
  if (o.negativeDayHardMax!=null && last && last.negativeDays>o.negativeDayHardMax) f.push({code:"NEG_DAYS", severity:"decline", message:`Most recent month has ${last.negativeDays} negative days; max ${o.negativeDayHardMax}.`});
  if (o.largeMoMDeltaPct!=null && a.byMonth.length>=2) {
    const [prev,cur] = a.byMonth.slice(-2);
    const delta = (cur.netDeposits - prev.netDeposits) / Math.max(1, prev.netDeposits);
    if (Math.abs(delta) > o.largeMoMDeltaPct) f.push({code:"MOM_SWING", severity:"decline", message:`MoM net deposit swing ${Math.round(delta*100)}% > ${Math.round(o.largeMoMDeltaPct*100)}%.`});
  }
  if (o.poorDailyBalanceThreshold!=null && o.poorDailyBalanceHardMax!=null && last)
    f.push({code:"POOR_BAL_DAYS_INFO", severity:"info", message:`Provide daily balances to compute < $${o.poorDailyBalanceThreshold} poor-day count exactly.`});
  return f;
}

export function suggestOffers(a: AccountAnalysis, opts: OfferOptions = {}): Offer[] {
  const factorTiers = opts.factorTiers ?? [1.20,1.30,1.40];
  const advanceMultiple = opts.advanceMultiple ?? 0.8;
  const holdbackPercents = opts.holdbackPercents ?? [0.08,0.10,0.12];
  const daysPerWeek = opts.daysPerWeek ?? 5;
  const termDaysTarget = opts.termDays ?? 120;
  const maxDSPct = opts.maxDebtServicePct ?? 0.25;

  const avgMonthlyNet = a.averages.netDeposits || (a.totalNetDeposits / Math.max(1,a.monthsInRange));
  const monthlyCapacity = avgMonthlyNet * maxDSPct;
  const dailyCapacity = monthlyCapacity / 22;
  const weeklyCapacity = monthlyCapacity / 4.33;
  const baseAdvance = avgMonthlyNet * advanceMultiple;

  const offers: Offer[] = [];
  for (let i=0;i<factorTiers.length;i++){
    const factor = factorTiers[i];
    const tier = i===0?"Conservative":i===1?"Standard":"Aggressive";
    const advance = Math.max(0, Math.round(baseAdvance));
    const payback = Math.round(advance*factor);

    const dailyPayment = Math.round(Math.min(dailyCapacity, payback/termDaysTarget));
    const weeklyPayment = Math.round(Math.min(weeklyCapacity, (payback/termDaysTarget)*daysPerWeek));

    offers.push({tier, factor, advance, payback, method:"fixed-daily", dailyPayment, estTermDays: Math.ceil(payback/Math.max(1,dailyPayment))});
    offers.push({tier, factor, advance, payback, method:"fixed-weekly", weeklyPayment, estTermDays: Math.ceil(payback/Math.max(1,weeklyPayment/daysPerWeek))});
    for (const hb of holdbackPercents){
      const holdbackDaily = (avgMonthlyNet/22)*hb;
      offers.push({tier, factor, advance, payback, method:"holdback", holdbackPct: hb, estHoldbackDurationDays: Math.ceil(payback/Math.max(1,holdbackDaily))});
    }
  }
  return offers;
}

export function fmt(n: number | undefined | null): string {
  if (n == null || isNaN(n as any)) return "-";
  return `$${n.toLocaleString(undefined,{maximumFractionDigits:2})}`;
}

export function toUiRows(a: AccountAnalysis){
  const rows = a.byMonth.map(m=>({
    month: `${m.monthKey.year}-${String(m.monthKey.month).padStart(2,"0")}`,
    totalDeposits: m.totalDeposits,
    transferAmt: m.transferAmount,
    otherAdvances: m.otherAdvances,
    miscDeductions: m.miscDeductions,
    netDeposits: m.netDeposits,
    numDeposits: m.depositCount,
    negDays: m.negativeDays,
    averageBal: m.averageDailyBalance,
    beginningBal: m.beginningBalance,
    endingBal: m.endingBalance,
  }));
  return { 
    rows,
    averages: {
      totalDeposits: a.averages.totalDeposits,
      transferAmt: a.averages.transferAmount,
      otherAdvances: a.averages.otherAdvances,
      miscDeductions: a.averages.miscDeductions,
      netDeposits: a.averages.netDeposits,
      numDeposits: a.averages.depositCount,
      negDays: a.averages.negativeDays,
      averageBal: a.averages.averageDailyBalance,
    }
  };
}