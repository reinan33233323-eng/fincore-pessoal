import test from 'node:test';
import assert from 'node:assert/strict';
import { quickBankEntry, quickCardData, newCardPurchaseRows, pickSource } from '../src/lib/quickEntry.ts';
import { invoiceDate } from '../src/lib/credit.ts';

const card={id:'c1',name:'Black',closing_day:25,due_day:5};
const input={amount:50,category:'Mercado',description:'Feira',date:'2026-11-12',unit:'Pessoa Física',paid:true,installments:1};

test('paid bank expense is realized on its own date and keeps the bank',()=>{
 const e=quickBankEntry(input,'b1');
 assert.equal(e.kind,'despesa');assert.equal(e.status,'realizado');assert.equal(e.paidDate,'2026-11-12');
 assert.equal(e.bankId,'b1');assert.equal(e.amount,50);assert.equal(e.unit,'Pessoa Física');assert.equal(e.recurrence,'nenhuma');
});
test('unpaid bank expense stays planned without a paid date',()=>{
 const e=quickBankEntry({...input,paid:false},'b1');
 assert.equal(e.status,'previsto');assert.equal(e.paidDate,null);
});
test('blank description falls back to the category name',()=>{
 assert.equal(quickBankEntry({...input,description:'  '},'b1').description,'Mercado');
 assert.equal(quickCardData({...input,description:''}).description,'Mercado');
});
test('zero amount is kept as zero',()=>{
 assert.equal(quickBankEntry({...input,amount:0},'b1').amount,0);
});
test('card purchase in 3 installments lands in 3 invoices sharing one series',()=>{
 const rows=newCardPurchaseRows(quickCardData({...input,amount:300,installments:3,date:'2026-10-15'}),card);
 assert.equal(rows.length,3);
 assert.deepEqual(rows.map(r=>r.date),['2026-11-05','2026-12-05','2027-01-05']);
 assert.equal(new Set(rows.map(r=>r.id)).size,3);
 assert.ok(rows[0].seriesId);assert.ok(rows.every(r=>r.seriesId===rows[0].seriesId));
 assert.equal(rows.reduce((s,r)=>s+Math.round(r.amount*100),0),30000);
 assert.ok(rows.every(r=>r.creditCardId==='c1'&&r.status==='previsto'&&r.bankId===null&&r.category==='Mercado'));
});
test('single card purchase has no series and the current invoice month',()=>{
 const rows=newCardPurchaseRows(quickCardData({...input,date:'2026-10-15'}),card);
 assert.equal(rows.length,1);assert.equal(rows[0].seriesId,undefined);assert.equal(rows[0].invoiceMonth,'2026-11');
});
test('purchase on the closing day uses the same invoice as invoiceDate',()=>{
 const rows=newCardPurchaseRows(quickCardData({...input,date:'2026-10-25'}),card);
 assert.equal(rows[0].date,invoiceDate('2026-10-25',card,0));
});
test('pickSource keeps a remembered source that still exists',()=>{
 assert.deepEqual(pickSource('card:c1',[{id:'i',name:'Itaú'}],[{id:'c1'}]),{type:'card',id:'c1'});
 assert.deepEqual(pickSource('bank:n',[{id:'i',name:'Itaú'},{id:'n',name:'Nubank'}],[]),{type:'bank',id:'n'});
});
test('pickSource falls back to Itaú, then first bank, then first card, then null',()=>{
 assert.deepEqual(pickSource('card:gone',[{id:'n',name:'Nubank'},{id:'i',name:'Itaú'}],[]),{type:'bank',id:'i'});
 assert.deepEqual(pickSource(null,[{id:'n',name:'Nubank'}],[]),{type:'bank',id:'n'});
 assert.deepEqual(pickSource(null,[],[{id:'c1'}]),{type:'card',id:'c1'});
 assert.equal(pickSource(null,[],[]),null);
});
