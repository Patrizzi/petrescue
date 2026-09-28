// ==========================================================
// PetRescue - Lógica y Conexión Frontend con Backend / MySQL
// ==========================================================

const API_BASE_URL = '/api';

// Estado global de la aplicación
const state = {
  currentView: 'voluntario', // 'voluntario' | 'adoptante'
  currentMascotaId: 1, // Luna (#PR-2024-0091)
  adoptanteMascotaId: 2, // Max (#PR-2026-0347)
  currentStep: 1,
  rescateFotoBase64: null,
  adoptionFormData: {
    // Paso 1: Hogar
    tipo_vivienda: '',
    metros_cuadrados: '',
    colonia: '',
    ciudad: '',
    tiene_jardin: false,
    permite_mascotas: false,
    area_descanso: false,
    // Paso 2: Rutina
    horas_solo: '',
    responsable: '',
    tiempo_paseos: '',
    plan_emergencia: '',
    // Paso 3: Experiencia
    experiencia_previa: 'Sí, con experiencia',
    otras_mascotas: '',
    veterinario_referencia: '',
    acuerdo_familiar: 'Sí, todos de acuerdo',
    // Paso 4: Compromiso y Solicitante
    nombre_solicitante: '',
    email: '',
    telefono: '',
    presupuesto_estimado: '',
    compromiso_cuidados: true,
    acepta_seguimiento: true
  }
};

// ==========================================================
// INICIALIZACIÓN
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupImageUploader();
  setupRescueForm();
  setupMedicalHistory();
  setupAdoptionStepper();
  checkDatabaseStatus();
});

// ==========================================================
// 1. NAVEGACIÓN ENTRE VISTAS (Voluntario / Adoptante)
// ==========================================================
function setupNavigation() {
  const btnVoluntario = document.getElementById('btnNavVoluntario');
  const btnAdoptante = document.getElementById('btnNavAdoptante');
  const viewVoluntario = document.getElementById('viewVoluntario');
  const viewAdoptante = document.getElementById('viewAdoptante');

  btnVoluntario.addEventListener('click', () => switchView('voluntario'));
  btnAdoptante.addEventListener('click', () => switchView('adoptante'));
}

function switchView(viewName) {
  state.currentView = viewName;
  const btnVoluntario = document.getElementById('btnNavVoluntario');
  const btnAdoptante = document.getElementById('btnNavAdoptante');
  const viewVoluntario = document.getElementById('viewVoluntario');
  const viewAdoptante = document.getElementById('viewAdoptante');

  if (viewName === 'voluntario') {
    document.body.classList.remove('mode-adoptante');
    btnVoluntario.classList.add('active');
    btnAdoptante.classList.remove('active');
    viewVoluntario.classList.add('active');
    viewAdoptante.classList.remove('active');
  } else {
    document.body.classList.add('mode-adoptante');
    btnAdoptante.classList.add('active');
    btnVoluntario.classList.remove('active');
    viewAdoptante.classList.add('active');
    viewVoluntario.classList.remove('active');
  }
}

// ==========================================================
// 2. SUBIDA Y PREVISUALIZACIÓN DE FOTOGRAFÍA (NUEVO RESCATE)
// ==========================================================
function setupImageUploader() {
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('fotoInput');
  const previewContainer = document.getElementById('uploadPreviewContainer');
  const previewImg = document.getElementById('uploadPreviewImg');
  const uploadContent = document.getElementById('uploadContent');
  const btnRemove = document.getElementById('btnRemovePhoto');

  dropzone.addEventListener('click', (e) => {
    if (e.target !== btnRemove && !btnRemove.contains(e.target)) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('La imagen no debe superar los 10 MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        state.rescateFotoBase64 = event.target.result;
        previewImg.src = state.rescateFotoBase64;
        uploadContent.style.display = 'none';
        previewContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  btnRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    state.rescateFotoBase64 = null;
    fileInput.value = '';
    previewImg.src = '';
    previewContainer.style.display = 'none';
    uploadContent.style.display = 'block';
  });

  // Drag & drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--teal-primary)';
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-dashed)';
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-dashed)';
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      const event = new Event('change');
      fileInput.dispatchEvent(event);
    }
  });
}

// ==========================================================
// 3. FORMULARIO DE NUEVO RESCATE (VISTA VOLUNTARIO)
// ==========================================================
function setupRescueForm() {
  const form = document.getElementById('formNuevoRescate');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const especie = document.getElementById('especieSelect').value;
    const nombre = document.getElementById('nombreRescate').value.trim();
    const descripcion_estado = document.getElementById('descripcionEstado').value.trim();
    const ubicacion_rescate = document.getElementById('ubicacionRescate').value.trim();

    if (!especie) {
      showToast('Por favor selecciona una especie', 'error');
      return;
    }
    if (!descripcion_estado || !ubicacion_rescate) {
      showToast('Completa la descripción del estado y la ubicación', 'error');
      return;
    }

    const payload = {
      nombre: nombre || 'Animal Rescatado',
      especie: especie,
      descripcion_estado: descripcion_estado,
      ubicacion_rescate: ubicacion_rescate,
      imagen_url: state.rescateFotoBase64 || '/images/luna.jpg'
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Guardando en MySQL...';

    try {
      const response = await fetch(`${API_BASE_URL}/rescates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast(`¡Rescate ${data.codigo} registrado exitosamente en MySQL!`, 'success');
        form.reset();
        // Reset preview
        document.getElementById('btnRemovePhoto').click();
      } else {
        throw new Error(data.error || 'Error al guardar');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con el servidor o MySQL', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ==========================================================
// 4. HISTORIAL MÉDICO & MODAL (VISTA VOLUNTARIO)
// ==========================================================
function setupMedicalHistory() {
  loadMedicalHistory(state.currentMascotaId);

  // Modal setup
  const btnOpenModal = document.getElementById('btnOpenAddMedicalModal');
  const modal = document.getElementById('modalAddMedical');
  const btnCloseModal = document.getElementById('btnCloseMedicalModal');
  const btnCancelModal = document.getElementById('btnCancelMedicalModal');
  const formMedical = document.getElementById('formAddMedical');

  btnOpenModal.addEventListener('click', () => {
    // Asignar fecha actual por defecto
    document.getElementById('medFecha').value = new Date().toISOString().split('T')[0];
    modal.classList.add('active');
  });

  const closeModal = () => modal.classList.remove('active');
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  formMedical.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      mascota_id: state.currentMascotaId,
      tipo_evento: document.getElementById('medTipo').value,
      titulo: document.getElementById('medTitulo').value.trim(),
      veterinario: document.getElementById('medVeterinario').value.trim(),
      fecha: document.getElementById('medFecha').value,
      notas: document.getElementById('medNotas').value.trim()
    };

    try {
      const res = await fetch(`${API_BASE_URL}/historial_medico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Registro médico añadido a MySQL con éxito', 'success');
        closeModal();
        formMedical.reset();
        loadMedicalHistory(state.currentMascotaId);
      } else {
        showToast(data.error || 'Error al guardar registro', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión al guardar registro médico', 'error');
    }
  });
}

async function loadMedicalHistory(mascotaId) {
  try {
    const res = await fetch(`${API_BASE_URL}/historial_medico/${mascotaId}`);
    if (!res.ok) throw new Error('Error al cargar historial');
    const data = await res.json();

    // Actualizar Estadísticas
    document.getElementById('statConsultas').textContent = data.stats.consultas || '0';
    document.getElementById('statTratamientos').textContent = data.stats.tratamientos || '0';
    document.getElementById('statUltimoChequeo').textContent = data.stats.ultimoChequeo || '-';

    // Renderizar Timeline
    const timelineContainer = document.getElementById('medicalTimeline');
    timelineContainer.innerHTML = '';

    if (!data.eventos || data.eventos.length === 0) {
      timelineContainer.innerHTML = '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:20px;">Sin registros médicos aún.</p>';
      return;
    }

    data.eventos.forEach(item => {
      let dotClass = 'dot-chequeo';
      let badgeClass = 'badge-chequeo';

      if (item.tipo_evento === 'Diagnóstico') {
        dotClass = 'dot-diag';
        badgeClass = 'badge-diag';
      } else if (item.tipo_evento === 'Tratamiento' || item.tipo_evento === 'Cirugía') {
        dotClass = 'dot-trat';
        badgeClass = 'badge-trat';
      }

      const itemEl = document.createElement('div');
      itemEl.className = 'timeline-item';
      itemEl.innerHTML = `
        <div class="timeline-dot ${dotClass}"></div>
        <div class="timeline-header">
          <span class="timeline-date">${item.fecha_formateada || item.fecha_raw}</span>
          <span class="timeline-badge ${badgeClass}">${item.tipo_evento}</span>
        </div>
        <div class="timeline-title">${escapeHtml(item.titulo)}</div>
        <div class="timeline-doctor">${escapeHtml(item.veterinario)}</div>
        <div class="timeline-card-box">${escapeHtml(item.notas)}</div>
      `;
      timelineContainer.appendChild(itemEl);
    });
  } catch (err) {
    console.error('Error cargando historial:', err);
  }
}

// ==========================================================
// 5. WIZARD MULTIPASO DE ADOPCIÓN (VISTA ADOPTANTE)
// ==========================================================
function setupAdoptionStepper() {
  const btnPrev = document.getElementById('btnStepPrev');
  const btnNext = document.getElementById('btnStepNext');
  const stepIndicator = document.getElementById('stepIndicatorText');

  btnNext.addEventListener('click', () => {
    if (validateStep(state.currentStep)) {
      if (state.currentStep < 4) {
        goToStep(state.currentStep + 1);
      } else {
        // Enviar formulario final a MySQL
        submitAdoptionForm();
      }
    }
  });

  btnPrev.addEventListener('click', () => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  });

  // Tabs superiores clickeables
  document.querySelectorAll('.step-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const stepToGo = parseInt(tab.dataset.step);
      if (stepToGo < state.currentStep || validateStep(state.currentStep)) {
        goToStep(stepToGo);
      }
    });
  });
}

function goToStep(stepNumber) {
  state.currentStep = stepNumber;

  // Actualizar tabs
  document.querySelectorAll('.step-tab').forEach(tab => {
    const s = parseInt(tab.dataset.step);
    tab.classList.toggle('active', s === stepNumber);
    tab.classList.toggle('completed', s < stepNumber);
  });

  // Mostrar pane correspondiente
  document.querySelectorAll('.step-pane').forEach(pane => {
    const s = parseInt(pane.dataset.step);
    pane.classList.toggle('active', s === stepNumber);
  });

  // Actualizar botones
  const btnPrev = document.getElementById('btnStepPrev');
  const btnNext = document.getElementById('btnStepNext');
  const stepIndicator = document.getElementById('stepIndicatorText');

  btnPrev.disabled = (stepNumber === 1);
  stepIndicator.textContent = `Paso ${stepNumber} de 4`;

  if (stepNumber === 4) {
    btnNext.innerHTML = 'Enviar Solicitud →';
  } else {
    btnNext.innerHTML = 'Siguiente →';
  }

  // Scroll suave hacia el formulario si es necesario
  document.getElementById('adoptionFormContainer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function validateStep(step) {
  if (step === 1) {
    const vivienda = document.getElementById('adoptTipoVivienda').value.trim();
    const colonia = document.getElementById('adoptColonia').value.trim();
    const ciudad = document.getElementById('adoptCiudad').value.trim();

    if (!vivienda || !colonia || !ciudad) {
      showToast('Por favor completa los campos requeridos del Hogar (*)', 'error');
      return false;
    }
  } else if (step === 2) {
    const horas = document.getElementById('adoptHorasSolo').value.trim();
    const responsable = document.getElementById('adoptResponsable').value.trim();

    if (!horas || !responsable) {
      showToast('Por favor completa los campos de rutina (*)', 'error');
      return false;
    }
  } else if (step === 3) {
    // Campos opcionales o con valores por defecto
    return true;
  } else if (step === 4) {
    const nombre = document.getElementById('adoptNombre').value.trim();
    const email = document.getElementById('adoptEmail').value.trim();
    const telefono = document.getElementById('adoptTelefono').value.trim();
    const compromiso = document.getElementById('chkCompromiso').checked;

    if (!nombre || !email || !telefono) {
      showToast('Por favor ingresa tu nombre, correo y teléfono (*)', 'error');
      return false;
    }
    if (!compromiso) {
      showToast('Debes aceptar el compromiso de cuidados para continuar', 'error');
      return false;
    }
  }
  return true;
}

async function submitAdoptionForm() {
  const btnNext = document.getElementById('btnStepNext');
  const originalText = btnNext.innerHTML;
  btnNext.disabled = true;
  btnNext.innerHTML = 'Enviando a MySQL...';

  // Recopilar todos los datos
  const payload = {
    mascota_id: state.adoptanteMascotaId,
    // Paso 1
    tipo_vivienda: document.getElementById('adoptTipoVivienda').value.trim(),
    metros_cuadrados: document.getElementById('adoptMetros').value.trim(),
    colonia: document.getElementById('adoptColonia').value.trim(),
    ciudad: document.getElementById('adoptCiudad').value.trim(),
    tiene_jardin: document.getElementById('chkJardin').checked,
    permite_mascotas: document.getElementById('chkEdificio').checked,
    area_descanso: document.getElementById('chkAreaDescanso').checked,
    // Paso 2
    horas_solo: document.getElementById('adoptHorasSolo').value.trim(),
    responsable: document.getElementById('adoptResponsable').value.trim(),
    tiempo_paseos: document.getElementById('adoptPaseos').value.trim(),
    plan_emergencia: document.getElementById('adoptEmergencia').value.trim(),
    // Paso 3
    experiencia_previa: document.getElementById('adoptExperiencia').value,
    otras_mascotas: document.getElementById('adoptOtrasMascotas').value.trim(),
    veterinario_referencia: document.getElementById('adoptVeterinario').value.trim(),
    acuerdo_familiar: document.getElementById('adoptAcuerdo').value,
    // Paso 4
    nombre_solicitante: document.getElementById('adoptNombre').value.trim(),
    email: document.getElementById('adoptEmail').value.trim(),
    telefono: document.getElementById('adoptTelefono').value.trim(),
    presupuesto_estimado: document.getElementById('adoptPresupuesto').value.trim(),
    compromiso_cuidados: document.getElementById('chkCompromiso').checked,
    acepta_seguimiento: document.getElementById('chkSeguimiento').checked
  };

  try {
    const res = await fetch(`${API_BASE_URL}/solicitudes_adopcion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showAdoptionSuccessModal(data.codigo_solicitud, payload.nombre_solicitante);
      resetAdoptionForm();
    } else {
      throw new Error(data.error || 'Error al enviar la solicitud');
    }
  } catch (err) {
    console.error(err);
    showToast('Error al conectar con la base de datos MySQL', 'error');
  } finally {
    btnNext.disabled = false;
    btnNext.innerHTML = originalText;
  }
}

function showAdoptionSuccessModal(codigo, nombre) {
  const modal = document.getElementById('modalAdoptionSuccess');
  document.getElementById('modalAdoptionCode').textContent = codigo;
  document.getElementById('modalAdoptionApplicant').textContent = nombre;
  modal.classList.add('active');

  document.getElementById('btnCloseSuccessModal').onclick = () => {
    modal.classList.remove('active');
    goToStep(1);
  };
}

function resetAdoptionForm() {
  document.getElementById('adoptionForm').reset();
  goToStep(1);
}

// ==========================================================
// 6. ESTADO DE LA BASE DE DATOS MYSQL
// ==========================================================
async function checkDatabaseStatus() {
  const pill = document.getElementById('dbStatusPill');
  try {
    const res = await fetch(`${API_BASE_URL}/status`);
    const data = await res.json();
    if (data.ok) {
      pill.innerHTML = `<span class="db-dot"></span> MySQL Conectado (${data.database})`;
      pill.style.background = '#f0fdf4';
      pill.style.borderColor = '#bbf7d0';
      pill.style.color = '#15803d';
    } else {
      throw new Error();
    }
  } catch (err) {
    pill.innerHTML = `<span class="db-dot" style="background:#ef4444;"></span> Desconectado de MySQL`;
    pill.style.background = '#fef2f2';
    pill.style.borderColor = '#fecaca';
    pill.style.color = '#b91c1c';
  }
}

// ==========================================================
// UTILIDADES (Toast, Escape HTML)
// ==========================================================
function showToast(message, type = 'success') {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast show ${type === 'error' ? 'toast-error' : 'toast-success'}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
