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

function estado(texto,ok=false){
  const el=$('estadoConexion');
  el.textContent=texto;
  el.style.color=ok?'#80d6a3':'#f0c96f';
}

async function cargarDatos(){
  const resultados=await Promise.all([
    db.from('programas').select('*').order('fecha',{ascending:false}),
    db.from('repeticiones').select('*').order('fecha',{ascending:false})
  ]);

  const programasRes=resultados[0];
  const repeticionesRes=resultados[1];

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
  if(!r.publicado)faltan.push('publicar');
  if(!r.promo_publicada)faltan.push('promo publicada');
  return faltan;
}

function formatoFecha(f){
  if(!f)return '';
  const partes=f.split('-').map(Number);
  return new Date(partes[0],partes[1]-1,partes[2]).toLocaleDateString('es-AR',{
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
    '<div class="stat"><strong>'+repeticiones.length+'</strong><span>Repeticiones</span></div>'+
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
        '<div><h3>'+escapeHtml(p.nombre)+'</h3>'+
        '<div class="meta">'+formatoFecha(p.fecha)+(p.hora?' · '+p.hora+' hs':'')+(p.canal?' · '+escapeHtml(p.canal):'')+'</div></div>'+
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

function renderRepeticiones(){
  if(!repeticiones.length){
    $('listaRepeticiones').innerHTML='<div class="empty-state">Todavía no hay repeticiones cargadas.</div>';
    return;
  }

  const lista=[...repeticiones].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));

  $('listaRepeticiones').innerHTML=lista.map(r=>{
    const completa=repeticionCompleta(r);
    const faltan=pendientesRepeticion(r);
    return '<article class="card repetition-list-card">'+
      '<div class="card-top">'+
        '<div><h3>Repetición: '+escapeHtml(r.programa_nombre)+'</h3>'+
        '<div class="meta">'+formatoFecha(r.fecha)+(r.hora?' · '+r.hora+' hs':'')+'</div></div>'+
        '<span class="badge '+(completa?'ok':'orange')+'">'+(completa?'Completa':'Pendiente')+'</span>'+
      '</div>'+
      '<div class="repetition-status-line"><b>Publicado:</b> '+(r.publicado?'Sí':'No')+' &nbsp; · &nbsp; <b>Promo publicada:</b> '+(r.promo_publicada?'Sí':'No')+'</div>'+
      (!completa?'<div class="mini" style="margin-top:8px"><b>Falta:</b> '+faltan.map(escapeHtml).join(', ')+'</div>':'')+
      '<div class="actions"><button onclick="editarRepeticion(\''+escapeAttr(r.id)+'\')">Abrir / editar</button></div>'+
    '</article>';
  }).join('');
}

function renderCalendario(){
  const y=mesActual.getFullYear();
  const m=mesActual.getMonth();
  $('mesTitulo').textContent=mesActual.toLocaleDateString('es-AR',{month:'long',year:'numeric'});

  const first=new Date(y,m,1);
  const last=new Date(y,m+1,0);
  let start=first.getDay();
  start=start===0?6:start-1;

  let html='';
  for(let i=0;i<start;i++)html+='<div class="day empty"></div>';

  for(let d=1;d<=last.getDate();d++){
    const iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');

    const eventosProgramas=programas
      .filter(p=>p.fecha===iso)
      .map(p=>({tipo:'programa',hora:p.hora||'',data:p}));

    const eventosRepeticiones=repeticiones
      .filter(r=>r.fecha===iso)
      .map(r=>({tipo:'repeticion',hora:r.hora||'',data:r}));

    const eventos=eventosProgramas.concat(eventosRepeticiones)
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
          '<div class="event-type">REPETICIÓN</div>'+
          '<div class="event-title">'+(r.hora?'<span class="event-time">'+r.hora+'</span>':'')+escapeHtml(r.programa_nombre)+'</div>'+
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
        '<div class="event-title">'+(p.hora?'<span class="event-time">'+p.hora+'</span>':'')+escapeHtml(p.nombre)+'</div>'+
        (p.observaciones?'<div class="event-comment"><b>Comentario:</b> '+escapeHtml(p.observaciones)+'</div>':'')+
        (p.canal?'<div class="event-channel">'+escapeHtml(p.canal)+'</div>':'')+
        detalle+
      '</div>';
    }).join('');

    html+='</div>';
  }

  $('calendarGrid').innerHTML=html;
}

function renderSelectorProgramas(seleccionado){
  const select=$('repeticionPrograma');
  const lista=[...programas].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));

  let html='<option value="">Seleccionar programa...</option>';
  html+=lista.map(p=>
    '<option value="'+escapeHtml(p.id)+'">'+
      escapeHtml(p.nombre)+' — '+formatoFecha(p.fecha)+
    '</option>'
  ).join('');

  select.innerHTML=html;
  if(seleccionado)select.value=seleccionado;
}

function renderTodo(){
  renderProgresoGeneral();
  renderStats();
  renderProgramas();
  renderRepeticiones();
  renderCalendario();
  renderSelectorProgramas();
}

function limpiarForm(){
  $('formPrograma').reset();
  $('programaId').value='';
  $('eliminar').classList.add('hidden');
  $('modalTitle').textContent='Nuevo programa';
}

function abrirNuevo(){
  limpiarForm();
  const h=new Date();
  $('fecha').value=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0')+'-'+String(h.getDate()).padStart(2,'0');
  $('modalPrograma').showModal();
}

window.editarPrograma=function(id){
  const p=programas.find(x=>x.id===id);
  if(!p)return;

  limpiarForm();
  $('modalTitle').textContent='Editar programa';
  $('programaId').value=p.id;
  $('nombre').value=p.nombre||'';
  $('fecha').value=p.fecha||'';
  $('hora').value=p.hora||'';
  $('canal').value=p.canal||'';
  $('observaciones').value=p.observaciones||'';
  checks.forEach(k=>$(k).checked=!!p[k]);
  $('eliminar').classList.remove('hidden');
  $('modalPrograma').showModal();
};

function limpiarRepeticion(){
  $('formRepeticion').reset();
  $('repeticionId').value='';
  $('eliminarRepeticion').classList.add('hidden');
  $('modalRepeticionTitle').textContent='Nueva repetición';
  renderSelectorProgramas();
}

function abrirNuevaRepeticion(){
  limpiarRepeticion();
  const h=new Date();
  $('repeticionFecha').value=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0')+'-'+String(h.getDate()).padStart(2,'0');
  $('modalRepeticion').showModal();
}

window.editarRepeticion=function(id){
  const r=repeticiones.find(x=>x.id===id);
  if(!r)return;

  limpiarRepeticion();
  $('modalRepeticionTitle').textContent='Editar repetición';

  if(r.programa_id && !programas.some(p=>p.id===r.programa_id)){
    const opt=document.createElement('option');
    opt.value=r.programa_id;
    opt.textContent=r.programa_nombre;
    $('repeticionPrograma').appendChild(opt);
  }

  $('repeticionId').value=r.id;
  $('repeticionPrograma').value=r.programa_id||'';
  $('repeticionFecha').value=r.fecha||'';
  $('repeticionHora').value=r.hora||'';
  $('repeticionPublicado').checked=!!r.publicado;
  $('repeticionPromoPublicada').checked=!!r.promo_publicada;
  $('eliminarRepeticion').classList.remove('hidden');
  $('modalRepeticion').showModal();
};

$('formPrograma').addEventListener('submit',async e=>{
  e.preventDefault();

  const data={
    id:$('programaId').value||String(Date.now()),
    nombre:$('nombre').value.trim(),
    fecha:$('fecha').value,
    hora:$('hora').value||null,
    canal:$('canal').value.trim()||null,
    observaciones:$('observaciones').value.trim()||null,
    updated_at:new Date().toISOString()
  };

  checks.forEach(k=>data[k]=$(k).checked);

  const res=await db.from('programas').upsert(data);
  if(res.error){
    alert('No se pudo guardar: '+res.error.message);
    return;
  }

  $('modalPrograma').close();
  await cargarDatos();
});

$('formRepeticion').addEventListener('submit',async e=>{
  e.preventDefault();

  const programaId=$('repeticionPrograma').value;
  const programa=programas.find(p=>p.id===programaId);

  if(!programa){
    alert('Seleccioná qué programa se repite.');
    return;
  }

  const data={
    id:$('repeticionId').value||('rep-'+Date.now()),
    programa_id:programa.id,
    programa_nombre:programa.nombre,
    fecha:$('repeticionFecha').value,
    hora:$('repeticionHora').value||null,
    publicado:$('repeticionPublicado').checked,
    promo_publicada:$('repeticionPromoPublicada').checked,
    updated_at:new Date().toISOString()
  };

  const res=await db.from('repeticiones').upsert(data);
  if(res.error){
    alert('No se pudo guardar la repetición: '+res.error.message);
    return;
  }

  $('modalRepeticion').close();
  await cargarDatos();
});

$('eliminar').addEventListener('click',async()=>{
  const id=$('programaId').value;
  if(!id)return;

  if(confirm('¿Eliminar este programa?')){
    const res=await db.from('programas').delete().eq('id',id);
    if(res.error){
      alert('No se pudo eliminar: '+res.error.message);
      return;
    }
    $('modalPrograma').close();
    await cargarDatos();
  }
});

$('eliminarRepeticion').addEventListener('click',async()=>{
  const id=$('repeticionId').value;
  if(!id)return;

  if(confirm('¿Eliminar esta repetición?')){
    const res=await db.from('repeticiones').delete().eq('id',id);
    if(res.error){
      alert('No se pudo eliminar la repetición: '+res.error.message);
      return;
    }
    $('modalRepeticion').close();
    await cargarDatos();
  }
});

$('btnNuevo').addEventListener('click',abrirNuevo);
$('btnRepeticion').addEventListener('click',abrirNuevaRepeticion);
$('cerrarModal').addEventListener('click',()=>$('modalPrograma').close());
$('cancelar').addEventListener('click',()=>$('modalPrograma').close());
$('cerrarRepeticion').addEventListener('click',()=>$('modalRepeticion').close());
$('cancelarRepeticion').addEventListener('click',()=>$('modalRepeticion').close());
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
  mesActual=new Date(mesActual.getFullYear(),mesActual.getMonth()-1,1);
  renderCalendario();
});

$('nextMes').addEventListener('click',()=>{
  mesActual=new Date(mesActual.getFullYear(),mesActual.getMonth()+1,1);
  renderCalendario();
});

function escapeHtml(s=''){
  return String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
}

function escapeAttr(s=''){
  return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

async function iniciar(){
  const ok=await cargarDatos();
  if(!ok)return;

  await migrarLocalSiHaceFalta();

  db.channel('zapatazo-cambios')
    .on('postgres_changes',{event:'*',schema:'public',table:'programas'},()=>cargarDatos())
    .on('postgres_changes',{event:'*',schema:'public',table:'repeticiones'},()=>cargarDatos())
    .subscribe();
}

iniciar();
