import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { preferredMaterialType, withModuleMaterials } from '../src/moduleMaterials.js';
import { prepareScheduleBlocks } from '../src/scheduleOrganization.js';
const read=name=>JSON.parse(readFileSync(new URL('../src/'+name,import.meta.url),'utf8'));
const catalog=read('moduleMaterials.json'),source=read('estrategiaSchedule.json'),rules=read('scheduleOrganization.json');
const organized=prepareScheduleBlocks(source.blocks,rules).map(b=>withModuleMaterials(b,catalog));

test('all published document links are grounded PDF files, not video streams',()=>{
  assert.equal(Object.values(catalog.blocks).filter(x=>x.pdfs.length).length,343);
  for(const entry of Object.values(catalog.blocks))for(const pdf of entry.pdfs){
    assert.ok(pdf.title.toLowerCase().endsWith('.pdf'));
    assert.ok(pdf.url.startsWith('https://drive.google.com/file/d/'));
    assert.ok(pdf.size>0);
    assert.ok(preferredMaterialType(pdf));
  }
});
test('only digital books and summaries remain, with books first',()=>{
  const block=organized.find(b=>b.title==='Semiologia Cardíaca');
  assert.equal(block.pdfs[0].type,'Livro digital');
  assert.ok(block.pdfs.some(p=>p.type==='Resumo'));
  assert.equal(block.pdfs.length,2);
  assert.ok(organized.every(b=>b.pdfs.every(p=>['Livro digital','Resumo'].includes(p.type))));
});
test('consolidated modules preserve PDF materials from both original folders',()=>{
  const block=organized.find(b=>b.id==='estrategia-2025-row-77');
  assert.equal(block.pdfs.length,3);assert.equal(block.subject,'Cirurgia');
});
test('a user-entered PDF replaces stale source associations without changing progress',()=>{
  const block=withModuleMaterials({id:'custom',title:'Minha leitura',url:'https://example.com/book.pdf',pdfUrl:'https://example.com/book.pdf',status:'Feito'},catalog);
  assert.equal(block.pdfs[0].url,'https://example.com/book.pdf');assert.equal(block.status,'Feito');
});
test('the active schedule contains no video player, speed or duration controls',()=>{
  const text=readFileSync(new URL('../src/SchedulePlanner.jsx',import.meta.url),'utf8');
  assert.ok(!/withLessonTiming|confirmedTime|shortTime|\bspeed\b|\bminutes\b|<video|Ver aulas|Duração original/.test(text));
  assert.ok(text.includes('Abrir PDF'));
});
test('recognizes LD and R/RE prefixes without accepting flashcards or unrelated names',()=>{
  for(const title of ['LD - Cardiologia.pdf','LD 2 - Trauma.pdf','LDI - Livro.pdf',' ld_3.pdf'])assert.equal(preferredMaterialType({title}),'Livro digital');
  for(const title of ['R - Cardiologia.pdf','RE - Trauma.pdf','RE_Resumo.pdf'])assert.equal(preferredMaterialType({title}),'Resumo');
  for(const title of ['Flashcard - Tema.pdf','Mapa Mental - Tema.pdf','Slide Resumo - Tema.pdf','Ressonância.pdf','Leitura.pdf'])assert.equal(preferredMaterialType({title}),null);
});
