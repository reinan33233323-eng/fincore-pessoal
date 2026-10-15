export type FinancialEntry = {
  kind: 'receita' | 'despesa';
  status: 'previsto' | 'realizado';
  amount: number;
  date: string;
  bankId?: string | null;
  paidDate?: string | null;
  juros?: number;
  discount?: number;
};

export const entryValue = (entry: FinancialEntry) =>
  entry.amount + (entry.kind === 'despesa' && entry.status === 'realizado'
    ? (entry.juros || 0) - (entry.discount || 0) : 0);

export function summarizeFinancialEntries(entries: FinancialEntry[]) {
  let income = 0, expense = 0, pay = 0, receive = 0;
  for (const entry of entries) {
    const cents = Math.round(entryValue(entry) * 100);
    if (entry.kind === 'receita') {
      if (entry.status === 'realizado') income += cents;
      else receive += cents;
    } else {
      if (entry.status === 'realizado') expense += cents;
      else pay += cents;
    }
  }
  return { income: income / 100, expense: expense / 100, pay: pay / 100,
    receive: receive / 100, totalIncome: (income + receive) / 100,
    totalExpense: (expense + pay) / 100, balance: (income - expense) / 100,
    projectedBalance: (income + receive - expense - pay) / 100, count: entries.length };
}

export function summarizeBank(entries: FinancialEntry[], bankId: string | null) {
  return summarizeFinancialEntries(entries.filter(entry => (entry.bankId || null) === bankId));
}

export const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const localMonthKey = (date: Date) => localDateKey(date).slice(0, 7);

// Cash follows settlement dates; pending amounts remain on their due dates.
export const cashDate = (entry: FinancialEntry) => entry.status === 'realizado' && entry.paidDate ? entry.paidDate : entry.date;
export function cashPosition(entries: FinancialEntry[], from: string, to: string) {
 const opening = summarizeFinancialEntries(entries.filter(e => e.status==='realizado' && cashDate(e)<from)).balance;
 const period = summarizeFinancialEntries(entries.filter(e => cashDate(e)>=from && cashDate(e)<=to));
 return {opening, closing:Math.round((opening+period.balance)*100)/100,
 projectedClosing:Math.round((opening+period.projectedBalance)*100)/100};
}
