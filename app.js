const SUPABASE_URL='https://jcnyvqzgjqqdiwuinula.supabase.co';
const SUPABASE_KEY='sb_publishable__ImxqupFGPBz1t7OfMzR9Q_tiGhL_Ua';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const STORAGE_KEY='zapatazo_programas_v1';

const checksNormales=[
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
let mesActual=new Date();

const $=id=>document.getElementById(id);

function estado(texto,ok=false){
  const el=$('estadoConexion');
  el.textContent=texto;
  el.style.color=ok?'#80d6a3':'#f0c96f';
}

async function cargarProgramas(){
  const {data,error}=await db
    .from('programas')
    .select('*')
    .order('fecha',{ascending:false});

  if(error){
    console.error(error);
    estado('Error al conectar con la base compartida.');
    $('listaProgramas').innerHTML='<div class="empty-state">No se pudo cargar la información.</div>';
    return false;
  }

  programas=data||[];
  estado('● Datos compartidos sincronizados',true);
  renderTodo();
  return true;
}

async function migrarLocalSiHaceFalta(){
  const locales=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  if(!locales.length || programas.length)return;

  const limpios=locales.map(p=>{
    const x={
      id:p.id,
      nombre:p.nombre,
      fecha:p.fecha,
      hora:p.hora||null,
      canal:p.canal||null,
      observaciones:p.observaciones||null,
      programa_repetido:false
    };

    checksNormales.forEach(k=>x[k]=!!p[k]);
    return x;
  });

  const {error}=await db.from('programas').upsert(limpios);

  if(!error){
    localStorage.removeItem(STORAGE_KEY);
    await cargarProgramas();
  }
}

function esRepetido(p){
  return !!p.programa_repetido;
}

function progresoPrograma(p){
  if(esRepetido(p)){
    const hechas=(p.programa_publicado?1:0)+(p.promo_publicado?1:0);
    return Math.round(hechas/2*100);
  }

  return Math.round(
    checksNormales.filter(k=>!!p[k]).length/checksNormales.length*100
  );
}

function pendientesPrograma(p){
  if(esRepetido(p)){
    const faltan=[];
    if(!p.programa_publicado)faltan.push('programa subido');
    if(!p.promo_publicado)faltan.push('promo publicada');
    return faltan;
  }

  return checksNormales.filter(k=>!p[k]).map(k=>labelsPendientes[k]);
}

function formatoFecha(f){
  if(!f)return '';
  const [y,m,d]=f.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-AR',{
    day:'2-digit',month:'2-digit',year:'numeric'
  });
}

function renderProgresoGeneral(){
  let totalItems=0;
  let completos=0;

  programas.forEach(p=>{
    if(esRepetido(p)){
      totalItems+=2;
      completos+=(p.programa_publicado?1:0)+(p.promo_publicado?1:0);
    }else{
      totalItems+=checksNormales.length;
      completos+=checksNormales.filter(k=>!!p[k]).length;
    }
  });

  const porcentaje=totalItems?Math.round(completos/totalItems*100):0;

  $('progresoGeneral').innerHTML=
    '<div class="overall-progress-top">'+
      '<span>AVANCE TOTAL</span>'+
      '<strong>'+porcentaje+'%</strong>'+
    '</div>'+
    '<div class="overall-progress-bar">'+
      '<div style="width:'+porcentaje+'%"></div>'+
    '</div>';
}

function renderStats(){
  const total=programas.length;
  const repetidos=programas.filter(esRepetido).length;
  const completos=programas.filter(p=>progresoPrograma(p)===100).length;

  $('stats').innerHTML=
    '<div class="stat"><strong>'+total+'</strong><span>Programas cargados</span></div>'+
    '<div class="stat"><strong>'+repetidos+'</strong><span>Programas repetidos</span></div>'+
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

  if(filtro==='pendientes'){
    lista=lista.filter(p=>progresoPrograma(p)<100);
  }

  if(filtro==='completos'){
    lista=lista.filter(p=>progresoPrograma(p)===100);
  }

  if(!lista.length){
    $('listaProgramas').innerHTML='<div class="empty-state">No hay programas para mostrar.</div>';
    return;
  }

  $('listaProgramas').innerHTML=lista.map(p=>{
    const pr=progresoPrograma(p);

    if(esRepetido(p)){
      return '<article class="card repetition-list-card">'+
        '<div class="card-top">'+
          '<div>'+
            '<h3>'+escapeHtml(p.nombre)+'</h3>'+
            '<div class="meta">Programa repetido · '+formatoFecha(p.fecha)+(p.hora?' · '+p.hora+' hs':'')+'</div>'+
          '</div>'+
          '<span class="badge '+(pr===100?'ok':'orange')+'">'+(pr===100?'Completo':pr+'%')+'</span>'+
        '</div>'+
        '<div class="repetition-status-line">'+
          '<b>Programa subido:</b> '+(p.programa_publicado?'Sí':'No')+
          ' &nbsp; · &nbsp; '+
          '<b>Promo publicada:</b> '+(p.promo_publicado?'Sí':'No')+
        '</div>'+
        '<div class="actions"><button onclick="editarPrograma(\''+escapeAttr(p.id)+'\')">Abrir / editar</button></div>'+
      '</article>';
    }

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

    const eventos=programas
      .filter(p=>p.fecha===iso)
      .sort((a,b)=>(a.hora||'99:99').localeCompare(b.hora||'99:99'));

    html+='<div class="day"><div class="day-num">'+d+'</div>';

    html+=eventos.map(p=>{
      const completo=progresoPrograma(p)===100;
      const faltan=pendientesPrograma(p);

      if(esRepetido(p)){
        const detalle=completo
          ? '<div class="event-status repetition-done">✓ Repetición completa</div>'
          : '<div class="event-status repetition-pending"><b>Falta:</b> '+faltan.map(escapeHtml).join(', ')+'</div>';

        return '<div class="event-card repetition '+(completo?'done':'')+'" onclick="editarPrograma(\''+escapeAttr(p.id)+'\')">'+
          '<div class="event-type">PROGRAMA REPETIDO</div>'+
          '<div class="event-title">'+
            (p.hora?'<span class="event-time">'+p.hora+'</span>':'')+
            escapeHtml(p.nombre)+
          '</div>'+
          detalle+
        '</div>';
      }

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

function aplicarModoRepetido(repetido){
  $('programaRepetido').checked=repetido;
  $('camposProgramaNormal').classList.toggle('hidden',repetido);
  $('camposProgramaRepetido').classList.toggle('hidden',!repetido);
  $('campoCanal').classList.toggle('hidden',repetido);

  if(repetido){
    $('modalTitle').textContent=$('programaId').value?'Editar programa repetido':'Nuevo programa repetido';
    $('guardarPrograma').textContent='Guardar repetido';
    $('guardarPrograma').classList.add('save-repeat');
  }else{
    $('modalTitle').textContent=$('programaId').value?'Editar programa':'Nuevo programa';
    $('guardarPrograma').textContent='Guardar';
    $('guardarPrograma').classList.remove('save-repeat');
  }
}

function limpiarForm(){
  $('formPrograma').reset();
  $('programaId').value='';
  $('eliminar').classList.add('hidden');
  aplicarModoRepetido(false);
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
  $('nombre').value=p.nombre||'';
  $('fecha').value=p.fecha||'';
  $('hora').value=p.hora||'';

  aplicarModoRepetido(esRepetido(p));

  if(esRepetido(p)){
    $('repeticionPublicado').checked=!!p.programa_publicado;
    $('repeticionPromoPublicada').checked=!!p.promo_publicado;
  }else{
    $('canal').value=p.canal||'';
    $('observaciones').value=p.observaciones||'';

    checksNormales.forEach(k=>{
      $(k).checked=!!p[k];
    });
  }

  $('eliminar').classList.remove('hidden');
  $('modalPrograma').showModal();
};

$('programaRepetido').addEventListener('change',()=>{
  aplicarModoRepetido($('programaRepetido').checked);
});

$('formPrograma').addEventListener('submit',async e=>{
  e.preventDefault();

  const repetido=$('programaRepetido').checked;

  const data={
    id:$('programaId').value||String(Date.now()),
    nombre:$('nombre').value.trim(),
    fecha:$('fecha').value,
    hora:$('hora').value||null,
    programa_repetido:repetido,
    updated_at:new Date().toISOString()
  };

  if(repetido){
    data.canal=null;
    data.observaciones=null;

    checksNormales.forEach(k=>data[k]=false);

    data.programa_publicado=$('repeticionPublicado').checked;
    data.promo_publicado=$('repeticionPromoPublicada').checked;
  }else{
    data.canal=$('canal').value.trim()||null;
    data.observaciones=$('observaciones').value.trim()||null;

    checksNormales.forEach(k=>{
      data[k]=$(k).checked;
    });
  }

  const {error}=await db.from('programas').upsert(data);

  if(error){
    console.error(error);
    alert('No se pudo guardar: '+error.message);
    return;
  }

  $('modalPrograma').close();
  await cargarProgramas();
});

$('eliminar').addEventListener('click',async()=>{
  const id=$('programaId').value;
  if(!id)return;

  if(!confirm('¿Eliminar este programa?'))return;

  const {error}=await db.from('programas').delete().eq('id',id);

  if(error){
    alert('No se pudo eliminar: '+error.message);
    return;
  }

  $('modalPrograma').close();
  await cargarProgramas();
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
  const ok=await cargarProgramas();

  if(ok){
    await migrarLocalSiHaceFalta();

    db.channel('programas-compartidos')
      .on(
        'postgres_changes',
        {event:'*',schema:'public',table:'programas'},
        ()=>cargarProgramas()
      )
      .subscribe();
  }
}

iniciar();
