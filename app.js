
const STORAGE_KEY = 'zapatazo_programas_v1';

const checks = [
  'programa_editado','programa_miniatura','programa_publicado',
  'promo_hecho','promo_miniatura','promo_publicado',
  'redes_recortes','redes_miniaturas','redes_instagram','redes_youtube'
];

let programas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let mesActual = new Date();

const $ = id => document.getElementById(id);

function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(programas));
  renderTodo();
}

function progreso(p) {
  const hechas = checks.filter(k => !!p[k]).length;
  return Math.round((hechas / checks.length) * 100);
}

function formatoFecha(fecha) {
  if (!fecha) return '';
  const [y,m,d] = fecha.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit', year:'numeric'});
}

function renderStats() {
  const total = programas.length;
  const completos = programas.filter(p => progreso(p) === 100).length;
  const pendientes = total - completos;
  const emisionesEsteMes = programas.filter(p => {
    if (!p.fecha) return false;
    const d = new Date(p.fecha + 'T00:00:00');
    const hoy = new Date();
    return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
  }).length;
  $('stats').innerHTML = `
    <div class="stat"><strong>${total}</strong><span>Programas cargados</span></div>
    <div class="stat"><strong>${completos}</strong><span>Completos</span></div>
    <div class="stat"><strong>${pendientes}</strong><span>Con pendientes</span></div>
    <div class="stat"><strong>${emisionesEsteMes}</strong><span>Emisiones este mes</span></div>
  `;
}

function resumenGrupo(p, keys) {
  const c = keys.filter(k => p[k]).length;
  return `${c}/${keys.length} completado`;
}

function renderProgramas() {
  const q = $('buscar').value.trim().toLowerCase();
  const filtro = $('filtroEstado').value;
  let lista = [...programas].sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''));
  lista = lista.filter(p => !q || (p.nombre||'').toLowerCase().includes(q) || (p.canal||'').toLowerCase().includes(q));
  if (filtro === 'pendientes') lista = lista.filter(p => progreso(p) < 100);
  if (filtro === 'completos') lista = lista.filter(p => progreso(p) === 100);

  if (!lista.length) {
    $('listaProgramas').innerHTML = `<div class="empty-state">No hay programas para mostrar.</div>`;
    return;
  }

  $('listaProgramas').innerHTML = lista.map(p => {
    const pr = progreso(p);
    return `
      <article class="card">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(p.nombre)}</h3>
            <div class="meta">${formatoFecha(p.fecha)} ${p.hora ? '· ' + p.hora + ' hs' : ''} ${p.canal ? '· ' + escapeHtml(p.canal) : ''}</div>
          </div>
          <span class="badge ${pr===100?'ok':'pending'}">${pr===100?'Completo':pr+'%'}</span>
        </div>
        <div class="progress"><div style="width:${pr}%"></div></div>
        <div class="status-grid">
          <div class="status-box">
            <b>Programa</b>
            <div class="mini">${resumenGrupo(p,['programa_editado','programa_miniatura','programa_publicado'])}</div>
          </div>
          <div class="status-box">
            <b>Promo</b>
            <div class="mini">${resumenGrupo(p,['promo_hecho','promo_miniatura','promo_publicado'])}</div>
          </div>
          <div class="status-box">
            <b>Redes</b>
            <div class="mini">${resumenGrupo(p,['redes_recortes','redes_miniaturas','redes_instagram','redes_youtube'])}</div>
          </div>
        </div>
        ${p.observaciones ? `<div class="mini" style="margin-top:12px"><b>Obs.:</b> ${escapeHtml(p.observaciones)}</div>` : ''}
        <div class="actions">
          <button onclick="editarPrograma('${p.id}')">Abrir / editar</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderCalendario() {
  const year = mesActual.getFullYear();
  const month = mesActual.getMonth();
  $('mesTitulo').textContent = mesActual.toLocaleDateString('es-AR',{month:'long',year:'numeric'});

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let startDay = first.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  let html = '';
  for (let i=0;i<startDay;i++) html += `<div class="day empty"></div>`;

  for (let day=1; day<=last.getDate(); day++) {
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const eventos = programas.filter(p => p.fecha === iso);
    html += `<div class="day"><div class="day-num">${day}</div>`;
    html += eventos.map(p => `
      <span class="event" onclick="editarPrograma('${p.id}')">
        ${p.hora ? p.hora + ' · ' : ''}${escapeHtml(p.nombre)}
      </span>
    `).join('');
    html += `</div>`;
  }

  $('calendarGrid').innerHTML = html;
}

function renderTodo() {
  renderStats();
  renderProgramas();
  renderCalendario();
}

function limpiarForm() {
  $('formPrograma').reset();
  $('programaId').value = '';
  $('eliminar').classList.add('hidden');
  $('modalTitle').textContent = 'Nuevo programa';
}

function abrirNuevo() {
  limpiarForm();
  const hoy = new Date();
  $('fecha').value = hoy.toISOString().slice(0,10);
  $('modalPrograma').showModal();
}

window.editarPrograma = function(id) {
  const p = programas.find(x => x.id === id);
  if (!p) return;
  limpiarForm();
  $('modalTitle').textContent = 'Editar programa';
  $('programaId').value = p.id;
  $('nombre').value = p.nombre || '';
  $('fecha').value = p.fecha || '';
  $('hora').value = p.hora || '';
  $('canal').value = p.canal || '';
  $('observaciones').value = p.observaciones || '';
  checks.forEach(k => $(k).checked = !!p[k]);
  $('eliminar').classList.remove('hidden');
  $('modalPrograma').showModal();
}

$('formPrograma').addEventListener('submit', e => {
  e.preventDefault();
  const id = $('programaId').value || String(Date.now());
  const data = {
    id,
    nombre: $('nombre').value.trim(),
    fecha: $('fecha').value,
    hora: $('hora').value,
    canal: $('canal').value.trim(),
    observaciones: $('observaciones').value.trim()
  };
  checks.forEach(k => data[k] = $(k).checked);

  const i = programas.findIndex(p => p.id === id);
  if (i >= 0) programas[i] = data;
  else programas.push(data);

  guardar();
  $('modalPrograma').close();
});

$('eliminar').addEventListener('click', () => {
  const id = $('programaId').value;
  if (!id) return;
  if (confirm('¿Eliminar este programa?')) {
    programas = programas.filter(p => p.id !== id);
    guardar();
    $('modalPrograma').close();
  }
});

$('btnNuevo').addEventListener('click', abrirNuevo);
$('cerrarModal').addEventListener('click', () => $('modalPrograma').close());
$('cancelar').addEventListener('click', () => $('modalPrograma').close());

$('buscar').addEventListener('input', renderProgramas);
$('filtroEstado').addEventListener('change', renderProgramas);

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
  });
});

$('prevMes').addEventListener('click', () => {
  mesActual = new Date(mesActual.getFullYear(), mesActual.getMonth()-1, 1);
  renderCalendario();
});
$('nextMes').addEventListener('click', () => {
  mesActual = new Date(mesActual.getFullYear(), mesActual.getMonth()+1, 1);
  renderCalendario();
});

function escapeHtml(s='') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

renderTodo();
