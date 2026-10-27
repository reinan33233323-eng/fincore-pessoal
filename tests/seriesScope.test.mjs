import test from 'node:test';
import assert from 'node:assert/strict';
import {seriesTargets} from '../src/lib/seriesScope.ts';
import {changedSeriesFields} from '../src/lib/seriesDates.ts';
const rows=[
 {id:'dec',seriesId:'monthly',date:'2026-12-10',status:'previsto',description:'Internet'},
 {id:'oct',seriesId:'monthly',date:'2026-10-10',status:'realizado',paidDate:'2026-10-12',description:'Internet'},
 {id:'nov',seriesId:'monthly',date:'2026-11-10',status:'previsto',description:'Internet'},
 {id:'other',seriesId:'other',date:'2026-11-10',status:'previsto',description:'Internet'},
];
test('editing or deleting one occurrence targets only its ID, regardless of the order or matching description/date',()=>{
 assert.deepEqual(seriesTargets(rows,rows[2],'one').map(e=>e.id),['nov']);
});
test('whole recurrence targets all and only its series, retaining each occurrence date',()=>{
 const ids=new Set(seriesTargets(rows,rows[2],'series').map(e=>e.id));
 const changes=changedSeriesFields(rows[2],{description:'Internet corrigida',paidDate:null},['date','installment','paidDate']);
 const updated=rows.map(e=>ids.has(e.id)?{...e,...changes}:e);
 assert.deepEqual(updated.map(e=>e.description),['Internet corrigida','Internet corrigida','Internet corrigida','Internet']);
 assert.deepEqual(updated.map(e=>e.date),rows.map(e=>e.date));
 assert.equal(updated[1].paidDate,'2026-10-12');
 assert.equal(updated[1].status,'realizado');
 assert.deepEqual(rows.filter(e=>!ids.has(e.id)).map(e=>e.id),['other']);
});
test('card recurrence changes target only open occurrences and never a paid invoice',()=>{
 assert.deepEqual(seriesTargets(rows,rows[2],'series',true).map(e=>e.id),['dec','nov']);
 assert.deepEqual(seriesTargets(rows,rows[1],'one',true),[]);
});
test('weekly and same-month split occurrences stay separate when choosing only this occurrence',()=>{
 const weekly=[{id:'week1',seriesId:'weekly',date:'2026-10-07'},{id:'week2',seriesId:'weekly',date:'2026-10-14'}];
 assert.deepEqual(seriesTargets(weekly,weekly[0],'one').map(e=>e.id),['week1']);
 assert.equal(seriesTargets(weekly,weekly[0],'series').length,2);
});
test('standalone entries cannot match unrelated entries without a series',()=>{
 assert.deepEqual(seriesTargets([{id:'a'},{id:'b'}],{id:'a'},'series').map(e=>e.id),['a']);
});
