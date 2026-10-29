export const normalizeTitle = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^\s*\d+[.,\s-]+/, '').replace(/\.mp4$/i, '').replace(/[^a-z0-9]+/g, ' ').trim();
const legacySamples = new Set(['estrategia-iam1','estrategia-sca1','estrategia-dm']);
const labels = {CARDIOLOGIA:'Cardiologia',NEFROLOGIA:'Nefrologia',NEUROLOGIA:'Neurologia',PNEUMOLOGIA:'Pneumologia',ENDÓCRINO:'Endocrinologia',INFECTOLOGIA:'Infectologia',GASTROENTEROLOGIA:'Gastroenterologia',HEPATOLOGIA:'Hepatologia',HEMATOLOGIA:'Hematologia',REUMATOLOGIA:'Reumatologia',DERMATOLOGIA:'Dermatologia',PSIQUIATRIA:'Psiquiatria',GINECOLOGIA:'Ginecologia',OBSTETRÍCIA:'Obstetrícia',PEDIATRIA:'Pediatria'};

export function classifyBlock(block) {
  const title=normalizeTitle(block.title), area=(block.area||'').toUpperCase();
  if(block.kind==='Revisão')return {subject:'Revisões',section:'Revisão da semana'};
  if(block.group==='MFC'||['PREVENTIVA','MFC','MEDICINA DE FAMÍLIA E COMUNIDADE'].includes(area)){
    let section='Saúde coletiva';
    if(area==='ATUALIZAÇÕES')section='Atualizações';
    else if(/multimidia|radiologia/.test(normalizeTitle(area)))section='Multimídia';
    else if(/atencao primaria|medicina de familia|saude do idoso/.test(title))section='Atenção primária e MFC';
    else if(/medidas de saude|estatistica|testes diagnosticos|epidemi/.test(title))section='Epidemiologia e bioestatística';
    else if(/sus|sistema unico|politicas|descentralizacao|informacao em saude/.test(title))section='SUS e políticas de saúde';
    return {subject:'MFC e Preventiva',section};
  }
  if(block.group==='CX'||['CIRURGIA','CIRURGIA GERAL','ORTOPEDIA','OFTALMOLOGIA','OTORRINOLARINGOLOGIA'].includes(area)||/cirurgia bariatrica/.test(title)){
    const sections={ORTOPEDIA:'Ortopedia',OFTALMOLOGIA:'Oftalmologia',OTORRINOLARINGOLOGIA:'Otorrinolaringologia','MULTIMÍDIA E RADIOLOGIA':'Multimídia'};
    const section=sections[area]||(/trauma|queimadura/.test(title)?'Trauma e urgências':/abdome agudo|urgencias abdominais/.test(title)?'Abdome agudo':/urologia/.test(title)?'Urologia':/infantil/.test(title)?'Cirurgia pediátrica':'Cirurgia geral');
    return {subject:'Cirurgia',section};
  }
  if(block.group==='PED'||area==='PEDIATRIA')return {subject:'Pediatria',section:area==='ATUALIZAÇÕES'?'Atualizações':'Módulos'};
  if(area==='ATUALIZAÇÕES'||area==='MULTIMÍDIA E RADIOLOGIA'){
    let subject='Clínica médica';
    if(block.group==='GO')subject=/ginec|laqueadura|anticoncepc|ovarios|colo|climaterio|hormonal/.test(title)?'Ginecologia':'Obstetrícia';
    else if(/hipertens|pressao arterial|acls|endocardite|duke|ecocardiograma/.test(title))subject='Cardiologia';
    else if(/gina|gold|asma|sdra|sara/.test(title))subject='Pneumologia';
    else if(/diabet|sbd/.test(title))subject='Endocrinologia';
    else if(/hepatite/.test(title))subject='Hepatologia';
    else if(/hiv|iltb|oropouche|mpox/.test(title))subject='Infectologia';
    else if(/nefro/.test(title))subject='Nefrologia';
    else if(/gastro/.test(title))subject='Gastroenterologia';
    else if(/hemato/.test(title))subject='Hematologia';
    else if(/radiologia|pocus|multimidia/.test(title))subject='Radiologia e multimídia';
    return {subject,section:area==='ATUALIZAÇÕES'?'Atualizações':'Multimídia'};
  }
  return {subject:labels[area]||block.area||'Outros estudos',section:'Módulos'};
}

const canonicalUrl=value=>{try{const u=new URL(value);return u.origin+u.pathname.replace(/\/$/,'')}catch{return value||''}};
export function prepareScheduleBlocks(blocks,rules={}){
  const byId=new Map(blocks.map(block=>[block.id,block])), groups=new Map();
  for(const block of blocks){
    if(legacySamples.has(block.id))continue;
    let alias=rules.moduleAliases?.[block.id];
    if(alias&&(block.url!==rules.sourceUrls?.[block.id]||(byId.has(alias)&&byId.get(alias).url!==rules.sourceUrls?.[alias])))alias=null;
    const urls=[block.url,block.secondaryUrl].filter(Boolean).map(canonicalUrl).sort();
    const key=alias||((block.kind!=='Revisão'&&urls.length)?'url:'+urls.join('|'):block.id);
    const canonicalKey=alias&&byId.has(alias)?'url:'+ [byId.get(alias).url,byId.get(alias).secondaryUrl].filter(Boolean).map(canonicalUrl).sort().join('|'):key;
    const group=groups.get(canonicalKey)||[];group.push(block);groups.set(canonicalKey,group);
  }
  const priority={'Feito':4,'Fazendo':3,'A fazer':2,'Pulados':1};
  return [...groups.values()].map(members=>{
    const base=members.find(b=>!rules.moduleAliases?.[b.id])||members[0];
    const status=[...members].sort((a,b)=>(priority[b.status]||0)-(priority[a.status]||0))[0].status||'A fazer';
    const links=[...new Set(members.flatMap(b=>[b.url,b.secondaryUrl]).filter(Boolean))];
    return {...base,status,memberIds:members.map(b=>b.id),materialUrls:links,...classifyBlock(base)};
  });
}
