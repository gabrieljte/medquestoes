import { useEffect, useState } from 'react';
import OrganizationShell from './OrganizationShell.jsx';
import AuthScreen from './AuthScreen.jsx';
import { supabase } from './supabase.js';
import { useSyncedStorage } from './syncedStorage.js';
const areas=['Cardiologia','Neurologia','Pneumologia','Endocrinologia','Clínica Médica','Cirurgia Geral','Ortopedia','Pediatria','Ginecologia e Obstetrícia','Medicina de Família e Comunidade','Psiquiatria','Infectologia','Oncologia','Reumatologia','Nefrologia','Hematologia','Outros'];
export default function PlannerApp(){
  const [session,setSession]=useState(null),[ready,setReady]=useState(false),[offline,setOffline]=useState(false);
  const [theme,setTheme]=useSyncedStorage('medquestoes-theme','dark');
  useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
  useEffect(()=>{
    if(!supabase){setReady(true);return}
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(alive){setSession(data?.session||null);setReady(true)}}).catch(()=>{if(alive)setReady(true)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{if(alive){setSession(next);setReady(true)}});
    return ()=>{alive=false;subscription.unsubscribe()};
  },[]);
  if(!ready)return <div className="loading-page">Abrindo seu espaço de estudos…</div>;
  if(!session&&!offline)return <AuthScreen onOffline={()=>setOffline(true)}/>;
  return <OrganizationShell session={session} theme={theme} setTheme={setTheme} areas={areas} onLogin={()=>setOffline(false)}/>;
}
