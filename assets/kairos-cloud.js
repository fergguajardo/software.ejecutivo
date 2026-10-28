/* Software Ejecutivo: authenticated autosave. Public browser key only. */
(() => {
  'use strict';
  const URL = 'https://kqnfrsnictmpkfzhqvny.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_pVcwMuEe1Brkk0uGSqru7A_oiAHHUpc';
  const gate = $('auth-gate'), app = $('kairos-app');
  const OWNER_KEY = KEY + '-workspace-owner';
  let client, user = null, ready = false, loading = false, applying = false;
  let stamp = null, dirty = false, pending = null, saving = false, timer;
  let baseline = '', conflict = false;
  const metaKey = () => KEY + '-cloud-v1-' + user.id;
  const recoveryKey = () => KEY + '-cloud-recovery-' + user.id;
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
  const signature = value => JSON.stringify(canonical({boards:value.boards, redes:value.redes}));
  const recovery = el('button','cloud-status','Descargar copia pendiente');
  recovery.type='button';recovery.hidden=true;
  document.querySelector('.backup-tools').append(recovery);
  function download(value) {
    const url=window.URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='software-ejecutivo-respaldo-'+Date.now()+'.json';a.click();
    setTimeout(()=>window.URL.revokeObjectURL(url),1000);
  }
  recovery.onclick=()=>{try {const v=JSON.parse(localStorage.getItem(recoveryKey())||'null');if(v)download(v);} catch {toast('No se pudo recuperar el respaldo.');}};
  function preserveLocal(value) {
    try {localStorage.setItem(recoveryKey(),JSON.stringify(value));recovery.hidden=false;return true;}
    catch {return false;}
  }
  function status(text) {
    $('cloud-status').textContent=text;$('cloud-status').hidden=false;
    $('cloud-status').style.display='';$('saved').textContent=text;
  }
  const message = text => {$('auth-message').textContent=text;};
  function lock(text) {
    ready=false;app.hidden=true;app.inert=true;gate.hidden=false;
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    $('auth-form').hidden=false;$('auth-conflict').hidden=true;
    if(text)message(text);
  }
  function unlock() {ready=true;app.hidden=false;app.inert=false;gate.hidden=true;}
  function persist() {
    try {
      localStorage.setItem(metaKey(),JSON.stringify({stamp,dirty,snapshot:dirty?pending:null}));
      localStorage.setItem(OWNER_KEY,user.id);
      return true;
    } catch {return false;}
  }
  function apply(value) {
    if(value?.format!=='kairos-backup')throw Error('Formato de nube inválido');
    const next=prepareKairosImport(value);
    applying=true;
    try {restoreKairosBackup(next,true);} finally {applying=false;}
    baseline=signature(kairosBackup());
  }
  function freshWorkspace() {
    const tasks={id:uid(),name:'Procesos',data:initial()};
    const balance={id:uid(),name:'Sistemas',data:{version:1,cards:[],events:[],balance:JSON.parse(JSON.stringify(BALANCE_SEED))}};
    return {format:'kairos-backup',version:1,active:tasks.id,boards:[tasks,balance],redes:{titulo:'Redes',categorias:[],calendarios:[]}};
  }
  function showConflict() {
    conflict=true;lock('Hay otra versión en la nube. Descargá tus cambios pendientes antes de cargarla.');
    $('auth-form').hidden=true;$('auth-conflict').hidden=false;$('auth-conflict-load').disabled=true;
    status('Pendiente · hay otra versión');
  }
  function changed() {
    if(!ready||applying||conflict)return;
    const snapshot=kairosBackup();
    if(signature(snapshot)===baseline&&!dirty&&!saving){status('Guardado en Supabase');return;}
    pending=snapshot;dirty=true;
    status(persist()?'Pendiente de sincronización':'Pendiente · sin respaldo local');
    clearTimeout(timer);timer=setTimeout(flush,650);
  }
  async function readRemote() {
    const result=await client.from('kairos_state').select('data,updated_at').eq('user_id',user.id).maybeSingle();
    if(result.error)throw result.error;
    return result.data;
  }
  async function flush() {
    clearTimeout(timer);
    if(!ready||!user||!dirty||saving||conflict)return false;
    saving=true;status('Guardando…');
    const snapshot=pending,expected=stamp,owner=user.id;
    try {
      const nextStamp=new Date(Math.max(Date.now(),(Date.parse(stamp)||0)+1)).toISOString();
      let result;
      if(expected)result=await client.from('kairos_state').update({data:snapshot,updated_at:nextStamp}).eq('user_id',owner).eq('updated_at',expected).select('updated_at').maybeSingle();
      else result=await client.from('kairos_state').insert({user_id:owner,data:snapshot,updated_at:nextStamp}).select('updated_at').single();
      if(!user||user.id!==owner)return false;
      if(result.error){if(result.error.code==='23505'){showConflict();return false;}throw result.error;}
      if(!result.data){showConflict();return false;}
      stamp=result.data.updated_at;baseline=signature(snapshot);
      if(pending===snapshot){dirty=false;pending=null;}
      persist();status(dirty?'Pendiente de sincronización':'Guardado en Supabase');
      return !dirty;
    } catch {status('Sin guardar en la nube · Reintentar');return false;}
    finally {saving=false;if(dirty&&ready&&!conflict){clearTimeout(timer);timer=setTimeout(flush,5000);}}
  }
  async function connect(session) {
    if(loading||ready)return;
    if(!session){lock('Ingresá con tu cuenta de Software Ejecutivo.');return;}
    loading=true;user=session.user;message('Conectando tus datos…');
    dirty=false;pending=null;stamp=null;conflict=false;recovery.hidden=true;
    try {
      const verified=await client.auth.getUser();
      if(verified.error||verified.data.user?.id!==user.id)throw Error('Sesión no válida');
      let meta=null,localOwner=null;
      try {meta=JSON.parse(localStorage.getItem(metaKey())||'null');localOwner=localStorage.getItem(OWNER_KEY);recovery.hidden=!localStorage.getItem(recoveryKey());}catch{}
      const remote=await readRemote();
      if(meta?.dirty&&meta.snapshot){
        pending=meta.snapshot;dirty=true;stamp=meta.stamp;
        if(remote&&signature(remote.data)===signature(pending)){
          apply(remote.data);stamp=remote.updated_at;dirty=false;pending=null;persist();
        }else if(remote&&remote.updated_at!==stamp||!remote&&stamp){
          showConflict();return;
        }else apply(pending);
      }else if(remote){
        // Preserve demo edits on first cloud connection before adopting server state.
        if(!localOwner&&!preserveLocal(kairosBackup()))throw Error('No se pudo conservar la demo local');
        apply(remote.data);stamp=remote.updated_at;persist();
      }else{
        // Never copy another account's cached workspace into a new account.
        if(localOwner&&localOwner!==user.id)apply(freshWorkspace());
        pending=kairosBackup();dirty=true;stamp=null;persist();
      }
      unlock();status(dirty?'Pendiente de sincronización':'Guardado en Supabase');
      if(dirty)await flush();
    }catch(error){
      const setup=['PGRST205','42P01','42501'].includes(error.code);
      lock(setup?'Falta completar la tabla y los permisos en Supabase. Ejecutá supabase/setup.sql y volvé a ingresar.':'No pudimos cargar tus datos. Tu copia local se conserva. Revisá la conexión e ingresá nuevamente.');
    }finally{loading=false;}
  }
  window.KairosCloud={changed,flush,lock};
  window.REDES.onSave=changed;
  $('cloud-status').onclick=flush;
  $('auth-conflict-download').onclick=()=>{download(pending||kairosBackup());$('auth-conflict-load').disabled=false;};
  $('auth-conflict-load').onclick=async()=>{
    try {
      const remote=await readRemote();
      if(!remote)throw Error('No existe versión remota');
      preserveLocal(pending||kairosBackup());apply(remote.data);stamp=remote.updated_at;
      dirty=false;pending=null;conflict=false;persist();unlock();status('Guardado en Supabase');
    }catch{message('No se pudo cargar la nube. Tu copia pendiente se conserva.');}
  };
  $('auth-logout').onclick=async()=>{
    document.activeElement?.blur();changed();await flush();
    if(dirty||saving){toast('Hay cambios pendientes. Esperá a que se guarden antes de salir.');return;}
    lock('Cerrando sesión…');
    const result=await client.auth.signOut({scope:'local'});
    if(result.error){message('No se pudo cerrar la sesión. Recargá y reintentá.');return;}
    user=null;recovery.hidden=true;message('Sesión cerrada. Tus datos están guardados en Supabase.');
  };
  $('auth-form').onsubmit=async event=>{
    event.preventDefault();if(!client){message('No se cargó la conexión. Recargá la página.');return;}
    $('auth-submit').disabled=true;message('Ingresando…');
    try {
      const result=await client.auth.signInWithPassword({email:$('auth-email').value.trim(),password:$('auth-password').value});
      $('auth-password').value='';
      if(result.error){message('No se pudo ingresar. Revisá tu correo, contraseña y conexión.');return;}
      await connect(result.data.session);
    }catch{message('No se pudo conectar. Probá nuevamente.');}
    finally{$('auth-submit').disabled=false;}
  };
  window.addEventListener('online',()=>{if(ready)flush();});
  window.addEventListener('offline',()=>{if(ready)status('Sin conexión · los cambios quedarán pendientes');});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&ready){changed();flush();}});
  async function start() {
    lock('Comprobando el acceso…');
    try {
      if(!window.supabase?.createClient)throw Error('SDK no disponible');
      client=window.supabase.createClient(URL,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      client.auth.onAuthStateChange((event,session)=>{
        if(event==='SIGNED_OUT'||!session&&event==='TOKEN_REFRESHED'||user&&session&&session.user.id!==user.id){
          if(user&&dirty)persist();user=null;lock('Ingresá con tu cuenta de Software Ejecutivo.');
        }
      });
      const result=await client.auth.getSession();if(result.error)throw result.error;
      await connect(result.data.session);
    }catch{lock('No se pudo iniciar la conexión. Revisá internet y recargá la página.');}
  }
  start();
})();
