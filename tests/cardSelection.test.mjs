import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCardId} from '../src/lib/cardSelection.ts';
test('normal card navigation starts with Nubank regardless of alphabetic order',()=>{
 const cards=[{id:'i',name:'Inter'},{id:'n',name:'Nubank Reinan'},{id:'c',name:'Cora'}];
 assert.equal(initialCardId(cards),'n');
 assert.equal(initialCardId(cards,'i'),'i');
 assert.equal(initialCardId(cards,'deleted'),'n');
 assert.equal(initialCardId([{id:'n',name:'NU BANK'}]),'n');
 assert.equal(initialCardId([{id:'i',name:'Inter'}]),'i');
 assert.equal(initialCardId([]),'');
});
