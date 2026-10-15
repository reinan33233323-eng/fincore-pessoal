import { localDateKey, type FinancialEntry } from './finance.ts';
export type CreditCard = { id: string; name: string; closing_day: number; due_day: number };
export function invoiceDate(purchaseDate: string, card: Pick<CreditCard,'closing_day'|'due_day'>, offset = 0) {
 const [year, month, day] = purchaseDate.split('-').map(Number);
 const closing = Math.min(card.closing_day, new Date(year, month, 0).getDate());
 const dueMonth = month - 1 + (day >= closing ? 1 : 0) + (card.due_day <= card.closing_day ? 1 : 0) + offset;
 const first = new Date(year,dueMonth,1);
 return localDateKey(new Date(first.getFullYear(),first.getMonth(),Math.min(card.due_day,new Date(first.getFullYear(),first.getMonth()+1,0).getDate())));
}
export function installmentAmounts(total: number, count: number) {
 const cents = Math.round(total*100);
 if (!Number.isInteger(count) || count<1 || count>60 || cents<count) throw new Error('Valor ou parcelas inválidos.');
 return Array.from({length:count},(_,i)=>(Math.floor(cents/count)+(i<cents%count?1:0))/100);
}
export type BalanceAdjustment = {id:string;bank_id:string;amount:number;date:string;notes:string};
export function adjustmentEntry(row: BalanceAdjustment) {
 return {id:row.id,kind:Number(row.amount)>0?'receita' as const:'despesa' as const,status:'realizado' as const,
 amount:Math.abs(Number(row.amount)),date:row.date,paidDate:row.date,bankId:row.bank_id,
 unit:'Saldo bancário',account:'Ajuste de saldo',category:'Ajuste de saldo',description:'Ajuste de saldo bancário',beneficiary:'',pix:'',recurrence:'nenhuma' as const,installments:1,notes:row.notes,balanceAdjustment:true};
}
