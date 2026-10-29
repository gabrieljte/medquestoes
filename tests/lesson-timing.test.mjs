import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const text = readFileSync(new URL('../src/lessonTiming.js', import.meta.url), 'utf8');
const load = catalog => new Function('catalog', text.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + '\nreturn {durationText,withLessonTiming,confirmedTime,completeTime};')(catalog);
const api = load({checkedAt:'2026-10-29', blocks:{full:{lessons:['a','b'],complete:true},partial:{lessons:['a','c'],complete:true},empty:{lessons:[],complete:true},unread:{lessons:['a'],complete:false}},lessons:{a:{id:'a',seconds:120},b:{id:'b',seconds:180},c:{id:'c',seconds:null}}});

test('unknown time is never presented as zero',()=>{
  for(const value of [null,undefined,0,NaN,-1]) assert.equal(api.durationText(value),'Sem tempo definido');
});
test('actual duration includes seconds and playback speed',()=>{
  assert.equal(api.durationText(1295.595),'21min 36s');
  assert.equal(api.durationText(3661),'1h 1min 1s');
  assert.equal(api.durationText(120/1.5),'1min 20s');
});
test('verified data does not overwrite user progress',()=>{
  const block=api.withLessonTiming({id:'full',status:'Feito',notes:'Meu comentário'});
  assert.equal(api.confirmedTime(block),300);assert.equal(api.completeTime(block),true);
  assert.equal(block.status,'Feito');assert.equal(block.notes,'Meu comentário');
});
test('unknown lessons and unverified folders keep totals partial',()=>{
  const partial=api.withLessonTiming({id:'partial'});
  assert.equal(partial.measuredCount,1);assert.equal(api.confirmedTime(partial),120);assert.equal(api.completeTime(partial),false);
  assert.equal(api.completeTime(api.withLessonTiming({id:'unread'})),false);
  assert.equal(api.completeTime(api.withLessonTiming({id:'empty'})),false);
});
test('manual blocks retain their duration',()=>{
  const manual=api.withLessonTiming({id:'personal',seconds:90});
  assert.equal(api.confirmedTime(manual),90);assert.equal(api.completeTime(manual),true);
});
test('catalog entries refer to real lessons, without expiring download links',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../src/lessonDurations.json',import.meta.url),'utf8'));
  assert.equal(Object.keys(catalog.lessons).length,936);
  for(const entry of Object.values(catalog.blocks)){
    assert.equal(new Set(entry.lessons).size,entry.lessons.length);
    for(const id of entry.lessons) assert.ok(catalog.lessons[id]);
  }
  for(const lesson of Object.values(catalog.lessons)){
    assert.ok(lesson.url.startsWith('https://drive.google.com/file/d/'));
    if(lesson.seconds!==null)assert.ok(Number.isFinite(lesson.seconds)&&lesson.seconds>0);
    else assert.ok(lesson.reason);
  }
});
