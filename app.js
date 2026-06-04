// --- CONFIGURACIÓN CLIENTE SUPABASE ---
const SUPABASE_URL = "https://pbcyeeqkdudlnqghgwmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiY3llZXFrZHVkbG5xZ2hnd21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMzgwNjksImV4cCI6MjA5NTcxNDA2OX0.HUWjTRPmRAcgcGG-YiCnqVRQlVQlTVX_Q_O6OaCTLjk";
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- REGISTRO DE SERVICE WORKER PARA PWA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker Registrado con éxito.', reg.scope))
            .catch(err => console.error('Error al registrar Service Worker:', err));
    });
}

// --- VARIABLES GLOBALES DE TRABAJO ---
let visitasBD = JSON.parse(localStorage.getItem('visitas_soporte')) || [];
let configIngeniero = JSON.parse(localStorage.getItem('config_ingeniero')) || { nombre: '', firma: '' };

// --- INICIALIZACIÓN DE COMPONENTES CUANDO EL DOM ESTÁ LISTO ---
$(document).ready(function() {
    renderizarTablaVisitas();
    inicializarDibujoCanvas();
    cargarConfigGlobal();

    // Eventos de Navegación de la Aplicación
    $('#btnConfig').click(() => $('#secConfig').toggleClass('hidden'));
    $('#btnNuevaVisita').click(() => abrirDetalleVisita(crearNuevaVisitaEstructura()));
    $('#btnVolver').click(() => {
        $('#secDetalleVisita').addClass('hidden');
        $('#secListado').removeClass('hidden');
        renderizarTablaVisitas();
    });

    // Control de Flujo de Pestañas (Tabs)
    $('.tab-btn').click(function() {
        const targetTab = $(this).data('tab');
        $('.tab-btn').removeClass('border-blue-700 text-blue-700').addClass('border-transparent text-gray-500');
        $(this).addClass('border-blue-700 text-blue-700').removeClass('border-transparent text-gray-500');
        $('.tab-content').addClass('hidden');
        $('#' + targetTab).removeClass('hidden');
    });

    // Evento de Auto-guardado en campos de texto/formulario
    $(document).on('change blur', '.auto-save', function() {
        guardarProgresoFormularioActual();
    });

    // Gestión Dinámica de Artículos Entregados
    $('#btnAgregarArticulo').click(() => {
        agregarFilaArticulo({ cantidad: 1, marca: '', modelo: '', serial: '', observaciones: '' });
        guardarProgresoFormularioActual();
    });

    $(document).on('click', '.btn-eliminar-art', function() {
        $(this).closest('tr').remove();
        guardarProgresoFormularioActual();
    });

    // Carga de Evidencias Fotográficas a Base64
    $(document).on('change', '.input-foto', function(e) {
        const tipoGaleria = $(this).data('tipo');
        const files = e.target.files;
        const vId = $('#v_id').val();
        let visita = visitasBD.find(v => v.id == vId);

        if (!visita) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(evt) {
                visita.evidencias[tipoGaleria].push(evt.target.result);
                actualizarLocalStorageYRedraw(visita);
                renderizarGaleriaFotos(tipoGaleria, visita.evidencias[tipoGaleria], visita);
            };
            reader.readAsDataURL(file);
        });
    });

    // Firma Global del Perfil del Ingeniero
    $('#btnGuardarConfig').click(function() {
        configIngeniero.nombre = $('#cfgNombre').val();
        const canvas = document.getElementById('canvasConfigFirma');
        if (!isCanvasBlank(canvas)) {
            configIngeniero.firma = canvas.toDataURL();
        }
        localStorage.setItem('config_ingeniero', JSON.stringify(configIngeniero));
        alert('Perfil e Identidad del Ingeniero Guardados de forma local.');
        $('#secConfig').addClass('hidden');
    });

    $('#clearCfgFirma').click(() => clearCanvas(document.getElementById('canvasConfigFirma')));
    
    $('#fileCfgFirma').change(function(e) {
        cargarImagenEnCanvas(e.target.files[0], document.getElementById('canvasConfigFirma'), () => {});
    });

    // Captura de archivos de imagen para las firmas de la visita
    $('.file-firma').change(function(e) {
        const canvasId = $(this).data('canvas');
        const canvas = document.getElementById(canvasId);
        cargarImagenEnCanvas(e.target.files[0], canvas, () => {
            guardarProgresoFormularioActual();
        });
    });
});

// --- ENRUTAMIENTO DE DATOS / CRUD ---

function crearNuevaVisitaEstructura() {
    return {
        id: 'V-' + Date.now(),
        ticket: '',
        fecha_atencion: new Date().toISOString().split('T')[0],
        fecha_creacion: new Date().toISOString().split('T')[0],
        ingeniero: configIngeniero.nombre || '',
        cliente: '', ubicacion: '', contacto: '', telefono: '', correo: '',
        tipo_servicio: '', nombre_terminal: '', incidencia: '', solicita_terminal: false,
        retirado: { sn: '', mac: '' }, instalado: { sn: '', mac: '' },
        solucion_detalle: '', comentarios: '',
        articulos: [],
        evidencias: { inicial: [], mediciones: [], instalacion: [], adicionales: [] },
        firmas: { ingeniero: configIngeniero.firma || '', cliente: '' }
    };
}

function abrirDetalleVisita(visita) {
    $('#secListado').addClass('hidden');
    $('#secDetalleVisita').removeClass('hidden');
    
    // Setear Campos base
    $('#v_id').val(visita.id);
    $('#v_ticket').val(visita.ticket);
    $('#v_ingeniero').val(visita.id ? visita.ingeniero : (configIngeniero.nombre || ''));
    $('#v_fecha_creacion').val(visita.fecha_creacion);
    $('#v_fecha_atencion').val(visita.fecha_atencion);
    $('#v_cliente').val(visita.cliente);
    $('#v_ubicacion').val(visita.ubicacion);
    $('#v_contacto').val(visita.contacto);
    $('#v_telefono').val(visita.telefono);
    $('#v_correo').val(visita.correo);
    $('#v_tipo_servicio').val(visita.tipo_servicio);
    $('#v_nombre_terminal').val(visita.nombre_terminal);
    $('#v_incidencia').val(visita.incidencia);
    $('#v_solicita_terminal').prop('checked', visita.solicita_terminal);
    $('#v_retirado_sn').val(visita.retirado.sn);
    $('#v_retirado_mac').val(visita.retirado.mac);
    $('#v_instalado_sn').val(visita.instalado.sn);
    $('#v_instalado_mac').val(visita.instalado.mac);
    $('#v_solucion_detalle').val(visita.solucion_detalle);
    $('#v_comentarios').val(visita.comentarios);

    // Inyectar Artículos
    $('#tbodyArticulos').empty();
    visita.articulos.forEach(art => agregarFilaArticulo(art));

    // Cargar Galerías Fotográficas
    renderizarGaleriaFotos('inicial', visita.evidencias.inicial, visita);
    renderizarGaleriaFotos('mediciones', visita.evidencias.mediciones, visita);
    renderizarGaleriaFotos('instalacion', visita.evidencias.instalacion, visita);
    renderizarGaleriaFotos('adicionales', visita.evidencias.adicionales, visita);

    // Renderizar Firmas guardadas en Canvas
    inyectarFirmaEnCanvas('canvasFirmaIng', visita.firmas.ingeniero || configIngeniero.firma);
    inyectarFirmaEnCanvas('canvasFirmaCli', visita.firmas.cliente);

    // Si es nueva, registrarla inmediatamente en memoria local
    if (!visitasBD.some(v => v.id === visita.id)) {
        visitasBD.push(visita);
        localStorage.setItem('visitas_soporte', JSON.stringify(visitasBD));
    }
}

function guardarProgresoFormularioActual() {
    const id = $('#v_id').val();
    let index = visitasBD.findIndex(v => v.id === id);
    if (index === -1) return;

    visitasBD[index].ticket = $('#v_ticket').val();
    visitasBD[index].ingeniero = $('#v_ingeniero').val();
    visitasBD[index].fecha_creacion = $('#v_fecha_creacion').val();
    visitasBD[index].fecha_atencion = $('#v_fecha_atencion').val();
    visitasBD[index].cliente = $('#v_cliente').val();
    visitasBD[index].ubicacion = $('#v_ubicacion').val();
    visitasBD[index].contacto = $('#v_contacto').val();
    visitasBD[index].telefono = $('#v_telefono').val();
    visitasBD[index].correo = $('#v_correo').val();
    visitasBD[index].tipo_servicio = $('#v_tipo_servicio').val();
    visitasBD[index].nombre_terminal = $('#v_nombre_terminal').val();
    visitasBD[index].incidencia = $('#v_incidencia').val();
    visitasBD[index].solicita_terminal = $('#v_solicita_terminal').is(':checked');
    visitasBD[index].retirado = { sn: $('#v_retirado_sn').val(), mac: $('#v_retirado_mac').val() };
    visitasBD[index].instalado = { sn: $('#v_instalado_sn').val(), mac: $('#v_instalado_mac').val() };
    visitasBD[index].solucion_detalle = $('#v_solucion_detalle').val();
    visitasBD[index].comentarios = $('#v_comentarios').val();

    // Guardar artículos del DOM
    visitasBD[index].articulos = [];
    $('#tbodyArticulos tr').each(function() {
        visitasBD[index].articulos.push({
            cantidad: $(this).find('.art-cant').val(),
            marca: $(this).find('.art-marca').val(),
            modelo: $(this).find('.art-modelo').val(),
            serial: $(this).find('.art-sn').val(),
            observaciones: $(this).find('.art-obs').val()
        });
    });

    // Guardar Firmas desde los Canvas
    const canvasIng = document.getElementById('canvasFirmaIng');
    const canvasCli = document.getElementById('canvasFirmaCli');
    if (!isCanvasBlank(canvasIng)) visitasBD[index].firmas.ingeniero = canvasIng.toDataURL();
    if (!isCanvasBlank(canvasCli)) visitasBD[index].firmas.cliente = canvasCli.toDataURL();

    localStorage.setItem('visitas_soporte', JSON.stringify(visitasBD));
}

function actualizarLocalStorageYRedraw(visitaModificada) {
    let idx = visitasBD.findIndex(v => v.id === visitaModificada.id);
    if(idx !== -1) {
        visitasBD[idx] = visitaModificada;
        localStorage.setItem('visitas_soporte', JSON.stringify(visitasBD));
    }
}

// --- RENDERS UI DINÁMICOS ---

function renderizarTablaVisitas() {
    const $tbody = $('#tablaVisitas');
    $tbody.empty();

    if(visitasBD.length === 0) {
        $tbody.append(`<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">No hay registros de visitas locales ni sincronizados.</td></tr>`);
        return;
    }

    visitasBD.forEach(v => {
        const tieneMateriales = v.articulos && v.articulos.length > 0;
        $tbody.append(`
            <tr class="hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-blue-900">${v.ticket || 'S/N'}</td>
                <td class="p-3 text-gray-500">${v.fecha_atencion}</td>
                <td class="p-3">
                    <div class="font-semibold text-gray-700">${v.cliente || 'Sin Cliente'}</div>
                    <div class="text-xs text-gray-400">${v.ubicacion || 'Ubicación no descrita'}</div>
                </td>
                <td class="p-3 text-xs text-gray-600 max-w-xs truncate">
                    <span class="font-medium bg-gray-200 px-1 rounded">${v.nombre_terminal || 'Genérico'}</span> ${v.incidencia || ''}
                </td>
                <td class="p-3 text-center">
                    <div class="inline-flex gap-1">
                        <button onclick="procesarYImprimirPDF('${v.id}', 'ODS')" class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded font-medium">ODS</button>
                        <button onclick="procesarYImprimirPDF('${v.id}', 'IDT')" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs px-2 py-1 rounded font-medium">IDT</button>
                        <button onclick="procesarYImprimirPDF('${v.id}', 'CDE')" ${!tieneMateriales ? 'disabled title="No aplica entrega"' : ''} class="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs px-2 py-1 rounded font-medium disabled:opacity-30 disabled:pointer-events-none">CDE</button>
                    </div>
                </td>
                <td class="p-3 text-center">
                    <button onclick="cargarVisitaParaEditar('${v.id}')" class="text-blue-600 hover:text-blue-900 font-semibold mr-2">Editar</button>
                    <button onclick="eliminarVisita('${v.id}')" class="text-red-500 hover:text-red-700">Eliminar</button>
                </td>
            </tr>
        `);
    });
}

function cargarVisitaParaEditar(id) {
    const visita = visitasBD.find(v => v.id === id);
    if(visita) abrirDetalleVisita(visita);
}

function eliminarVisita(id) {
    if(confirm('¿Desea eliminar este registro de visita de manera permanente?')) {
        visitasBD = visitasBD.filter(v => v.id !== id);
        localStorage.setItem('visitas_soporte', JSON.stringify(visitasBD));
        renderizarTablaVisitas();
    }
}

function agregarFilaArticulo(art) {
    $('#tbodyArticulos').append(`
        <tr class="border-b border-gray-100">
            <td class="p-1"><input type="number" value="${art.cantidad}" class="w-full border p-1 rounded art-cant auto-save"></td>
            <td class="p-1"><input type="text" value="${art.marca}" class="w-full border p-1 rounded art-marca auto-save"></td>
            <td class="p-1"><input type="text" value="${art.modelo}" class="w-full border p-1 rounded art-modelo auto-save"></td>
            <td class="p-1"><input type="text" value="${art.serial}" class="w-full border p-1 rounded art-sn auto-save"></td>
            <td class="p-1"><input type="text" value="${art.observaciones}" class="w-full border p-1 rounded art-obs auto-save"></td>
            <td class="p-1 text-center"><button type="button" class="btn-eliminar-art text-red-500 font-bold">✕</button></td>
        </tr>
    `);
}

function renderizarGaleriaFotos(tipo, arrayFotos, visita) {
    const $box = $(`#galeria_${tipo}`);
    $box.empty();
    arrayFotos.forEach((imgBase64, index) => {
        $box.append(`
            <div class="relative w-20 h-20 border rounded bg-cover bg-center" style="background-image: url('${imgBase64}')">
                <button type="button" onclick="removerFoto('${tipo}', ${index}, '${visita.id}')" class="absolute -top-1 -right-1 bg-red-600 text-white text-xxs w-4 h-4 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
        `);
    });
}

function removerFoto(tipo, index, visitaId) {
    let visita = visitasBD.find(v => v.id === visitaId);
    if (visita) {
        visita.evidencias[tipo].splice(index, 1);
        actualizarLocalStorageYRedraw(visita);
        renderizarGaleriaFotos(tipo, visita.evidencias[tipo], visita);
    }
}

// --- DRIVER DE FIRMAS CON CANVAS (INPUT TÁCTIL / RATÓN) ---

function inicializarDibujoCanvas() {
    const canvasIds = ['canvasConfigFirma', 'canvasFirmaIng', 'canvasFirmaCli'];
    canvasIds.forEach(id => {
        const canvas = document.getElementById(id);
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        let dibujando = false;

        function obtenerPosicion(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        function empezar(e) {
            dibujando = true;
            const pos = obtenerPosicion(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }

        function mover(e) {
            if (!dibujando) return;
            e.preventDefault();
            const pos = obtenerPosicion(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }

        function terminar() { 
            if(dibujando) {
                dibujando = false;
                guardarProgresoFormularioActual();
            }
        }

        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 2;

        canvas.addEventListener('mousedown', empezar);
        canvas.addEventListener('mousemove', mover);
        window.addEventListener('mouseup', terminar);

        canvas.addEventListener('touchstart', empezar, { passive: false });
        canvas.addEventListener('touchmove', mover, { passive: false });
        window.addEventListener('touchend', terminar);
    });

    $('.clear-canvas').click(function() {
        const cid = $(this).data('canvas');
        clearCanvas(document.getElementById(cid));
        guardarProgresoFormularioActual();
    });
}

function clearCanvas(canvas) {
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function isCanvasBlank(canvas) {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

function inyectarFirmaEnCanvas(canvasId, base64) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !base64) return;
    const ctx = canvas.getContext('2d');
    clearCanvas(canvas);
    const img = new Image();
    img.src = base64;
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function cargarImagenEnCanvas(file, canvas, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function cargarConfigGlobal() {
    if (configIngeniero.nombre) $('#cfgNombre').val(configIngeniero.nombre);
    if (configIngeniero.firma) inyectarFirmaEnCanvas('canvasConfigFirma', configIngeniero.firma);
}

// --- SINCRONIZACIÓN SUPABASE NUBE ---

async function sincronizarVisitaASupabase(visita) {
    if (!supabase) return console.warn("Supabase no configurado.");
    try {
        const { data, error } = await supabase
            .from('visitas_soporte')
            .upsert({
                id: visita.id,
                ticket: visita.ticket,
                fecha_atencion: visita.fecha_atencion,
                cliente: parseInt(visita.cliente) || visita.cliente, // Se adapta a esquemas numéricos o texto
                datos_completos_json: visita 
            }, { onConflict: 'id' });

        if (error) throw error;
        console.log("Visita sincronizada en Supabase con éxito.");
    } catch (err) {
        console.error("Error al sincronizar con Supabase (operando offline):", err.message);
    }
}

// --- GENERACIÓN DE REPORTES PDF (jsPDF) ---

function procesarYImprimirPDF(id, tipoDoc) {
    const visita = visitasBD.find(v => v.id === id);
    if(!visita) return;

    // Sincronizar de fondo a la nube al presionar imprimir/generar documento
    sincronizarVisitaASupabase(visita);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Cabecera Estándar de la Empresa
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 220, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`INFOBLOCK · TERMINAL INTELLIGENCE HUB`, 14, 16);
    
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    // Metadatos
    doc.text(`TIPO DOCUMENTO: ${tipoDoc}`, 14, 35);
    doc.text(`TICKET NO: ${visita.ticket || 'N/A'}`, 14, 41);
    doc.text(`Fecha Atención: ${visita.fecha_atencion}`, 140, 35);
    doc.text(`Ing. Campo: ${visita.ingeniero || 'N/A'}`, 140, 41);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 45, 196, 45);

    // Contenido condicional en base a la naturaleza del entregable solicitado
    if(tipoDoc === 'ODS') {
        doc.text("DATOS DEL CLIENTE Y SITIO", 14, 53);
        doc.setFont("helvetica", "normal");
        doc.text(`Cliente: ${visita.cliente}`, 14, 60);
        doc.text(`Ubicación: ${visita.ubicacion}`, 14, 66);
        doc.text(`Contacto: ${visita.contacto} | Telf: ${visita.telefono}`, 14, 72);

        doc.setFont("helvetica", "bold");
        doc.text("REPORTE DE INCIDENCIA Y SOLUCIÓN", 14, 82);
        doc.setFont("helvetica", "normal");
        doc.text(`Servicio: ${visita.tipo_servicio} | Terminal: ${visita.nombre_terminal}`, 14, 89);
        doc.text(`Incidencia: ${visita.incidencia}`, 14, 95);
        doc.text(`Solución Aplicada: ${visita.solucion_detalle}`, 14, 105);
    } 
    else if (tipoDoc === 'IDT') {
        doc.text("CONSTANCIA TÉCNICA DE INSTALACIÓN DE TERMINAL", 14, 53);
        doc.setFont("helvetica", "normal");
        doc.text(`Terminal ID/Nombre: ${visita.nombre_terminal}`, 14, 62);
        doc.text(`¿Requiere cambio de hardware?: ${visita.solicita_terminal ? 'SÍ' : 'NO'}`, 14, 68);
        
        doc.setFont("helvetica", "bold");
        doc.text("Hardware Retirado:", 14, 80);
        doc.setFont("helvetica", "normal");
        doc.text(`S/N: ${visita.retirado.sn} | MAC: ${visita.retirado.mac}`, 14, 86);

        doc.setFont("helvetica", "bold");
        doc.text("Hardware Instalado Nuevo:", 14, 96);
        doc.setFont("helvetica", "normal");
        doc.text(`S/N: ${visita.instalado.sn} | MAC: ${visita.instalado.mac}`, 14, 102);
    } 
    else if (tipoDoc === 'CDE') {
        doc.text("MINUTA DE RECEPCIÓN Y ENTREGA DE MATERIALES", 14, 53);
        let y = 65;
        visita.articulos.forEach((art, index) => {
            doc.setFont("helvetica", "normal");
            doc.text(`${index + 1}. (Cant: ${art.cantidad}) - ${art.marca} / ${art.modelo} [SN: ${art.serial}]`, 14, y);
            doc.text(`    Obs: ${art.observaciones}`, 14, y + 5);
            y += 12;
        });
    }

    // Inyección de Firmas al fondo del documento
    let fY = 220;
    doc.line(14, fY, 80, fY);
    doc.line(120, fY, 186, fY);
    doc.setFontSize(8);
    doc.text("Firma Ingeniero", 35, fY + 5);
    doc.text("Firma Cliente Conformidad", 140, fY + 5);

    if(visita.firmas.ingeniero) {
        try { doc.addImage(visita.firmas.ingeniero, 'PNG', 20, fY - 30, 50, 25); } catch(e){}
    }
    if(visita.firmas.cliente) {
        try { doc.addImage(visita.firmas.cliente, 'PNG', 130, fY - 30, 50, 25); } catch(e){}
    }

    // Descarga del Archivo PDF en el navegador
    doc.save(`${tipoDoc}_TICKET_${visita.ticket || 'SIN_NUMERO'}.pdf`);
}