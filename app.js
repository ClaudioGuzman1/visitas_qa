// ====== Estado y almacenamiento ======
const STORAGE_KEY = 'visitas_calidad_v1';
let visitas = [];
let currentVisit = null; // objeto en edicion
let editingId = null;

function loadVisitas(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    visitas = raw ? JSON.parse(raw) : [];
  }catch(e){ visitas = []; }
}
function saveVisitas(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visitas));
}

function uid(){ return 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }

// ====== Modelo de datos por defecto ======
function emptyChecklist(items){
  const obj = {};
  items.forEach(it => obj[it[0]] = { resp:'', valor: it[2] || '' });
  return obj;
}

function newVisit(){
  return {
    id: uid(),
    nombre: '',
    fechaCreacion: new Date().toISOString(),
    general: {
      ticket:'', fecha:'', sitio:'', cliente:'', contacto:'', direccion:'', cp:'',
      tel:'', ext:'', correo:''
    },
    checklist1: emptyChecklist(SECCION1),
    checklist2: emptyChecklist(SECCION2),
    checklist3: emptyChecklist(SECCION3),
    checklist4: emptyChecklist(SECCION4),
    comentariosAgencia: '',
    comentariosTerminal: '',
    terminal: {
      id:'', serie:'', mac:'', firmware:'', validar:'', biometrico:'G3.3C'
    },
    fotosAgencia: {
      nombreSitio:'',
      ag_tablero: [], ag_fn: [], ag_nt: [], ag_telurometro: [], ag_registro: [],
      ag_telurometro_comments:'', ag_registro_comments:''
    },
    fotosTerminal: {
      nombreTerminal:'',
      te_terminal:[], te_config:[], te_serie:[], te_fn:[], te_nt:[], te_voltaje:[], te_poe:[], te_cableado:[], te_complementarias:[],
      te_config_comments:'', te_mediciones_comments:'', te_voltaje_comments:'', te_poe_comments:'', te_cableado_comments:'', te_complementarias_comments:''
    },
    firmas: {
      ib_nombre:'', cliente_nombre:'',
      sig_ib: null, sig_cliente: null, sig_ib_term: null, sig_cliente_term: null
    }
  };
}

// ====== Navegacion entre vistas ======
const viewList = document.getElementById('viewList');
const viewForm = document.getElementById('viewForm');

function showList(){
  viewForm.classList.add('hidden');
  viewList.classList.remove('hidden');
  renderList();
}
function showForm(){
  viewList.classList.add('hidden');
  viewForm.classList.remove('hidden');
}

// Tabs
document.querySelectorAll('.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector(`.tabpanel[data-tab="${btn.dataset.tab}"]`).classList.add('active');
  });
});

// ====== Render lista ======
function renderList(){
  const cont = document.getElementById('listContainer');
  if(visitas.length === 0){
    cont.innerHTML = '<div class="empty-msg">No hay visitas guardadas. Crea una nueva visita de calidad.</div>';
    return;
  }
  let html = '<table class="list"><thead><tr><th>Nombre</th><th>Sitio</th><th>Fecha</th><th>Ticket</th><th>Acciones</th></tr></thead><tbody>';
  visitas.slice().sort((a,b)=> (b.fechaCreacion||'').localeCompare(a.fechaCreacion||'')).forEach(v=>{
    html += `<tr>
      <td>${escapeHtml(v.nombre || '(sin nombre)')}</td>
      <td>${escapeHtml(v.general.sitio || '')}</td>
      <td>${escapeHtml(v.general.fecha || '')}</td>
      <td>${escapeHtml(v.general.ticket || '')}</td>
      <td>
        <div class="btn-row" style="margin:0;">
          <button class="btn small-btn" data-action="edit" data-id="${v.id}">Editar</button>
          <button class="btn green small-btn" data-action="duplicate" data-id="${v.id}">Duplicar</button>
          <button class="btn danger small-btn" data-action="delete" data-id="${v.id}">Eliminar</button>
        </div>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  cont.innerHTML = html;

  cont.querySelectorAll('button[data-action]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if(action === 'edit'){ openEdit(id); }
      else if(action === 'duplicate'){ duplicateVisit(id); }
      else if(action === 'delete'){ deleteVisit(id); }
    });
  });
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function duplicateVisit(id){
  const orig = visitas.find(v=>v.id===id);
  if(!orig) return;
  const copy = JSON.parse(JSON.stringify(orig));
  copy.id = uid();
  copy.nombre = (orig.nombre || 'Visita') + ' (copia)';
  copy.fechaCreacion = new Date().toISOString();
  // Limpiar firmas en la copia (cada visita requiere firma propia)
  copy.firmas.sig_ib = null;
  copy.firmas.sig_cliente = null;
  copy.firmas.sig_ib_term = null;
  copy.firmas.sig_cliente_term = null;
  visitas.push(copy);
  saveVisitas();
  renderList();
  showToast('Visita duplicada. Puedes editarla ahora.');
}

function deleteVisit(id){
  if(!confirm('¿Eliminar esta visita de calidad? Esta acción no se puede deshacer.')) return;
  visitas = visitas.filter(v=>v.id!==id);
  saveVisitas();
  renderList();
}

// ====== Toast ======
let toastTimer = null;
function showToast(msg){
  let el = document.querySelector('.toast');
  if(!el){
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.style.display='none'; }, 2800);
}

// ====== Checklist tables ======
function buildChecklistTable(tableEl, items, dataObj, prefix){
  let html = '<tr><th class="num">Núm.</th><th class="desc">Descripción</th><th class="radio">Sí</th><th class="radio">No</th><th class="valor">Valor</th></tr>';
  items.forEach(it=>{
    const [num, desc, defaultValor] = it;
    const state = dataObj[num] || {resp:'', valor: defaultValor || ''};
    html += `<tr>
      <td class="num">${num}</td>
      <td class="desc">${escapeHtml(desc)}</td>
      <td class="radio"><input type="radio" name="${prefix}_${num}" value="si" ${state.resp==='si'?'checked':''} data-chk="${prefix}|${num}|resp" data-val="si"></td>
      <td class="radio"><input type="radio" name="${prefix}_${num}" value="no" ${state.resp==='no'?'checked':''} data-chk="${prefix}|${num}|resp" data-val="no"></td>
      <td class="valor"><input type="text" value="${escapeHtml(state.valor)}" data-chk="${prefix}|${num}|valor"></td>
    </tr>`;
  });
  tableEl.innerHTML = html;

  tableEl.querySelectorAll('input[type=radio][data-chk]').forEach(r=>{
    r.addEventListener('change', e=>{
      const [pfx, num] = e.target.dataset.chk.split('|');
      getChecklistObj(pfx)[num].resp = e.target.dataset.val;
    });
  });
  tableEl.querySelectorAll('input[type=text][data-chk]').forEach(t=>{
    t.addEventListener('input', e=>{
      const [pfx, num] = e.target.dataset.chk.split('|');
      getChecklistObj(pfx)[num].valor = e.target.value;
    });
  });
}

function getChecklistObj(prefix){
  switch(prefix){
    case 'c1': return currentVisit.checklist1;
    case 'c2': return currentVisit.checklist2;
    case 'c3': return currentVisit.checklist3;
    case 'c4': return currentVisit.checklist4;
  }
}

// ====== Cargar / volcar formulario ======
function loadFormFromVisit(v){
  document.getElementById('f_visitName').value = v.nombre || '';
  document.getElementById('f_ticket').value = v.general.ticket || '';
  document.getElementById('f_fecha').value = v.general.fecha || '';
  document.getElementById('f_sitio').value = v.general.sitio || '';
  document.getElementById('f_cliente').value = v.general.cliente || '';
  document.getElementById('f_contacto').value = v.general.contacto || '';
  document.getElementById('f_direccion').value = v.general.direccion || '';
  document.getElementById('f_cp').value = v.general.cp || '';
  document.getElementById('f_tel').value = v.general.tel || '';
  document.getElementById('f_ext').value = v.general.ext || '';
  document.getElementById('f_correo').value = v.general.correo || '';

  buildChecklistTable(document.getElementById('tbl_seccion1'), SECCION1, v.checklist1, 'c1');
  buildChecklistTable(document.getElementById('tbl_seccion2'), SECCION2, v.checklist2, 'c2');
  buildChecklistTable(document.getElementById('tbl_seccion3'), SECCION3, v.checklist3, 'c3');
  buildChecklistTable(document.getElementById('tbl_seccion4'), SECCION4, v.checklist4, 'c4');

  document.getElementById('f_comentarios_agencia').value = v.comentariosAgencia || '';
  document.getElementById('f_comentarios_terminal').value = v.comentariosTerminal || '';

  document.getElementById('t_id').value = v.terminal.id || '';
  document.getElementById('t_serie').value = v.terminal.serie || '';
  document.getElementById('t_mac').value = v.terminal.mac || '';
  document.getElementById('t_firmware').value = v.terminal.firmware || '';
  document.getElementById('t_validar').value = v.terminal.validar || '';
  document.getElementById('t_biometrico').value = v.terminal.biometrico || 'G3.3C';

  document.getElementById('fa_nombreSitio').value = v.fotosAgencia.nombreSitio || '';
  document.getElementById('ag_telurometro_comments').value = v.fotosAgencia.ag_telurometro_comments || '';
  document.getElementById('ag_registro_comments').value = v.fotosAgencia.ag_registro_comments || '';

  document.getElementById('ft_nombreTerminal').value = v.fotosTerminal.nombreTerminal || '';
  document.getElementById('te_config_comments').value = v.fotosTerminal.te_config_comments || '';
  document.getElementById('te_mediciones_comments').value = v.fotosTerminal.te_mediciones_comments || '';
  document.getElementById('te_voltaje_comments').value = v.fotosTerminal.te_voltaje_comments || '';
  document.getElementById('te_poe_comments').value = v.fotosTerminal.te_poe_comments || '';
  document.getElementById('te_cableado_comments').value = v.fotosTerminal.te_cableado_comments || '';
  document.getElementById('te_complementarias_comments').value = v.fotosTerminal.te_complementarias_comments || '';

  document.getElementById('firma_ib_nombre').value = v.firmas.ib_nombre || '';
  document.getElementById('firma_cliente_nombre').value = v.firmas.cliente_nombre || '';

  // Fotos: render previews
  Object.keys(v.fotosAgencia).forEach(key=>{
    if(Array.isArray(v.fotosAgencia[key])) renderPhotoPreview(key, v.fotosAgencia[key], 'fotosAgencia');
  });
  Object.keys(v.fotosTerminal).forEach(key=>{
    if(Array.isArray(v.fotosTerminal[key])) renderPhotoPreview(key, v.fotosTerminal[key], 'fotosTerminal');
  });

  // Firmas: cargar en canvas
  setTimeout(()=>{
    loadSignatureToCanvas('sig_ib', v.firmas.sig_ib);
    loadSignatureToCanvas('sig_cliente', v.firmas.sig_cliente);
    loadSignatureToCanvas('sig_ib_term', v.firmas.sig_ib_term);
    loadSignatureToCanvas('sig_cliente_term', v.firmas.sig_cliente_term);
  }, 50);

  // Reset tabs a la primera
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active'));
  document.querySelector('.tabs button[data-tab="general"]').classList.add('active');
  document.querySelector('.tabpanel[data-tab="general"]').classList.add('active');
}

function saveFormToVisit(){
  const v = currentVisit;
  v.nombre = document.getElementById('f_visitName').value.trim();
  v.general.ticket = document.getElementById('f_ticket').value;
  v.general.fecha = document.getElementById('f_fecha').value;
  v.general.sitio = document.getElementById('f_sitio').value;
  v.general.cliente = document.getElementById('f_cliente').value;
  v.general.contacto = document.getElementById('f_contacto').value;
  v.general.direccion = document.getElementById('f_direccion').value;
  v.general.cp = document.getElementById('f_cp').value;
  v.general.tel = document.getElementById('f_tel').value;
  v.general.ext = document.getElementById('f_ext').value;
  v.general.correo = document.getElementById('f_correo').value;

  v.comentariosAgencia = document.getElementById('f_comentarios_agencia').value;
  v.comentariosTerminal = document.getElementById('f_comentarios_terminal').value;

  v.terminal.id = document.getElementById('t_id').value;
  v.terminal.serie = document.getElementById('t_serie').value;
  v.terminal.mac = document.getElementById('t_mac').value;
  v.terminal.firmware = document.getElementById('t_firmware').value;
  v.terminal.validar = document.getElementById('t_validar').value;
  v.terminal.biometrico = document.getElementById('t_biometrico').value;

  v.fotosAgencia.nombreSitio = document.getElementById('fa_nombreSitio').value;
  v.fotosAgencia.ag_telurometro_comments = document.getElementById('ag_telurometro_comments').value;
  v.fotosAgencia.ag_registro_comments = document.getElementById('ag_registro_comments').value;

  v.fotosTerminal.nombreTerminal = document.getElementById('ft_nombreTerminal').value;
  v.fotosTerminal.te_config_comments = document.getElementById('te_config_comments').value;
  v.fotosTerminal.te_mediciones_comments = document.getElementById('te_mediciones_comments').value;
  v.fotosTerminal.te_voltaje_comments = document.getElementById('te_voltaje_comments').value;
  v.fotosTerminal.te_poe_comments = document.getElementById('te_poe_comments').value;
  v.fotosTerminal.te_cableado_comments = document.getElementById('te_cableado_comments').value;
  v.fotosTerminal.te_complementarias_comments = document.getElementById('te_complementarias_comments').value;

  v.firmas.ib_nombre = document.getElementById('firma_ib_nombre').value;
  v.firmas.cliente_nombre = document.getElementById('firma_cliente_nombre').value;

  // Firmas: guardar como dataURL si tienen contenido
  v.firmas.sig_ib = getSignatureDataUrl('sig_ib');
  v.firmas.sig_cliente = getSignatureDataUrl('sig_cliente');
  v.firmas.sig_ib_term = getSignatureDataUrl('sig_ib_term');
  v.firmas.sig_cliente_term = getSignatureDataUrl('sig_cliente_term');
}

// ====== Fotos ======
function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Comprimir imagen a tamaño razonable para PDF
function compressImage(dataUrl, maxW=1000){
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>{
      let w = img.width, h = img.height;
      if(w > maxW){ h = Math.round(h * maxW / w); w = maxW; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = ()=>resolve(dataUrl);
    img.src = dataUrl;
  });
}

document.querySelectorAll('input[type=file][data-photo]').forEach(input=>{
  input.addEventListener('change', async (e)=>{
    const key = input.dataset.photo;
    const target = key.startsWith('ag_') ? currentVisit.fotosAgencia : currentVisit.fotosTerminal;
    const files = Array.from(e.target.files);
    for(const file of files){
      const raw = await fileToDataUrl(file);
      const compressed = await compressImage(raw);
      target[key].push(compressed);
    }
    renderPhotoPreview(key, target[key], key.startsWith('ag_') ? 'fotosAgencia' : 'fotosTerminal');
    input.value = '';
  });
});

function renderPhotoPreview(key, arr, groupName){
  const cont = document.querySelector(`.photo-preview[data-preview="${key}"]`);
  if(!cont) return;
  cont.innerHTML = '';
  arr.forEach((dataUrl, idx)=>{
    const div = document.createElement('div');
    div.className = 'ph';
    div.innerHTML = `<img src="${dataUrl}"><button class="rm" data-key="${key}" data-idx="${idx}" data-group="${groupName}">×</button>`;
    cont.appendChild(div);
  });
  cont.querySelectorAll('.rm').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const group = btn.dataset.group === 'fotosAgencia' ? currentVisit.fotosAgencia : currentVisit.fotosTerminal;
      group[btn.dataset.key].splice(parseInt(btn.dataset.idx),1);
      renderPhotoPreview(btn.dataset.key, group[btn.dataset.key], btn.dataset.group);
    });
  });
}

// ====== Firmas (canvas) ======
const sigCanvases = {};
function setupSignaturePad(id){
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');
  function resize(){
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const prevData = canvas.toDataURL();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a4e';
    // restore previous drawing if any
    if(sigCanvases[id] && sigCanvases[id].hasContent){
      const img = new Image();
      img.onload = ()=>ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = prevData;
    }
  }
  sigCanvases[id] = { canvas, ctx, drawing:false, hasContent:false };
  resize();
  window.addEventListener('resize', resize);

  function getPos(e){
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }
  function start(e){
    e.preventDefault();
    sigCanvases[id].drawing = true;
    sigCanvases[id].hasContent = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }
  function move(e){
    if(!sigCanvases[id].drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }
  function end(e){
    sigCanvases[id].drawing = false;
  }
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, {passive:false});
  canvas.addEventListener('touchmove', move, {passive:false});
  canvas.addEventListener('touchend', end);
}

['sig_ib','sig_cliente','sig_ib_term','sig_cliente_term'].forEach(setupSignaturePad);

document.querySelectorAll('button[data-clearsig]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const id = btn.dataset.clearsig;
    const c = sigCanvases[id];
    c.ctx.clearRect(0,0,c.canvas.width,c.canvas.height);
    c.hasContent = false;
  });
});

function getSignatureDataUrl(id){
  const c = sigCanvases[id];
  if(!c || !c.hasContent) return null;
  return c.canvas.toDataURL('image/png');
}

function loadSignatureToCanvas(id, dataUrl){
  const c = sigCanvases[id];
  if(!c) return;
  c.ctx.clearRect(0,0,c.canvas.width,c.canvas.height);
  c.hasContent = false;
  if(!dataUrl) return;
  const img = new Image();
  img.onload = ()=>{
    const rect = c.canvas.getBoundingClientRect();
    c.ctx.drawImage(img, 0, 0, rect.width, rect.height);
    c.hasContent = true;
  };
  img.src = dataUrl;
}

// ====== Botones principales ======
document.getElementById('btnNueva').addEventListener('click', ()=>{
  currentVisit = newVisit();
  editingId = null;
  document.getElementById('formTitle').textContent = 'Nueva Visita de Calidad';
  loadFormFromVisit(currentVisit);
  showForm();
});

function openEdit(id){
  const v = visitas.find(x=>x.id===id);
  if(!v) return;
  currentVisit = JSON.parse(JSON.stringify(v));
  editingId = id;
  document.getElementById('formTitle').textContent = 'Editar Visita: ' + (v.nombre || '(sin nombre)');
  loadFormFromVisit(currentVisit);
  showForm();
}

document.getElementById('btnGuardar').addEventListener('click', ()=>{
  saveFormToVisit();
  if(!currentVisit.nombre){
    currentVisit.nombre = currentVisit.general.sitio || 'Visita sin nombre';
  }
  if(editingId){
    const idx = visitas.findIndex(v=>v.id===editingId);
    if(idx>=0) visitas[idx] = currentVisit;
  } else {
    visitas.push(currentVisit);
    editingId = currentVisit.id;
  }
  saveVisitas();
  showToast('Visita guardada.');
  document.getElementById('formTitle').textContent = 'Editar Visita: ' + (currentVisit.nombre || '(sin nombre)');
});

document.getElementById('btnCancelar').addEventListener('click', ()=>{
  showList();
});

// Exportar / Importar
document.getElementById('btnExport').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(visitas, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'visitas_calidad_backup.json';
  a.click();
});
document.getElementById('btnImport').addEventListener('click', ()=>{
  document.getElementById('fileImport').click();
});
document.getElementById('fileImport').addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(Array.isArray(data)){
      visitas = visitas.concat(data.map(v=>({...v, id: v.id || uid()})));
      saveVisitas();
      renderList();
      showToast('Datos importados.');
    } else {
      showToast('Archivo inválido.');
    }
  }catch(err){
    showToast('Error al importar: ' + err.message);
  }
  e.target.value = '';
});

// ====== Inicializacion ======
loadVisitas();
document.getElementById('logoImg').src = LOGO_BASE64;
showList();

// ====== Generacion de PDFs ======
async function withSavedData(fn){
  saveFormToVisit();
  try{
    await fn(currentVisit);
  }catch(e){
    console.error(e);
    showToast('Error al generar PDF: ' + e.message);
  }
}

document.getElementById('btnGenAgenciaOrden').addEventListener('click', ()=>{
  withSavedData(v=>generateAgenciaOrdenPdf(v));
});
document.getElementById('btnGenAgenciaAnexo').addEventListener('click', ()=>{
  withSavedData(v=>generateAgenciaAnexoPdf(v));
});
document.getElementById('btnGenTerminalOrden').addEventListener('click', ()=>{
  withSavedData(v=>generateTerminalOrdenPdf(v));
});
document.getElementById('btnGenTerminalAnexo').addEventListener('click', ()=>{
  withSavedData(v=>generateTerminalAnexoPdf(v));
});
document.getElementById('btnGenTodos').addEventListener('click', ()=>{
  withSavedData(async v=>{
    generateAgenciaOrdenPdf(v);
    await generateAgenciaAnexoPdf(v);
    generateTerminalOrdenPdf(v);
    await generateTerminalAnexoPdf(v);
    showToast('4 PDFs generados.');
  });
});
