import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { classifyBlock, prepareScheduleBlocks } from '../src/scheduleOrganization.js';
const source=JSON.parse(readFileSync(new URL('../src/estrategiaSchedule.json',import.meta.url),'utf8'));
const rules=JSON.parse(readFileSync(new URL('../src/scheduleOrganization.json',import.meta.url),'utf8'));
const prepared=prepareScheduleBlocks(source.blocks,rules);

test('clinical subjects stay distinct, surgery and MFC contain their modules',()=>{
  assert.equal(classifyBlock({area:'CARDIOLOGIA'}).subject,'Cardiologia');
  assert.equal(classifyBlock({area:'NEFROLOGIA'}).subject,'Nefrologia');
  assert.equal(classifyBlock({area:'ORTOPEDIA',group:'CX'}).subject,'Cirurgia');
  assert.equal(classifyBlock({area:'PREVENTIVA',group:'MFC',title:'17. Atenção Primária a Saúde'}).section,'Atenção primária e MFC');
  assert.equal(classifyBlock({area:'ATUALIZAÇÕES',group:'MFC',title:'Financiamento da APS'}).subject,'MFC e Preventiva');
});
test('verified duplicate modules are unified without dropping material links',()=>{
  assert.equal(prepared.length,470);
  const surgery=prepared.find(b=>b.id==='estrategia-2025-row-77');
  assert.equal(surgery.subject,'Cirurgia');
  assert.deepEqual(surgery.memberIds,['estrategia-2025-row-77','estrategia-2025-row-231']);
  assert.equal(surgery.materialUrls.length,2);
  assert.equal(prepared.filter(b=>b.title.includes('Síndrome Hepatorrenal e Síndrome Hepatopulmonar')).length,1);
});
test('similar titles with distinct teaching content are not merged',()=>{
  assert.equal(prepared.filter(b=>b.title.includes('Sífilis na Gestação e Sífilis Congênitas')).length,2);
  assert.equal(prepared.filter(b=>/\d+[.,] Miscelânea$/.test(b.title)).length,2);
  assert.equal(prepared.filter(b=>b.kind==='Revisão').length,52);
});
test('duplicate merging preserves completion and does not mutate saved records',()=>{
  const rows=[{id:'a',title:'Tema',url:'https://drive.google.com/file/d/file/view',status:'A fazer',week:1,notes:'Minha nota'}, {id:'b',title:'Tema',url:'https://drive.google.com/file/d/file/view?usp=sharing',status:'Feito',week:2}];
  const snapshot=JSON.stringify(rows),result=prepareScheduleBlocks(rows);
  assert.equal(result.length,1);assert.equal(result[0].status,'Feito');assert.deepEqual(result[0].memberIds,['a','b']);
  assert.equal(JSON.stringify(rows),snapshot);assert.equal(result[0].notes,'Minha nota');
});
test('a customized material is no longer treated as a verified alias',()=>{
  const edited=source.blocks.map(b=>b.id==='estrategia-2025-row-236'?{...b,url:'https://example.com/new-course'}:b);
  assert.equal(prepareScheduleBlocks(edited,rules).length,471);
});
test('legacy demo modules do not appear beside the real course',()=>{
  assert.equal(prepareScheduleBlocks([{id:'estrategia-iam1',title:'Exemplo'}]).length,0);
});
