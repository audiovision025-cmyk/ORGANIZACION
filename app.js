const SUPABASE_URL='https://jcnyvqzgjqqdiwuinula.supabase.co';
const SUPABASE_KEY='sb_publishable__ImxqupFGPBz1t7OfMzR9Q_tiGhL_Ua';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const STORAGE_KEY='zapatazo_programas_v1';
const checks=['programa_editado','programa_miniatura','programa_publicado','promo_hecho','promo_miniatura','promo_publicado','redes_recortes','redes_miniaturas','redes_instagram','redes_youtube'];
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
let programas=[];let mesActual=new Date();const $=id=>document.getElementById(id);

function estado(t,ok=false){const e=$('estadoConexion');e.textContent=t;e.style.color=ok?'#80d6a3':'#f0c96f'}
async function cargarProgramas(){const{data,error}=await db.from('programas').select('*').order('fecha',{ascending:false});if(error){console.error(error);estado('Falta configurar la tabla compartida en Supabase.');$('listaProgramas').innerHTML='<div class="empty-state">La base compartida todavía no está configurada.</div>';return false}programas=data||[];estado('● Datos compartidos sincronizados',true);renderTodo();return true}
async function migrarLocalSiHaceFalta(){const locales=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(!locales.length||programas.length)return;const limpios=locales.map(p=>{const x={};['id','nombre','fecha','hora','canal','observaciones',...checks].forEach(k=>x[k]=p[k]??(checks.includes(k)?false:null));return x});const{error}=await db.from('programas').upsert(limpios);if(!error){localStorage.removeItem(STORAGE_KEY);await cargarProgramas()}}
function progreso(p){return Math.round(checks.filter(k=>!!p[k]).length/checks.length*100)}
function pendientes(p){return checks.filter(k=>!p[k]).map(k=>labelsPendientes[k])}
function formatoFecha(f){if(!f)return'';const[y,m,d]=f.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'})}
function renderStats(){const total=programas.length,completos=programas.filter(p=>progreso(p)===100).length,hoy=new Date();const emisiones=programas.filter(p=>{if(!p.fecha)return false;const d=new Date(p.fecha+'T00:00:00');return d.getMonth()===hoy.getMonth()&&d.getFullYear()===hoy.getFullYear()}).length;$('stats').innerHTML=`<div class="stat"><strong>${total}</strong><span>Programas cargados</span></div><div class="stat"><strong>${completos}</strong><span>Completos</span></div><div class="stat"><strong>${total-completos}</strong><span>Con pendientes</span></div><div class="stat"><strong>${emisiones}</strong><span>Emisiones este mes</span></div>`}
function resumenGrupo(p,k){return`${k.filter(x=>p[x]).length}/${k.length} completado`}
function renderProgramas(){const q=$('buscar').value.trim().toLowerCase(),f=$('filtroEstado').value;let l=[...programas].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));l=l.filter(p=>!q||(p.nombre||'').toLowerCase().includes(q)||(p.canal||'').toLowerCase().includes(q));if(f==='pendientes')l=l.filter(p=>progreso(p)<100);if(f==='completos')l=l.filter(p=>progreso(p)===100);$('listaProgramas').innerHTML=l.length?l.map(p=>{const pr=progreso(p);return`<article class="card"><div class="card-top"><div><h3>${escapeHtml(p.nombre)}</h3><div class="meta">${formatoFecha(p.fecha)} ${p.hora?'· '+p.hora+' hs':''} ${p.canal?'· '+escapeHtml(p.canal):''}</div></div><span class="badge ${pr===100?'ok':'pending'}">${pr===100?'Completo':pr+'%'}</span></div><div class="progress"><div style="width:${pr}%"></div></div><div class="status-grid"><div class="status-box"><b>Programa</b><div class="mini">${resumenGrupo(p,['programa_editado','programa_miniatura','programa_publicado'])}</div></div><div class="status-box"><b>Promo</b><div class="mini">${resumenGrupo(p,['promo_hecho','promo_miniatura','promo_publicado'])}</div></div><div class="status-box"><b>Redes</b><div class="mini">${resumenGrupo(p,['redes_recortes','redes_miniaturas','redes_instagram','redes_youtube'])}</div></div></div>${p.observaciones?'<div class="mini" style="margin-top:12px"><b>Obs.:</b> '+escapeHtml(p.observaciones)+'</div>':''}<div class="actions"><button onclick="editarPrograma('${p.id}')">Abrir / editar</button></div></article>`}).join(''):'<div class="empty-state">No hay programas para mostrar.</div>'}

function renderCalendario(){
  const y=mesActual.getFullYear(),m=mesActual.getMonth();
  $('mesTitulo').textContent=mesActual.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
  const first=new Date(y,m,1),last=new Date(y,m+1,0);
  let s=first.getDay();s=s===0?6:s-1;
  let html='';
  for(let i=0;i<s;i++)html+='<div class="day empty"></div>';
  for(let d=1;d<=last.getDate();d++){
    const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const ev=programas.filter(p=>p.fecha===iso);
    html+=`<div class="day"><div class="day-num">${d}</div>`;
    html+=ev.map(p=>{
      const completos=progreso(p)===100;
      const faltan=pendientes(p);
      const detalle=completos
        ? '<div class="event-status complete">✓ Todo completo</div>'
        : '<div class="event-status pending"><b>Falta:</b> '+faltan.map(x=>escapeHtml(x)).join(', ')+'</div>';
      return `<div class="event-card ${completos?'complete':''}" onclick="editarPrograma('${p.id}')">
        <div class="event-title">${p.hora?'<span class="event-time">'+p.hora+'</span>':''}${escapeHtml(p.nombre)}</div>
        ${p.canal?'<div class="event-channel">'+escapeHtml(p.canal)+'</div>':''}
        ${detalle}
      </div>`;
    }).join('');
    html+='</div>';
  }
  $('calendarGrid').innerHTML=html
}
function renderTodo(){renderStats();renderProgramas();renderCalendario()}
function limpiarForm(){$('formPrograma').reset();$('programaId').value='';$('eliminar').classList.add('hidden');$('modalTitle').textContent='Nuevo programa'}
function abrirNuevo(){limpiarForm();const h=new Date();$('fecha').value=`${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;$('modalPrograma').showModal()}
window.editarPrograma=function(id){const p=programas.find(x=>x.id===id);if(!p)return;limpiarForm();$('modalTitle').textContent='Editar programa';$('programaId').value=p.id;$('nombre').value=p.nombre||'';$('fecha').value=p.fecha||'';$('hora').value=p.hora||'';$('canal').value=p.canal||'';$('observaciones').value=p.observaciones||'';checks.forEach(k=>$(k).checked=!!p[k]);$('eliminar').classList.remove('hidden');$('modalPrograma').showModal()}
$('formPrograma').addEventListener('submit',async e=>{e.preventDefault();const data={id:$('programaId').value||String(Date.now()),nombre:$('nombre').value.trim(),fecha:$('fecha').value,hora:$('hora').value||null,canal:$('canal').value.trim()||null,observaciones:$('observaciones').value.trim()||null,updated_at:new Date().toISOString()};checks.forEach(k=>data[k]=$(k).checked);const{error}=await db.from('programas').upsert(data);if(error){alert('No se pudo guardar: '+error.message);return}$('modalPrograma').close();await cargarProgramas()})
$('eliminar').addEventListener('click',async()=>{const id=$('programaId').value;if(!id)return;if(confirm('¿Eliminar este programa?')){const{error}=await db.from('programas').delete().eq('id',id);if(error){alert('No se pudo eliminar: '+error.message);return}$('modalPrograma').close();await cargarProgramas()}})
$('btnNuevo').addEventListener('click',abrirNuevo);$('cerrarModal').addEventListener('click',()=>$('modalPrograma').close());$('cancelar').addEventListener('click',()=>$('modalPrograma').close());$('buscar').addEventListener('input',renderProgramas);$('filtroEstado').addEventListener('change',renderProgramas);
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$(btn.dataset.tab).classList.add('active')}));
$('prevMes').addEventListener('click',()=>{mesActual=new Date(mesActual.getFullYear(),mesActual.getMonth()-1,1);renderCalendario()});$('nextMes').addEventListener('click',()=>{mesActual=new Date(mesActual.getFullYear(),mesActual.getMonth()+1,1);renderCalendario()});
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
async function iniciar(){const ok=await cargarProgramas();if(ok){await migrarLocalSiHaceFalta();db.channel('programas-compartidos').on('postgres_changes',{event:'*',schema:'public',table:'programas'},()=>cargarProgramas()).subscribe()}}
iniciar();