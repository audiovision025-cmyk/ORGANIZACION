const SUPABASE_URL='https://jcnyvqzgjqqdiwuinula.supabase.co';
const SUPABASE_KEY='sb_publishable__ImxqupFGPBz1t7OfMzR9Q_tiGhL_Ua';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const STORAGE_KEY='zapatazo_programas_v1';

const checks=[
  'programa_editado','programa_miniatura','programa_publicado',
  'promo_hecho','promo_miniatura','promo_publicado',
  'redes_recortes','redes_miniaturas','redes_instagram','redes_youtube'
];

const labelsPendientes={
  programa_editado:'edición del programa',
  programa_miniatura:'miniatura del programa',
  programa_publicado:'publicar programa',
  promo_hecho:'hacer promo',
  promo_miniatura:'miniatura del promo',
  promo_publicado:'publicar promo',
  redes_recortes:'recortes para redes',
  redes_miniaturas:'miniaturas de recortes',
  redes_instagram:'subir a Instagram',
  redes_youtube:'subir a YouTube'
};

let programas=[];
let repeticiones=[];
let mesActual=new Date();

const $=id=>document.getElementById(id);

const WRITE_URL='https://jcnyvqzgjqqdiwuinula.supabase.co/functions/v1/zapatazo-write';
const WRITE_TOKEN='zapatazo-write-2026-v1';

async function writeViaFunction(action,payload={}){
  const response=await fetch(WRITE_URL,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=UTF-8'},
    body:JSON.stringify({token:WRITE_TOKEN,action,...payload})
  });

  let result={};
  try{ result=await response.json(); }catch(_){}

  if(!response.ok || result.error){
    throw new Error(result.error || ('HTTP '+response.status));
  }

  return result;
}

function estado(texto,ok=false){
  const el=$('estadoConexion');
  el.textContent=texto;
  el.style.color=ok?'#80d6a3':'#f0c96f';
}

async function cargarDatos(){
  const [programasRes,repeticionesRes]=await Promise.all([
    db.from('programas').select('*').order('fecha',{ascending:false}),
    db.from('repeticiones').select('*').order('fecha',{ascending:false})
  ]);

  if(programasRes.error || repeticionesRes.error){
    console.error(programasRes.error || repeticionesRes.error);
    estado('Error al conectar con la base compartida.');
    return false;
  }

  programas=programasRes.data||[];
  repeticiones=repeticionesRes.data||[];

  estado('● Datos compartidos sincronizados',true);
  renderTodo();
  return true;
}

async function migrarLocalSiHaceFalta(){
  const locales=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  if(!locales.length || programas.length)return;

  const limpios=locales.map(p=>{
    const x={};
    ['id','nombre','fecha','hora','canal','observaciones'].concat(checks).forEach(k=>{
      x[k]=p[k]??(checks.includes(k)?false:null);
    });
    return x;
  });

  const res=await db.from('programas').upsert(limpios);
  if(!res.error){
    localStorage.removeItem(STORAGE_KEY);
    await cargarDatos();
  }
}

function progreso(p){
  return Math.round(checks.filter(k=>!!p[k]).length/checks.length*100);
}

function pendientes(p){
  return checks.filter(k=>!p[k]).map(k=>labelsPendientes[k]);
}

function repeticionCompleta(r){
  return !!r.publicado && !!r.promo_publicada;
}

function pendientesRepeticion(r){
  const faltan=[];
  if(!r.publicado)faltan.push('programa subido');
  if(!r.promo_publicada)faltan.push('promo publicada');
  return faltan;
}

function formatoFecha(f){
  if(!f)return '';
  const [y,m,d]=f.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-AR',{
    day:'2-digit',month:'2-digit',year:'numeric'
  });
}

function renderProgresoGeneral(){
  const totalItems=(programas.length*checks.length)+(repeticiones.length*2);
  const completosProgramas=programas.reduce((acc,p)=>acc+checks.filter(k=>!!p[k]).length,0);
  const completosRepeticiones=repeticiones.reduce((acc,r)=>acc+(r.publicado?1:0)+(r.promo_publicada?1:0),0);
  const completos=completosProgramas+completosRepeticiones;
  const porcentaje=totalItems?Math.round(completos/totalItems*100):0;

  $('progresoGeneral').innerHTML=
    '<div class="overall-progress-top">'+
      '<span>AVANCE TOTAL</span>'+
      '<strong>'+porcentaje+'%</strong>'+
    '</div>'+
    '<div class="overall-progress-bar"><div style="width:'+porcentaje+'%"></div></div>';
}

function renderStats(){
  const completosProgramas=programas.filter(p=>progreso(p)===100).length;
  const completasRepeticiones=repeticiones.filter(repeticionCompleta).length;
  const completos=completosProgramas+completasRepeticiones;
  const total=programas.length+repeticiones.length;

  $('stats').innerHTML=
    '<div class="stat"><strong>'+programas.length+'</strong><span>Programas</span></div>'+
    '<div class="stat"><strong>'+repeticiones.length+'</strong><span>Repetidos</span></div>'+
    '<div class="stat"><strong>'+completos+'</strong><span>Completos</span></div>'+
    '<div class="stat"><strong>'+(total-completos)+'</strong><span>Con pendientes</span></div>';
}

function resumenGrupo(p,keys){
  return keys.filter(k=>p[k]).length+'/'+keys.length+' completado';
}

function renderProgramas(){
  const q=$('buscar').value.trim().toLowerCase();
  const filtro=$('filtroEstado').value;

  let lista=[...programas].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));

  lista=lista.filter(p=>
    !q ||
    (p.nombre||'').toLowerCase().includes(q) ||
    (p.canal||'').toLowerCase().includes(q)
  );

  if(filtro==='pendientes')lista=lista.filter(p=>progreso(p)<100);
  if(filtro==='completos')lista=lista.filter(p=>progreso(p)===100);

  if(!lista.length){
    $('listaProgramas').innerHTML='<div class="empty-state">No hay programas para mostrar.</div>';
    return;
  }

  $('listaProgramas').innerHTML=lista.map(p=>{
    const pr=progreso(p);

    return '<article class="card">'+
      '<div class="card-top">'+
        '<div>'+
          '<h3>'+escapeHtml(p.nombre)+'</h3>'+
          '<div class="meta">'+
            formatoFecha(p.fecha)+
            (p.hora?' · '+p.hora+' hs':'')+
            (p.canal?' · '+escapeHtml(p.canal):'')+
          '</div>'+
        '</div>'+
        '<span class="badge '+(pr===100?'ok':'pending')+'">'+(pr===100?'Completo':pr+'%')+'</span>'+
      '</div>'+
      '<div class="progress"><div style="width:'+pr+'%"></div></div>'+
      '<div class="status-grid">'+
        '<div class="status-box"><b>Programa</b><div class="mini">'+resumenGrupo(p,['programa_editado','programa_miniatura','programa_publicado'])+'</div></div>'+
        '<div class="status-box"><b>Promo</b><div class="mini">'+resumenGrupo(p,['promo_hecho','promo_miniatura','promo_publicado'])+'</div></div>'+
        '<div class="status-box"><b>Redes</b><div class="mini">'+resumenGrupo(p,['redes_recortes','redes_miniaturas','redes_instagram','redes_youtube'])+'</div></div>'+
      '</div>'+
      (p.observaciones?'<div class="mini" style="margin-top:12px"><b>Obs.:</b> '+escapeHtml(p.observaciones)+'</div>':'')+
      '<div class="actions"><button onclick="editarPrograma(\''+escapeAttr(p.id)+'\')">Abrir / editar</button></div>'+
    '</article>';
  }).join('');
}

function renderCalendario(){
  const y=mesActual.getFullYear();
  const m=mesActual.getMonth();

  $('mesTitulo').textContent=mesActual.toLocaleDateString('es-AR',{
    month:'long',year:'numeric'
  });

  const first=new Date(y,m,1);
  const last=new Date(y,m+1,0);

  let start=first.getDay();
  start=start===0?6:start-1;

  let html='';

  for(let i=0;i<start;i++){
    html+='<div class="day empty"></div>';
  }

  for(let d=1;d<=last.getDate();d++){
    const iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');

    const eventosProgramas=programas
      .filter(p=>p.fecha===iso)
      .map(p=>({tipo:'programa',hora:p.hora||'',data:p}));

    const eventosRepeticiones=repeticiones
      .filter(r=>r.fecha===iso)
      .map(r=>({tipo:'repeticion',hora:r.hora||'',data:r}));

    const eventos=eventosProgramas
      .concat(eventosRepeticiones)
      .sort((a,b)=>(a.hora||'99:99').localeCompare(b.hora||'99:99'));

    html+='<div class="day"><div class="day-num">'+d+'</div>';

    html+=eventos.map(ev=>{
      if(ev.tipo==='repeticion'){
        const r=ev.data;
        const completa=repeticionCompleta(r);
        const faltan=pendientesRepeticion(r);

        const detalle=completa
          ? '<div class="event-status repetition-done">✓ Repetición completa</div>'
          : '<div class="event-status repetition-pending"><b>Falta:</b> '+faltan.map(escapeHtml).join(', ')+'</div>';

        return '<div class="event-card repetition '+(completa?'done':'')+'" onclick="editarRepeticion(\''+escapeAttr(r.id)+'\')">'+
          '<div class="event-type">PROGRAMA REPETIDO</div>'+
          '<div class="event-title">'+
            (r.hora?'<span class="event-time">'+r.hora+'</span>':'')+
            escapeHtml(r.programa_nombre)+
          '</div>'+
          detalle+
        '</div>';
      }

      const p=ev.data;
      const completo=progreso(p)===100;
      const faltan=pendientes(p);

      const detalle=completo
        ? '<div class="event-status complete">✓ Todo completo</div>'
        : '<div class="event-status pending"><b>Falta:</b> '+faltan.map(escapeHtml).join(', ')+'</div>';

      return '<div class="event-card '+(completo?'complete':'')+'" onclick="editarPrograma(\''+escapeAttr(p.id)+'\')">'+
        '<div class="event-title">'+
          (p.hora?'<span class="event-time">'+p.hora+'</span>':'')+
          escapeHtml(p.nombre)+
        '</div>'+
        (p.observaciones?'<div class="event-comment"><b>Comentario:</b> '+escapeHtml(p.observaciones)+'</div>':'')+
        (p.canal?'<div class="event-channel">'+escapeHtml(p.canal)+'</div>':'')+
        detalle+
      '</div>';
    }).join('');

    html+='</div>';
  }

  $('calendarGrid').innerHTML=html;
}

function renderTodo(){
  renderProgresoGeneral();
  renderStats();
  renderProgramas();
  renderCalendario();
}

function aplicarModoRepetido(repetido,bloquearSelector=false){
  $('programaRepetido').checked=repetido;
  $('programaRepetido').disabled=bloquearSelector;

  $('camposProgramaNormal').classList.toggle('hidden',repetido);
  $('camposProgramaRepetido').classList.toggle('hidden',!repetido);
  $('campoCanal').classList.toggle('hidden',repetido);

  if(repetido){
    $('tipoRegistro').value='repeticion';
    $('modalTitle').textContent=$('programaId').value?'Editar programa repetido':'Nuevo programa repetido';
    $('guardarPrograma').textContent='Guardar repetido';
    $('guardarPrograma').classList.add('save-repeat');
  }else{
    $('tipoRegistro').value='programa';
    $('modalTitle').textContent=$('programaId').value?'Editar programa':'Nuevo programa';
    $('guardarPrograma').textContent='Guardar';
    $('guardarPrograma').classList.remove('save-repeat');
  }
}

function limpiarForm(){
  $('formPrograma').reset();
  $('programaId').value='';
  $('tipoRegistro').value='programa';
  $('programaRepetido').disabled=false;
  $('eliminar').classList.add('hidden');
  aplicarModoRepetido(false,false);
}

function abrirNuevo(){
  limpiarForm();

  const h=new Date();
  $('fecha').value=
    h.getFullYear()+'-'+
    String(h.getMonth()+1).padStart(2,'0')+'-'+
    String(h.getDate()).padStart(2,'0');

  $('modalPrograma').showModal();
}

window.editarPrograma=function(id){
  const p=programas.find(x=>x.id===id);
  if(!p)return;

  limpiarForm();

  $('programaId').value=p.id;
  $('tipoRegistro').value='programa';

  aplicarModoRepetido(false,true);

  $('nombre').value=p.nombre||'';
  $('fecha').value=p.fecha||'';
  $('hora').value=p.hora||'';
  $('canal').value=p.canal||'';
  $('observaciones').value=p.observaciones||'';

  checks.forEach(k=>{
    $(k).checked=!!p[k];
  });

  $('eliminar').classList.remove('hidden');
  $('modalPrograma').showModal();
};

window.editarRepeticion=function(id){
  const r=repeticiones.find(x=>x.id===id);
  if(!r)return;

  limpiarForm();

  $('programaId').value=r.id;
  $('tipoRegistro').value='repeticion';

  aplicarModoRepetido(true,true);

  $('nombre').value=r.programa_nombre||'';
  $('fecha').value=r.fecha||'';
  $('hora').value=r.hora||'';

  $('repeticionPublicado').checked=!!r.publicado;
  $('repeticionPromoPublicada').checked=!!r.promo_publicada;

  $('eliminar').classList.remove('hidden');
  $('modalPrograma').showModal();
};

$('programaRepetido').addEventListener('change',()=>{
  aplicarModoRepetido($('programaRepetido').checked,false);
});

$('formPrograma').addEventListener('submit',async e=>{
  e.preventDefault();

  const tipo=$('tipoRegistro').value;
  const idExistente=$('programaId').value;

  if(tipo==='repeticion'){
    const data={
      id:idExistente||('rep-'+Date.now()),
      programa_id:null,
      programa_nombre:$('nombre').value.trim(),
      fecha:$('fecha').value,
      hora:$('hora').value||null,
      publicado:$('repeticionPublicado').checked,
      promo_publicada:$('repeticionPromoPublicada').checked,
      updated_at:new Date().toISOString()
    };

    try{
      await writeViaFunction('save_repeticion',{data});
    }catch(error){
      alert('No se pudo guardar el programa repetido: '+error.message);
      return;
    }
  }else{
    const data={
      id:idExistente||String(Date.now()),
      nombre:$('nombre').value.trim(),
      fecha:$('fecha').value,
      hora:$('hora').value||null,
      canal:$('canal').value.trim()||null,
      observaciones:$('observaciones').value.trim()||null,
      updated_at:new Date().toISOString()
    };

    checks.forEach(k=>{
      data[k]=$(k).checked;
    });

    try{
      await writeViaFunction('save_programa',{data});
    }catch(error){
      alert('No se pudo guardar: '+error.message);
      return;
    }
  }

  $('modalPrograma').close();
  await cargarDatos();
});

$('eliminar').addEventListener('click',async()=>{
  const id=$('programaId').value;
  const tipo=$('tipoRegistro').value;

  if(!id)return;

  const texto=tipo==='repeticion'
    ? '¿Eliminar este programa repetido?'
    : '¿Eliminar este programa?';

  if(!confirm(texto))return;

  try{
    await writeViaFunction(tipo==='repeticion'?'delete_repeticion':'delete_programa',{id});
  }catch(error){
    alert('No se pudo eliminar: '+error.message);
    return;
  }

  $('modalPrograma').close();
  await cargarDatos();
});

$('btnNuevo').addEventListener('click',abrirNuevo);
$('cerrarModal').addEventListener('click',()=>$('modalPrograma').close());
$('cancelar').addEventListener('click',()=>$('modalPrograma').close());
$('buscar').addEventListener('input',renderProgramas);
$('filtroEstado').addEventListener('change',renderProgramas);

document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));

    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
  });
});

$('prevMes').addEventListener('click',()=>{
  mesActual=new Date(
    mesActual.getFullYear(),
    mesActual.getMonth()-1,
    1
  );
  renderCalendario();
});

$('nextMes').addEventListener('click',()=>{
  mesActual=new Date(
    mesActual.getFullYear(),
    mesActual.getMonth()+1,
    1
  );
  renderCalendario();
});

function escapeHtml(s=''){
  return String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[c]));
}

function escapeAttr(s=''){
  return String(s)
    .replace(/\\/g,'\\\\')
    .replace(/'/g,"\\'");
}

async function iniciar(){
  const ok=await cargarDatos();
  if(!ok)return;

  await migrarLocalSiHaceFalta();

  db.channel('zapatazo-cambios')
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:'programas'},
      ()=>cargarDatos()
    )
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:'repeticiones'},
      ()=>cargarDatos()
    )
    .subscribe();
}

iniciar();
