import { useEffect, useMemo, useState } from 'react';
import source from './estrategiaSchedule.json';
import rules from './scheduleOrganization.json';
import { prepareScheduleBlocks } from './scheduleOrganization.js';
import { useSyncedStorage, writeSyncedValue, readSyncedValue } from './syncedStorage.js';
import { RecordModal, Remove } from './StudyRecords.jsx';
import materials from './moduleMaterials.json';
import { withModuleMaterials } from './moduleMaterials.js';

const states=['A fazer','Fazendo','Feito','Pulados'];
const colors={Cardiologia:'#cf6680',Nefrologia:'#8873ca',Neurologia:'#7784d5',Pneumologia:'#419c9b',Cirurgia:'#bd8c47','MFC e Preventiva':'#5d9b7b',Pediatria:'#ba799f',Ginecologia:'#ae7ec0',Obstetrícia:'#bd7e91'};
function weekDate(start,week){const date=new Date(start+'T12:00:00');date.setDate(date.getDate()+(week-1)*7);return date}
const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const cleanTitle=title=>title.replace(/^\s*\d+[.,]\s*/,'').replace(/\.(?:mp4|pdf)$/i,'');
const dateLabel=date=>date.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');

function ModuleRow({block:b,expanded,onToggle,onUpdate,onEdit,onSchedule,onRemove}){
  const panelId='module-panel-'+b.id,primary=b.pdfs[0];
  return <article className={`sp-module ${expanded?'is-expanded':''} ${b.status==='Feito'?'is-done':''}`}>
    <div className="sp-module-row">
      <label className="sp-check"><input type="checkbox" aria-label={`Concluir ${cleanTitle(b.title)}`} checked={b.status==='Feito'} onChange={e=>onUpdate({status:e.target.checked?'Feito':'A fazer'})}/><span aria-hidden="true">✓</span></label>
      <button className="sp-module-title" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId}><h3>{cleanTitle(b.title)}</h3><span>{b.pdfs.length?`${b.pdfs.length} PDFs disponíveis`:(b.kind==='Revisão'?'Bloco de revisão':'PDF ainda não localizado')}<i>·</i>Semana {b.week}{b.optional&&<em>Complemento</em>}{b.status!=='A fazer'&&<em>{b.status}</em>}</span></button>
      {primary?<a className="sp-open-pdf" href={primary.url} target="_blank" rel="noreferrer" aria-label={`Abrir PDF de ${cleanTitle(b.title)}`}>Abrir PDF <span aria-hidden="true">↗</span></a>:<span className="sp-no-pdf">{b.kind==='Revisão'?'Revisão':'Sem PDF'}</span>}
      <button className="sp-expand" aria-label={`${expanded?'Fechar':'Ver'} materiais de ${cleanTitle(b.title)}`} aria-expanded={expanded} aria-controls={panelId} onClick={onToggle}>{expanded?'Fechar':'Materiais'}<span aria-hidden="true">{expanded?'−':'+'}</span></button>
    </div>
    {expanded&&<div className="sp-module-panel" id={panelId}>
      {b.notes&&<p className="sp-module-notes">{b.notes}</p>}
      {b.pdfs.length?<><div className="sp-lesson-heading"><b>Materiais em PDF</b><span>Abrem diretamente no Google Drive</span></div><ul className="sp-pdfs">{b.pdfs.map(pdf=><li key={pdf.id}><span className="sp-pdf-icon" aria-hidden="true">PDF</span><div><small>{pdf.type}</small><a href={pdf.url} target="_blank" rel="noreferrer">{cleanTitle(pdf.title)}</a></div><a className="sp-pdf-link" href={pdf.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${pdf.title}`}>Abrir ↗</a></li>)}</ul></>:<p className="sp-material-notice">{b.kind==='Revisão'?'Use este bloco para revisar os assuntos da semana e marcar sua conclusão.':'Não encontrei um PDF nos materiais deste módulo. Você pode adicionar o link em Editar.'}</p>}
      <div className="sp-module-actions"><div className="sp-materials">{!primary&&!b.materialsCatalogued&&b.url&&<a href={b.url} target="_blank" rel="noreferrer">Abrir material adicionado ↗</a>}{primary&&<small>Comece pelo livro digital e use os resumos e mapas mentais para revisar.</small>}</div><div className="sp-management"><select value={b.status} aria-label={`Status de ${cleanTitle(b.title)}`} onChange={e=>onUpdate({status:e.target.value})}>{states.map(s=><option key={s}>{s}</option>)}</select><button onClick={()=>onUpdate({status:'Fazendo'})}>▶ Iniciar estudo</button><button onClick={onSchedule}>＋ Agendar</button><button onClick={onEdit}>Editar</button><Remove onRemove={onRemove}/></div></div>
    </div>}
  </article>;
}

export default function SchedulePlanner({userEmail,syncReady}){
  const [blocks,setBlocks]=useSyncedStorage('medplanner-blocks-v1',[]);
  const [settings,setSettings]=useSyncedStorage('medplanner-settings-v1',{start:source.start});
  const [week,setWeek]=useState(1),[view,setView]=useState('Completo'),[status,setStatus]=useState('Todos');
  const [search,setSearch]=useState(''),[area,setArea]=useState('Todas'),[showOptional,setShowOptional]=useState(false);
  const [draft,setDraft]=useState(null),[message,setMessage]=useState(''),[expandedId,setExpandedId]=useState(null),[openSubjects,setOpenSubjects]=useState({});
  const organized=useMemo(()=>prepareScheduleBlocks(blocks,rules).map(b=>withModuleMaterials(b,materials)).filter(b=>!(b.optional&&b.materialsCatalogued&&!b.pdfs.length)),[blocks]);
  const weekCount=Math.max(52,...blocks.map(b=>Number(b.week)||1));
  function importPlan(){const ids=new Set(blocks.map(b=>b.id));setBlocks([...blocks,...source.blocks.filter(b=>!ids.has(b.id))]);setSettings({...settings,start:settings.importedWorkbook?settings.start:source.start,importedWorkbook:source.version});setMessage('Cronograma carregado. Módulos organizados por matéria, com materiais repetidos reunidos e seu progresso preservado.')}
  useEffect(()=>{const owner=['gabrieljacintot@gmail.com','gabriel.jacinto@ufms.br'].includes(userEmail?.toLowerCase());if(owner&&syncReady&&!settings.importedWorkbook)importPlan()},[userEmail,syncReady,settings.importedWorkbook]);
  const weekInfo=source.weeks.find(w=>w.week===week);
  const allCurrent=organized.filter(b=>view==='Completo'||Number(b.week)===week);
  const current=allCurrent.filter(b=>view==='Revisões'?b.kind==='Revisão':b.kind!=='Revisão'&&(showOptional||!b.optional));
  const overview=current.filter(b=>area==='Todas'||b.subject===area);
  const done=overview.filter(b=>b.status==='Feito'),pdfCount=new Set(overview.flatMap(b=>b.pdfs.map(p=>p.id))).size;
  const percent=overview.length?Math.round(done.length/overview.length*100):0;
  const start=weekDate(settings.start||source.start,week),end=new Date(start);end.setDate(end.getDate()+6);
  const subjects=[...new Set(current.map(b=>b.subject))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const filtered=current.filter(b=>(area==='Todas'||b.subject===area)&&`${b.title} ${b.subject} ${b.section}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const visible=filtered.filter(b=>status==='Todos'||b.status===status);
  const grouped=subjects.map(subject=>({subject,items:visible.filter(b=>b.subject===subject)})).filter(g=>g.items.length);
  const primaryByWeek=new Map();for(const b of organized.filter(b=>!b.optional&&b.kind!=='Revisão')){const rows=primaryByWeek.get(Number(b.week))||[];rows.push(b);primaryByWeek.set(Number(b.week),rows)}
  function changeWeek(n){setWeek(Math.max(1,Math.min(weekCount,n)));setArea('Todas');setExpandedId(null)}
  function changeView(value){setView(value);setArea('Todas');setStatus('Todos');setSearch('');setExpandedId(null)}
  function chooseArea(value){setArea(value);setExpandedId(null);if(value!=='Todas')setOpenSubjects(old=>({...old,[`${view}:${value}`]:true}))}
  function update(block,patch){setBlocks(old=>old.map(b=>block.memberIds.includes(b.id)?{...b,...patch,updatedAt:new Date().toISOString()}:b))}
  function edit(block){const raw=blocks.find(b=>b.id===block.id)||block;setDraft({...raw,kind:raw.kind==='Videoaula'?'Leitura':raw.kind})}
  function save(event){event.preventDefault();const row={...draft,pdfUrl:draft.url||'',week:Number(draft.week),id:draft.id||crypto.randomUUID(),status:draft.status||'A fazer',updatedAt:new Date().toISOString()};setBlocks(old=>draft.id?old.map(b=>b.id===draft.id?row:b):[...old,row]);setDraft(null)}
  function scheduleBlock(block){const date=weekDate(settings.start||source.start,Number(block.week));if(block.kind==='Revisão')date.setDate(date.getDate()+5);const events=readSyncedValue('medquiz-academic-calendar-v1',[]);if(events.some(e=>e.id==='block-'+block.id)){setMessage('Esse bloco já está no calendário. Você pode ajustar seu horário por lá.');return}writeSyncedValue('medquiz-academic-calendar-v1',[...events,{id:'block-'+block.id,title:block.title,category:'Estudos',date:dateKey(date),startTime:'08:00',endTime:'09:00',description:`Reserva inicial de uma hora; ajuste conforme seu estudo. ${block.url||''}`,weekly:false,repeatWeekdays:[],completed:false,completedDates:[]}]);setMessage('Bloco agendado às 08h, com reserva inicial de uma hora. Ajuste o horário no calendário.')}
  return <section className="planner-page schedule-page sp-page">
    <header className="sp-page-heading"><div><span className="sp-eyebrow">SEU PLANO DE ESTUDOS</span><h1>Meu cronograma</h1><p>Matérias, PDFs e progresso em um só lugar.</p></div><button className="primary" onClick={()=>setDraft({title:'',area:'',week,url:'',kind:'Leitura',notes:''})}>＋ Novo bloco</button></header>
    {!settings.importedWorkbook&&<div className="schedule-import"><div><b>Seu planejamento está disponível</b><p>52 semanas de estudo com os materiais do Estratégia Med.</p></div><button className="primary" onClick={importPlan}>Carregar meu cronograma</button></div>}
    <nav className="sp-view-tabs" aria-label="Visualização do cronograma">{[['Semana','Minha semana'],['Completo','Todas as matérias'],['Revisões','Revisões']].map(([value,label])=><button key={value} aria-pressed={view===value} onClick={()=>changeView(value)}>{label}</button>)}<small>ESTRATÉGIA MED · PLANO ANUAL</small></nav>
    {message&&<p className="planner-message" role="status">{message}<button aria-label="Fechar aviso" onClick={()=>setMessage('')}>✕</button></p>}
    <div className="sp-workspace">
      <aside className="sp-rail" aria-label="Navegação do plano">
        <section className="sp-rail-section"><div className="sp-rail-title"><h2>{view==='Completo'?'Suas matérias':'Plano de 52 semanas'}</h2><span>{view==='Completo'?subjects.length:weekCount}</span></div>
          {view==='Completo'?<nav className="sp-subject-nav" aria-label="Filtrar matéria"><button className={area==='Todas'?'active':''} onClick={()=>chooseArea('Todas')}><span>Todas as matérias</span><small>{current.length}</small></button>{subjects.map(subject=><button key={subject} className={area===subject?'active':''} onClick={()=>chooseArea(subject)}><i style={{background:colors[subject]||'#7589d0'}}/><span>{subject}</span><small>{current.filter(b=>b.subject===subject).length}</small></button>)}</nav>:<><div className="sp-week-picker"><button disabled={week<=1} onClick={()=>changeWeek(week-1)} aria-label="Semana anterior">‹</button><select aria-label="Selecionar semana" value={week} onChange={e=>changeWeek(Number(e.target.value))}>{Array.from({length:weekCount},(_,i)=><option key={i} value={i+1}>Semana {i+1}</option>)}</select><button disabled={week>=weekCount} onClick={()=>changeWeek(week+1)} aria-label="Próxima semana">›</button></div><div className="sp-week-grid">{Array.from({length:weekCount},(_,i)=>{const n=i+1,rows=primaryByWeek.get(n)||[],complete=rows.length>0&&rows.every(b=>b.status==='Feito');return <button key={n} aria-label={`Semana ${n}${complete?' concluída':''}`} aria-current={n===week?'step':undefined} className={`${n===week?'selected':''} ${complete?'complete':''}`} onClick={()=>changeWeek(n)}>{n}</button>})}</div><div className="sp-week-legend"><span><i/>Selecionada</span><span><i/>Concluída</span></div></>}
        </section>
        {view!=='Completo'&&<details className="sp-rail-section sp-settings"><summary>Preferências do plano <span>⌄</span></summary><label>Início do plano<input type="date" value={settings.start||source.start} onChange={e=>e.target.value&&setSettings({...settings,start:e.target.value})}/></label><small>As datas das semanas acompanham o início do plano. Seus módulos e marcações ficam preservados.</small></details>}
        <div className="sp-rail-note"><span>▤</span><p><b>Seu material, direto no Drive.</b> Abra o PDF, estude no seu ritmo e marque o módulo como concluído.</p></div>
      </aside>
      <div className="sp-main">
        <section className="sp-overview"><div className="sp-overview-heading"><div><span className="sp-eyebrow">{view==='Completo'?'BIBLIOTECA DO PLANO':view==='Revisões'?'CONSOLIDAR PARA AVANÇAR':`${dateLabel(start)} — ${dateLabel(end)}`}</span><h2>{view==='Completo'?(area==='Todas'?'Explore suas matérias':area):view==='Revisões'?`Revisões · Semana ${week}`:`Sua semana ${week}`}</h2><p>{view==='Completo'?(area==='Todas'?'Escolha uma matéria e encontre os módulos dentro dela.':'Livros, resumos e materiais para estudar no seu ritmo.'):`${subjects.length} ${subjects.length===1?'matéria':'matérias'} no seu caminho nesta semana.`}</p></div><div className="sp-progress-ring" style={{'--progress':percent+'%'}} aria-label={`${percent}% concluído`}><b>{percent}<small>%</small></b></div></div>
          <div className="sp-overview-stats"><div><span>Módulos concluídos</span><b>{done.length}<small> / {overview.length}</small></b></div><div><span>PDFs disponíveis</span><b>{pdfCount}</b></div><div><span>Módulos para estudar</span><b>{overview.length-done.length}</b></div></div>
        </section>
        {weekInfo&&view!=='Completo'&&<details className="sp-week-routine"><summary>Ver o roteiro e as revisões da semana <span>↗</span></summary><div className="sp-focus">{Object.entries(weekInfo.areas).map(([group,description])=><div key={group}><b>{group}</b><span>{description.split('\n').join(' · ')}</span></div>)}</div><p>{weekInfo.routine}</p></details>}
        <div className="sp-filter-bar"><label className="sp-search"><span aria-hidden="true">⌕</span><input aria-label="Buscar módulo" placeholder="Buscar módulo ou assunto…" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button aria-label="Limpar busca" onClick={()=>setSearch('')}>✕</button>}</label>{view!=='Revisões'&&<label className="sp-optional"><input type="checkbox" checked={showOptional} onChange={e=>setShowOptional(e.target.checked)}/>Complementos</label>}</div>
        {view!=='Completo'&&subjects.length>1&&<nav className="sp-subject-pills" aria-label="Matérias da semana">{['Todas',...subjects].map(subject=><button aria-pressed={area===subject} key={subject} onClick={()=>chooseArea(subject)}>{subject==='Todas'?'Todas as matérias':subject}</button>)}</nav>}
        <div className="sp-status-bar"><nav aria-label="Situação dos módulos">{['Todos',...states].map(s=><button key={s} aria-pressed={status===s} onClick={()=>setStatus(s)}>{s}<small>{s==='Todos'?filtered.length:filtered.filter(b=>b.status===s).length}</small></button>)}</nav><span>{visible.length} {visible.length===1?'módulo':'módulos'}</span></div>
        <div className="sp-groups">{grouped.map(({subject,items})=>{const key=`${view}:${subject}`,open=openSubjects[key]??(view!=='Completo'||area!=='Todas'||Boolean(search)),sections=[...new Set(items.map(b=>b.section))];return <section className="sp-subject" key={subject} style={{'--subject-color':colors[subject]||'#7589d0'}}><button className="sp-subject-heading" aria-expanded={open} aria-controls={`subject-${subject.replace(/\s/g,'-')}`} onClick={()=>setOpenSubjects(old=>({...old,[key]:!open}))}><span className="sp-subject-mark" aria-hidden="true">▦</span><div><h2>{subject}</h2><span>{items.length} {items.length===1?'módulo':'módulos'}<i>·</i>{new Set(items.flatMap(b=>b.pdfs.map(p=>p.id))).size} PDFs disponíveis</span></div><span className="sp-folder-count">{items.filter(b=>b.status==='Feito').length}/{items.length}</span><span className="sp-folder-chevron" aria-hidden="true">{open?'⌃':'⌄'}</span></button>{open&&<div className="sp-subject-content" id={`subject-${subject.replace(/\s/g,'-')}`}>{sections.map(section=><div className="sp-subsection" key={section}>{(sections.length>1||!['Módulos','Revisão da semana'].includes(section))&&<h3 className="sp-subsection-label">{section}<span>{items.filter(b=>b.section===section).length}</span></h3>}{items.filter(b=>b.section===section).map(b=><ModuleRow key={b.id} block={b} expanded={expandedId===b.id} onToggle={()=>setExpandedId(expandedId===b.id?null:b.id)} onUpdate={patch=>update(b,patch)} onEdit={()=>edit(b)} onSchedule={()=>scheduleBlock(b)} onRemove={()=>setBlocks(old=>old.filter(item=>!b.memberIds.includes(item.id)))}/>)}</div>)}</div>}</section>})}</div>
        {!visible.length&&<div className="planner-empty"><h2>Nenhum módulo nesta seleção</h2><p>Tente outra matéria, semana ou situação para encontrar seu estudo.</p><button className="sp-reset" onClick={()=>{setArea('Todas');setStatus('Todos');setSearch('')}}>Limpar filtros</button></div>}
      </div>
    </div>
    {draft&&<RecordModal title={draft.id?'Editar bloco':'Novo bloco de estudo'} onClose={()=>setDraft(null)}><form onSubmit={save}>{[['title','Tema'],['area','Especialidade'],['week','Semana'],['url','Link do PDF']].map(([name,label])=><label key={name}>{label}<input required={['title','week'].includes(name)} type={name==='week'?'number':name==='url'?'url':'text'} min={name==='week'?1:0} step={1} value={draft[name]??''} onChange={e=>setDraft({...draft,[name]:e.target.value})}/></label>)}<label>Tipo<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value})}>{['Módulo','Complemento','Revisão','Leitura','Questões externas'].map(k=><option key={k}>{k}</option>)}</select></label><label>Observações<textarea value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><button className="primary">Salvar bloco</button></form></RecordModal>}
  </section>;
}
