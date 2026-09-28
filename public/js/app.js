// ==========================================================
// PetRescue - Lógica y Conexión Frontend con Backend / MySQL
// Roles y Seguridad: ADMIN_ONG vs USER (SENATI Tarea 6)
// ==========================================================

const API_BASE_URL = '/api';

// Estado global de la aplicación
const state = {
  currentView: 'voluntario', // 'voluntario' | 'adoptante' | 'dashboard'
  currentMascotaId: 1, // Luna (#PR-2024-0091)
  adoptanteMascotaId: 2, // Max (#PR-2026-0347)
  currentStep: 1,
  rescateFotoBase64: null,
  token: localStorage.getItem('petrescue_token') || null,
  currentUser: JSON.parse(localStorage.getItem('petrescue_user') || 'null'),
  pendingViewAfterLogin: null,
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
  setupAuthUI();
  setupImageUploader();
  setupRescueForm();
  setupMedicalHistory();
  setupAdoptionStepper();
  checkDatabaseStatus();
});

// ==========================================================
// 1. GESTIÓN DE SESIONES Y AUTENTICACIÓN (ADMIN_ONG vs USER)
// ==========================================================
function setupAuthUI() {
  const btnOpenLoginModal = document.getElementById('btnOpenLoginModal');
  const modalLogin = document.getElementById('modalLogin');
  const btnCloseLoginModal = document.getElementById('btnCloseLoginModal');
  const btnCancelLoginModal = document.getElementById('btnCancelLoginModal');
  const formLogin = document.getElementById('formLogin');
  const btnLogout = document.getElementById('btnLogout');
  const btnFillAdmin = document.getElementById('btnFillAdmin');
  const btnFillUser = document.getElementById('btnFillUser');

  // Actualizar UI según si ya existe una sesión guardada
  renderUserSessionState();

  // Abrir y cerrar modal de login
  btnOpenLoginModal.addEventListener('click', () => {
    state.pendingViewAfterLogin = null;
    openLoginModal();
  });

  const closeModal = () => modalLogin.classList.remove('active');
  btnCloseLoginModal.addEventListener('click', closeModal);
  btnCancelLoginModal.addEventListener('click', closeModal);
  modalLogin.addEventListener('click', (e) => {
    if (e.target === modalLogin) closeModal();
  });

  // Relleno rápido para evaluar fácilmente (1 clic)
  btnFillAdmin.addEventListener('click', () => {
    document.getElementById('loginUsername').value = 'admin';
    document.getElementById('loginPassword').value = '1234';
  });

  btnFillUser.addEventListener('click', () => {
    document.getElementById('loginUsername').value = 'usuario';
    document.getElementById('loginPassword').value = '1234';
  });

  // Enviar formulario de login
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        state.token = data.token;
        state.currentUser = data.user;
        localStorage.setItem('petrescue_token', data.token);
        localStorage.setItem('petrescue_user', JSON.stringify(data.user));

        renderUserSessionState();
        closeModal();
        formLogin.reset();
        showToast(`Sesión iniciada: ${data.user.nombre} (${data.user.rol})`, 'success');

        // Si intentaba entrar al dashboard y ahora es admin, redirigir
        if (state.pendingViewAfterLogin === 'dashboard' && data.user.rol === 'ADMIN_ONG') {
          switchView('dashboard');
        } else if (state.currentView === 'dashboard' && data.user.rol !== 'ADMIN_ONG') {
          switchView('voluntario');
        }
      } else {
        showToast(data.error || 'Credenciales inválidas', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión al autenticar', 'error');
    }
  });

  // Cerrar Sesión
  btnLogout.addEventListener('click', async () => {
    try {
      if (state.token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
      }
    } catch (e) {}

    state.token = null;
    state.currentUser = null;
    localStorage.removeItem('petrescue_token');
    localStorage.removeItem('petrescue_user');

    renderUserSessionState();
    showToast('Has cerrado sesión correctamente', 'success');

    // Si estaba en el dashboard protegido, volver a vista voluntario
    if (state.currentView === 'dashboard') {
      switchView('voluntario');
    }
  });
}

function openLoginModal() {
  document.getElementById('modalLogin').classList.add('active');
  document.getElementById('loginUsername').focus();
}

function renderUserSessionState() {
  const btnOpenLoginModal = document.getElementById('btnOpenLoginModal');
  const userProfileBadge = document.getElementById('userProfileBadge');
  const userProfileRole = document.getElementById('userProfileRole');
  const tabLockBadge = document.getElementById('tabLockBadge');

  if (state.currentUser && state.token) {
    btnOpenLoginModal.style.display = 'none';
    userProfileBadge.style.display = 'inline-flex';

    if (state.currentUser.rol === 'ADMIN_ONG') {
      userProfileBadge.style.background = '#eef2ff';
      userProfileBadge.style.borderColor = '#c7d2fe';
      userProfileBadge.style.color = '#4338ca';
      userProfileRole.textContent = `🛡️ ADMIN_ONG (${state.currentUser.username})`;
      tabLockBadge.textContent = '🔓';
      tabLockBadge.title = 'Acceso concedido como ADMIN_ONG';
    } else {
      userProfileBadge.style.background = '#f1f5f9';
      userProfileBadge.style.borderColor = '#e2e8f0';
      userProfileBadge.style.color = '#475569';
      userProfileRole.textContent = `👤 ${state.currentUser.username} (USER)`;
      tabLockBadge.textContent = '🔒';
      tabLockBadge.title = 'Acceso restringido: requiere ADMIN_ONG';
    }
  } else {
    btnOpenLoginModal.style.display = 'inline-flex';
    userProfileBadge.style.display = 'none';
    tabLockBadge.textContent = '🔒';
    tabLockBadge.title = 'Requiere iniciar sesión como ADMIN_ONG';
  }
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  return headers;
}

// ==========================================================
// 2. NAVEGACIÓN ENTRE VISTAS (Voluntario / Adoptante / Dashboard ONG)
// ==========================================================
function setupNavigation() {
  const btnVoluntario = document.getElementById('btnNavVoluntario');
  const btnAdoptante = document.getElementById('btnNavAdoptante');
  const btnDashboard = document.getElementById('btnNavDashboard');
  const btnIrNuevoRescate = document.getElementById('btnIrNuevoRescate');

  btnVoluntario.addEventListener('click', () => switchView('voluntario'));
  btnAdoptante.addEventListener('click', () => switchView('adoptante'));
  btnDashboard.addEventListener('click', () => {
    // Verificación de rol ADMIN_ONG
    if (!state.currentUser || state.currentUser.rol !== 'ADMIN_ONG') {
      showToast('🔒 Restricción Crítica: Solo usuarios con rol ADMIN_ONG pueden ingresar al Dashboard.', 'error');
      state.pendingViewAfterLogin = 'dashboard';
      openLoginModal();
      return;
    }
    switchView('dashboard');
  });

  if (btnIrNuevoRescate) {
    btnIrNuevoRescate.addEventListener('click', () => {
      switchView('voluntario');
      document.getElementById('especieSelect').focus();
    });
  }
}

function switchView(viewName) {
  state.currentView = viewName;
  const btnVoluntario = document.getElementById('btnNavVoluntario');
  const btnAdoptante = document.getElementById('btnNavAdoptante');
  const btnDashboard = document.getElementById('btnNavDashboard');

  const viewVoluntario = document.getElementById('viewVoluntario');
  const viewAdoptante = document.getElementById('viewAdoptante');
  const viewDashboard = document.getElementById('viewDashboard');

  // Reset de clases activas
  btnVoluntario.classList.remove('active');
  btnAdoptante.classList.remove('active');
  btnDashboard.classList.remove('active');
  viewVoluntario.classList.remove('active');
  viewAdoptante.classList.remove('active');
  viewDashboard.classList.remove('active');

  if (viewName === 'voluntario') {
    document.body.classList.remove('mode-adoptante');
    btnVoluntario.classList.add('active');
    viewVoluntario.classList.add('active');
  } else if (viewName === 'adoptante') {
    document.body.classList.add('mode-adoptante');
    btnAdoptante.classList.add('active');
    viewAdoptante.classList.add('active');
  } else if (viewName === 'dashboard') {
    document.body.classList.remove('mode-adoptante');
    btnDashboard.classList.add('active');
    viewDashboard.classList.add('active');
    loadDashboardData();
  }
}

// ==========================================================
// 3. CARGA Y GESTIÓN DEL DASHBOARD ONG (RESTRINGIDO A ADMIN_ONG)
// ==========================================================
async function loadDashboardData() {
  if (!state.currentUser || state.currentUser.rol !== 'ADMIN_ONG') return;

  // 1. Cargar Estadísticas
  try {
    const resStats = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    if (resStats.ok) {
      const stats = await resStats.json();
      document.getElementById('dashTotalMascotas').textContent = stats.totalMascotas;
      document.getElementById('dashMascotasDisponibles').textContent = stats.mascotasDisponibles;
      document.getElementById('dashTotalSolicitudes').textContent = stats.totalSolicitudes;
      document.getElementById('dashSolicitudesAprobadas').textContent = stats.solicitudesAprobadas;
    }
  } catch (err) {
    console.error('Error cargando estadísticas del dashboard:', err);
  }

  // 2. Cargar Solicitudes de Adopción (DATOS PERSONALES PROTEGIDOS)
  try {
    const resSol = await fetch(`${API_BASE_URL}/solicitudes_adopcion`, {
      headers: getAuthHeaders()
    });

    if (resSol.status === 403) {
      showToast('Restricción Crítica: Acceso denegado a datos de adoptantes', 'error');
      return;
    }

    if (resSol.ok) {
      const solicitudes = await resSol.json();
      renderDashboardSolicitudes(solicitudes);
    }
  } catch (err) {
    console.error('Error cargando solicitudes:', err);
  }

  // 3. Cargar Inventario de Mascotas
  try {
    const resMascotas = await fetch(`${API_BASE_URL}/mascotas`);
    if (resMascotas.ok) {
      const mascotas = await resMascotas.json();
      renderDashboardMascotas(mascotas);
    }
  } catch (err) {
    console.error('Error cargando mascotas:', err);
  }
}

function renderDashboardSolicitudes(solicitudes) {
  const tbody = document.getElementById('dashTableSolicitudesBody');
  tbody.innerHTML = '';

  if (!solicitudes || solicitudes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding: 24px; color: #94a3b8;">
          No hay solicitudes de adopción registradas aún.
        </td>
      </tr>
    `;
    return;
  }

  solicitudes.forEach(sol => {
    const tr = document.createElement('tr');

    let badgeClass = 'pendiente';
    const estado = sol.estado_solicitud || 'Pendiente';
    if (estado === 'Aprobada') badgeClass = 'aprobada';
    else if (estado === 'Rechazada') badgeClass = 'rechazada';

    tr.innerHTML = `
      <td><strong>${escapeHtml(sol.codigo_solicitud || `#SOL-${sol.id}`)}</strong></td>
      <td><strong>${escapeHtml(sol.nombre_mascota || 'Max')}</strong></td>
      <td><strong>${escapeHtml(sol.nombre_solicitante)}</strong></td>
      <td><a href="tel:${escapeHtml(sol.telefono)}" style="color:#0f766e; font-weight:600;">${escapeHtml(sol.telefono)}</a></td>
      <td>${escapeHtml(sol.email)}</td>
      <td>${escapeHtml(sol.ciudad || '')}, ${escapeHtml(sol.colonia || '')}</td>
      <td>${escapeHtml(sol.tipo_vivienda || 'Vivienda')}</td>
      <td><span class="status-pill ${badgeClass}">${escapeHtml(estado)}</span></td>
      <td>
        <div class="btn-action-group">
          <button class="btn-action-approve" onclick="updateSolicitudEstado(${sol.id}, 'Aprobada')" title="Aprobar Adopción">✓ Aprobar</button>
          <button class="btn-action-reject" onclick="updateSolicitudEstado(${sol.id}, 'Rechazada')" title="Rechazar Adopción">✗ Rechazar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDashboardMascotas(mascotas) {
  const tbody = document.getElementById('dashTableMascotasBody');
  tbody.innerHTML = '';

  if (!mascotas || mascotas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">Sin animales registrados</td></tr>`;
    return;
  }

  mascotas.forEach(m => {
    const tr = document.createElement('tr');
    let pillClass = 'disponible';
    if (m.estado_adopcion === 'En Proceso') pillClass = 'en-proceso';
    else if (m.estado_adopcion === 'Adoptado') pillClass = 'aprobada';

    tr.innerHTML = `
      <td>
        <div class="table-avatar-chip">
          <img src="${escapeHtml(m.imagen_url || '/images/luna.jpg')}" class="table-avatar-img" alt="${escapeHtml(m.nombre)}" />
          <strong>${escapeHtml(m.nombre)}</strong>
        </div>
      </td>
      <td>${escapeHtml(m.codigo)}</td>
      <td>${escapeHtml(m.especie)}</td>
      <td>${escapeHtml(m.raza || 'Mestizo')}</td>
      <td>${escapeHtml(m.edad || '-')} / ${escapeHtml(m.peso || '-')}</td>
      <td>${escapeHtml(m.sexo || '-')}</td>
      <td>${escapeHtml(m.esterilizado || 'Sí')}</td>
      <td><span class="status-pill ${pillClass}">${escapeHtml(m.estado_adopcion || 'Disponible')}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

window.updateSolicitudEstado = async function(solicitudId, nuevoEstado) {
  try {
    const res = await fetch(`${API_BASE_URL}/solicitudes_adopcion/${solicitudId}/estado`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ estado: nuevoEstado })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Solicitud actualizada: ${nuevoEstado}`, 'success');
      loadDashboardData();
    } else {
      showToast(data.error || 'Error al actualizar', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error de red al actualizar estado', 'error');
  }
};

// ==========================================================
// 4. SUBIDA Y PREVISUALIZACIÓN DE FOTOGRAFÍA (NUEVO RESCATE)
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
// 5. FORMULARIO DE NUEVO RESCATE (VISTA VOLUNTARIO)
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
    submitBtn.innerHTML = 'Guardando en BD...';

    try {
      const response = await fetch(`${API_BASE_URL}/rescates`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast(`¡Rescate ${data.codigo} registrado exitosamente!`, 'success');
        form.reset();
        document.getElementById('btnRemovePhoto').click();
      } else {
        throw new Error(data.error || 'Error al guardar');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con la base de datos', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ==========================================================
// 6. HISTORIAL MÉDICO & MODAL (VISTA VOLUNTARIO)
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
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Registro médico añadido con éxito', 'success');
        closeModal();
        formMedical.reset();
        loadMedicalHistory(state.currentMascotaId);
      } else {
        showToast(data.error || 'Error al guardar registro', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al guardar registro médico', 'error');
    }
  });
}

async function loadMedicalHistory(mascotaId) {
  try {
    const res = await fetch(`${API_BASE_URL}/historial_medico/${mascotaId}`);
    if (!res.ok) throw new Error('Error al cargar historial');
    const data = await res.json();

    document.getElementById('statConsultas').textContent = data.stats.consultas || '0';
    document.getElementById('statTratamientos').textContent = data.stats.tratamientos || '0';
    document.getElementById('statUltimoChequeo').textContent = data.stats.ultimoChequeo || '-';

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
// 7. WIZARD MULTIPASO DE ADOPCIÓN (VISTA ADOPTANTE)
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
        submitAdoptionForm();
      }
    }
  });

  btnPrev.addEventListener('click', () => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  });

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

  document.querySelectorAll('.step-tab').forEach(tab => {
    const s = parseInt(tab.dataset.step);
    tab.classList.toggle('active', s === stepNumber);
    tab.classList.toggle('completed', s < stepNumber);
  });

  document.querySelectorAll('.step-pane').forEach(pane => {
    const s = parseInt(pane.dataset.step);
    pane.classList.toggle('active', s === stepNumber);
  });

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
  btnNext.innerHTML = 'Enviando a BD...';

  const payload = {
    mascota_id: state.adoptanteMascotaId,
    tipo_vivienda: document.getElementById('adoptTipoVivienda').value.trim(),
    metros_cuadrados: document.getElementById('adoptMetros').value.trim(),
    colonia: document.getElementById('adoptColonia').value.trim(),
    ciudad: document.getElementById('adoptCiudad').value.trim(),
    tiene_jardin: document.getElementById('chkJardin').checked,
    permite_mascotas: document.getElementById('chkEdificio').checked,
    area_descanso: document.getElementById('chkAreaDescanso').checked,
    horas_solo: document.getElementById('adoptHorasSolo').value.trim(),
    responsable: document.getElementById('adoptResponsable').value.trim(),
    tiempo_paseos: document.getElementById('adoptPaseos').value.trim(),
    plan_emergencia: document.getElementById('adoptEmergencia').value.trim(),
    experiencia_previa: document.getElementById('adoptExperiencia').value,
    otras_mascotas: document.getElementById('adoptOtrasMascotas').value.trim(),
    veterinario_referencia: document.getElementById('adoptVeterinario').value.trim(),
    acuerdo_familiar: document.getElementById('adoptAcuerdo').value,
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
    showToast('Error al registrar la solicitud', 'error');
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
// 8. ESTADO DE LA BASE DE DATOS
// ==========================================================
async function checkDatabaseStatus() {
  const pill = document.getElementById('dbStatusPill');
  try {
    const res = await fetch(`${API_BASE_URL}/status`);
    const data = await res.json();
    if (data.ok) {
      pill.innerHTML = `<span class="db-dot"></span> Conectado: ${data.database}`;
      pill.style.background = '#f0fdf4';
      pill.style.borderColor = '#bbf7d0';
      pill.style.color = '#15803d';
    } else {
      throw new Error();
    }
  } catch (err) {
    pill.innerHTML = `<span class="db-dot" style="background:#ef4444;"></span> Desconectado`;
    pill.style.background = '#fef2f2';
    pill.style.borderColor = '#fecaca';
    pill.style.color = '#b91c1c';
  }
}

// ==========================================================
// UTILIDADES
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
