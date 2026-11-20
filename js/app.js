/**
 * Ficha Técnica de Medición — Main App
 * SPA with hash routing: #start | #home?type=cave|radon | #form?id=...&type=...
 */
(() => {
  // =========================================
  // State
  // =========================================
  let currentFichaId = null;
  let autoSaveTimer = null;
  let deferredInstallPrompt = null;
  let currentMenuCleanup = null;

  const TERRAIN_OPTIONS = [
    'Grava', 'Arena', 'Arcilla', 'Piedra arenisca', 'Travertino', 'Diorita',
    'Pómez', 'Traquita', 'Tufo volcánico', 'Caliza', 'Dolomita', 'Basalto',
    'Pórfido', 'Esquisto', 'Granito', 'Mármol', 'Sienita',
  ];
  const CONSTRUCTION_MATERIAL_OPTIONS = [
    'Tufo', 'Ladrillo', 'Cemento', 'Arena', 'Yeso natural', 'Piedra natural',
    'Cemento y arena', 'Hormigón',
  ];
  const CLIMATE_OPTIONS = [
    'Solo calefacción', 'Calefacción / aire acondicionado',
    'Solo aire acondicionado', 'Ninguno',
  ];

  // =========================================
  // Utilities
  // =========================================
  function $(sel, ctx = document) { return ctx.querySelector(sel); }
  function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

  function showToast(msg, type = '', duration = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, duration);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${months[parseInt(m)-1]} ${y}`;
  }

  function isFichaComplete(ficha) {
    return ficha.tipo === 'radon'
      ? !!(ficha.nombresCompletos && ficha.provincia && ficha.canton && ficha.parroquia
        && ficha.numeroCuadra && ficha.latitud && ficha.longitud && ficha.codigoElectreto && ficha.fecha
        && ficha.fechaFin && ficha.voltajeInicial && ficha.voltajeFinal)
      : !!(ficha.cueva && ficha.provincia && ficha.canton && ficha.punto && ficha.fecha && ficha.horaInicio);
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function confirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.innerHTML = `
        <div class="dialog">
          <div class="dialog-title">${title}</div>
          <div class="dialog-message">${message}</div>
          <div class="dialog-actions">
            <button class="btn btn-ghost btn-sm" data-action="cancel">Cancelar</button>
            <button class="btn btn-danger btn-sm" data-action="confirm">Eliminar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'confirm' || action === 'cancel' || e.target === overlay) {
          overlay.remove();
          resolve(action === 'confirm');
        }
      });
    });
  }

  // =========================================
  // Router
  // =========================================
  function getRoute() {
    const hash = location.hash.replace('#', '') || 'start';
    const [path, query] = hash.split('?');
    const params = {};
    if (query) query.split('&').forEach(p => { const [k, v] = p.split('='); params[k] = decodeURIComponent(v || ''); });
    return { path, params };
  }

  function navigate(path, params = {}) {
    const q = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    location.hash = q ? `${path}?${q}` : path;
  }

  window.addEventListener('hashchange', render);

  // =========================================
  // Main Render
  // =========================================
  async function render() {
    const { path, params } = getRoute();
    if (path === 'form') {
      await renderForm(params.id || 'new', params.type || params.tipo || 'cave');
    } else if (path === 'home') {
      await renderHome(params.type || params.tipo || 'cave');
    } else if (path === 'start') {
      renderStart();
    } else {
      renderStart();
    }
  }

  function renderStart() {
    currentFichaId = null;
    const app = document.getElementById('app');
    app.innerHTML = `
      <main class="start-screen">
        <header class="start-topbar">
          <div class="start-brand"><img class="brand-mark" src="icons/icon-ficharium.png" alt=""><span>Ficharium</span></div>
          <button class="btn-icon" id="start-menu-btn" aria-label="Menú" title="Más opciones">⋮</button>
        </header>
        <section class="start-intro"><p class="eyebrow">HERRAMIENTA DE MEDICIÓN</p><h1>¿Qué vas a registrar?</h1><p>Elige el tipo de ficha para empezar tu trabajo de campo.</p></section>
        <section class="type-grid" aria-label="Tipo de ficha">
          <button class="type-card cave-card" data-type="cave">
            <span class="type-art cave-art" aria-hidden="true"><svg viewBox="0 0 100 80"><path d="M8 72 Q18 50 26 36 Q34 19 50 12 Q66 19 74 36 Q82 50 92 72Z"/><path d="M34 72 Q38 54 50 43 Q62 54 66 72Z"/><path d="M18 56 Q33 47 50 49 Q67 47 82 56"/></svg></span>
            <span class="type-name">Cuevas</span><span class="type-copy">Exploración y mediciones subterráneas</span><span class="type-action">Abrir fichas</span>
          </button>
          <button class="type-card radon-card" data-type="radon">
            <span class="type-art radon-art" aria-hidden="true"><svg viewBox="0 0 100 80"><circle cx="50" cy="40" r="8"/><path d="M46 30 34 10Q28 7 24 13L37 35M58 37 82 35Q87 39 83 45L59 45M43 47 34 69Q37 75 44 73L51 50"/><circle cx="50" cy="40" r="30"/></svg></span>
            <span class="type-name">Radón</span><span class="type-copy">Registro de sitios y medición de radón</span><span class="type-action">Abrir fichas</span>
          </button>
        </section>
        <p class="start-footnote">Tus registros se guardan en este dispositivo.</p>
      </main>`;
    $$('.type-card').forEach(card => card.addEventListener('click', () => navigate('home', { type: card.dataset.type })));
    $('#start-menu-btn').addEventListener('click', (e) => showHomeMenu(e));
  }

  // =========================================
  // Home Screen
  // =========================================
  async function renderHome(type = 'cave') {
    type = type === 'radon' ? 'radon' : 'cave';
    currentFichaId = null;
    const fichas = (await DB.getAllFichas()).filter(f => (f.tipo || 'cave') === type);
    // Sort by updatedAt desc
    fichas.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="home-screen">
        <header class="app-header">
          <div class="header-title">
            Fichas de ${type === 'radon' ? 'Radón' : 'Cuevas'}
            <div class="header-subtitle">App de campo — ${type === 'radon' ? 'medición de radón' : 'exploración subterránea'}</div>
          </div>
          <div class="header-status">
            <div class="status-dot" id="status-dot"></div>
            <span id="status-text">Online</span>
          </div>
          <button class="btn-icon" id="home-menu-btn" aria-label="Menú" title="Más opciones">⋮</button>
        </header>

        <main class="home-content">
          <button class="collection-switch" id="collection-switch">← Cambiar tipo de ficha</button>
          ${fichas.length === 0 ? renderEmptyState(type) : renderFichaList(fichas, type)}
        </main>

        <button class="fab" id="new-ficha-btn" title="Nueva Ficha">+</button>
      </div>`;

    updateOnlineStatus();

    $('#new-ficha-btn').addEventListener('click', () => navigate('form', { id: 'new', type }));
    $('#home-menu-btn').addEventListener('click', (e) => showHomeMenu(e, type));
    $('#collection-switch').addEventListener('click', () => navigate('start'));

    // Bind ficha card actions
    $$('.ficha-card-main').forEach(el => {
      el.addEventListener('click', () => navigate('form', { id: el.dataset.id, type }));
    });
    $$('[data-action="edit"]').forEach(el => {
      el.addEventListener('click', () => navigate('form', { id: el.dataset.id, type }));
    });
    $$('[data-action="pdf"]').forEach(el => {
      el.addEventListener('click', () => exportPDF(el.dataset.id));
    });
    $$('[data-action="export-json"]').forEach(el => {
      el.addEventListener('click', () => exportJSON(el.dataset.id));
    });
    $$('[data-action="delete"]').forEach(el => {
      el.addEventListener('click', () => deleteFicha(el.dataset.id));
    });
  }

  function renderEmptyState(type) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${type === 'radon' ? '☢️' : '🗺️'}</div>
        <div class="empty-title">Sin fichas aún</div>
        <div class="empty-subtitle">Toca + para crear tu primera ficha de ${type === 'radon' ? 'Radón' : 'Cuevas'}</div>
      </div>`;
  }

  function renderFichaList(fichas, type) {
    return `
      <div class="home-count">${fichas.length} ficha${fichas.length !== 1 ? 's' : ''}</div>
      <div class="ficha-list">
        ${fichas.map(f => renderFichaCard(f, type)).join('')}
      </div>`;
  }

  function renderFichaCard(f, type) {
    const complete = isFichaComplete(f);
    const dateStr = f.fecha ? formatDate(f.fecha) : 'Sin fecha';
    const updStr = new Date(f.updatedAt).toLocaleDateString('es', { day: '2-digit', month: 'short' });

    return `
      <div class="ficha-card">
        <div class="ficha-card-main" data-id="${f.id}" role="button" tabindex="0">
          <div class="ficha-card-header">
            <div class="ficha-card-info">
              <div class="ficha-cueva">${esc(type === 'radon' ? (f.codigoCasa || f.nombresCompletos || '(Sin identificar)') : (f.cueva || '(Sin nombre)'))}</div>
              <div class="ficha-meta">
                ${type === 'radon' ? [f.provincia, f.canton, f.parroquia].filter(Boolean).map(v => `<span class="ficha-meta-item">📍 ${esc(v)}</span>`).join('') : (f.punto ? `<span class="ficha-meta-item">📍 ${esc(f.punto)}</span>` : '')}
                <span class="ficha-meta-item">📅 ${dateStr}</span>
                <span class="ficha-meta-item">✏️ ${updStr}</span>
              </div>
            </div>
            <span class="ficha-badge ${complete ? 'complete' : 'partial'}">
              ${complete ? '✓ Completa' : '⏳ Parcial'}
            </span>
          </div>
        </div>
        <div class="ficha-card-actions">
          <button class="ficha-action-btn" data-action="edit" data-id="${f.id}" title="Editar">
            ✏️ Editar
          </button>
          <button class="ficha-action-btn success" data-action="pdf" data-id="${f.id}" title="Exportar PDF">
            📄 PDF
          </button>
          <button class="ficha-action-btn" data-action="export-json" data-id="${f.id}" title="Exportar JSON">
            💾 JSON
          </button>
          <button class="ficha-action-btn danger" data-action="delete" data-id="${f.id}" title="Eliminar">
            🗑️
          </button>
        </div>
      </div>`;
  }

  function showHomeMenu(e, type = null) {
    if (currentMenuCleanup) currentMenuCleanup();
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();

    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';

    const menu = document.createElement('div');
    menu.className = 'menu-dropdown';
    menu.style.cssText = `top:${rect.bottom + 4}px; right:${document.documentElement.clientWidth - rect.right}px`;
    const installedAlready = isInStandaloneMode();
    const exportOptions = type
      ? `<button class="menu-item" data-menu="export-all">💾 Exportar fichas de ${type === 'radon' ? 'Radón' : 'Cuevas'} (JSON)</button>`
      : `<button class="menu-item" data-menu="export-all">💾 Exportar todas las fichas (JSON)</button>
         <button class="menu-item" data-menu="export-cave">🗺️ Exportar fichas de Cuevas</button>
         <button class="menu-item" data-menu="export-radon">☢️ Exportar fichas de Radón</button>`;
    menu.innerHTML = `
      <button class="menu-item" data-menu="import">📂 Importar fichas (JSON)</button>
      <div class="divider"></div>
      ${exportOptions}
      <div class="divider"></div>
      ${installedAlready
        ? `<button class="menu-item" data-menu="install" disabled style="opacity:.4;cursor:default">📲 App ya instalada</button>`
        : `<button class="menu-item" data-menu="install">📲 Instalar app</button>`}
      <div class="divider"></div>
      <button class="menu-item danger" data-menu="clear">🗑️ Limpiar caché y datos</button>`;

    document.body.appendChild(overlay);
    document.body.appendChild(menu);

    function cleanup() {
      overlay.remove();
      menu.remove();
      currentMenuCleanup = null;
    }
    currentMenuCleanup = cleanup;

    overlay.addEventListener('click', cleanup);
    menu.querySelectorAll('[data-menu]').forEach(item => {
      item.addEventListener('click', () => {
        if (item.disabled) return;
        cleanup();
        if (item.dataset.menu === 'import') triggerImport(type);
        if (item.dataset.menu === 'export-all') exportAllJSON(type);
        if (item.dataset.menu === 'export-cave') exportAllJSON('cave');
        if (item.dataset.menu === 'export-radon') exportAllJSON('radon');
        if (item.dataset.menu === 'install') triggerInstall();
        if (item.dataset.menu === 'clear') showClearDialog();
      });
    });
  }

  function triggerInstall() {
    if (isIOS()) {
      showInstallIOSDialog();
    } else if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(() => {
        deferredInstallPrompt = null;
      });
    } else {
      showInstallGenericDialog();
    }
  }

  function showInstallIOSDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-title">📲 Instalar en iPhone / iPad</div>
        <div class="dialog-message">
          <ol style="padding-left:18px; line-height:2">
            <li>Toca el botón <strong>Compartir</strong> <span style="font-size:16px">⎙</span> en la barra de Safari</li>
            <li>Desplázate y toca <strong>"Añadir a pantalla de inicio"</strong></li>
            <li>Confirma tocando <strong>"Añadir"</strong></li>
          </ol>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary btn-sm" data-action="close">Entendido</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close' || e.target === overlay) overlay.remove();
    });
  }

  function showInstallGenericDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-title">📲 Instalar app</div>
        <div class="dialog-message">
          Para instalar, busca la opción <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong> en el menú de tu navegador.<br><br>
          <span style="color:var(--text-secondary); font-size:13px">Nota: algunos navegadores requieren que la página esté servida por HTTPS para permitir la instalación.</span>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary btn-sm" data-action="close">Entendido</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close' || e.target === overlay) overlay.remove();
    });
  }

  // =========================================
  // Form Screen
  // =========================================
  async function renderForm(id, requestedType = 'cave') {
    requestedType = requestedType === 'radon' ? 'radon' : 'cave';
    let ficha;
    if (id === 'new') {
      ficha = {
        tipo: requestedType,
        id: crypto.randomUUID(),
        cueva: '', punto: '', sitio: '', nombresCompletos: '', provincia: '', canton: '', parroquia: '', barrio: '', codigoCasa: '', numeroCuadra: '', latitud: '', longitud: '',
        tipologiaConstruccion: '', tipologiaConstruccionOtro: '', posicionPisoBajo: '', posicionPisoBajoOtro: '', usoSotano: '', usoSotanoOtro: '',
        anoConstruccion: '', tiposTerreno: [], materialesConstruccion: [], climatizacion: [], humedadParedes: null, grietasParedes: null,
        codigoElectreto: '', fecha: '', fechaFin: '', horaInicio: '', horaFin: '', voltajeInicial: '', voltajeFinal: '', tipoEspacio: '', tipoEspacioOtro: '', pisoMedicion: '', numeroPisoMedicion: '',
        agua: '', aguaTipo: { corriendo: null, estancada: null },
        seccionTransversal: '',
        parametros: { humedad: false, temperatura: false, presion: false, velViento: false, co2: false },
        equiposRadiacion: requestedType === 'radon'
          ? { alphaE: false, gammaScout: false, saphyRad: false }
          : { alphaE: false, gammaScout: false, dosimetros: false, saphyRad: false, saphyRadSonda: '' },
        equiposAdicionales: { medidorRadiacionCosmica: false },
        observaciones: '',
      };
      // Pre-create in DB so photos can attach
      await DB.createFicha(ficha);
    } else {
      ficha = await DB.getFicha(id);
      if (!ficha) { navigate('home', { type: requestedType }); return; }
      if (!ficha.tipo) ficha.tipo = 'cave';
    }
    const type = ficha.tipo === 'radon' ? 'radon' : 'cave';
    currentFichaId = ficha.id;

    const fotos = await DB.getFotos(ficha.id);
    const app = document.getElementById('app');

    app.innerHTML = `
      <div class="form-screen" data-type="${type}">
        <header class="app-header">
          <button class="header-back" id="back-btn" title="Volver">←</button>
          <div class="header-title">
            ${esc(type === 'radon' ? (ficha.codigoCasa || ficha.nombresCompletos || 'Nueva ficha de Radón') : (ficha.cueva || 'Nueva Ficha'))}
            <div class="header-subtitle" id="save-status-header">Auto-guardado</div>
          </div>
          <button class="btn-icon" id="form-menu-btn" aria-label="Más opciones">⋮</button>
        </header>

        <main class="form-content" id="form-content">
          ${type === 'radon' ? `
            ${renderRadonSection1(ficha)}
            ${renderRadonHousingSection2(ficha)}
            ${renderRadonMeasurementSection3(ficha)}
            ${renderSection3(ficha, 4)}
            ${renderSection5(ficha, 5)}
          ` : `
            ${renderSection1(ficha)}
            ${renderSection2(ficha)}
            ${renderSection3(ficha)}
            ${renderSection4(ficha)}
            ${renderSection5(ficha)}
          `}
          ${renderPhotosSection(fotos)}
        </main>

        <div class="form-actions">
          <div class="save-status" id="save-status">💾 Guardado automáticamente</div>
          <button class="btn btn-primary btn-full btn-lg" id="export-pdf-btn">📄 Exportar PDF</button>
        </div>
      </div>`;

    bindFormEvents(ficha);
  }

  function renderRadonSection1(f) {
    return `
      <div class="form-section expanded" id="section-1">
        <button class="section-toggle" data-section="1"><div class="section-number">1</div><span class="section-title">Datos Generales</span><span class="section-chevron">▼</span></button>
        <div class="section-body">
          <div class="field"><label for="f-nombres-completos">Nombres completos <span class="required-mark">*</span></label><input type="text" id="f-nombres-completos" name="nombresCompletos" value="${esc(f.nombresCompletos)}" placeholder="Nombres y apellidos" autocomplete="name" required></div>
          <div class="field-row"><div class="field"><label for="f-provincia">Provincia <span class="required-mark">*</span></label><input type="text" id="f-provincia" name="provincia" value="${esc(f.provincia)}" placeholder="Provincia" required></div><div class="field"><label for="f-canton">Cantón <span class="required-mark">*</span></label><input type="text" id="f-canton" name="canton" value="${esc(f.canton)}" placeholder="Cantón" required></div></div>
          <div class="field-row"><div class="field"><label for="f-parroquia">Parroquia <span class="required-mark">*</span></label><input type="text" id="f-parroquia" name="parroquia" value="${esc(f.parroquia)}" placeholder="Parroquia" required></div><div class="field"><label for="f-barrio">Barrio</label><input type="text" id="f-barrio" name="barrio" value="${esc(f.barrio)}" placeholder="Barrio o sector"></div></div>
          <div class="field-row"><div class="field"><label for="f-codigo-casa">Código de casa</label><input type="text" id="f-codigo-casa" name="codigoCasa" value="${esc(f.codigoCasa)}" placeholder="Código de vivienda"></div><div class="field"><label for="f-numero-cuadra">Número de cuadra <span class="required-mark">*</span></label><input type="text" id="f-numero-cuadra" name="numeroCuadra" value="${esc(f.numeroCuadra)}" placeholder="Ej. C-12" required></div></div>
          <div class="field-row coordinate-fields"><div class="field"><label for="f-latitud">Latitud <span class="required-mark">*</span></label><input type="number" id="f-latitud" name="latitud" value="${esc(f.latitud)}" placeholder="Ej. -0.180653" step="any" inputmode="decimal" required></div><div class="field"><label for="f-longitud">Longitud <span class="required-mark">*</span></label><input type="number" id="f-longitud" name="longitud" value="${esc(f.longitud)}" placeholder="Ej. -78.467834" step="any" inputmode="decimal" required></div></div>
          <div class="location-actions"><button type="button" class="btn btn-ghost btn-full" id="use-location-btn">📍 Obtener coordenadas del dispositivo</button><div class="location-status" id="location-status" role="status" aria-live="polite">También puedes escribir o corregir las coordenadas manualmente.</div></div>
        </div>
      </div>`;
  }

  function listValue(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  }

  function tagChip(field, value) {
    return `<span class="tag-chip" data-tag-field="${field}" data-tag-value="${esc(value)}"><span>${esc(value)}</span><button type="button" class="tag-remove" aria-label="Eliminar ${esc(value)}">×</button></span>`;
  }

  function renderTagSelector({ id, field, label, options, selected, allowCustom = false, exclusiveNone = false }) {
    const values = listValue(selected);
    return `
      <div class="tag-selector" data-tag-field="${field}" ${exclusiveNone ? 'data-exclusive-none="true"' : ''}>
        <div class="field">
          <label for="${id}">${label}</label>
          <select id="${id}" data-tag-select data-tag-field="${field}">
            <option value="">Selecciona para agregar</option>
            ${options.map(option => `<option value="${esc(option)}" ${values.includes(option) ? 'disabled' : ''}>${esc(option)}</option>`).join('')}
            ${allowCustom ? '<option value="__custom__">Otro…</option>' : ''}
          </select>
        </div>
        <div class="tag-box" data-tag-box="${field}" aria-live="polite">${values.length ? values.map(value => tagChip(field, value)).join('') : '<span class="tag-placeholder">Aún no hay opciones agregadas.</span>'}</div>
        ${allowCustom ? `<div class="tag-custom-entry" data-tag-custom="${field}"><input type="text" placeholder="Escribe otro tipo de terreno" aria-label="Otro tipo de terreno"><button type="button" class="btn btn-ghost btn-sm" data-add-custom-tag="${field}">Agregar</button></div>` : ''}
      </div>`;
  }

  function renderRadonHousingSection2(f) {
    return `
      <div class="form-section" id="section-2">
        <button class="section-toggle" data-section="2"><div class="section-number">2</div><span class="section-title">Datos de la vivienda</span><span class="section-chevron">▼</span></button>
        <div class="section-body">
          <div class="field"><label for="f-tipologia-construccion">Tipología de construcción</label><select id="f-tipologia-construccion" name="tipologiaConstruccion"><option value="">Selecciona una opción</option><option value="casa" ${f.tipologiaConstruccion === 'casa' ? 'selected' : ''}>Casa</option><option value="condominio" ${f.tipologiaConstruccion === 'condominio' ? 'selected' : ''}>Condominio</option><option value="edificio" ${f.tipologiaConstruccion === 'edificio' ? 'selected' : ''}>Edificio</option><option value="otro" ${f.tipologiaConstruccion === 'otro' ? 'selected' : ''}>Otro</option></select></div>
          <div class="conditional-field ${f.tipologiaConstruccion === 'otro' ? 'visible' : ''}" id="tipologia-otro-field"><label for="f-tipologia-construccion-otro">Especifica otra tipología</label><input type="text" id="f-tipologia-construccion-otro" name="tipologiaConstruccionOtro" value="${esc(f.tipologiaConstruccionOtro)}" placeholder="Describe la tipología de construcción"></div>

          <div class="subsection-heading">Posición del piso más bajo de la construcción respecto al suelo</div>
          <div class="field"><label for="f-posicion-piso-bajo">Relación con el terreno</label><select id="f-posicion-piso-bajo" name="posicionPisoBajo"><option value="">Selecciona una opción</option><option value="sobre_terreno" ${f.posicionPisoBajo === 'sobre_terreno' ? 'selected' : ''}>Sobre el terreno</option><option value="bajo_terreno" ${f.posicionPisoBajo === 'bajo_terreno' ? 'selected' : ''}>Bajo el terreno</option><option value="semienterrado" ${f.posicionPisoBajo === 'semienterrado' ? 'selected' : ''}>Semienterrado</option><option value="sobre_columnas" ${f.posicionPisoBajo === 'sobre_columnas' ? 'selected' : ''}>Sobre columnas</option><option value="enterrado_lateral" ${f.posicionPisoBajo === 'enterrado_lateral' ? 'selected' : ''}>Enterrado o semienterrado en alguno de sus lados</option><option value="otro" ${f.posicionPisoBajo === 'otro' ? 'selected' : ''}>Otro</option></select></div>
          <div class="position-preview" id="position-preview" aria-live="polite">${positionIllustration(f.posicionPisoBajo)}</div>
          <div class="conditional-field ${f.posicionPisoBajo === 'otro' ? 'visible' : ''}" id="posicion-otro-field"><label for="f-posicion-piso-bajo-otro">Describe otra posición</label><input type="text" id="f-posicion-piso-bajo-otro" name="posicionPisoBajoOtro" value="${esc(f.posicionPisoBajoOtro)}" placeholder="Describe la relación de la construcción con el terreno"></div>

          <div class="subsection-heading">Características de la construcción</div>
          <div class="field"><label for="f-ano-construccion">Año de construcción</label><input type="text" id="f-ano-construccion" name="anoConstruccion" value="${esc(f.anoConstruccion)}" placeholder="Ej. 1998" inputmode="numeric"></div>
          ${renderTagSelector({ id: 'f-tipos-terreno', field: 'tiposTerreno', label: 'Tipo de terreno sobre el cual está la edificación', options: TERRAIN_OPTIONS, selected: f.tiposTerreno, allowCustom: true })}
          ${renderTagSelector({ id: 'f-materiales-construccion', field: 'materialesConstruccion', label: 'Materiales de construcción', options: CONSTRUCTION_MATERIAL_OPTIONS, selected: f.materialesConstruccion })}
          ${renderTagSelector({ id: 'f-climatizacion', field: 'climatizacion', label: 'Presencia de planta de climatización activa', options: CLIMATE_OPTIONS, selected: f.climatizacion, exclusiveNone: true })}
          <div class="toggle-grid housing-condition-grid">
            ${toggleItem('Humedad en las paredes', 'humedadParedes', f.humedadParedes)}
            ${toggleItem('Grietas o fisuras en las paredes', 'grietasParedes', f.grietasParedes)}
          </div>

          <div class="subsection-heading">Uso del piso semienterrado o sótano</div>
          <div class="field"><label for="f-uso-sotano">Uso principal</label><select id="f-uso-sotano" name="usoSotano"><option value="">Selecciona una opción</option><option value="cimiento" ${f.usoSotano === 'cimiento' ? 'selected' : ''}>Cimiento</option><option value="bodega_garaje" ${f.usoSotano === 'bodega_garaje' ? 'selected' : ''}>Bodega/Garaje</option><option value="ventilacion" ${f.usoSotano === 'ventilacion' ? 'selected' : ''}>Lugar de ventilación</option><option value="trabajo" ${f.usoSotano === 'trabajo' ? 'selected' : ''}>Lugar de trabajo</option><option value="otro" ${f.usoSotano === 'otro' ? 'selected' : ''}>Otro</option></select></div>
          <div class="conditional-field ${f.usoSotano === 'otro' ? 'visible' : ''}" id="uso-sotano-otro-field"><label for="f-uso-sotano-otro">Especifica otro uso</label><input type="text" id="f-uso-sotano-otro" name="usoSotanoOtro" value="${esc(f.usoSotanoOtro)}" placeholder="Describe el uso del piso semienterrado o sótano"></div>
        </div>
      </div>`;
  }

  function renderRadonMeasurementSection3(f) {
    return `
      <div class="form-section" id="section-3">
        <button class="section-toggle" data-section="3"><div class="section-number">3</div><span class="section-title">Datos de medición</span><span class="section-chevron">▼</span></button>
        <div class="section-body">
          <div class="field"><label for="f-codigo-electreto">Código del electreto <span class="required-mark">*</span></label><input type="text" id="f-codigo-electreto" name="codigoElectreto" value="${esc(f.codigoElectreto)}" placeholder="Código o identificador del electreto" required></div>
          <div class="field-row"><div class="field"><label for="f-fecha">Fecha inicial <span class="required-mark">*</span></label><input type="date" id="f-fecha" name="fecha" value="${esc(f.fecha)}" required></div><div class="field"><label for="f-fecha-fin">Fecha final <span class="required-mark">*</span></label><input type="date" id="f-fecha-fin" name="fechaFin" value="${esc(f.fechaFin)}" required></div></div>
          <div class="field-row"><div class="field"><label for="f-hora-inicio">Hora de inicio</label><input type="time" id="f-hora-inicio" name="horaInicio" value="${esc(f.horaInicio)}"></div><div class="field"><label for="f-hora-fin">Hora de fin</label><input type="time" id="f-hora-fin" name="horaFin" value="${esc(f.horaFin)}"></div></div>
          <div class="field-row"><div class="field"><label for="f-voltaje-inicial">Voltaje inicial <span class="required-mark">*</span></label><input type="number" id="f-voltaje-inicial" name="voltajeInicial" value="${esc(f.voltajeInicial)}" placeholder="Voltaje inicial" step="any" inputmode="decimal" required></div><div class="field"><label for="f-voltaje-final">Voltaje final <span class="required-mark">*</span></label><input type="number" id="f-voltaje-final" name="voltajeFinal" value="${esc(f.voltajeFinal)}" placeholder="Voltaje final" step="any" inputmode="decimal" required></div></div>

          <div class="subsection-heading">Tipo de espacio donde se efectuará la medición</div>
          <div class="field"><label for="f-tipo-espacio">Tipo de espacio</label><select id="f-tipo-espacio" name="tipoEspacio"><option value="">Selecciona una opción</option><option value="dormitorio" ${f.tipoEspacio === 'dormitorio' ? 'selected' : ''}>Dormitorio</option><option value="sala" ${f.tipoEspacio === 'sala' ? 'selected' : ''}>Sala</option><option value="estudio_laboratorio" ${f.tipoEspacio === 'estudio_laboratorio' ? 'selected' : ''}>Estudio/Laboratorio</option><option value="otro" ${f.tipoEspacio === 'otro' ? 'selected' : ''}>Otro</option></select></div>
          <div class="conditional-field ${f.tipoEspacio === 'otro' ? 'visible' : ''}" id="tipo-espacio-otro-field"><label for="f-tipo-espacio-otro">Especifica otro espacio</label><input type="text" id="f-tipo-espacio-otro" name="tipoEspacioOtro" value="${esc(f.tipoEspacioOtro)}" placeholder="Describe el espacio de medición"></div>

          <div class="subsection-heading">Piso sobre el cual se efectuará la medición</div>
          <div class="field"><label for="f-piso-medicion">Piso de medición</label><select id="f-piso-medicion" name="pisoMedicion"><option value="">Selecciona una opción</option><option value="planta_baja" ${f.pisoMedicion === 'planta_baja' ? 'selected' : ''}>Planta baja</option><option value="numero" ${f.pisoMedicion === 'numero' ? 'selected' : ''}>Número de piso</option></select></div>
          <div class="conditional-field ${f.pisoMedicion === 'numero' ? 'visible' : ''}" id="numero-piso-medicion-field"><label for="f-numero-piso-medicion">Número de piso</label><input type="number" id="f-numero-piso-medicion" name="numeroPisoMedicion" value="${esc(f.numeroPisoMedicion)}" placeholder="Ej. 2" step="1" inputmode="numeric"></div>
        </div>
      </div>`;
  }

  function renderSection1(f) {
    const aguaTipoVisible = f.agua === 'si' ? 'visible' : '';
    return `
      <div class="form-section expanded" id="section-1">
        <button class="section-toggle" data-section="1">
          <div class="section-number">1</div>
          <span class="section-title">Detalles de cueva</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="field">
            <label for="f-cueva">Cueva <span style="color:var(--danger)">*</span></label>
            <input type="text" id="f-cueva" name="cueva" value="${esc(f.cueva)}" placeholder="Nombre de la cueva" autocomplete="off">
          </div>
          <div class="field-row">
            <div class="field"><label for="f-provincia">Provincia <span style="color:var(--danger)">*</span></label><input type="text" id="f-provincia" name="provincia" value="${esc(f.provincia)}" placeholder="Provincia" required></div>
            <div class="field"><label for="f-canton">Cantón <span style="color:var(--danger)">*</span></label><input type="text" id="f-canton" name="canton" value="${esc(f.canton)}" placeholder="Cantón" required></div>
          </div>
          <div class="field">
            <label for="f-punto">Punto <span style="color:var(--danger)">*</span></label>
            <input type="text" id="f-punto" name="punto" value="${esc(f.punto)}" placeholder="P0, P1, etc." autocomplete="off">
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-fecha">Fecha de inicio <span style="color:var(--danger)">*</span></label>
              <input type="date" id="f-fecha" name="fecha" value="${esc(f.fecha)}">
            </div>
            <div class="field">
              <label for="f-hora-inicio">Hora de inicio <span style="color:var(--danger)">*</span></label>
              <input type="time" id="f-hora-inicio" name="horaInicio" value="${esc(f.horaInicio)}">
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-fecha-fin">Fecha de fin</label>
              <input type="date" id="f-fecha-fin" name="fechaFin" value="${esc(f.fechaFin)}">
            </div>
            <div class="field">
              <label for="f-hora-fin">Hora de fin</label>
              <input type="time" id="f-hora-fin" name="horaFin" value="${esc(f.horaFin)}">
            </div>
          </div>
          <div class="field">
            <label>Agua (presencia)</label>
            <div class="radio-group">
              <label class="radio-option ${f.agua === 'si' ? 'selected' : ''}">
                <input type="radio" name="agua" value="si" ${f.agua === 'si' ? 'checked' : ''}> Sí
              </label>
              <label class="radio-option ${f.agua === 'no' ? 'selected' : ''}">
                <input type="radio" name="agua" value="no" ${f.agua === 'no' ? 'checked' : ''}> No
              </label>
            </div>
          </div>
          <div class="conditional-field ${aguaTipoVisible}" id="agua-tipo-field">
            <label>Tipo de agua</label>
            <div class="toggle-grid">
              ${toggleItem('Corriendo', 'aguaTipo.corriendo', aguaTipoVal(f, 'corriendo'))}
              ${toggleItem('Estancada', 'aguaTipo.estancada', aguaTipoVal(f, 'estancada'))}
            </div>
          </div>
          <div class="field">
            <label for="f-seccion">Sección transversal</label>
            <input type="text" id="f-seccion" name="seccionTransversal" value="${esc(f.seccionTransversal)}" placeholder="Descripción de la sección" autocomplete="off">
          </div>
        </div>
      </div>`;
  }

  function renderSection2(f, sectionNumber = 2) {
    const p = f.parametros || {};
    return `
      <div class="form-section" id="section-${sectionNumber}">
        <button class="section-toggle" data-section="${sectionNumber}">
          <div class="section-number">${sectionNumber}</div>
          <span class="section-title">Parámetros ambientales</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="toggle-grid">
            ${toggleItem('Humedad', 'parametros.humedad', p.humedad)}
            ${toggleItem('Temperatura', 'parametros.temperatura', p.temperatura)}
            ${toggleItem('Presión', 'parametros.presion', p.presion)}
            ${toggleItem('Vel. del viento', 'parametros.velViento', p.velViento)}
            ${toggleItem('CO2', 'parametros.co2', p.co2)}
          </div>
        </div>
      </div>`;
  }

  function renderSection3(f, sectionNumber = 3) {
    const e = f.equiposRadiacion || {};
    if (f.tipo === 'radon') {
      return `
        <div class="form-section" id="section-${sectionNumber}">
          <button class="section-toggle" data-section="${sectionNumber}"><div class="section-number">${sectionNumber}</div><span class="section-title">Equipos adicionales de medición de radiación ionizante</span><span class="section-chevron">▼</span></button>
          <div class="section-body"><div class="toggle-grid">
            ${toggleItem('AlphaE', 'equiposRadiacion.alphaE', e.alphaE)}
            ${toggleItem('GammaScout', 'equiposRadiacion.gammaScout', e.gammaScout)}
            ${toggleItem('SaphyRAD', 'equiposRadiacion.saphyRad', e.saphyRad)}
          </div></div>
        </div>`;
    }
    return `
      <div class="form-section" id="section-${sectionNumber}">
        <button class="section-toggle" data-section="${sectionNumber}">
          <div class="section-number">${sectionNumber}</div>
          <span class="section-title">Equipos de radiación ionizante</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="toggle-grid">
            ${toggleItem('AlphaE', 'equiposRadiacion.alphaE', e.alphaE)}
            ${toggleItem('GammaScout', 'equiposRadiacion.gammaScout', e.gammaScout)}
            ${toggleItem('Dosímetros', 'equiposRadiacion.dosimetros', e.dosimetros)}
            ${toggleItem('SaphyRAD', 'equiposRadiacion.saphyRad', e.saphyRad)}
          </div>
          <div class="conditional-field ${e.saphyRad === true ? 'visible' : ''}" id="saphyrad-probe-field">
            <label for="f-saphyrad-sonda">Sonda SaphyRAD</label>
            <select id="f-saphyrad-sonda" name="saphyRadSonda">
              <option value="">Selecciona una opción</option>
              <option value="Sin sonda" ${e.saphyRadSonda === 'Sin sonda' ? 'selected' : ''}>Sin sonda</option>
              <option value="AB16" ${e.saphyRadSonda === 'AB16' ? 'selected' : ''}>AB16</option>
              <option value="GSP145" ${e.saphyRadSonda === 'GSP145' ? 'selected' : ''}>GSP145</option>
            </select>
          </div>
        </div>
      </div>`;
  }

  function renderSection4(f, sectionNumber = 4) {
    const a = f.equiposAdicionales || {};
    return `
      <div class="form-section" id="section-${sectionNumber}">
        <button class="section-toggle" data-section="${sectionNumber}">
          <div class="section-number">${sectionNumber}</div>
          <span class="section-title">Equipos adicionales</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="toggle-grid">
            ${toggleItem('Medidor de radiación cósmica', 'equiposAdicionales.medidorRadiacionCosmica', a.medidorRadiacionCosmica)}
          </div>
          <div class="field">
            <label for="f-otro-equipo">Otro equipo</label>
            <input type="text" id="f-otro-equipo" name="otroEquipo" value="${esc(a.otroEquipo)}" placeholder="Describe otro equipo que se haya utilizado">
          </div>
        </div>
      </div>`;
  }

  function renderSection5(f, sectionNumber = 5) {
    return `
      <div class="form-section" id="section-${sectionNumber}">
        <button class="section-toggle" data-section="${sectionNumber}">
          <div class="section-number">${sectionNumber}</div>
          <span class="section-title">Observaciones y/o notas</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="field">
            <label for="f-obs">Observaciones</label>
            <textarea id="f-obs" name="observaciones" rows="5" placeholder="Anota cualquier observación relevante sobre la medición...">${esc(f.observaciones)}</textarea>
          </div>
        </div>
      </div>`;
  }

  function renderPhotosSection(fotos) {
    return `
      <div class="form-section" id="section-photos">
        <button class="section-toggle" data-section="photos">
          <div class="section-number">📷</div>
          <span class="section-title">Fotografías adjuntas</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="photos-container">
            <div class="photo-grid" id="photo-grid">
              ${fotos.map(renderPhotoThumb).join('')}
            </div>
            <button class="add-photo-btn" id="add-photo-btn">
              📷 Agregar foto
            </button>
          </div>
        </div>
      </div>`;
  }

  function renderPhotoThumb(foto) {
    const url = URL.createObjectURL(foto.blob);
    return `
      <div class="photo-thumb" data-foto-id="${foto.id}">
        <img src="${url}" alt="Foto adjunta" loading="lazy">
        <button class="photo-thumb-delete" data-foto-id="${foto.id}" title="Eliminar foto">✕</button>
      </div>`;
  }

  // Normalize aguaTipo: supports old array format and new object format
  function aguaTipoVal(f, key) {
    const at = f.aguaTipo;
    if (!at) return null;
    if (Array.isArray(at)) return at.includes(key) ? true : null; // old format: no selection = null
    return at[key] ?? null;
  }

  function toggleItem(label, name, value) {
    // value: true=Sí, false=No, null/undefined=sin seleccionar
    const yesCls = value === true  ? 'active-yes' : '';
    const noCls  = value === false ? 'active-no'  : '';
    return `
      <div class="toggle-item">
        <div class="toggle-item-label">${label}</div>
        <div class="toggle-item-options">
          <button class="toggle-btn ${yesCls}" data-toggle="${name}" data-value="true">Sí</button>
          <button class="toggle-btn ${noCls}"  data-toggle="${name}" data-value="false">No</button>
        </div>
      </div>`;
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function positionIllustration(type) {
    const labels = {
      sobre_terreno: 'Sobre el terreno',
      bajo_terreno: 'Bajo el terreno',
      semienterrado: 'Semienterrado',
      sobre_columnas: 'Sobre columnas',
      enterrado_lateral: 'Enterrado o semienterrado en alguno de sus lados',
      otro: 'Otra configuración',
    };
    if (!labels[type]) return '<div class="position-empty">Selecciona una posición para ver su esquema.</div>';

    const house = (bodyY, bodyH, extra = '') => `
      <path class="diagram-roof" d="M102 ${bodyY} L160 ${bodyY - 38} L218 ${bodyY} Z"/>
      <rect class="diagram-house" x="112" y="${bodyY}" width="96" height="${bodyH}" rx="4"/>
      <line class="diagram-floor" x1="112" y1="${bodyY + bodyH / 2}" x2="208" y2="${bodyY + bodyH / 2}"/>
      <rect class="diagram-window" x="130" y="${bodyY + 13}" width="16" height="14" rx="2"/>
      <rect class="diagram-window" x="174" y="${bodyY + 13}" width="16" height="14" rx="2"/>
      ${extra}`;

    const drawings = {
      sobre_terreno: `
        <rect class="diagram-earth" x="20" y="116" width="280" height="28" rx="7"/>
        <line class="diagram-ground" x1="20" y1="116" x2="300" y2="116"/>
        ${house(54, 62, '<rect class="diagram-highlight" x="112" y="85" width="96" height="31" rx="4"/>')}`,
      bajo_terreno: `
        <rect class="diagram-earth" x="20" y="86" width="280" height="58" rx="7"/>
        <line class="diagram-ground" x1="20" y1="86" x2="300" y2="86"/>
        ${house(34, 92, '<rect class="diagram-highlight" x="112" y="86" width="96" height="40" rx="4"/>')}`,
      semienterrado: `
        <rect class="diagram-earth" x="20" y="103" width="280" height="41" rx="7"/>
        <line class="diagram-ground" x1="20" y1="103" x2="300" y2="103"/>
        ${house(38, 88, '<rect class="diagram-highlight" x="112" y="82" width="96" height="44" rx="4"/>')}`,
      sobre_columnas: `
        <rect class="diagram-earth" x="20" y="132" width="280" height="12" rx="6"/>
        <line class="diagram-ground" x1="20" y1="132" x2="300" y2="132"/>
        ${house(42, 60)}
        <path class="diagram-column" d="M126 102V132M160 102V132M194 102V132"/>`,
      enterrado_lateral: `
        <path class="diagram-earth" d="M20 116 L95 116 L150 86 L300 86 L300 144 L20 144 Z"/>
        <path class="diagram-ground" d="M20 116 L95 116 L150 86 L300 86"/>
        ${house(38, 88, '<rect class="diagram-highlight" x="112" y="82" width="96" height="44" rx="4"/>')}`,
      otro: `
        <rect class="diagram-earth" x="20" y="120" width="280" height="24" rx="7"/>
        <path class="diagram-ground diagram-dashed" d="M20 120 C82 102 119 132 172 116 S252 98 300 120"/>
        ${house(48, 68)}
        <circle class="diagram-question-bg" cx="254" cy="48" r="24"/><text class="diagram-question" x="254" y="57" text-anchor="middle">?</text>`,
    };

    return `<figure class="position-illustration" aria-label="Esquema: ${labels[type]}">
      <svg viewBox="0 0 320 160" role="img" aria-hidden="true">${drawings[type]}</svg>
      <figcaption>${labels[type]}</figcaption>
    </figure>`;
  }

  // =========================================
  // Form Event Binding
  // =========================================
  function bindFormEvents(ficha) {
    const save = debounce(() => autoSave(), 500);

    // Section toggles
    $$('.section-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.closest('.form-section');
        section.classList.toggle('expanded');
      });
    });

    // Text inputs
    $$('input[type="text"], input[type="number"], input[type="date"], input[type="time"], textarea').forEach(el => {
      el.addEventListener('input', () => {
        el.classList.remove('error');
        save();
      });
    });
    const conditionalSelects = [
      ['f-tipologia-construccion', 'tipologia-otro-field', 'otro'],
      ['f-posicion-piso-bajo', 'posicion-otro-field', 'otro'],
      ['f-uso-sotano', 'uso-sotano-otro-field', 'otro'],
      ['f-tipo-espacio', 'tipo-espacio-otro-field', 'otro'],
      ['f-piso-medicion', 'numero-piso-medicion-field', 'numero'],
    ];
    const updateConditionalFields = () => {
      conditionalSelects.forEach(([selectId, fieldId, activeValue]) => {
        const select = document.getElementById(selectId);
        document.getElementById(fieldId)?.classList.toggle('visible', select?.value === activeValue);
      });
      const positionSelect = document.getElementById('f-posicion-piso-bajo');
      const positionPreview = document.getElementById('position-preview');
      if (positionSelect && positionPreview) positionPreview.innerHTML = positionIllustration(positionSelect.value);
    };
    $$('select').forEach(el => el.addEventListener('change', () => {
      updateConditionalFields();
      save();
    }));

    const refreshTagBox = (box) => {
      const placeholder = box.querySelector('.tag-placeholder');
      const hasTags = Boolean(box.querySelector('.tag-chip'));
      if (hasTags) placeholder?.remove();
      else if (!placeholder) box.insertAdjacentHTML('beforeend', '<span class="tag-placeholder">Aún no hay opciones agregadas.</span>');
    };
    const reenableTagOption = (field, value) => {
      const select = document.querySelector(`[data-tag-select][data-tag-field="${field}"]`);
      [...(select?.options || [])].find(option => option.value === value)?.removeAttribute('disabled');
    };
    const removeTag = (field, value) => {
      const box = document.querySelector(`[data-tag-box="${field}"]`);
      const chip = [...(box?.querySelectorAll('.tag-chip') || [])].find(item => item.dataset.tagValue === value);
      chip?.remove();
      reenableTagOption(field, value);
      if (box) refreshTagBox(box);
    };
    const addTag = (field, value) => {
      const selector = document.querySelector(`.tag-selector[data-tag-field="${field}"]`);
      const box = selector?.querySelector(`[data-tag-box="${field}"]`);
      const select = selector?.querySelector('[data-tag-select]');
      if (!box || !select || !value) return;
      const existing = [...box.querySelectorAll('.tag-chip')].map(chip => chip.dataset.tagValue);
      if (selector.dataset.exclusiveNone === 'true') {
        if (value === 'Ninguno') existing.forEach(item => removeTag(field, item));
        else if (existing.includes('Ninguno')) removeTag(field, 'Ninguno');
      }
      if ([...box.querySelectorAll('.tag-chip')].some(chip => chip.dataset.tagValue === value)) return;
      box.querySelector('.tag-placeholder')?.remove();
      box.insertAdjacentHTML('beforeend', tagChip(field, value));
      [...select.options].find(option => option.value === value)?.setAttribute('disabled', '');
      select.value = '';
      save();
    };

    $$('[data-tag-select]').forEach(select => {
      select.addEventListener('change', () => {
        if (select.value === '__custom__') {
          const custom = document.querySelector(`[data-tag-custom="${select.dataset.tagField}"]`);
          custom?.classList.add('visible');
          custom?.querySelector('input')?.focus();
          select.value = '';
          return;
        }
        addTag(select.dataset.tagField, select.value);
      });
    });
    $$('[data-tag-box]').forEach(box => {
      box.addEventListener('click', (event) => {
        const button = event.target.closest('.tag-remove');
        const chip = button?.closest('.tag-chip');
        if (!chip) return;
        removeTag(chip.dataset.tagField, chip.dataset.tagValue);
        save();
      });
    });
    $$('[data-add-custom-tag]').forEach(button => {
      const addCustom = () => {
        const custom = button.closest('[data-tag-custom]');
        const input = custom?.querySelector('input');
        const value = input?.value.trim();
        if (!value) return;
        addTag(button.dataset.addCustomTag, `Otro: ${value}`);
        input.value = '';
        custom.classList.remove('visible');
      };
      button.addEventListener('click', addCustom);
      button.closest('[data-tag-custom]')?.querySelector('input')?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addCustom();
        }
      });
    });

    // Geolocalización de Radón: solo se solicita por acción explícita.
    const locationBtn = document.getElementById('use-location-btn');
    locationBtn?.addEventListener('click', () => {
      const status = document.getElementById('location-status');
      const latitudeInput = document.getElementById('f-latitud');
      const longitudeInput = document.getElementById('f-longitud');
      if (!navigator.geolocation) {
        if (status) status.textContent = 'Este dispositivo o navegador no ofrece geolocalización.';
        showToast('Geolocalización no disponible', 'warning', 3500);
        return;
      }

      locationBtn.disabled = true;
      locationBtn.setAttribute('aria-busy', 'true');
      locationBtn.textContent = '⌛ Obteniendo ubicación...';
      if (status) status.textContent = 'Esperando la ubicación del dispositivo…';

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (latitudeInput) latitudeInput.value = position.coords.latitude.toFixed(6);
          if (longitudeInput) longitudeInput.value = position.coords.longitude.toFixed(6);
          const accuracy = Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null;
          if (status) status.textContent = accuracy ? `Coordenadas obtenidas. Precisión aproximada: ${accuracy} m.` : 'Coordenadas obtenidas.';
          locationBtn.disabled = false;
          locationBtn.removeAttribute('aria-busy');
          locationBtn.textContent = '📍 Actualizar coordenadas del dispositivo';
          autoSave();
          showToast('Coordenadas actualizadas', 'success');
        },
        (error) => {
          const messages = {
            1: 'Permiso de ubicación denegado. Puedes ingresar las coordenadas manualmente.',
            2: 'No fue posible determinar la ubicación. Puedes ingresarla manualmente.',
            3: 'La ubicación tardó demasiado. Inténtalo otra vez o ingrésala manualmente.',
          };
          const message = messages[error.code] || 'No fue posible obtener la ubicación. Puedes ingresarla manualmente.';
          if (status) status.textContent = message;
          locationBtn.disabled = false;
          locationBtn.removeAttribute('aria-busy');
          locationBtn.textContent = '📍 Obtener coordenadas del dispositivo';
          showToast(message, 'warning', 4500);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });

    // Agua radio
    $$('input[name="agua"]').forEach(radio => {
      radio.addEventListener('change', () => {
        // Update selected state
        $$('.radio-option').forEach(o => o.classList.remove('selected'));
        radio.closest('.radio-option')?.classList.add('selected');
        // Toggle agua tipo visibility
        const aguaTipoField = document.getElementById('agua-tipo-field');
        if (aguaTipoField) {
          aguaTipoField.className = `conditional-field ${radio.value === 'si' ? 'visible' : ''}`;
        }
        save();
      });
    });

    // Agua tipo checkboxes
    $$('input[name="aguaTipo"]').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.closest('.checkbox-option')?.classList.toggle('selected', cb.checked);
        save();
      });
    });

    // Toggle buttons (Sí/No for all toggle fields)
    $$('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.toggle;
        const isYes = btn.dataset.value === 'true';
        // Find the pair
        const yesBtn = document.querySelector(`[data-toggle="${name}"][data-value="true"]`);
        const noBtn  = document.querySelector(`[data-toggle="${name}"][data-value="false"]`);
        yesBtn.className = `toggle-btn${isYes  ? ' active-yes' : ''}`;
        noBtn.className  = `toggle-btn${!isYes ? ' active-no'  : ''}`;
        setNestedValue(ficha, name, isYes);
        if (name === 'equiposRadiacion.saphyRad') {
          const probeField = document.getElementById('saphyrad-probe-field');
          const probeSelect = document.getElementById('f-saphyrad-sonda');
          probeField?.classList.toggle('visible', isYes);
          if (!isYes && probeSelect) probeSelect.value = '';
        }
        save();
      });
    });

    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => navigate('home', { type: ficha.tipo || 'cave' }));

    // Form menu
    document.getElementById('form-menu-btn')?.addEventListener('click', (e) => showFormMenu(e, ficha));

    // PDF export
    document.getElementById('export-pdf-btn')?.addEventListener('click', () => exportPDF(ficha.id));

    // Photos
    document.getElementById('add-photo-btn')?.addEventListener('click', () => {
      const input = document.getElementById('photo-input');
      input.value = '';
      input.onchange = async () => {
        for (const file of input.files) {
          const foto = await DB.addFoto(ficha.id, file, file.name);
          const grid = document.getElementById('photo-grid');
          if (grid) grid.insertAdjacentHTML('beforeend', renderPhotoThumb(foto));
        }
        showToast(`${input.files.length} foto(s) agregada(s)`, 'success');
      };
      input.click();
    });

    // Photo delete
    document.getElementById('photo-grid')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-foto-id]');
      if (!btn || !btn.classList.contains('photo-thumb-delete')) return;
      const fotoId = parseInt(btn.dataset.fotoId);
      await DB.deleteFoto(fotoId);
      btn.closest('.photo-thumb')?.remove();
      showToast('Foto eliminada');
    });
  }

  function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // =========================================
  // Auto-save
  // =========================================
  async function autoSave() {
    if (!currentFichaId) return;
    const data = collectFormData();
    try {
      setSaveStatus('saving');
      await DB.updateFicha(currentFichaId, data);
      // Update header title
      const headerTitle = document.querySelector('.header-title');
      if (headerTitle && (data.cueva || data.codigoCasa || data.nombresCompletos)) {
        headerTitle.childNodes[0].textContent = data.tipo === 'radon' ? (data.codigoCasa || data.nombresCompletos) : data.cueva;
      }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }

  function setSaveStatus(state) {
    const el = document.getElementById('save-status');
    if (!el) return;
    if (state === 'saving') {
      el.textContent = '⏳ Guardando...';
      el.className = 'save-status saving';
    } else if (state === 'saved') {
      el.textContent = '✓ Guardado';
      el.className = 'save-status saved';
      setTimeout(() => {
        if (el.className.includes('saved')) {
          el.textContent = '💾 Auto-guardado activo';
          el.className = 'save-status';
        }
      }, 2000);
    } else {
      el.textContent = '⚠️ Error al guardar';
      el.className = 'save-status';
    }
  }

  function collectFormData() {
    const ficha = { tipo: document.querySelector('.form-screen')?.dataset.type || 'cave' };

    // Text fields
    [
      'cueva', 'punto', 'sitio', 'nombresCompletos', 'provincia', 'canton', 'parroquia', 'barrio', 'codigoCasa', 'numeroCuadra', 'latitud', 'longitud',
      'tipologiaConstruccion', 'tipologiaConstruccionOtro', 'posicionPisoBajo', 'posicionPisoBajoOtro', 'usoSotano', 'usoSotanoOtro', 'anoConstruccion',
      'codigoElectreto', 'fecha', 'fechaFin', 'horaInicio', 'horaFin', 'voltajeInicial', 'voltajeFinal', 'tipoEspacio', 'tipoEspacioOtro',
      'pisoMedicion', 'numeroPisoMedicion', 'seccionTransversal', 'observaciones',
    ].forEach(name => {
      const el = document.querySelector(`[name="${name}"]`) || document.getElementById(`f-${name}`) || document.getElementById(`f-${camelToKebab(name)}`);
      if (el) ficha[name] = el.value;
    });

    // Also try by ID directly
    if (ficha.tipo === 'cave') {
      ficha.cueva = document.getElementById('f-cueva')?.value ?? ficha.cueva;
      ficha.punto = document.getElementById('f-punto')?.value ?? ficha.punto;
      ficha.seccionTransversal = document.getElementById('f-seccion')?.value ?? ficha.seccionTransversal;
    }
    ficha.fecha = document.getElementById('f-fecha')?.value ?? ficha.fecha;
    ficha.fechaFin = document.getElementById('f-fecha-fin')?.value ?? ficha.fechaFin;
    ficha.horaInicio = document.getElementById('f-hora-inicio')?.value ?? ficha.horaInicio;
    ficha.horaFin = document.getElementById('f-hora-fin')?.value ?? ficha.horaFin;
    ficha.observaciones = document.getElementById('f-obs')?.value ?? ficha.observaciones;

    const toggleNames = [];
    if (ficha.tipo === 'radon') {
      ficha.tiposTerreno = [...document.querySelectorAll('[data-tag-box="tiposTerreno"] .tag-chip')].map(chip => chip.dataset.tagValue);
      ficha.materialesConstruccion = [...document.querySelectorAll('[data-tag-box="materialesConstruccion"] .tag-chip')].map(chip => chip.dataset.tagValue);
      ficha.climatizacion = [...document.querySelectorAll('[data-tag-box="climatizacion"] .tag-chip')].map(chip => chip.dataset.tagValue);
      toggleNames.push(
        'humedadParedes', 'grietasParedes',
        'equiposRadiacion.alphaE', 'equiposRadiacion.gammaScout', 'equiposRadiacion.saphyRad',
      );
      ficha.equiposRadiacion = {};
    } else {
      const aguaRadio = document.querySelector('input[name="agua"]:checked');
      ficha.agua = aguaRadio?.value || '';
      toggleNames.push(
        'aguaTipo.corriendo', 'aguaTipo.estancada',
        'parametros.humedad', 'parametros.temperatura', 'parametros.presion', 'parametros.velViento', 'parametros.co2',
        'equiposAdicionales.medidorRadiacionCosmica',
        'equiposRadiacion.alphaE', 'equiposRadiacion.gammaScout', 'equiposRadiacion.dosimetros', 'equiposRadiacion.saphyRad',
      );
      ficha.aguaTipo = {};
      ficha.parametros = {};
      ficha.equiposRadiacion = {};
      ficha.equiposAdicionales = {};
    }

    toggleNames.forEach(name => {
      const yesBtn = document.querySelector(`[data-toggle="${name}"][data-value="true"]`);
      const noBtn  = document.querySelector(`[data-toggle="${name}"][data-value="false"]`);
      // null = neither pressed, true/false = explicitly selected
      const val = yesBtn?.classList.contains('active-yes') ? true
               : noBtn?.classList.contains('active-no')   ? false
               : null;
      setNestedValue(ficha, name, val);
    });

    if (ficha.tipo === 'cave') {
      ficha.equiposRadiacion.saphyRadSonda = document.getElementById('f-saphyrad-sonda')?.value || '';
      ficha.equiposAdicionales.otroEquipo = document.getElementById('f-otro-equipo')?.value || '';
    } else {
      // Campos retirados de Radón: no enviarlos en el parche para conservar datos históricos.
      delete ficha.sitio;
      delete ficha.punto;
      delete ficha.parametros;
      delete ficha.equiposAdicionales;
    }

    return ficha;
  }

  function camelToKebab(str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  // =========================================
  // Form Menu
  // =========================================
  function showFormMenu(e, ficha) {
    if (currentMenuCleanup) currentMenuCleanup();
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();

    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';

    const menu = document.createElement('div');
    menu.className = 'menu-dropdown';
    menu.style.cssText = `top:${rect.bottom + 4}px; right:${document.documentElement.clientWidth - rect.right}px`;
    menu.innerHTML = `
      <button class="menu-item" data-menu="pdf">📄 Exportar PDF</button>
      <button class="menu-item" data-menu="json">💾 Exportar JSON</button>
      <div class="divider"></div>
      <button class="menu-item danger" data-menu="delete">🗑️ Eliminar ficha</button>`;

    document.body.appendChild(overlay);
    document.body.appendChild(menu);

    function cleanup() {
      overlay.remove();
      menu.remove();
      currentMenuCleanup = null;
    }
    currentMenuCleanup = cleanup;

    overlay.addEventListener('click', cleanup);
    menu.querySelectorAll('[data-menu]').forEach(item => {
      item.addEventListener('click', () => {
        cleanup();
        if (item.dataset.menu === 'pdf') exportPDF(ficha.id);
        if (item.dataset.menu === 'json') exportJSON(ficha.id);
        if (item.dataset.menu === 'delete') deleteFicha(ficha.id, true);
      });
    });
  }

  // =========================================
  // Clear Cache & Data
  // =========================================
  function showClearDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-title">🗑️ Limpiar caché y datos</div>
        <div class="dialog-message">
          <strong style="color:var(--warning)">⚠️ Guarda tus fichas en JSON antes de limpiar.</strong><br><br>
          Esta acción eliminará <strong>todas las fichas, fotos y caché</strong> del dispositivo. No se puede deshacer.<br><br>
          Podrás volver a importar tus fichas desde los archivos JSON exportados.
        </div>
        <div class="dialog-actions" style="flex-direction:column; gap:8px">
          <button class="btn btn-primary btn-full" data-action="export-first">💾 Exportar todo primero</button>
          <div style="display:flex; gap:8px; width:100%">
            <button class="btn btn-ghost btn-sm" style="flex:1" data-action="cancel">Cancelar</button>
            <button class="btn btn-danger btn-sm" style="flex:1" data-action="clear-now">Limpiar de todas formas</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      if (!action && e.target !== overlay) return;
      if (action === 'export-first') {
        await exportAllJSON();
        // Keep dialog open so user can then choose to clear
        return;
      }
      overlay.remove();
      if (action === 'clear-now') await clearAllData();
    });
  }

  async function clearAllData() {
    showToast('Limpiando datos...', '', 4000);
    try {
      // Delete all fichas (and their photos, via DB.deleteFicha cascade)
      const fichas = await DB.getAllFichas();
      for (const f of fichas) await DB.deleteFicha(f.id);

      // Clear service worker caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // Unregister service worker so it re-registers fresh on next load
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }

      showToast('Datos y caché eliminados', 'success');
      const { params } = getRoute();
      if (getRoute().path === 'start') renderStart();
      else await renderHome(params.type || 'cave');
    } catch (err) {
      console.error(err);
      showToast('Error al limpiar', 'error');
    }
  }

  // =========================================
  // PDF Export
  // =========================================
  async function exportPDF(id) {
    showToast('Generando PDF...', '', 3000);
    try {
      // Save current form state first if we're on the form screen
      if (currentFichaId === id) {
        await DB.updateFicha(id, collectFormData());
      }
      const ficha = await DB.getFicha(id);
      const fotos = await DB.getFotos(id);
      const requiredFields = (ficha.tipo || 'cave') === 'radon'
        ? [
            ['nombresCompletos', 'f-nombres-completos', 'nombres completos'],
            ['provincia', 'f-provincia', 'provincia'],
            ['canton', 'f-canton', 'cantón'],
            ['parroquia', 'f-parroquia', 'parroquia'],
            ['numeroCuadra', 'f-numero-cuadra', 'número de cuadra'],
            ['latitud', 'f-latitud', 'latitud'],
            ['longitud', 'f-longitud', 'longitud'],
            ['codigoElectreto', 'f-codigo-electreto', 'código del electreto'],
            ['fecha', 'f-fecha', 'fecha inicial'],
            ['fechaFin', 'f-fecha-fin', 'fecha final'],
            ['voltajeInicial', 'f-voltaje-inicial', 'voltaje inicial'],
            ['voltajeFinal', 'f-voltaje-final', 'voltaje final'],
          ]
        : [
            ['provincia', 'f-provincia', 'provincia'],
            ['canton', 'f-canton', 'cantón'],
          ];
      const missing = requiredFields.find(([name]) => !String(ficha[name] ?? '').trim());
      if (missing) {
        showToast(`Completa ${missing[2]} antes de exportar el PDF`, 'warning', 4000);
        if (currentFichaId === id) {
          const missingField = document.getElementById(missing[1]);
          missingField?.closest('.form-section')?.classList.add('expanded');
          missingField?.classList.add('error');
          missingField?.focus();
          missingField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      await PDFGen.generate(ficha, fotos);
      showToast('PDF exportado', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al generar PDF', 'error');
    }
  }

  // =========================================
  // JSON Export / Import
  // =========================================
  async function exportJSON(id) {
    const ficha = await DB.getFicha(id);
    const fotos = await DB.getFotos(id);

    // Convert photo blobs to base64
    const fotosExport = await Promise.all(fotos.map(async f => {
      const base64 = await blobToBase64(f.blob);
      return { name: f.name, type: f.blob.type, data: base64, createdAt: f.createdAt };
    }));

    const exportData = { ficha, fotos: fotosExport, exportedAt: new Date().toISOString(), version: 2 };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fichaName = ficha.tipo === 'radon' ? (ficha.codigoCasa || ficha.nombresCompletos) : ficha.cueva;
    const baseName = fichaName ? (ficha.tipo === 'radon' ? fichaName : (ficha.punto ? `${fichaName}_${ficha.punto}` : fichaName)) : 'Ficha';
    const safeName = baseName.replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚüÜñÑ ]/g, '_');
    a.download = `Ficha_${safeName}_${ficha.fecha || 'sin-fecha'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON exportado', 'success');
  }

  async function exportAllJSON(type) {
    const allFichas = await DB.getAllFichas();
    const fichas = type ? allFichas.filter(f => (f.tipo || 'cave') === type) : allFichas;
    const allData = await Promise.all(fichas.map(async f => {
      const fotos = await DB.getFotos(f.id);
      const fotosExport = await Promise.all(fotos.map(async foto => {
        const base64 = await blobToBase64(foto.blob);
        return { name: foto.name, type: foto.blob.type, data: base64, createdAt: foto.createdAt };
      }));
      return { ficha: f, fotos: fotosExport };
    }));

    const exportData = { fichas: allData, exportedAt: new Date().toISOString(), version: 2 };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fichas_${type === 'radon' ? 'Radon' : type === 'cave' ? 'Cuevas' : 'Medicion'}_${new Date().toISOString().substring(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${fichas.length} fichas exportadas`, 'success');
  }

  function triggerImport(type) {
    const input = document.getElementById('import-file');
    input.value = '';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importJSON(data, type);
      } catch (err) {
        showToast('Error al leer el archivo', 'error');
        console.error(err);
      }
    };
    input.click();
  }

  async function importJSON(data, currentType = 'cave') {
    let imported = 0;
    const items = data.fichas || [{ ficha: data.ficha, fotos: data.fotos }];

    for (const item of items) {
      const { ficha: rawFicha, fotos = [] } = item;
      const ficha = { ...rawFicha, tipo: rawFicha?.tipo || 'cave' };
      if (!ficha?.id) continue;
      // Check if exists, if so update
      const existing = await DB.getFicha(ficha.id);
      if (existing) {
        await DB.updateFicha(ficha.id, ficha);
      } else {
        await DB.createFicha(ficha);
      }
      // Import photos
      for (const fotoData of fotos) {
        const blob = base64ToBlob(fotoData.data, fotoData.type);
        await DB.addFoto(ficha.id, blob, fotoData.name);
      }
      imported++;
    }

    showToast(`${imported} ficha(s) importada(s)`, 'success');
    if (currentType) await renderHome(currentType);
    else renderStart();
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(base64, type) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  // =========================================
  // Delete
  // =========================================
  async function deleteFicha(id, fromForm = false) {
    const ficha = await DB.getFicha(id);
    const name = ficha?.tipo === 'radon' ? (ficha?.codigoCasa || ficha?.nombresCompletos || 'esta ficha') : (ficha?.cueva || 'esta ficha');
    const ok = await confirm('Eliminar ficha', `¿Eliminar "${name}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    await DB.deleteFicha(id);
    showToast('Ficha eliminada');
    navigate('home', { type: ficha?.tipo || 'cave' });
  }

  // =========================================
  // Online/Offline Status
  // =========================================
  function updateOnlineStatus() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot) return;
    if (navigator.onLine) {
      dot.className = 'status-dot';
      if (text) text.textContent = 'Online';
    } else {
      dot.className = 'status-dot offline';
      if (text) text.textContent = 'Offline';
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', () => {
    updateOnlineStatus();
    showToast('Modo offline — datos guardados localmente', 'warning', 3000);
  });

  // =========================================
  // PWA Install
  // =========================================

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  }

  // Capture the install prompt for Android/desktop — used when menu option is tapped
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    showToast('App instalada correctamente', 'success');
  });

  // =========================================
  // Service Worker Registration
  // =========================================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  }

  // =========================================
  // Init
  // =========================================
  async function init() {
    try {
      await render();
    } catch (err) {
      console.error('Init error:', err);
      document.getElementById('app').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Error al cargar</div>
          <div class="empty-subtitle">${err.message}</div>
        </div>`;
    }
  }

  init();
})();
