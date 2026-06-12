// ====== Generación de PDFs con jsPDF ======
// Paleta de colores (RGB)
const COL_NAVY = [31,78,121];
const COL_TEAL = [27,158,158];
const COL_GREEN = [147,196,125];
const COL_GRAY = [230,230,230];
const COL_LIGHTGRAY = [245,245,245];
const COL_BORDER = [200,200,200];

const PAGE_W = 215.9; // letter width mm
const PAGE_H = 279.4; // letter height mm
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN*2;

function newPdfDoc(){
  return new jspdf.jsPDF({ unit:'mm', format:'letter' });
}

// Dibuja encabezado: ticket/fecha (izquierda) y logo (derecha)
function drawHeader(doc, v){
  doc.setFont('helvetica','normal');
  doc.setFontSize(10);
  doc.setTextColor(0,0,0);

  // Ticket de servicio
  doc.text('Ticket de servicio:', MARGIN, 14);
  doc.setDrawColor(150,150,150);
  doc.line(MARGIN+32, 14.5, MARGIN+70, 14.5);
  doc.text(v.general.ticket || '', MARGIN+33, 13.5);

  // Fecha
  doc.text('Fecha:', MARGIN, 20);
  const fechaParts = formatFechaParts(v.general.fecha);
  doc.line(MARGIN+15, 20.5, MARGIN+35, 20.5);
  doc.text(fechaParts.d, MARGIN+22, 19.5, {align:'center'});
  doc.text('/', MARGIN+36, 19.5);
  doc.line(MARGIN+38, 20.5, MARGIN+58, 20.5);
  doc.text(fechaParts.m, MARGIN+45, 19.5, {align:'center'});
  doc.text('/', MARGIN+59, 19.5);
  doc.line(MARGIN+61, 20.5, MARGIN+81, 20.5);
  doc.text(fechaParts.y, MARGIN+68, 19.5, {align:'center'});

  // Logo
  try{
    const imgW = 50, imgH = 50 * (794/2500);
    doc.addImage(LOGO_BASE64, 'PNG', PAGE_W - MARGIN - imgW, 8, imgW, imgH);
  }catch(e){}

  return 30; // y inicial de contenido
}

function formatFechaParts(fechaStr){
  if(!fechaStr) return {d:'',m:'',y:''};
  const parts = fechaStr.split('-'); // yyyy-mm-dd
  if(parts.length !== 3) return {d:'',m:'',y:''};
  return { y: parts[0], m: parts[1], d: parts[2] };
}

// Pie de pagina con texto legal y barra de color
function drawFooter(doc, pageNum){
  const y = PAGE_H - 18;
  doc.setFont('helvetica','normal');
  doc.setFontSize(8);
  doc.setTextColor(80,80,80);
  const text = 'Estimado cliente: revise y lea detenidamente este ticket de servicio, su firma representa la aceptación de los trabajos aquí descritos a su entera satisfacción. Gracias.';
  const lines = doc.splitTextToSize(text, CONTENT_W - 15);
  doc.text(lines, MARGIN, y, {align:'left'});
  doc.setFontSize(10);
  doc.setTextColor(0,0,0);
  doc.text(String(pageNum), PAGE_W - MARGIN - 3, y+3);

  // Barra inferior tricolor
  const barY = PAGE_H - 4;
  const barH = 2.5;
  const w1 = CONTENT_W * 0.45, w2 = CONTENT_W * 0.35, w3 = CONTENT_W * 0.20;
  doc.setFillColor(...COL_NAVY);
  doc.rect(MARGIN, barY, w1, barH, 'F');
  doc.setFillColor(...COL_TEAL);
  doc.rect(MARGIN+w1, barY, w2, barH, 'F');
  doc.setFillColor(...COL_GREEN);
  doc.rect(MARGIN+w1+w2, barY, w3, barH, 'F');
}

function finalizeDoc(doc){
  const pageCount = doc.internal.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){
    doc.setPage(i);
    drawFooter(doc, i);
  }
}

function downloadPdf(doc, filename){
  doc.save(filename);
}

// Sanitiza nombre de archivo
function safeFilename(name){
  return (name || 'documento').replace(/[^a-zA-Z0-9_\-]+/g,'_').slice(0,60);
}

// ====== Tabla de checklist generica ======
function drawChecklistTable(doc, y, items, dataObj, sectionTitle){
  const colNum = 12, colSi = 14, colNo = 14, colValor = 28;
  const colDesc = CONTENT_W - colNum - colSi - colNo - colValor;
  const rowH = 7;

  // Encabezado de seccion (numero + titulo)
  doc.setFillColor(255,255,255);
  doc.setDrawColor(...COL_BORDER);
  doc.setFontSize(10);
  doc.setFont('helvetica','bold');
  doc.setTextColor(0,0,0);
  doc.rect(MARGIN, y, CONTENT_W, 7);
  doc.text(sectionTitle, MARGIN + CONTENT_W/2, y+5, {align:'center'});
  y += 7;

  // Encabezado de columnas
  doc.setFillColor(...COL_TEAL);
  doc.setTextColor(255,255,255);
  doc.rect(MARGIN, y, colNum, 7, 'FD');
  doc.rect(MARGIN+colNum, y, colDesc, 7, 'FD');
  doc.rect(MARGIN+colNum+colDesc, y, colSi, 7, 'FD');
  doc.rect(MARGIN+colNum+colDesc+colSi, y, colNo, 7, 'FD');
  doc.rect(MARGIN+colNum+colDesc+colSi+colNo, y, colValor, 7, 'FD');
  doc.setFontSize(8);
  doc.text('Núm.', MARGIN+colNum/2, y+4.5, {align:'center'});
  doc.text('Descripción', MARGIN+colNum+3, y+4.5);
  doc.text('Sí', MARGIN+colNum+colDesc+colSi/2, y+4.5, {align:'center'});
  doc.text('No', MARGIN+colNum+colDesc+colSi+colNo/2, y+4.5, {align:'center'});
  doc.text('Valor', MARGIN+colNum+colDesc+colSi+colNo+3, y+4.5);
  y += 7;

  doc.setTextColor(0,0,0);
  doc.setFont('helvetica','normal');

  items.forEach(it=>{
    const [num, desc, defVal] = it;
    const state = (dataObj && dataObj[num]) || {resp:'', valor: defVal || ''};

    doc.setFontSize(8);
    const descLines = doc.splitTextToSize(desc, colDesc - 4);
    const valLines = doc.splitTextToSize(state.valor || '', colValor - 4);
    const lineH = 4;
    const thisRowH = Math.max(rowH, Math.max(descLines.length, valLines.length) * lineH + 2);

    // Salto de pagina si no entra
    if(y + thisRowH > PAGE_H - 22){
      doc.addPage();
      y = 15;
    }

    doc.setDrawColor(...COL_BORDER);
    doc.setFillColor(...COL_LIGHTGRAY);
    doc.rect(MARGIN, y, colNum, thisRowH, 'FD');
    doc.rect(MARGIN+colNum, y, colDesc, thisRowH);
    doc.rect(MARGIN+colNum+colDesc, y, colSi, thisRowH);
    doc.rect(MARGIN+colNum+colDesc+colSi, y, colNo, thisRowH);
    doc.rect(MARGIN+colNum+colDesc+colSi+colNo, y, colValor, thisRowH);

    doc.setFont('helvetica','bold');
    doc.text(num, MARGIN+colNum/2, y+thisRowH/2+1.5, {align:'center'});
    doc.setFont('helvetica','normal');
    doc.text(descLines, MARGIN+colNum+2, y+5);
    doc.text(valLines, MARGIN+colNum+colDesc+colSi+colNo+2, y+5);

    // Marca X en Si/No
    doc.setFont('helvetica','bold');
    if(state.resp === 'si'){
      doc.text('X', MARGIN+colNum+colDesc+colSi/2, y+thisRowH/2+1.5, {align:'center'});
    } else if(state.resp === 'no'){
      doc.text('X', MARGIN+colNum+colDesc+colSi+colNo/2, y+thisRowH/2+1.5, {align:'center'});
    }
    doc.setFont('helvetica','normal');

    y += thisRowH;
  });

  return y;
}

// ====== PDF 1: Orden de Servicio - Agencia ======
function generateAgenciaOrdenPdf(v){
  const doc = newPdfDoc();
  let y = drawHeader(doc, v);

  // Titulo
  doc.setFont('helvetica','normal');
  doc.setFontSize(18);
  doc.setTextColor(...COL_NAVY);
  doc.text('Orden de Servicio – Visita de Calidad', PAGE_W/2, y+4, {align:'center'});
  y += 12;

  // Datos del cliente
  doc.setFontSize(11);
  doc.setTextColor(0,0,0);
  doc.text('Datos del cliente', MARGIN, y);
  y += 4;

  const rows = [
    ['Cliente:', v.general.cliente, 'Sitio:', v.general.sitio],
    ['Contacto del cliente en sitio:', v.general.contacto, '', ''],
    ['Dirección:', v.general.direccion, '', ''],
    ['Código Postal, entidad federativa, municipio:', v.general.cp, '', ''],
  ];
  doc.setDrawColor(...COL_BORDER);
  doc.setFontSize(9);

  // Cliente / Sitio row
  let rh = 7;
  doc.rect(MARGIN, y, CONTENT_W, rh);
  doc.setTextColor(...COL_TEAL);
  doc.text('Cliente: ' + (v.general.cliente||''), MARGIN+2, y+4.5);
  doc.text('Sitio: ' + (v.general.sitio||''), MARGIN+CONTENT_W*0.6, y+4.5);
  y += rh;

  const fieldRows = [
    ['Contacto del cliente en sitio:', v.general.contacto],
    ['Dirección:', v.general.direccion],
    ['Código Postal, entidad federativa, municipio:', v.general.cp],
  ];
  fieldRows.forEach(([label, value])=>{
    const valLines = doc.splitTextToSize(String(value||''), CONTENT_W - 70);
    const h = Math.max(7, valLines.length*4+2);
    doc.rect(MARGIN, y, CONTENT_W, h);
    doc.setTextColor(...COL_TEAL);
    doc.text(label, MARGIN+2, y+4.5);
    doc.setTextColor(0,0,0);
    doc.text(valLines, MARGIN+68, y+4.5);
    y += h;
  });

  // Tel / Ext / Correo row
  doc.rect(MARGIN, y, CONTENT_W, rh);
  doc.setTextColor(...COL_TEAL);
  doc.text('Tel: ' + (v.general.tel||''), MARGIN+2, y+4.5);
  doc.text('Ext: ' + (v.general.ext||''), MARGIN+CONTENT_W*0.45, y+4.5);
  doc.text('Correo: ' + (v.general.correo||''), MARGIN+CONTENT_W*0.6, y+4.5);
  y += rh + 4;

  // Protocolo de revision
  doc.setFontSize(13);
  doc.setTextColor(...COL_NAVY);
  doc.text('Protocolo de revisión', PAGE_W/2, y, {align:'center'});
  y += 6;

  y = drawChecklistTable(doc, y, SECCION1, v.checklist1, '1.  Energía y tierra – Instalación del cliente');
  y += 3;

  if(y > PAGE_H - 60){ doc.addPage(); y = 15; }
  doc.setFontSize(9);
  doc.setTextColor(...COL_TEAL);
  doc.setFont('helvetica','italic');
  const noteLines = doc.splitTextToSize('El apartado 2 se llenará al finalizar el protocolo con el responsable por el cliente:', CONTENT_W);
  doc.text(noteLines, MARGIN, y+4);
  doc.setFont('helvetica','normal');
  y += noteLines.length*4 + 3;

  y = drawChecklistTable(doc, y, SECCION2, v.checklist2, '2.  Conocimiento de operación – Cliente');
  y += 6;

  // Firmas Por IBServices / Por cliente
  if(y > PAGE_H - 70){ doc.addPage(); y = 15; }
  const halfW = CONTENT_W/2;
  doc.setFontSize(12);
  doc.setFont('helvetica','bold');
  doc.setTextColor(...COL_NAVY);
  doc.text('Por IBServices', MARGIN + halfW/2, y+5, {align:'center'});
  doc.text('Por cliente', MARGIN + halfW + halfW/2, y+5, {align:'center'});
  y += 8;

  // Nombre y firma boxes
  doc.setFontSize(9);
  doc.setTextColor(...COL_TEAL);
  doc.setFont('helvetica','bold');
  const sigBoxH = 28;
  doc.setDrawColor(...COL_BORDER);
  doc.rect(MARGIN, y, halfW, sigBoxH);
  doc.rect(MARGIN+halfW, y, halfW, sigBoxH);
  doc.text('Nombre y firma:', MARGIN+2, y+5);
  doc.text('Nombre y firma:', MARGIN+halfW+2, y+5);
  doc.setFont('helvetica','normal');
  doc.setTextColor(0,0,0);
  doc.setFontSize(8);
  doc.text(v.firmas.ib_nombre || '', MARGIN+2, y+9);
  doc.text(v.firmas.cliente_nombre || '', MARGIN+halfW+2, y+9);

  // Firmas (imagenes)
  try{
    if(v.firmas.sig_ib) doc.addImage(v.firmas.sig_ib, 'PNG', MARGIN+5, y+10, halfW-10, sigBoxH-12);
  }catch(e){}
  try{
    if(v.firmas.sig_cliente) doc.addImage(v.firmas.sig_cliente, 'PNG', MARGIN+halfW+5, y+10, halfW-10, sigBoxH-12);
  }catch(e){}
  y += sigBoxH;

  // Comentarios
  const comBoxH = 50;
  if(y + comBoxH > PAGE_H - 22){ doc.addPage(); y = 15; }
  doc.setFontSize(9);
  doc.setTextColor(0,0,0);
  doc.setFont('helvetica','normal');
  doc.rect(MARGIN, y, CONTENT_W, comBoxH);
  doc.text('Comentarios:', MARGIN+2, y+5);
  const comLines = doc.splitTextToSize(v.comentariosAgencia || '', CONTENT_W - 4);
  doc.text(comLines, MARGIN+2, y+10);

  finalizeDoc(doc);
  downloadPdf(doc, `Orden_de_servicio_Agencia_${safeFilename(v.nombre)}.pdf`);
}

// Altura maxima de la imagen para que entren 2 fotografias por pagina
const MAX_PHOTO_IMG_H = 90;

// ====== Helper: dibuja un bloque de seccion con imagenes ======
// title: titulo seccion oscuro (navy), subtitle: barra teal (opcional), images: array dataURL
function drawPhotoSection(doc, y, title, subtitle, images, commentText){
  const imgs = images || [];

  // Altura del encabezado (titulo + subtitulo) que debe permanecer junto a la primera fotografia
  let headerH = 0;
  if(title) headerH += 7;
  if(subtitle) headerH += 6;

  // Altura de la primera "unidad" (encabezado + primera foto, o encabezado + placeholder)
  let firstUnitH = headerH;
  if(imgs.length === 0){
    firstUnitH += 20; // placeholder "(Sin fotografía)"
  } else {
    const dim0 = getImageDisplaySize(imgs[0], CONTENT_W - 10);
    firstUnitH += dim0.h + 8;
  }

  // Si el encabezado + primera foto no caben juntos en la pagina actual, saltar de pagina ANTES de dibujar el encabezado
  if(headerH > 0 && y + firstUnitH > PAGE_H - 22){
    doc.addPage();
    y = 15;
  }

  // Titulo navy
  if(title){
    if(y > PAGE_H - 25){ doc.addPage(); y = 15; }
    doc.setFillColor(...COL_NAVY);
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','normal');
    doc.setFontSize(11);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.text(title, PAGE_W/2, y+5, {align:'center'});
    y += 7;
  }
  // Subtitulo teal
  if(subtitle){
    if(y > PAGE_H - 25){ doc.addPage(); y = 15; }
    doc.setFillColor(...COL_TEAL);
    doc.setTextColor(255,255,255);
    doc.setFontSize(10);
    doc.rect(MARGIN, y, CONTENT_W, 6, 'F');
    doc.text(subtitle, MARGIN+2, y+4.5);
    y += 6;
  }

  // Marco contenedor para imagenes
  if(imgs.length === 0){
    const boxH = 20;
    if(y + boxH > PAGE_H - 22){ doc.addPage(); y = 15; }
    doc.setDrawColor(...COL_BORDER);
    doc.setLineDashPattern([1,1],0);
    doc.rect(MARGIN, y, CONTENT_W, boxH);
    doc.setLineDashPattern([],0);
    doc.setTextColor(180,180,180);
    doc.setFontSize(9);
    doc.text('(Sin fotografía)', PAGE_W/2, y+boxH/2+1, {align:'center'});
    y += boxH;
  } else {
    for(const img of imgs){
      const dim = getImageDisplaySize(img, CONTENT_W - 10);
      const boxH = dim.h + 8;
      if(y + boxH > PAGE_H - 22){ doc.addPage(); y = 15; }
      doc.setDrawColor(...COL_BORDER);
      doc.setLineDashPattern([1,1],0);
      doc.rect(MARGIN, y, CONTENT_W, boxH);
      doc.setLineDashPattern([],0);
      try{
        doc.addImage(img, 'JPEG', MARGIN + (CONTENT_W-dim.w)/2, y+4, dim.w, dim.h);
      }catch(e){}
      y += boxH;
    }
  }

  // Comentarios
  if(commentText !== undefined){
    const lines = doc.splitTextToSize(commentText || '', CONTENT_W - 4);
    const boxH = Math.max(8, lines.length*4 + 5);
    if(y + boxH > PAGE_H - 22){ doc.addPage(); y = 15; }
    doc.setFillColor(...COL_LIGHTGRAY);
    doc.setDrawColor(...COL_BORDER);
    doc.setLineDashPattern([1,1],0);
    doc.rect(MARGIN, y, CONTENT_W, boxH, 'FD');
    doc.setLineDashPattern([],0);
    doc.setTextColor(0,0,0);
    doc.setFontSize(9);
    doc.text('Comentarios:', MARGIN+2, y+4.5);
    if(commentText) doc.text(lines, MARGIN+2, y+9);
    y += boxH;
  }

  return y + 3;
}

// Calcula tamaño de imagen embebida (max width), preservando proporcion, altura limitada
// para que entren exactamente 2 fotografias por pagina
function getImageDisplaySize(dataUrl, maxW){
  const cacheKey = dataUrl.slice(0,100);
  if(_imgSizeCache[cacheKey]) {
    const {w,h} = _imgSizeCache[cacheKey];
    let dw = maxW, dh = h * (maxW/w);
    if(dh > MAX_PHOTO_IMG_H){ dh = MAX_PHOTO_IMG_H; dw = w * (MAX_PHOTO_IMG_H/h); }
    return {w:dw, h:dh};
  }
  let dw = maxW, dh = maxW*0.65;
  if(dh > MAX_PHOTO_IMG_H){ dh = MAX_PHOTO_IMG_H; dw = dh/0.65; }
  return {w:dw, h:dh};
}
const _imgSizeCache = {};
function preloadImageSizes(images){
  return Promise.all(images.map(src=>{
    return new Promise(resolve=>{
      const img = new Image();
      img.onload = ()=>{ _imgSizeCache[src.slice(0,100)] = {w:img.width, h:img.height}; resolve(); };
      img.onerror = ()=>resolve();
      img.src = src;
    });
  }));
}

// ====== PDF 2: Anexo fotografico - Agencia ======
async function generateAgenciaAnexoPdf(v){
  // Preload all images for sizing
  const allImgs = [
    ...v.fotosAgencia.ag_tablero, ...v.fotosAgencia.ag_fn, ...v.fotosAgencia.ag_nt,
    ...v.fotosAgencia.ag_telurometro, ...v.fotosAgencia.ag_registro
  ];
  await preloadImageSizes(allImgs);

  const doc = newPdfDoc();
  let y = drawHeader(doc, v);

  doc.setFont('helvetica','normal');
  doc.setFontSize(18);
  doc.setTextColor(...COL_NAVY);
  doc.text('Anexo – Testigo fotográfico', PAGE_W/2, y+4, {align:'center'});
  y += 12;

  const nombreSitio = v.fotosAgencia.nombreSitio || '[Nombre del Sitio]';
  y = drawPhotoSection(doc, y, nombreSitio, 'Foto tablero principal y/o secundario - Área completa y vista cercana', v.fotosAgencia.ag_tablero);

  y = drawPhotoSection(doc, y, 'Voltaje de salida del tablero', 'Multímetro fase – neutro (110-137)', v.fotosAgencia.ag_fn);
  y = drawPhotoSection(doc, y, null, 'Multímetro neutro – tierra (0 - 5)', v.fotosAgencia.ag_nt);

  y = drawPhotoSection(doc, y, 'Tierra física', 'Telurómetro (menor a 3 ohms)', v.fotosAgencia.ag_telurometro, v.fotosAgencia.ag_telurometro_comments);

  y = drawPhotoSection(doc, y, 'Registro', 'Complementarias, registros', v.fotosAgencia.ag_registro, v.fotosAgencia.ag_registro_comments);

  finalizeDoc(doc);
  downloadPdf(doc, `Anexo_fotografico_Agencia_${safeFilename(v.nombre)}.pdf`);
}

// ====== PDF 3: Orden de Servicio - Terminal ======
function generateTerminalOrdenPdf(v){
  const doc = newPdfDoc();
  let y = drawHeader(doc, v);

  doc.setFont('helvetica','normal');
  doc.setFontSize(18);
  doc.setTextColor(...COL_NAVY);
  doc.text('Orden de Servicio – Visita de Calidad', PAGE_W/2, y+4, {align:'center'});
  y += 12;

  // Tabla info terminal
  const idTerminal = v.terminal.id || '[Nombre]';
  doc.setDrawColor(...COL_BORDER);
  doc.setFillColor(...COL_LIGHTGRAY);

  const colW1 = CONTENT_W * 0.32, colW2 = CONTENT_W * 0.18, colW3 = CONTENT_W * 0.18, colW4 = CONTENT_W * 0.32;

  // Header row
  doc.rect(MARGIN, y, CONTENT_W, 7, 'FD');
  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.setTextColor(0,0,0);
  doc.text('ID de terminal en tablero ' + idTerminal, MARGIN+2, y+5);
  y += 7;

  function infoRow(label1, val1, label2, val2){
    const h = 7;
    doc.setFillColor(255,255,255);
    doc.rect(MARGIN, y, colW1, h, 'FD');
    doc.rect(MARGIN+colW1, y, colW2, h, 'FD');
    doc.rect(MARGIN+colW1+colW2, y, colW3, h, 'FD');
    doc.rect(MARGIN+colW1+colW2+colW3, y, colW4, h, 'FD');
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.setTextColor(...COL_TEAL);
    doc.text(label1, MARGIN+2, y+4.5);
    doc.text(label2, MARGIN+colW1+colW2+2, y+4.5);
    doc.setFont('helvetica','normal');
    doc.setTextColor(0,0,0);
    doc.text(String(val1||''), MARGIN+colW1+2, y+4.5);
    doc.text(String(val2||''), MARGIN+colW1+colW2+colW3+2, y+4.5);
    y += h;
  }
  infoRow('Número de serie', v.terminal.serie, 'MAC', v.terminal.mac);
  infoRow('Versión de firmware', v.terminal.firmware, 'Validar configuración app', v.terminal.validar || 'Testigo fotográfico');

  // Biometrico row
  {
    const h = 9;
    doc.setFillColor(255,255,255);
    doc.rect(MARGIN, y, colW1, h, 'FD');
    doc.rect(MARGIN+colW1, y, colW2, h, 'FD');
    doc.rect(MARGIN+colW1+colW2, y, colW3, h, 'FD');
    doc.rect(MARGIN+colW1+colW2+colW3, y, colW4, h, 'FD');
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.setTextColor(...COL_TEAL);
    doc.text('Versión de biométrico', MARGIN+2, y+5);
    doc.setFont('helvetica','normal');
    doc.setTextColor(0,0,0);
    const opts = ['G3.3C','G3.4C','G3.6C'];
    const sel = v.terminal.biometrico || 'G3.3C';
    const xpos = [MARGIN+colW1+2, MARGIN+colW1+colW2+2, MARGIN+colW1+colW2+colW3+2];
    opts.forEach((opt,i)=>{
      const marker = (opt===sel) ? '> ' : '';
      doc.setFont('helvetica', opt===sel ? 'bold':'normal');
      doc.text(marker + opt, xpos[i], y+4.5);
      if(opt==='G3.3C'){
        doc.setFontSize(6);
        doc.text('(necesario cambio de equipo)', xpos[i], y+8);
        doc.setFontSize(9);
      }
    });
    y += h + 3;
  }

  // Sección 3
  y = drawChecklistTable(doc, y, SECCION3, v.checklist3, '1.  Energía y red por terminal');
  y += 3;

  // Sección 4
  y = drawChecklistTable(doc, y, SECCION4, v.checklist4, '2.  Hardware y entorno ambiental');
  y += 6;

  // Firmas
  if(y > PAGE_H - 70){ doc.addPage(); y = 15; }
  const halfW = CONTENT_W/2;
  doc.setFontSize(12);
  doc.setFont('helvetica','bold');
  doc.setTextColor(...COL_NAVY);
  doc.text('Por IBServices', MARGIN + halfW/2, y+5, {align:'center'});
  doc.text('Por cliente', MARGIN + halfW + halfW/2, y+5, {align:'center'});
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(...COL_TEAL);
  doc.setFont('helvetica','bold');
  const sigBoxH = 28;
  doc.setDrawColor(...COL_BORDER);
  doc.rect(MARGIN, y, halfW, sigBoxH);
  doc.rect(MARGIN+halfW, y, halfW, sigBoxH);
  doc.text('Nombre y firma:', MARGIN+2, y+5);
  doc.text('Nombre y firma:', MARGIN+halfW+2, y+5);
  doc.setFont('helvetica','normal');
  doc.setTextColor(0,0,0);
  doc.setFontSize(8);
  doc.text(v.firmas.ib_nombre || '', MARGIN+2, y+9);
  doc.text(v.firmas.cliente_nombre || '', MARGIN+halfW+2, y+9);

  try{
    if(v.firmas.sig_ib_term) doc.addImage(v.firmas.sig_ib_term, 'PNG', MARGIN+5, y+10, halfW-10, sigBoxH-12);
  }catch(e){}
  try{
    if(v.firmas.sig_cliente_term) doc.addImage(v.firmas.sig_cliente_term, 'PNG', MARGIN+halfW+5, y+10, halfW-10, sigBoxH-12);
  }catch(e){}
  y += sigBoxH;

  // Comentarios
  const comBoxH = 50;
  if(y + comBoxH > PAGE_H - 22){ doc.addPage(); y = 15; }
  doc.setFontSize(9);
  doc.setTextColor(0,0,0);
  doc.setFont('helvetica','normal');
  doc.rect(MARGIN, y, CONTENT_W, comBoxH);
  doc.text('Comentarios:', MARGIN+2, y+5);
  const comLines = doc.splitTextToSize(v.comentariosTerminal || '', CONTENT_W - 4);
  doc.text(comLines, MARGIN+2, y+10);

  finalizeDoc(doc);
  downloadPdf(doc, `Orden_de_servicio_Terminal_${safeFilename(v.nombre)}.pdf`);
}

// ====== PDF 4: Anexo fotografico - Terminal ======
async function generateTerminalAnexoPdf(v){
  const ft = v.fotosTerminal;
  const allImgs = [
    ...ft.te_terminal, ...ft.te_config, ...ft.te_serie, ...ft.te_fn, ...ft.te_nt,
    ...ft.te_voltaje, ...ft.te_poe, ...ft.te_cableado, ...ft.te_complementarias
  ];
  await preloadImageSizes(allImgs);

  const doc = newPdfDoc();
  let y = drawHeader(doc, v);

  doc.setFont('helvetica','normal');
  doc.setFontSize(18);
  doc.setTextColor(...COL_NAVY);
  doc.text('Anexo – Testigos fotográficos', PAGE_W/2, y+4, {align:'center'});
  y += 12;

  const nombreTerminal = ft.nombreTerminal || '[Nombre]';
  y = drawPhotoSection(doc, y, 'Terminal ' + nombreTerminal, 'Foto terminal - Área completa y vista cercana', ft.te_terminal);

  y = drawPhotoSection(doc, y, null, 'Pantalla de configuración: red y status', ft.te_config, ft.te_config_comments);

  y = drawPhotoSection(doc, y, null, 'Número de serie Terminal', ft.te_serie);

  y = drawPhotoSection(doc, y, 'Mediciones', 'Multímetro fase – neutro (110-137)', ft.te_fn);
  y = drawPhotoSection(doc, y, null, 'Multímetro neutro – tierra (0 - 5)', ft.te_nt, ft.te_mediciones_comments);

  y = drawPhotoSection(doc, y, null, 'Voltaje de salida (13.6 – 13.9) calibrada la fuente conmutada', ft.te_voltaje, ft.te_voltaje_comments);

  y = drawPhotoSection(doc, y, null, 'Poe tester', ft.te_poe, ft.te_poe_comments);

  y = drawPhotoSection(doc, y, 'Escaneo de cableado', null, ft.te_cableado, ft.te_cableado_comments);

  y = drawPhotoSection(doc, y, 'Complementarias de hardware y entorno ambiental', null, ft.te_complementarias, ft.te_complementarias_comments);

  finalizeDoc(doc);
  downloadPdf(doc, `Anexo_fotografico_Terminal_${safeFilename(v.nombre)}.pdf`);
}