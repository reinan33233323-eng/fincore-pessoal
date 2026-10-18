import test from 'node:test';
import assert from 'node:assert/strict';
import { reportingDate, reportingPeriod, cashDate, summarizeFinancialEntries, summarizeBank } from '../src/lib/finance.ts';
import { cardSchedule, cardInvoices } from '../src/lib/cardLedger.ts';

const card = {id:'nubank',name:'Nubank',closing_day:15,due_day:23};
const card2 = {id:'other',name:'Outro cartão',closing_day:20,due_day:10};
const period=(entries,month)=>reportingPeriod(entries,`${month}-01`,`${month}-31`);

test('October purchases from any card count in October, even when invoices and settlement are in November or December',()=>{
 const purchases=[...cardSchedule({date:'2026-10-29',amount:19.90,recurrence:'nenhuma',installments:1},card),
 ...cardSchedule({date:'2026-10-25',amount:40.10,recurrence:'nenhuma',installments:1},card2)];
 assert.equal(summarizeFinancialEntries(period(purchases,'2026-10')).totalExpense,60);
 assert.equal(period(purchases,'2026-11').length,0);
 const paid=purchases.map(e=>({...e,status:'realizado',paidDate:'2026-12-01',bankId:'itau'}));
 assert.equal(summarizeFinancialEntries(period(paid,'2026-10')).totalExpense,60);
 assert.equal(period(paid,'2026-12').length,0);
 assert.equal(summarizeBank(paid,'itau').balance,-60);
 assert.ok(paid.every(e=>cashDate(e)==='2026-12-01'));
});

test('a subscription contributes one charge per purchase month and its invoice remains on the due date',()=>{
 const rows=cardSchedule({date:'2026-10-29',amount:19.90,recurrence:'mensal',installments:1},card);
 for(const month of ['2026-10','2026-11','2026-12']) {
  assert.equal(summarizeFinancialEntries(period(rows,month)).totalExpense,19.90);
 }
 assert.equal(period(rows,'2026-10')[0].date,'2026-11-23');
 assert.equal(cardInvoices(rows,[card]).find(e=>e.invoiceMonth==='2026-11').amount,19.90);
});

test('installments count the full purchase exactly once in its purchase month, preserving later invoices',()=>{
 const rows=cardSchedule({date:'2026-10-18',amount:1000.01,recurrence:'nenhuma',installments:24},card);
 const before=structuredClone(rows);
 assert.equal(summarizeFinancialEntries(period(rows,'2026-10')).totalExpense,1000.01);
 assert.equal(period(rows,'2026-11').length,0);
 assert.equal(cardInvoices(rows,[card]).length,24);
 assert.equal(new Set(rows.map(e=>e.date)).size,24);
 assert.equal(summarizeBank(rows,'itau').balance,0);
 assert.deepEqual(rows,before);
});

test('ordinary transactions retain their existing dates and legacy card entries safely use their available date',()=>{
 const ordinary={kind:'despesa',status:'realizado',amount:50,date:'2026-10-29',paidDate:'2026-11-02'};
 assert.equal(reportingDate(ordinary),'2026-11-02');
 assert.equal(reportingDate({...ordinary,status:'previsto'}),'2026-10-29');
 assert.equal(reportingDate({...ordinary,creditCardId:'legacy',cardPurchaseDate:null}),'2026-11-02');
 const entry={...ordinary,creditCardId:'card',cardPurchaseDate:'2026-10-18'};
 assert.equal(reportingPeriod([entry],'2026-10-18','2026-10-18')[0],entry);
 assert.deepEqual(reportingPeriod([entry],'2026-10-19','2026-10-31'),[]);
});
