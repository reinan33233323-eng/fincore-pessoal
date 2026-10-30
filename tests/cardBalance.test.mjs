import test from 'node:test';
import assert from 'node:assert/strict';
import {balanceCardEntries} from '../src/lib/cardBalance.ts';
import {buildCashFlow} from '../src/lib/cashFlow.ts';
import {cardPaymentEntries,invoiceMonthSummary} from '../src/lib/credit.ts';
import {reportingPeriod,summarizeFinancialEntries,summarizeBank} from '../src/lib/finance.ts';
const cards=[{id:'normal',name:'Normal',closing_day:25,due_day:5},{id:'control',name:'Controle',closing_day:25,due_day:5,include_in_balance:false}];
const purchase=(id,amount,status='previsto')=>({id,kind:'despesa',status,amount,date:'2026-11-05',cardPurchaseDate:'2026-10-15',creditCardId:id,invoiceMonth:'2026-11',bankId:status==='realizado'?'bank':null,paidDate:status==='realizado'?'2026-10-20':null});
const opening={id:'opening',kind:'receita',status:'realizado',amount:1000,date:'2026-10-01',bankId:'bank',balanceAdjustment:true};
test('control cards stay in spending and invoice reports while their forecasts do not lower cash',()=>{
 const rows=[purchase('normal',100),purchase('control',200)];
 assert.equal(summarizeFinancialEntries(reportingPeriod(rows,'2026-10-01','2026-10-31')).totalExpense,300);
 assert.equal(invoiceMonthSummary(rows,'control','2026-11').pending,200);
 const flow=buildCashFlow([opening,...rows],['bank'],cards,'2026-10',2,'2026-10-30');
 assert.equal(flow.months[1].pendingExpense,100);assert.equal(flow.months[1].closing,900);
});
test('paid control entries and both partial-payment rows are excluded only from cash',()=>{
 const partial={id:'p',card_id:'control',invoice_month:'2026-11',bank_id:'bank',amount:50,paid_date:'2026-10-20',settled_bank:null,settled_date:null};
 const rows=[opening,purchase('control',200,'realizado'),purchase('normal',100,'realizado'),...cardPaymentEntries([partial],cards)];
 const cash=balanceCardEntries(rows,cards);
 assert.deepEqual(cash.map(e=>e.id),['opening','normal']);
 assert.equal(summarizeBank(cash,'bank').balance,900);
 assert.equal(buildCashFlow(rows,['bank'],cards,'2026-10',2,'2026-10-30').actual,900);
 assert.equal(rows.filter(e=>e.creditCardId==='control'&&!e.cardPayment)[0].amount,200);
});
test('existing cards default to participating, and toggling an option never changes the entries',()=>{
 const rows=[purchase('normal',100),purchase('control',200)];const original=JSON.stringify(rows);
 const included=cards.map(c=>({...c,include_in_balance:true}));
 assert.equal(balanceCardEntries(rows,included).length,2);
 assert.equal(balanceCardEntries(rows,cards).length,1);
 assert.equal(JSON.stringify(rows),original);
 assert.equal(balanceCardEntries([{id:'other',creditCardId:'unknown'}],cards).length,1);
});
test('settled control payments with no bank remain visible in the invoice history',()=>{
 const payments=cardPaymentEntries([{id:'p',card_id:'control',invoice_month:'2026-11',bank_id:null,amount:50,paid_date:'2026-10-20',settled_bank:null,settled_date:null}],cards);
 const all=[purchase('control',200),...payments];
 assert.equal(invoiceMonthSummary(all,'control','2026-11').paid,50);
 assert.equal(invoiceMonthSummary(all,'control','2026-11').pending,150);
 assert.equal(balanceCardEntries(all,cards).length,0);
});
