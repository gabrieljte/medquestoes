import { useEffect, useState } from 'react';
import source from './estrategiaSchedule.json';
import { useSyncedStorage, writeSyncedValue, readSyncedValue } from './syncedStorage.js';
import { RecordModal, Remove } from './StudyRecords.jsx';
import { durationText as time, withLessonTiming, confirmedTime, completeTime } from './lessonTiming.js';

const states=['A fazer','Fazendo','Feito','Pulados'];
const legacySamples=new Set(['estrategia-iam1','estrategia-sca1','estrategia-dm']);
function weekDate(start,week){const date=new Date(start+'T12:00:00');date.setDate(date.getDate()+(week-1)*7);return date}
const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export default function SchedulePlanner({userEmail,syncReady}){
  const [blocks,setBlocks]=useSyncedStorage('medplanner-blocks-v1',[]);
  const [settings,setSettings]=useSyncedStorage('medplanner-settings-v1',{start:source.start,speed:1.5});
  const [week,setWeek]=useState(1),[view,setView]=useState('Semana'),[status,setStatus]=useState('A fazer');
  const [search,setSearch]=useState(''),[area,setArea]=useState('Todas'),[showOptional,setShowOptional]=useState(false);
  const [draft,setDraft]=useState(null),[message,setMessage]=useState('');
  function importPlan(){
    const existing=blocks.map(b=>legacySamples.has(b.id)?{...b,optional:true}:b);
    const ids=new Set(existing.map(b=>b.id));
    setBlocks([...existing,...source.blocks.filter(b=>!ids.has(b.id))]);
    setSettings({...settings,start:settings.importedWorkbook?settings.start:source.start,importedWorkbook:source.version});
    setMessage('Planejamento carregado: 358 módulos, 62 complementos e as revisões das 52 semanas. Seus blocos e marcações existentes foram preservados.');
  }
  useEffect(()=>{
    const owner=['gabrieljacintot@gmail.com','gabriel.jacinto@ufms.br'].includes(userEmail?.toLowerCase());
    if(owner&&syncReady&&!settings.importedWorkbook)importPlan();
  },[userEmail,syncReady,settings.importedWorkbook]);
  const weekInfo=source.weeks.find(w=>w.week===week);
  const allCurrent=blocks.map(withLessonTiming).filter(b=>view==='Completo'||Number(b.week)===week);
  const current=allCurrent.filter(b=>view==='Revisões'?b.kind==='Revisão':b.kind!=='Revisão'&&(showOptional||!b.optional));
  const done=current.filter(b=>b.status==='Feito');
  const known=current.filter(b=>confirmedTime(b)>0),doneKnown=done.filter(b=>confirmedTime(b)>0);
  const total=known.reduce((n,b)=>n+confirmedTime(b),0),doneTotal=doneKnown.reduce((n,b)=>n+confirmedTime(b),0);
  const incomplete=current.some(b=>!completeTime(b));
  const percent=current.length?Math.round(done.length/current.length*100):0;
  const start=weekDate(settings.start||source.start,week),end=new Date(start);end.setDate(end.getDate()+6);
  const areas=[...new Set(allCurrent.map(b=>b.area))].sort();
  const visible=current.filter(b=>b.status===status&&(area==='Todas'||b.area===area)&&`${b.title} ${b.area}`.toLowerCase().includes(search.toLowerCase()));
  function update(id,patch){setBlocks(old=>old.map(b=>b.id===id?{...b,...patch,updatedAt:new Date().toISOString()}:b))}
  function save(event){event.preventDefault();const row={...draft,week:Number(draft.week),seconds:draft.minutes!==''?Number(draft.minutes)*60:null,id:draft.id||crypto.randomUUID(),status:draft.status||'A fazer',updatedAt:new Date().toISOString()};setBlocks(old=>draft.id?old.map(b=>b.id===draft.id?row:b):[...old,row]);setDraft(null)}
  function scheduleBlock(block){
    const date=weekDate(settings.start||source.start,Number(block.week));if(block.kind==='Revisão')date.setDate(date.getDate()+5);
    const events=readSyncedValue('medquiz-academic-calendar-v1',[]);
    if(events.some(e=>e.id==='block-'+block.id)){setMessage('Esse bloco já está no calendário. Você pode ajustar seu horário por lá.');return}
    writeSyncedValue('medquiz-academic-calendar-v1',[...events,{id:'block-'+block.id,title:block.title,category:'Estudos',date:dateKey(date),startTime:'08:00',endTime:'09:00',description:`Reserva inicial de uma hora; ajuste conforme seu estudo. ${block.url||''}`,weekly:false,repeatWeekdays:[],completed:false,completedDates:[]}]);
    setMessage('Bloco agendado às 08h, com reserva inicial de uma hora. Ajuste o horário no calendário.');
  }
  return <section className="planner-page schedule-page">
    <div className="planner-heading"><div><span>ESTRATÉGIA MED · PLANO ANUAL</span><h1>Meu cronograma</h1><p>52 semanas. Três grandes áreas por semana, no rodízio da sua planilha.</p></div><button className="primary" onClick={()=>setDraft({title:'',area:'',week,minutes:'',url:'',kind:'Videoaula',notes:''})}>＋ Novo bloco</button></div>
    {!settings.importedWorkbook&&<div className="schedule-import"><div><b>Seu planejamento está disponível</b><p>358 módulos principais, 62 complementos e revisões semanais. Início: 02/11/2026.</p></div><button className="primary" onClick={importPlan}>Carregar meu cronograma</button></div>}
    <div className="schedule-view">{['Semana','Revisões','Completo'].map(value=><button key={value} className={view===value?'active':''} onClick={()=>{setView(value);setArea('Todas')}}>{value==='Semana'?'Cronograma semanal':value==='Revisões'?'Panorama de revisões':'Cronograma completo'}</button>)}</div>
    <div className="schedule-week-title"><h2>{view==='Completo'?'Todos os módulos':`Semana ${week}`}<small>{start.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} – {end.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</small></h2><div><button disabled={week<=1} onClick={()=>{setWeek(week-1);setArea('Todas')}} aria-label="Semana anterior">‹</button><select aria-label="Selecionar semana" value={week} onChange={e=>{setWeek(Number(e.target.value));setArea('Todas')}}>{Array.from({length:Math.max(52,...blocks.map(b=>Number(b.week)||1))},(_,i)=><option key={i} value={i+1}>Semana {i+1}</option>)}</select><button onClick={()=>{setWeek(week+1);setArea('Todas')}} aria-label="Próxima semana">›</button></div></div>
    {weekInfo&&view!=='Completo'&&<div className="schedule-focus">{Object.entries(weekInfo.areas).map(([group,description])=><div key={group}><span>{group}</span><b>{description.split('\n')[0]}</b><small>{description.split('\n').slice(1).join(' · ')}</small></div>)}</div>}
    <div className="schedule-progress-label"><span>{showOptional?'Progresso dos blocos exibidos':'Progresso dos módulos principais'}</span><b>{percent}%</b></div><div className="planner-progress"><i style={{width:percent+'%'}}/></div>
    <div className="schedule-stats"><article><span>Concluídos</span><b>{done.length}<small> / {current.length}</small></b><small>{showOptional?'Módulos e complementos':'Complementos opcionais fora do percentual'}</small></article><article><span>Tempo confirmado · {settings.speed}×{incomplete?' · parcial':''}</span><b>{total?time(total/settings.speed):'Sem tempo definido'}</b><small>{doneTotal?`${time(doneTotal/settings.speed)} nos blocos concluídos · `:''}{known.length} de {current.length} blocos com algum tempo confirmado</small><small>Original: {time(total)}. Orçamento de estudo: {source.weeklyHours}h/semana (não é a duração das aulas).</small></article></div>
    {weekInfo&&view!=='Completo'&&<details className="schedule-routine"><summary>Distribuição da semana e revisões</summary><p>{weekInfo.routine}</p><small>As 24h são um orçamento de estudo da planilha. Os tempos confirmados abaixo vêm dos arquivos de vídeo do Drive; as aulas sem duração disponível ficam fora da soma.</small></details>}
    <div className="planner-toolbar"><label>Início do plano<input type="date" value={settings.start||source.start} onChange={e=>e.target.value&&setSettings({...settings,start:e.target.value})}/></label><label>Velocidade<select value={settings.speed} onChange={e=>setSettings({...settings,speed:Number(e.target.value)})}>{[1,1.25,1.5,1.75,2].map(n=><option key={n} value={n}>{n}×</option>)}</select></label><label>Especialidade<select value={area} onChange={e=>setArea(e.target.value)}><option>Todas</option>{areas.map(a=><option key={a}>{a}</option>)}</select></label><input aria-label="Buscar bloco" placeholder="Buscar tema…" value={search} onChange={e=>setSearch(e.target.value)}/>{view!=='Revisões'&&<label className="schedule-optional"><input type="checkbox" checked={showOptional} onChange={e=>setShowOptional(e.target.checked)}/>Incluir complementos</label>}</div>
    {message&&<p className="planner-message" role="status">{message}<button onClick={()=>setMessage('')}>✕</button></p>}
    <div className="schedule-status">{states.map(s=><button key={s} className={status===s?'active':''} onClick={()=>setStatus(s)}>{s}<b>{current.filter(b=>b.status===s).length}</b></button>)}</div>
    <div className="schedule-blocks">{visible.map(b=><article className="schedule-block" key={b.id}><div className="schedule-block-tags"><span>{b.kind}</span><span>{b.area}</span><small>Semana {b.week}{b.optional?' · opcional':''}</small><input type="checkbox" aria-label={`Concluir ${b.title}`} checked={b.status==='Feito'} onChange={e=>update(b.id,{status:e.target.checked?'Feito':'A fazer'})}/></div><h2>{b.title}</h2>{b.notes&&<p>{b.notes}</p>}<div className="schedule-block-bottom"><span>◷ {confirmedTime(b)?`${time(confirmedTime(b)/settings.speed)} em ${settings.speed}× · ${time(confirmedTime(b))} original${completeTime(b)?'':' · total parcial'}`:'Sem tempo definido'}</span><div>{b.url&&<a href={b.url} target="_blank" rel="noreferrer">Abrir material ↗</a>}{b.secondaryUrl&&<a href={b.secondaryUrl} target="_blank" rel="noreferrer">Segundo material ↗</a>}<button onClick={()=>update(b.id,{status:'Fazendo'})}>Iniciar</button><button onClick={()=>setDraft({...blocks.find(item=>item.id===b.id),minutes:b.seconds?b.seconds/60:''})}>Editar</button></div></div>{b.lessons&&<details className="lesson-timing"><summary>Videoaulas · {b.lessons.length} encontradas · {b.measuredCount} com tempo confirmado</summary><p className="lesson-timing-note">{b.timingComplete?'Todas as durações deste módulo foram conferidas nos arquivos.':'Total incompleto: aulas sem duração confirmada não entram na soma.'}{b.timingIssue?` ${b.timingIssue}`:''}</p>{b.lessons.length?<ol>{b.lessons.map(lesson=><li key={lesson.id}><a href={lesson.url} target="_blank" rel="noreferrer">{lesson.title} ↗</a><div><b>{time(lesson.seconds)}</b>{lesson.seconds&&settings.speed!==1?<small>{time(lesson.seconds/settings.speed)} em {settings.speed}×</small>:null}{!lesson.seconds&&<small>{lesson.reason||'Duração não disponível'}</small>}</div></li>)}</ol>:<p>Sem tempo definido · nenhuma videoaula localizada nos materiais conferidos.</p>}<small>Conferência: {new Date(b.timingCheckedAt).toLocaleDateString('pt-BR')}. Tempos das aulas; não incluem pausas ou exercícios.</small></details>}<details><summary>Organizar bloco</summary><div className="record-actions"><select aria-label="Status do bloco" value={b.status} onChange={e=>update(b.id,{status:e.target.value})}>{states.map(s=><option key={s}>{s}</option>)}</select><button onClick={()=>scheduleBlock(b)}>＋ Agendar</button><Remove onRemove={()=>setBlocks(old=>old.filter(i=>i.id!==b.id))}/></div></details></article>)}</div>
    {!visible.length&&<div className="planner-empty"><h2>Nenhum bloco nessa seleção</h2><p>Altere o status, a semana ou os filtros para encontrar seu próximo estudo.</p></div>}
    {draft&&<RecordModal title={draft.id?'Editar bloco':'Novo bloco de estudo'} onClose={()=>setDraft(null)}><form onSubmit={save}>{[['title','Tema'],['area','Especialidade'],['week','Semana'],['minutes','Duração original em minutos'],['url','Link do material']].map(([name,label])=><label key={name}>{label}<input required={['title','week'].includes(name)} type={['week','minutes'].includes(name)?'number':name==='url'?'url':'text'} min={name==='week'?1:0} step={name==='minutes'?'any':1} value={draft[name]??''} onChange={e=>setDraft({...draft,[name]:e.target.value})}/></label>)}<label>Tipo<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value})}>{['Módulo','Complemento','Videoaula','Revisão','Leitura','Questões externas'].map(k=><option key={k}>{k}</option>)}</select></label><label>Observações<textarea value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><button className="primary">Salvar bloco</button></form></RecordModal>}
  </section>
}
