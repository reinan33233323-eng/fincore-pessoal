import test from 'node:test';
import assert from 'node:assert/strict';
import {balanceCardEntries,controlCardEntries} from '../src/lib/cardBalance.ts';
import {cardInvoices,cardSchedule} from '../src/lib/cardLedger.ts';
import {buildCashFlow,cashMovementRows} from '../src/lib/cashFlow.ts';
import {monthlyParts} from '../src/lib/installments.ts';
import {reportingPeriod,summarizeFinancialEntries} from '../src/lib/finance.ts';
const cards=[{id:'normal',name:'Cobrado',closing_day:25,due_day:5},{id:'control',name:'Controle',closing_day:25,due_day:5,include_in_balance:false}];
const entry=(id,amount,date='2026-11-05')=>({id,amount,date,description:id,kind:'despesa',status:'previsto',recurrence:'nenhuma',installments:1});
test('control invoices and their partial payments stay out of launches, with purchases separately reported',()=>{
 const rows=[entry('cash',20),{...entry('normal',100),creditCardId:'normal',invoiceMonth:'2026-11',cardPurchaseDate:'2026-11-01'},{...entry('control',200),creditCardId:'control',invoiceMonth:'2026-11',cardPurchaseDate:'2026-11-01'},{...entry('payment',50),paysCardId:'control',cardPayment:true}];
 const launches=cardInvoices(balanceCardEntries(rows,cards),cards);
 assert.equal(launches.length,2);assert.ok(!launches.some(e=>e.creditCardId==='control'||e.paysCardId==='control'));
 const spending=reportingPeriod(rows.filter(e=>!e.cardPayment&&!e.invoiceAdjustment),'2026-11-01','2026-11-30');
 assert.equal(summarizeFinancialEntries(balanceCardEntries(spending,cards)).totalExpense,120);
 assert.equal(summarizeFinancialEntries(controlCardEntries(spending,cards)).totalExpense,200);
 assert.equal(rows.length,4);
});
test('descending cash list keeps balances calculated from the beginning of the month',()=>{
 const flow=buildCashFlow([{...entry('opening',1000,'2026-10-31'),kind:'receita',status:'realizado',bankId:'bank'},entry('first',100),entry('second',50,'2026-11-25'),entry('zero',0,'2026-11-26')],['bank'],[],'2026-11',1,'2026-11-02');
 const rows=cashMovementRows(flow.months[0],true);
 assert.deepEqual(rows.map(e=>e.date),['2026-11-26','2026-11-25','2026-11-05']);
 assert.deepEqual(rows.map(e=>e.balance),[850,850,900]);
 assert.equal(rows[0].balance,flow.months[0].closing);
});
test('zero entries persist in standard, monthly and card schedules without changing totals',()=>{
 assert.deepEqual(monthlyParts(3,0,'2026-11-05').map(e=>e.amount),[0,0,0]);
 const cardRows=cardSchedule(entry('zero',0),cards[0]);
 assert.equal(cardRows.length,1);assert.equal(cardRows[0].amount,0);
 assert.equal(cardInvoices(cardRows,cards).length,1);
 assert.equal(cardInvoices(cardRows,cards)[0].status,'previsto');
 assert.throws(()=>monthlyParts(1,-1,'2026-11-05'));
 assert.throws(()=>monthlyParts(3,0.01,'2026-11-05'));
});
