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
 if (!Number.isSafeInteger(count) || count<1 || !Number.isSafeInteger(cents) || cents<count) throw new Error('Valor ou parcelas inválidos.');
 return Array.from({length:count},(_,i)=>(Math.floor(cents/count)+(i<cents%count?1:0))/100);
}
export type BalanceAdjustment = {id:string;bank_id:string;amount:number;date:string;notes:string};
export function adjustmentEntry(row: BalanceAdjustment) {
 return {id:row.id,kind:Number(row.amount)>0?'receita' as const:'despesa' as const,status:'realizado' as const,
 amount:Math.abs(Number(row.amount)),date:row.date,paidDate:row.date,bankId:row.bank_id,
 unit:'Saldo bancário',account:'Ajuste de saldo',category:'Ajuste de saldo',description:'Ajuste de saldo bancário',beneficiary:'',pix:'',recurrence:'nenhuma' as const,installments:1,notes:row.notes,balanceAdjustment:true};
}

/** Invoice months are named by their payment due date. Closing starts the next cycle. */
export function invoiceCycle(month: string, card: Pick<CreditCard,'closing_day'|'due_day'>) {
 const [year,monthNumber]=month.split('-').map(Number);
 const dayAt=(offset:number,day:number)=>{
  const start=new Date(year,monthNumber-1+offset,1);
  return localDateKey(new Date(start.getFullYear(),start.getMonth(),Math.min(day,new Date(start.getFullYear(),start.getMonth()+1,0).getDate())));
 };
 const closingOffset=card.due_day<=card.closing_day?-1:0;
 return {start:dayAt(closingOffset-1,card.closing_day),closing:dayAt(closingOffset,card.closing_day),due:dayAt(0,card.due_day)};
}

export function invoiceMonthSummary(entries:any[],cardId:string,month:string) {
 const items=entries.filter(e=>e.creditCardId===cardId&&e.invoiceMonth===month);
 const cents=(e:any)=>Math.round((e.amount+(e.status==='realizado'?(e.juros||0)-(e.discount||0):0))*100);
 const paid=items.filter(e=>e.status==='realizado').reduce((sum,e)=>sum+cents(e),0)/100;
 const pending=items.filter(e=>e.status==='previsto').reduce((sum,e)=>sum+cents(e),0)/100;
 return {items,paid,pending,total:Math.round((paid+pending)*100)/100};
}
