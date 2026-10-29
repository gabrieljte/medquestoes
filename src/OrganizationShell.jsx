import { useState } from 'react';
import Calendar from './Calendar.jsx';
import Library from './Library.jsx';
import CongressRadar from './CongressRadar.jsx';
import StudyOrganizer from './StudyOrganizer.jsx';
import StudySchedule from './SchedulePlanner.jsx';
import { ErrorNotebook, ExamPlanner } from './StudyRecords.jsx';
import { useAccountSync } from './accountSync.js';
import { supabase } from './supabase.js';
import { useSyncedStorage } from './syncedStorage.js';
import '../app/planner.css';
import '../app/workspace.css';

const sections = [['cronograma','📋','Cronograma'],['calendario','📅','Calendário'],['provas','🎯','Minhas provas'],['erros','📒','Caderno de erros'],['organizacao','🗂️','Plano de estudos'],['biblioteca','📚','Biblioteca'],['curriculo','🎓','Currículo médico']];
export default function OrganizationShell({session,theme,setTheme,areas,onLogin}) {
  const [page,setPage] = useState('cronograma');
  const [collapsed,setCollapsed] = useSyncedStorage('medquestoes-sidebar-collapsed',false);
  const sync = useAccountSync(session?.user?.id);
  return <main className={`app-shell planner-shell theme-${theme} ${collapsed?'sidebar-collapsed':''}`}>
    <aside className="nav-sidebar"><button className="sidebar-toggle" onClick={()=>setCollapsed(!collapsed)} aria-label="Alternar menu">{collapsed?'›':'‹'}</button>
      <div className="brand"><span className="logo">✚</span><div><b>MedPlanner</b><small>Seu espaço de organização</small></div></div>
      <nav aria-label="Menu principal">{sections.map(([id,icon,name])=><button key={id} title={name} className={page===id?'active':''} onClick={()=>setPage(id)}><span>{icon}</span><b>{name}</b></button>)}</nav>
      <button className="theme-toggle" onClick={()=>setTheme(theme==='dark'?'light':'dark')}><span>{theme==='dark'?'🌙':'☀️'}</span><b>{theme==='dark'?'Tema escuro':'Tema claro'}</b></button>
      <div className="account-box"><button className="db-status" onClick={sync.retry}>{!session?'Modo local':sync.syncing?'Sincronizando…':sync.error?'Falha ao sincronizar · tentar novamente':'✓ Sincronizado'}</button>{sync.error&&<small role="alert">{sync.error}</small>}<small>{session?.user?.email||'Neste dispositivo'}</small><button onClick={()=>session?supabase.auth.signOut():onLogin()}>{session?'Sair':'Entrar'}</button></div>
    </aside>
    <div className="app-content"><header className="academy-topbar"><div className="academy-breadcrumb"><span>{sections.find(s=>s[0]===page)?.[1]}</span><div><small>MEDPLANNER / MEU ESPAÇO</small><b>{sections.find(s=>s[0]===page)?.[2]}</b></div></div><button className="planner-theme" onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label="Alternar tema">{theme==='dark'?'☀':'☾'}</button></header>
      {page==='cronograma'?<StudySchedule userEmail={session?.user?.email} syncReady={Boolean(sync.lastSyncedAt)&&!sync.syncing&&!sync.error}/>:page==='calendario'?<Calendar/>:page==='provas'?<ExamPlanner/>:page==='erros'?<ErrorNotebook/>:page==='biblioteca'?<Library areas={areas} userId={session?.user?.id}/>:page==='curriculo'?<CongressRadar/>:<StudyOrganizer/>}
    </div>
  </main>;
}
