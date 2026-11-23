(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PRICE = 219;
  const COLORS = [
    { name: 'Coral', value: '#ef553f' }, { name: 'Azul noche', value: '#18334c' },
    { name: 'Arena', value: '#d9c6a4' }, { name: 'Verde', value: '#32a866' },
  ];
  const MATERIALS = ['Cuero', 'Gamuza', 'Lona'];
  const SIZES = ['39', '40', '41', '42', '43'];
  const STEPS = ['Color', 'Talla', 'Resumen'];
  const MODELS = ['Runner Pulse', 'Classic Court', 'Urban Flex', 'Trail Nova'];

  const state = { color: COLORS[0], material: 'Cuero', size: null, step: 1, cart: [], angle: 0 };
  try { Object.assign(state, { cart: JSON.parse(localStorage.getItem('sw-cart') || '[]') }); } catch (e) {}

  /* ---------- Utilidades ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  // Diálogos nativos: atrapan el foco, cierran con Esc y devuelven el foco al disparador
  function openDialog(dlg, trigger) {
    dlg._trigger = trigger; dlg.showModal();
    trigger && trigger.setAttribute('aria-expanded', 'true');
  }
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', () => d._trigger && d._trigger.focus());
  });

  // Enlace activo según scroll
  const links = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => {
        if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }), { rootMargin: '-40% 0px -55% 0px' });
    ['catalogo', 'personaliza', 'pedidos', 'comunidad'].forEach(id => io.observe(document.getElementById(id)));
  }

  /* ---------- Radiogroups accesibles (flechas, roving tabindex) ---------- */
  function radioGroup(container, items, getLabel, isSelected, onSelect, render) {
    container.innerHTML = '';
    items.forEach((item, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', getLabel(item));
      render && render(b, item);
      if (!render) b.textContent = getLabel(item);
      b.addEventListener('click', () => onSelect(item));
      container.appendChild(b);
    });
    container.addEventListener('keydown', e => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      const btns = $$('[role=radio]', container);
      const i = btns.indexOf(document.activeElement);
      const n = btns[(i + keys[e.key] + btns.length) % btns.length];
      n.focus(); n.click();
    });
    return () => $$('[role=radio]', container).forEach((b, i) => {
      const sel = isSelected(items[i]);
      b.setAttribute('aria-checked', sel);
      b.tabIndex = sel || (!items.some(isSelected) && i === 0) ? 0 : -1;
      b.classList.toggle('active', sel);
    });
  }

  const markSaved = () => {
    const s = $('#saved'); s.textContent = 'Diseño guardado'; s.style.opacity = 1;
  };
  const stage = $('#stage');
  const refreshColor = radioGroup($('#colors'), COLORS, c => c.name, c => c.name === state.color.name,
    c => { state.color = c; update(); }, (b, c) => { b.style.backgroundColor = c.value; });
  const refreshMat = radioGroup($('#materials'), MATERIALS, m => m, m => m === state.material,
    m => { state.material = m; update(); });
  const refreshSize = radioGroup($('#sizes'), SIZES, s => 'Talla ' + s, s => s === state.size,
    s => { state.size = s; $('#sizeError').textContent = ''; update(); }, (b, s) => { b.textContent = s; });

  /* ---------- Pasos ---------- */
  function showStep() {
    $$('.step-panel').forEach(p => p.hidden = +p.dataset.step !== state.step);
    $('#stepText').textContent = `Paso ${state.step} de ${STEPS.length}`;
    $('#stepName').textContent = STEPS[state.step - 1];
    const pr = $('#progress'); pr.setAttribute('aria-valuenow', state.step);
    pr.firstElementChild.style.width = (state.step / STEPS.length * 100) + '%';
    $('#prevBtn').disabled = state.step === 1;
    $('#nextBtn').disabled = state.step === STEPS.length;
    if (state.step === 3) {
      $('#summary').innerHTML = `<li><b>Modelo:</b> Runner Pulse</li><li><b>Color:</b> ${state.color.name}</li>
        <li><b>Material:</b> ${state.material}</li><li><b>Talla:</b> ${state.size || 'sin elegir'}</li><li><b>Precio:</b> S/ ${PRICE}</li>`;
    }
  }
  function go(n) {
    if (n > state.step && state.step === 2 && !state.size) {
      $('#sizeError').textContent = 'Selecciona una talla para continuar.';
      $('#sizes [role=radio]').focus(); return;
    }
    state.step = Math.min(Math.max(n, 1), STEPS.length); showStep();
    const first = $(`.step-panel[data-step="${state.step}"] button, #stepText`);
    ($(`.step-panel[data-step="${state.step}"] [tabindex="0"]`) || first).focus();
  }
  $('#nextBtn').addEventListener('click', () => go(state.step + 1));
  $('#prevBtn').addEventListener('click', () => go(state.step - 1));

  function update() {
    stage.style.setProperty('--accent', state.color.value);
    $('#colorName').innerHTML = `${state.color.name} <span>${state.color.value}</span>`;
    $('#stageImg').alt = `Vista previa de Runner Pulse en color ${state.color.name}, material ${state.material}`;
    refreshColor(); refreshMat(); refreshSize(); markSaved();
    if (state.step === 3) showStep();
  }

  /* ---------- Rotación 360° (arrastre + teclado) ---------- */
  const img = $('#stageImg');
  const rotate = d => { state.angle += d; img.style.transform = `perspective(800px) rotateY(${state.angle % 360}deg)`; };
  let dragX = null;
  stage.addEventListener('pointerdown', e => { dragX = e.clientX; stage.classList.add('dragging'); stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => { if (dragX !== null) { rotate((e.clientX - dragX) * .6); dragX = e.clientX; } });
  ['pointerup', 'pointercancel'].forEach(ev => stage.addEventListener(ev, () => { dragX = null; stage.classList.remove('dragging'); }));
  $('#rotateBtn').addEventListener('click', () => rotate(45));
  $('#rotateBtn').addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); rotate(-15); }
    if (e.key === 'ArrowRight') { e.preventDefault(); rotate(15); }
  });

  /* ---------- Carrito ---------- */
  const fmt = n => 'S/ ' + n.toLocaleString('es-PE');
  function saveCart() { try { localStorage.setItem('sw-cart', JSON.stringify(state.cart)); } catch (e) {} }
  function renderCart() {
    const count = state.cart.reduce((a, i) => a + i.qty, 0);
    const badge = $('#cartCount'); badge.hidden = !count; badge.textContent = count;
    $('#cartBtn').setAttribute('aria-label', `Carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`);
    const list = $('#cartList');
    list.innerHTML = state.cart.length ? '' : '<li class="muted" style="padding:16px 0">Tu carrito está vacío.</li>';
    state.cart.forEach((it, i) => {
      const li = document.createElement('li'); li.className = 'cart-item';
      li.innerHTML = `<div><b>Runner Pulse</b><small>${it.color} · ${it.material} · Talla ${it.size}</small>
        <div class="qty" role="group" aria-label="Cantidad">
          <button type="button" data-a="dec" aria-label="Disminuir cantidad">−</button>
          <output aria-live="polite" style="min-width:28px;text-align:center">${it.qty}</output>
          <button type="button" data-a="inc" aria-label="Aumentar cantidad">+</button></div></div>
        <div style="text-align:right"><b>${fmt(PRICE * it.qty)}</b><br>
        <button type="button" class="remove-btn" data-a="rm">Quitar</button></div>`;
      li.addEventListener('click', e => {
        const a = e.target.dataset.a; if (!a) return;
        if (a === 'inc') it.qty++;
        if (a === 'dec') it.qty = Math.max(1, it.qty - 1);
        if (a === 'rm') { state.cart.splice(i, 1); toast('Producto eliminado'); }
        saveCart(); renderCart();
        const nb = $$('#cartList li')[Math.min(i, state.cart.length - 1)];
        (nb && $(`[data-a="${a === 'rm' ? 'rm' : a}"]`, nb) || $('#cartDialog [data-close]')).focus();
      });
      list.appendChild(li);
    });
    $('#cartTotal').textContent = fmt(state.cart.reduce((a, i) => a + PRICE * i.qty, 0));
    $('#checkoutBtn').disabled = !state.cart.length;
  }
  $('#cartBtn').addEventListener('click', e => openDialog($('#cartDialog'), e.currentTarget));
  $('#checkoutBtn').addEventListener('click', () => { $('#cartDialog').close(); toast('Redirigiendo al pago seguro…'); });

  $('#customizer').addEventListener('submit', e => {
    e.preventDefault();
    if (!state.size) { go(2); $('#sizeError').textContent = 'Selecciona una talla antes de agregar.'; return; }
    const found = state.cart.find(i => i.color === state.color.name && i.material === state.material && i.size === state.size);
    found ? found.qty++ : state.cart.push({ color: state.color.name, material: state.material, size: state.size, qty: 1 });
    saveCart(); renderCart(); toast('Agregado al carrito');
  });

  /* ---------- Búsqueda ---------- */
  const input = $('#searchInput'), results = $('#results');
  function search() {
    const q = input.value.trim().toLowerCase();
    const r = MODELS.filter(m => m.toLowerCase().includes(q));
    results.innerHTML = r.length ? r.map(m => `<li><a href="#personaliza" data-close>${m}</a></li>`).join('')
      : '<li class="muted" style="padding:10px 0">Sin resultados para tu búsqueda.</li>';
  }
  input.addEventListener('input', search);
  results.addEventListener('click', e => e.target.closest('a') && $('#searchDialog').close());
  $('#searchBtn').addEventListener('click', e => { search(); openDialog($('#searchDialog'), e.currentTarget); });
  $('#updateBtn').addEventListener('click', e => openDialog($('#updateDialog'), e.currentTarget));

  $('.profile-button').addEventListener('click', () => toast('Inicio de sesión disponible próximamente'));

  /* ---------- Init ---------- */
  showStep(); update(); renderCart();
})();
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const say = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => t.classList.remove('show'), 3000); };
  const open = id => $('#' + id).showModal();
  const HEX = { Coral: '#ef553f', 'Azul noche': '#18334c', Arena: '#d9c6a4', Verde: '#32a866' };
  const sel = g => { const b = $('[role=radio][aria-checked="true"]', $('#' + g)); return b && b.getAttribute('aria-label'); };
  const cur = () => ({ color: sel('colors'), material: sel('materials'), size: (sel('sizes') || '').replace('Talla ', '') || null });
  const pick = (g, label) => { const b = $$('[role=radio]', $('#' + g)).find(x => x.getAttribute('aria-label') === label); b && b.click(); };
  const apply = c => { c.color && pick('colors', c.color); c.material && pick('materials', c.material); c.size && pick('sizes', 'Talla ' + c.size); };
  const dlg = (id, t, body) => `<dialog id="${id}" aria-labelledby="${id}T"><div class="dialog-inner"><div class="dialog-head"><h2 id="${id}T">${t}</h2><button type="button" class="close-btn" data-close aria-label="Cerrar">✕</button></div>${body}</div></dialog>`;

  /* ===== Marcado nuevo (se inyecta; el landing original no se modifica) ===== */
  $('#nav a[href="#pedidos"]').insertAdjacentHTML('beforebegin', '<a href="#resenas">Reseñas</a>');

  $('.controls').insertAdjacentHTML('beforeend', `
  <details class="tools" open><summary>Más herramientas</summary>
   <div class="field"><label for="sport">Actividad deportiva</label>
    <select id="sport"><option value="">Selecciona…</option><option>Running</option><option>Básquet</option><option>Casual</option><option>Escalada</option></select>
    <p id="sportTip" class="hint" aria-live="polite"></p></div>
   <div class="field"><span class="lbl">Paletas sugeridas</span><div class="chips" id="pals"></div>
    <button type="button" class="link-btn" id="undoPal" hidden>Deshacer paleta</button><p id="palMsg" class="hint" aria-live="polite"></p></div>
   <div class="field"><label for="budget">Presupuesto máximo (S/)</label>
    <input id="budget" type="number" min="0" inputmode="numeric" placeholder="Ej. 400" aria-describedby="budgetMsg"><p id="budgetMsg" class="hint" aria-live="polite"></p></div>
   <div class="field"><label for="svgFile">Subir diseño (solo SVG)</label>
    <input id="svgFile" type="file" accept=".svg,image/svg+xml" aria-describedby="svgMsg"><p id="svgMsg" class="error-msg" role="alert"></p>
    <label for="svgScale">Tamaño del diseño</label><input id="svgScale" type="range" min="20" max="100" value="50" disabled>
    <p id="cutWarn" class="error-msg" role="alert" hidden>Riesgo de corte: el diseño sobrepasa el área segura. <button type="button" class="link-btn" id="ignoreCut">Ignorar bajo mi riesgo</button></p></div>
   <div class="field"><label class="check"><input type="checkbox" id="cmyk"> Modo prueba de impresión (CMYK)</label>
    <button type="button" class="chip" id="premiumBtn">Render fotorealista <b>★ Premium</b></button>
    <p class="hint">Las herramientas básicas son gratis y sin marcas de agua.</p></div>
   <div class="actions">
    <button type="button" class="chip" id="saveDraft">Guardar borrador</button><button type="button" class="chip" id="loadDraft">Abrir borrador</button>
    <button type="button" class="chip" id="saveVar">Guardar variante</button><button type="button" class="chip" id="compare">Comparar</button>
    <button type="button" class="chip" id="shareBtn">Compartir</button><button type="button" class="chip" id="favBtn" aria-pressed="false">♡ Favorito</button></div>
   <ul id="favList" class="fav-list" aria-label="Mis favoritos"></ul>
  </details>`);

  $('#materials').insertAdjacentHTML('afterend', `<dl class="mat-info"><dt>Cuero</dt><dd>Resistente y fácil de limpiar. Ideal para uso diario.</dd>
   <dt>Gamuza</dt><dd>Suave y muy cómoda. Evita la lluvia.</dd><dt>Lona</dt><dd>Ligera y respirable. Recomendada para running.</dd></dl>`);
  $('#sizes').insertAdjacentHTML('afterend', `<p class="stock-note"><span>Talla 43 agotada. Quedan pocos pares en 41 y 42.</span>
   <button type="button" class="link-btn" id="notifyBtn">Avísame cuando haya stock</button> · <button type="button" class="link-btn" id="guideBtn">Guía de tallas</button></p>`);
  $('.progress').insertAdjacentHTML('afterend', '<p class="step-hint" id="stepHint" aria-live="polite"></p>');
  $('#stage').insertAdjacentHTML('beforeend', '<div class="safe-area" aria-hidden="true"></div><img id="designImg" class="design" alt="Diseño vectorial importado" title="Riesgo de corte" hidden><button type="button" class="zoom-btn" id="zoomBtn" aria-pressed="false">Zoom</button>');

  $('#pedidos').insertAdjacentHTML('beforebegin', `
  <section class="community" id="galeria" aria-labelledby="com-t"><div class="section-heading"><div><p class="eyebrow">COMUNIDAD</p><h2 id="com-t">Diseños para inspirarte</h2></div><p>Plantillas verificadas y totalmente editables.</p></div>
   <div class="filters"><label>Categoría <select id="fCat"><option value="">Todas</option><option>Patrones vectoriales</option><option>Minimalista</option></select></label>
   <label>Modelo <select id="fModel"><option value="">Todos</option><option>Runner Pulse</option><option>Classic Court</option><option>Urban Flex</option><option>Trail Nova</option></select></label></div>
   <ul class="cards" id="tplList" aria-live="polite"></ul></section>
  <section class="reviews" id="resenas" aria-labelledby="rev-t"><div class="section-heading"><div><p class="eyebrow">OPINIONES</p><h2 id="rev-t">Lo que dicen los compradores</h2></div>
   <label>Modelo <select id="revModel"><option>Runner Pulse</option><option>Classic Court</option><option>Urban Flex</option><option>Trail Nova</option></select></label></div>
   <ul class="rev-list" id="revList" aria-live="polite"></ul></section>`);

  $('.tracking-card').insertAdjacentHTML('beforeend', `<p class="eta">Próximo paso estimado: Ensamblado, mañana 10:00 a. m.</p>
   <div class="actions"><button type="button" class="chip" id="processBtn">Ver proceso</button><button type="button" class="chip" id="chatBtn">Chat con soporte</button></div>
   <label class="check"><input type="checkbox" id="mailNotif" checked> Avisarme por correo con cada nueva foto</label>`);
  $('#cartTotal').parentElement.insertAdjacentHTML('beforebegin', `<p id="hold" class="hold" role="timer"></p>
   <details class="tech"><summary>Detalles técnicos</summary><ul id="techList"></ul><button type="button" class="link-btn" id="editDesign">Editar diseño</button></details>`);

  const row = (a, b) => `<div class="field"><label for="${a}">${b}</label>`;
  document.body.insertAdjacentHTML('beforeend',
    dlg('guideDlg', 'Guía de tallas', '<p id="guideSel" class="hint" aria-live="polite"></p><table class="size-table"><caption class="sr-only">Equivalencia de tallas</caption><thead><tr><th scope="col">Talla</th><th scope="col">Largo del pie</th><th scope="col">Stock</th></tr></thead><tbody id="guideBody"></tbody></table><p class="hint">Medidas del modelo: ancho 10 cm · altura 12 cm · caída 8 mm.</p><button type="button" class="chip" id="unitBtn"></button>') +
    dlg('cmpDlg', 'Comparar variantes', '<div class="cmp" id="cmpBody"></div>') +
    dlg('shareDlg', 'Compartir diseño', '<p>Enlace privado de solo lectura.</p><label class="sr-only" for="shareLink">Enlace</label><input id="shareLink" class="search-input" readonly><p id="shareSt" class="hint" aria-live="polite"></p><div class="actions"><button type="button" class="chip" id="copyLink">Copiar enlace</button><button type="button" class="chip" id="offLink">Desactivar enlace</button></div>') +
    dlg('premiumDlg', 'Función Premium', '<p>El render fotorealista es parte de la suscripción: incluye exportación en alta resolución y fondo transparente.</p><p class="muted">Puedes seguir diseñando gratis, sin marcas de agua.</p><button type="button" class="primary-button" data-close>Entendido</button>') +
    dlg('processDlg', 'Proceso de fabricación', '<ul class="gallery"><li><img src="sneaker-studio.jpg" alt="Corte del material" style="object-position:0 50%"><span>Corte</span></li><li><img src="sneaker-studio.jpg" alt="Impresión del color" style="object-position:50% 50%"><span>Impresión</span></li><li><img src="sneaker-studio.jpg" alt="Costura final" style="object-position:100% 50%"><span>Costura</span></li></ul>') +
    dlg('chatDlg', 'Chat con soporte', '<ul class="chat" id="chatLog" aria-live="polite"></ul><form id="chatForm"><label class="sr-only" for="chatIn">Mensaje</label><input id="chatIn" class="search-input" placeholder="Escribe tu consulta" required><label class="chip" for="chatImg">Adjuntar imagen</label><input id="chatImg" type="file" accept="image/*" class="sr-only"><button class="primary-button">Enviar</button></form>') +
    dlg('payDlg', 'Pago y comprobante', `<form id="payForm" novalidate><fieldset><legend>Tipo de comprobante</legend><label class="check"><input type="radio" name="tipo" value="boleta" checked> Boleta de venta</label><label class="check"><input type="radio" name="tipo" value="factura"> Factura</label></fieldset>
      <div id="rucBox" hidden>${row('ruc', 'RUC (11 dígitos)')}<input id="ruc" class="search-input" inputmode="numeric" aria-describedby="rucErr"><p id="rucErr" class="error-msg" role="alert"></p></div></div>
      <div id="razonBox" hidden>${row('razon', 'Razón social')}<input id="razon" class="search-input" readonly></div></div>
      ${row('mail', 'Correo para el comprobante')}<input id="mail" type="email" class="search-input" autocomplete="email" aria-describedby="mailErr"><p id="mailErr" class="error-msg" role="alert"></p></div>
      <button class="primary-button" type="submit">Confirmar pago</button></form>`) +
    dlg('tourDlg', 'Tutorial rápido', '<p id="tourTxt" aria-live="polite"></p><div class="actions"><button type="button" class="link-btn" id="tourSkip">Saltar tutorial</button><button type="button" class="primary-button" id="tourNext">Siguiente</button></div>'));
  // los diálogos nuevos no existían cuando app.js registró sus cierres
  document.addEventListener('click', e => { const d = e.target.closest('dialog'); if (d && (e.target === d || e.target.closest('[data-close]'))) d.close(); });

  /* ===== HU-009 / HU-010: pasos con instrucciones y ayuda contextual ===== */
  const HINTS = ['Elige el color y el material de tu zapatilla.', 'Selecciona tu talla; revisa la guía si dudas.', 'Revisa tu diseño y edítalo antes de pagar.'];
  const hint = () => { const n = +($('#stepText').textContent.match(/\d+/) || [1])[0]; $('#stepHint').textContent = HINTS[n - 1]; };
  new MutationObserver(hint).observe($('#stepText'), { childList: true, characterData: true, subtree: true }); hint();
  const HELP = { 'lbl-color': 'El color principal pinta toda la capellada. Puedes cambiarlo cuando quieras.', 'lbl-mat': 'El material cambia la textura y la comodidad. Mira la descripción de abajo.', 'lbl-size': 'Elige la talla según el largo de tu pie en centímetros.' };
  Object.entries(HELP).forEach(([id, txt]) => {
    const l = $('#' + id), b = document.createElement('button'), p = document.createElement('p');
    b.type = 'button'; b.className = 'help-btn'; b.textContent = '?'; b.setAttribute('aria-label', 'Ayuda sobre ' + l.textContent.toLowerCase()); b.setAttribute('aria-expanded', 'false');
    p.className = 'help-tip'; p.hidden = true; p.innerHTML = txt + ' <button type="button" class="link-btn">Cerrar</button>';
    b.onclick = () => { p.hidden = !p.hidden; b.setAttribute('aria-expanded', !p.hidden); };
    $('button', p).onclick = () => { p.hidden = true; b.setAttribute('aria-expanded', 'false'); b.focus(); };
    l.append(b); l.after(p);
  });

  /* ===== HU-001: zoom (y arreglo de clic dentro del visor) ===== */
  let z = 1;
  [$('#zoomBtn'), $('#rotateBtn')].forEach(b => b.addEventListener('pointerdown', e => e.stopPropagation()));
  $('#zoomBtn').onclick = () => { z = z === 1 ? 1.6 : 1; [$('#stageImg'), $('.color-wash'), $('#designImg')].forEach(e => e.style.scale = z); $('#zoomBtn').setAttribute('aria-pressed', z > 1); };

  /* ===== HU-013 / HU-032: stock y aviso de reposición ===== */
  const STOCK = { 39: 8, 40: 6, 41: 3, 42: 2, 43: 0 };
  $$('#sizes [role=radio]').forEach(b => {
    const n = STOCK[b.textContent];
    if (n === 0) { b.disabled = true; b.setAttribute('aria-label', 'Talla ' + b.textContent + ', agotada'); b.classList.add('soldout'); }
    else if (n < 5) b.title = 'Quedan ' + n + ' pares';
  });
  $('#notifyBtn').onclick = () => { store.set('sw-notify', ['43']); say('Te avisaremos por correo cuando la talla 43 vuelva a tener stock.'); };

  /* ===== HU-011 / HU-045: guía de tallas ===== */
  const CM = { 39: 24.5, 40: 25.2, 41: 26, 42: 26.7, 43: 27.5 }; let unit = 'cm';
  const guide = () => {
    const s = (sel('sizes') || '').replace('Talla ', '');
    $('#guideBody').innerHTML = Object.entries(CM).map(([k, v]) => `<tr${k === s ? ' class="sel" aria-current="true"' : ''}><th scope="row">${k}</th><td>${unit === 'cm' ? v + ' cm' : (v / 2.54).toFixed(1) + ' in'}</td><td>${STOCK[k] ? 'Disponible' : 'Agotada'}</td></tr>`).join('');
    $('#unitBtn').textContent = unit === 'cm' ? 'Ver en pulgadas' : 'Ver en centímetros';
    $('#guideSel').textContent = s ? 'Talla seleccionada: ' + s : 'Aún no has elegido talla.';
  };
  $('#guideBtn').onclick = () => { guide(); open('guideDlg'); };
  $('#unitBtn').onclick = () => { unit = unit === 'cm' ? 'in' : 'cm'; guide(); };

  /* ===== HU-039 / HU-042 / HU-043: recomendaciones, paletas, presupuesto ===== */
  const REC = { Running: 'Te recomendamos Lona: ligera y respirable.', Básquet: 'Te recomendamos Cuero: más soporte en el tobillo.', Casual: 'Te recomendamos Gamuza: suave y cómoda.' };
  $('#sport').onchange = e => { $('#sportTip').textContent = e.target.value ? (REC[e.target.value] || 'Aún no hay recomendaciones para esta actividad. Puedes configurar tu zapatilla manualmente.') : ''; };
  const PAL = [['Urbana', 'Azul noche', 'Cuero'], ['Playa', 'Arena', 'Lona'], ['Selva', 'Verde', 'Gamuza'], ['Costa', 'Verde', 'Lona'], ['Fuego', 'Coral', 'Gamuza']]; let prev = null;
  PAL.forEach(([n, c, m]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = n;
    b.onclick = () => {
      if (c === 'Verde' && m === 'Gamuza') { $('#palMsg').textContent = 'El color Verde no está disponible en Gamuza. Mantuvimos tu configuración.'; return; }
      prev = cur(); apply({ color: c, material: m }); $('#undoPal').hidden = false; $('#palMsg').textContent = 'Paleta ' + n + ' aplicada.';
    };
    $('#pals').append(b);
  });
  $('#undoPal').onclick = () => { prev && apply(prev); $('#undoPal').hidden = true; $('#palMsg').textContent = 'Paleta deshecha.'; };
  const budget = () => {
    const v = +$('#budget').value, m = $('#budgetMsg'); if (!v) { m.textContent = ''; return; }
    const t = store.get('sw-cart', []).reduce((a, i) => a + 219 * i.qty, 0) + 219;
    m.className = 'hint' + (t > v ? ' bad' : ''); m.textContent = t > v ? `Superas tu presupuesto por S/ ${t - v}. Ajusta tus opciones.` : `Costo acumulado S/ ${t}: dentro de tu presupuesto.`;
  };
  $('#budget').oninput = budget; document.addEventListener('click', () => setTimeout(budget, 50));

  /* ===== HU-021 / HU-023 / HU-005 / HU-003: SVG, zona segura, CMYK, Premium ===== */
  const design = $('#designImg'), scale = $('#svgScale'); let ignored = false;
  const check = () => { const v = +scale.value; design.style.width = v + '%'; const bad = v > 76 && !ignored; design.classList.toggle('risk', bad); $('#cutWarn').hidden = !bad; };
  $('#svgFile').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.type !== 'image/svg+xml' && !/\.svg$/i.test(f.name)) { $('#svgMsg').textContent = 'Formato no soportado, use SVG.'; e.target.value = ''; return; }
    $('#svgMsg').textContent = ''; const r = new FileReader();
    r.onload = () => { design.src = r.result; design.hidden = false; scale.disabled = false; ignored = false; $('#stage').classList.add('has-design'); check(); say('Diseño cargado'); };
    r.readAsDataURL(f);
  };
  scale.oninput = () => { ignored = false; check(); };
  $('#ignoreCut').onclick = () => { ignored = true; check(); };
  $('#cmyk').onchange = e => $('#stage').classList.toggle('cmyk', e.target.checked);
  $('#premiumBtn').onclick = () => open('premiumDlg');

  /* ===== HU-037 / HU-038 / HU-041 / HU-044: borrador, variantes, compartir, favoritos ===== */
  $('#saveDraft').onclick = () => say(store.set('sw-draft', cur()) ? 'Borrador guardado.' : 'No se pudo guardar el borrador. Tus cambios siguen aquí.');
  $('#loadDraft').onclick = () => { const d = store.get('sw-draft', null); d ? (apply(d), say('Borrador abierto.')) : say('Aún no tienes borradores.'); };
  $('#saveVar').onclick = () => { const v = store.get('sw-vars', []); v.push(cur()); store.set('sw-vars', v.slice(-4)); say('Variante guardada (' + Math.min(v.length, 4) + ').'); };
  $('#compare').onclick = () => {
    const v = store.get('sw-vars', []); if (v.length < 2) { say('Necesitas al menos dos variantes para comparar.'); return; }
    $('#cmpBody').innerHTML = v.slice(-2).map((c, i) => `<div class="cmp-card"><span class="dot" style="background:${HEX[c.color] || '#ccc'}"></span><b>Variante ${i + 1}</b><p>${c.color} · ${c.material} · Talla ${c.size || 'sin elegir'}</p><button type="button" class="chip" data-use="${i}">Usar como principal</button></div>`).join('');
    $$('[data-use]', $('#cmpBody')).forEach(b => b.onclick = () => { apply(v.slice(-2)[+b.dataset.use]); $('#cmpDlg').close(); say('Variante principal aplicada.'); });
    open('cmpDlg');
  };
  const shareSt = () => { const t = store.get('sw-share', null); $('#shareLink').value = t ? location.href.split('#')[0] + '#ver-' + t : ''; $('#shareSt').textContent = t ? 'Enlace activo.' : 'Enlace desactivado.'; };
  $('#shareBtn').onclick = () => { if (!store.get('sw-share', null)) store.set('sw-share', Math.random().toString(36).slice(2, 10)); shareSt(); open('shareDlg'); };
  $('#offLink').onclick = () => { store.set('sw-share', null); shareSt(); };
  $('#copyLink').onclick = () => { $('#shareLink').select(); try { navigator.clipboard.writeText($('#shareLink').value); say('Enlace copiado.'); } catch (e) { say('Copia el enlace manualmente.'); } };
  if (/^#ver-/.test(location.hash) && store.get('sw-share', null) !== location.hash.slice(5)) say('El enlace ya no se encuentra disponible.');
  const favs = () => {
    const f = store.get('sw-fav', []);
    $('#favList').innerHTML = f.map((c, i) => `<li><span class="dot" style="background:${HEX[c.color] || '#ccc'}"></span>${c.color} · ${c.material} <button type="button" class="link-btn" data-a="${i}">Aplicar</button> <button type="button" class="link-btn" data-r="${i}">Quitar</button></li>`).join('') || '<li class="muted">Sin favoritos todavía.</li>';
    $$('[data-a]', $('#favList')).forEach(b => b.onclick = () => apply(f[+b.dataset.a]));
    $$('[data-r]', $('#favList')).forEach(b => b.onclick = () => { f.splice(+b.dataset.r, 1); store.set('sw-fav', f); favs(); });
  };
  $('#favBtn').onclick = () => { const f = store.get('sw-fav', []), c = cur(); if (!f.some(x => x.color === c.color && x.material === c.material)) f.push(c); store.set('sw-fav', f); $('#favBtn').setAttribute('aria-pressed', 'true'); say('Agregado a favoritos.'); favs(); };
  favs();

  /* ===== HU-014 / HU-015: resumen con edición ===== */
  const sum = $('#summary');
  new MutationObserver(() => {
    if ($('[data-edit]', sum)) return;
    sum.insertAdjacentHTML('beforeend', '<li><button type="button" class="chip" data-edit="1">Editar color o material</button> <button type="button" class="chip" data-edit="2">Cambiar talla</button></li>');
    $$('[data-edit]', sum).forEach(b => b.onclick = () => { const p = $('#prevBtn'); for (let i = 0; i < +b.dataset.edit % 2 + 1 && !p.disabled; i++) p.click(); });
  }).observe(sum, { childList: true });

  /* ===== HU-008 / HU-024 / HU-016: comunidad y reseñas ===== */
  const TPL = [['Atardecer Lima', 'Patrones vectoriales', 'Runner Pulse', 'Coral', 'Cuero'], ['Noche Urbana', 'Minimalista', 'Urban Flex', 'Azul noche', 'Gamuza'], ['Duna', 'Minimalista', 'Classic Court', 'Arena', 'Lona'], ['Selva Andina', 'Patrones vectoriales', 'Trail Nova', 'Verde', 'Lona']];
  const tpl = () => {
    const c = $('#fCat').value, m = $('#fModel').value, r = TPL.filter(t => (!c || t[1] === c) && (!m || t[2] === m));
    $('#tplList').innerHTML = r.map((t, i) => `<li class="card"><span class="dot big" style="background:${HEX[t[3]]}" aria-hidden="true"></span><h3>${t[0]}</h3><p class="muted">${t[1]} · ${t[2]}</p><span class="tag">✓ Viable (verificado)</span><button type="button" class="chip" data-t="${TPL.indexOf(t)}">Usar como plantilla</button></li>`).join('') || '<li class="muted">No hay diseños con ese filtro.</li>';
    $$('[data-t]', $('#tplList')).forEach(b => b.onclick = () => { const t = TPL[+b.dataset.t]; apply({ color: t[3], material: t[4] }); location.hash = '#personaliza'; say('Plantilla cargada. Puedes editarla.'); });
  };
  $('#fCat').onchange = $('#fModel').onchange = tpl; tpl();
  const REV = { 'Runner Pulse': [['Camila', 'Muy cómodas y el color salió igual al diseño.', 5, 4, 5, 5], ['Diego', 'La talla calza justa, pedí media más.', 4, 3, 5, 4]], 'Classic Court': [['Lucía', 'Buena calidad por el precio.', 4, 5, 4, 5]] };
  const rev = () => {
    const r = REV[$('#revModel').value] || [];
    $('#revList').innerHTML = r.map(x => `<li class="review"><b>${x[0]}</b><p>${x[1]}</p><p class="muted">Comodidad ${x[2]}/5 · Talla ${x[3]}/5 · Calidad ${x[4]}/5 · Fidelidad ${x[5]}/5</p></li>`).join('') || '<li class="muted">Aún no existen valoraciones para este producto.</li>';
  };
  $('#revModel').onchange = rev; rev();

  /* ===== HU-028 / HU-036: seguimiento y chat ===== */
  $('#processBtn').onclick = () => open('processDlg');
  $('#mailNotif').checked = store.get('sw-mail', true); $('#mailNotif').onchange = e => { store.set('sw-mail', e.target.checked); say(e.target.checked ? 'Te avisaremos por correo.' : 'Notificaciones por correo desactivadas.'); };
  const msg = (t, me) => $('#chatLog').insertAdjacentHTML('beforeend', `<li class="${me ? 'me' : ''}">${t}</li>`);
  $('#chatBtn').onclick = () => { if (!$('#chatLog').children.length) msg('Orden #SW-761-2026 · Etapa: En producción (enviado al operador)'); open('chatDlg'); };
  $('#chatForm').onsubmit = e => { e.preventDefault(); const v = $('#chatIn').value.trim(); if (!v) return; msg(v.replace(/</g, '&lt;'), true); $('#chatIn').value = ''; };
  $('#chatImg').onchange = e => { if (e.target.files[0]) msg('Imagen adjunta: ' + e.target.files[0].name.replace(/</g, '&lt;'), true); };

  /* ===== HU-026 / HU-046 / HU-048: carrito y pago ===== */
  let end = 0, tm;
  const hold = () => {
    const el = $('#hold'); if (!store.get('sw-cart', []).length) { el.textContent = ''; return; }
    if (!end) end = Date.now() + 15 * 60000; clearInterval(tm);
    const tick = () => { const s = Math.round((end - Date.now()) / 1000); if (s <= 0) { clearInterval(tm); end = 0; el.textContent = 'La reserva venció: liberamos tu stock y revalidamos la disponibilidad.'; say('Tu reserva de 15 minutos venció.'); return; } el.textContent = `Unidades reservadas por ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    tick(); tm = setInterval(tick, 1000);
  };
  $('#cartBtn').addEventListener('click', () => {
    const c = store.get('sw-cart', []);
    $('#techList').innerHTML = c.map(i => `<li>${i.material} · ${i.color} <code>${HEX[i.color]}</code> · Talla ${i.size} × ${i.qty}</li>`).join('') || '<li class="muted">Tu carrito está vacío.</li>';
    hold();
  });
  $('#editDesign').onclick = () => { $('#cartDialog').close(); location.hash = '#personaliza'; };
  document.addEventListener('click', e => { if (e.target.closest('#checkoutBtn')) { e.stopPropagation(); $('#cartDialog').close(); open('payDlg'); } }, true);
  const pf = $('#payForm'), tipo = () => pf.elements.tipo.value;
  pf.addEventListener('change', () => { $('#rucBox').hidden = $('#razonBox').hidden = tipo() !== 'factura'; });
  $('#ruc').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11); $('#razon').value = e.target.value.length === 11 ? 'Comercial Andes S.A.C.' : ''; });
  pf.addEventListener('submit', e => {
    e.preventDefault(); let ok = true;
    const err = (id, m) => { $('#' + id).textContent = m; if (m) ok = false; };
    err('rucErr', tipo() === 'factura' && $('#ruc').value.length !== 11 ? 'Ingresa un RUC válido de 11 dígitos.' : '');
    err('mailErr', /^\S+@\S+\.\S+$/.test($('#mail').value) ? '' : 'Ingresa un correo válido.');
    if (ok) { $('#payDlg').close(); say('Pago confirmado. Enviamos tu comprobante con IGV al correo.'); }
  });

  /* ===== HU-007: tutorial de primer uso ===== */
  const TOUR = ['Paso 1 de 3: elige color y material en el personalizador.', 'Paso 2 de 3: arrastra la zapatilla para verla en 360° o usa Zoom.', 'Paso 3 de 3: elige tu talla con la guía y agrégala al carrito.']; let ti = 0;
  const tour = () => { $('#tourTxt').textContent = TOUR[ti]; $('#tourNext').textContent = ti === 2 ? 'Finalizar' : 'Siguiente'; };
  $('#tourNext').onclick = () => { if (ti < 2) { ti++; tour(); } else { $('#tourDlg').close(); say('¡Listo! Ya puedes diseñar libremente.'); } };
  $('#tourSkip').onclick = () => $('#tourDlg').close();
  $('#tourDlg').addEventListener('close', () => store.set('sw-tour', true));
  if (!store.get('sw-tour', false)) setTimeout(() => { tour(); open('tourDlg'); }, 700);
})();
;(()=>{const b=document.getElementById('budget');b&&b.addEventListener('keydown',e=>{if(e.key==='Enter')e.preventDefault();});})();

/* hu-fixes.js — cierra las brechas detectadas frente a las HU. Cargar DESPUÉS de app.js.
   HU-003 (texto), HU-005 (gama CMYK), HU-013 (stock material + revalidación),
   HU-015/043 (precio por material), HU-026 (render desde carrito),
   HU-037 (borradores en "Mi cuenta"), HU-045 (medidas por talla), accesibilidad de tallas agotadas. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } } };
  const say = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => t.classList.remove('show'), 3000); };
  const fmt = n => 'S/ ' + n.toLocaleString('es-PE');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HEX = { Coral: '#ef553f', 'Azul noche': '#18334c', Arena: '#d9c6a4', Verde: '#32a866' };
  const PRICES = { Cuero: 219, Gamuza: 249, Lona: 199 };
  const unit = m => PRICES[m] || 219;
  const STOCK = { 39: 8, 40: 6, 41: 3, 42: 2, 43: 0 };
  const CM = { 39: 24.5, 40: 25.2, 41: 26, 42: 26.7, 43: 27.5 };
  const selOf = g => { const b = $('[role=radio][aria-checked="true"]', $('#' + g)); return b && b.getAttribute('aria-label'); };
  const curMat = () => selOf('materials') || 'Cuero';
  const pick = (g, label) => { const b = $$('[role=radio]', $('#' + g)).find(x => x.getAttribute('aria-label') === label); b && b.click(); };
  const apply = c => { c.color && pick('colors', c.color); c.material && pick('materials', c.material); c.size && pick('sizes', 'Talla ' + c.size); };
  const dlg = (id, t, body) => `<dialog id="${id}" aria-labelledby="${id}T"><div class="dialog-inner"><div class="dialog-head"><h2 id="${id}T">${t}</h2><button type="button" class="close-btn" data-close aria-label="Cerrar">✕</button></div>${body}</div></dialog>`;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .product-stage.gamut-bad{outline:3px solid #b00020;outline-offset:-3px}
    .stage-text{position:absolute;z-index:1;left:50%;bottom:22%;transform:translateX(-50%);color:#fff;font-weight:700;letter-spacing:2px;text-shadow:0 1px 3px #0008;pointer-events:none;max-width:80%;overflow:hidden;white-space:nowrap}
    .rstage{position:relative;background:#e8e7df;border-radius:8px;overflow:hidden}
    .rstage img{display:block;width:100%;mix-blend-mode:multiply;filter:grayscale(.35) contrast(.9)}
    .rstage i{position:absolute;inset:0;mix-blend-mode:color;opacity:.72}
    .acct-list{list-style:none;padding:0;margin:0 0 8px;font-size:14px}
    .acct-list li{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:44px}
    #measDlg svg{width:100%;height:auto;fill:none;stroke:var(--structure);stroke-width:2}
    #measDlg svg text{fill:var(--ink);stroke:none;font-size:11px}
  </style>`);

  /* ===== HU-015 / HU-043: el precio depende del material ===== */
  function budget() {
    const v = +$('#budget').value, m = $('#budgetMsg'); if (!v) return;
    const t = cartTotal() + unit(curMat());
    m.className = 'hint' + (t > v ? ' bad' : '');
    m.textContent = t > v ? `Superas tu presupuesto por ${fmt(t - v)}. Ajusta tus opciones.` : `Costo acumulado ${fmt(t)}: dentro de tu presupuesto.`;
  }
  const cartTotal = () => store.get('sw-cart', []).reduce((a, i) => a + unit(i.material) * i.qty, 0);
  function syncPrice() {
    const p = unit(curMat());
    $('#price').textContent = fmt(p);
    $$('#summary li').forEach(li => { if (/Precio:/.test(li.textContent) && li.lastChild && li.lastChild.nodeType === 3) li.lastChild.textContent = ' ' + fmt(p); });
  }
  function fixCart() {
    const items = store.get('sw-cart', []);
    $$('#cartList .cart-item').forEach((li, i) => { const it = items[i], b = $('div:last-child > b', li); if (it && b) b.textContent = fmt(unit(it.material) * it.qty); });
    $('#cartTotal').textContent = fmt(cartTotal());
  }
  $$('.mat-info dt').forEach(dt => { const dd = dt.nextElementSibling; if (dd) dd.textContent += ' Precio: ' + fmt(unit(dt.textContent)) + '.'; });
  new MutationObserver(fixCart).observe($('#cartList'), { childList: true });
  document.addEventListener('click', () => { setTimeout(syncPrice, 0); setTimeout(budget, 120); });
  $('#budget').addEventListener('input', budget);
  syncPrice(); fixCart();

  /* ===== HU-013: stock de materiales y revalidación antes de pagar ===== */
  $('.mat-info').insertAdjacentHTML('afterend', '<p class="stock-note">Gamuza: quedan pocos pares. Cuero y Lona disponibles.</p>');
  $('#payForm [type=submit]').insertAdjacentHTML('beforebegin', '<p id="stockErr" class="error-msg" role="alert"></p>');
  $('#payForm').addEventListener('submit', e => {
    const need = {}; store.get('sw-cart', []).forEach(i => need[i.size] = (need[i.size] || 0) + i.qty);
    const bad = Object.keys(need).filter(s => need[s] > (STOCK[s] || 0));
    const el = $('#stockErr');
    if (bad.length) {
      e.preventDefault(); e.stopImmediatePropagation();
      el.textContent = 'Revalidamos el stock: ' + bad.map(s => `talla ${s}, solo hay ${STOCK[s] || 0} par(es) y pediste ${need[s]}`).join('; ') + '. Edita tu carrito antes de pagar.';
    } else el.textContent = '';
  }, true);

  /* Flechas en tallas: saltar las agotadas (antes el foco se quedaba atascado) */
  $('#sizes').addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
    e.preventDefault(); e.stopPropagation();
    const b = $$('[role=radio]', $('#sizes')).filter(x => !x.disabled), i = b.indexOf(document.activeElement);
    const n = b[(i + d + b.length) % b.length]; n.focus(); n.click();
  }, true);

  /* ===== HU-026: render estático en alta resolución desde el carrito ===== */
  document.body.insertAdjacentHTML('beforeend', dlg('renderDlg', 'Render del diseño', '<div id="renderBody"></div>'));
  $('#editDesign').insertAdjacentHTML('beforebegin', '<button type="button" class="link-btn" id="renderBtn">Ver render en alta resolución</button>');
  $('#renderBtn').onclick = () => {
    const c = store.get('sw-cart', []);
    $('#renderBody').innerHTML = c.map(i => `<figure style="margin:0 0 16px"><div class="rstage"><img src="sneaker-studio.jpg" alt="Render de Runner Pulse ${esc(i.color)}, ${esc(i.material)}"><i style="background:${HEX[i.color] || '#ccc'}"></i></div><figcaption class="muted">${esc(i.color)} <code>${HEX[i.color] || ''}</code> · ${esc(i.material)} · Talla ${esc(i.size)} × ${i.qty}</figcaption></figure>`).join('') || '<p class="muted">Agrega un diseño al carrito para ver su render.</p>';
    $('#renderDlg').showModal();
  };

  /* ===== HU-005: advertencia de color fuera de gama imprimible ===== */
  const OUT = { Verde: ['#32a866', '#3f9a68', 'C75 M20 Y75 K5'] };
  $('#cmyk').closest('label').insertAdjacentHTML('afterend', '<p id="gamutMsg" class="error-msg" role="alert"></p>');
  const gamut = () => {
    const c = selOf('colors'), bad = $('#cmyk').checked && OUT[c];
    $('#stage').classList.toggle('gamut-bad', !!bad);
    $('#gamutMsg').textContent = bad ? `Advertencia: ${c} (${OUT[c][0]}) está fuera de la gama imprimible en textil. Equivalente CMYK más cercano: ${OUT[c][1]} (${OUT[c][2]}).` : '';
  };
  $('#cmyk').addEventListener('change', gamut);
  document.addEventListener('click', () => setTimeout(gamut, 0));

  /* ===== HU-003: herramienta básica de texto, gratis y sin marca de agua ===== */
  $('#stage').insertAdjacentHTML('beforeend', '<div class="stage-text" id="stageText" aria-hidden="true"></div>');
  $('#cmyk').closest('.field').insertAdjacentHTML('beforebegin', '<div class="field"><label for="txtIn">Texto sobre la zapatilla (gratis)</label><input id="txtIn" type="text" maxlength="12" placeholder="Ej. LIMA"></div>');
  $('#txtIn').addEventListener('input', e => { $('#stageText').textContent = e.target.value; });
  $('#txtIn').addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });

  /* ===== HU-045: medidas de una talla (largo, ancho, altura y caída) + unidad ===== */
  document.body.insertAdjacentHTML('beforeend', dlg('measDlg', 'Medidas de la talla', `<svg viewBox="0 0 240 120" role="img" aria-label="Zapatilla en 2D con sus medidas"><path d="M20 82V44q0-10 12-10h38q14 28 50 30l80 4q32 4 32 18v6H12z"/><path d="M12 88h220"/><path d="M12 104h220M12 100v8M232 100v8"/><text x="100" y="116">Largo</text><path d="M246 34v54" transform="translate(-14 0)"/><text x="206" y="26">Altura</text></svg>
    <ul class="acct-list" id="measList" aria-live="polite"></ul>`));
  const thead = $('#guideBody').closest('table').querySelector('thead tr');
  thead.insertAdjacentHTML('beforeend', '<th scope="col">Medidas</th>');
  const addBtns = () => $$('#guideBody tr').forEach(tr => {
    if ($('.m-btn', tr)) return; const s = $('th', tr).textContent;
    tr.insertAdjacentHTML('beforeend', `<td><button type="button" class="link-btn m-btn" data-size="${s}" aria-label="Ver medidas de la talla ${s}">Ver</button></td>`);
  });
  new MutationObserver(addBtns).observe($('#guideBody'), { childList: true });
  $('#guideBody').addEventListener('click', e => {
    const b = e.target.closest('.m-btn'); if (!b) return;
    const s = +b.dataset.size, inch = $('#unitBtn').textContent.includes('centím');
    const f = v => inch ? (v / 2.54).toFixed(1) + ' in' : v + ' cm';
    const W = +(9.6 + (s - 39) * .2).toFixed(1);
    $('#measDlgT').textContent = 'Medidas de la talla ' + s;
    $('#measList').innerHTML = `<li><b>Largo:</b> ${f(CM[s])}</li><li><b>Ancho:</b> ${f(W)}</li><li><b>Altura:</b> ${f(12)}</li><li><b>Caída:</b> ${inch ? '0.3 in' : '8 mm'}</li>`;
    $('#measDlg').showModal();
  });

  /* ===== HU-037: borradores, variantes y favoritos en "Mi cuenta" ===== */
  document.body.insertAdjacentHTML('beforeend', dlg('acctDlg', 'Mi cuenta', '<div id="acctBody"></div><p class="hint">El inicio de sesión estará disponible próximamente; tus datos se guardan en este dispositivo.</p>'));
  const row = (c, k) => `<li><span class="dot" style="background:${HEX[c.color] || '#ccc'}"></span>${esc(c.color)} · ${esc(c.material)}${c.size ? ' · Talla ' + esc(c.size) : ''} <button type="button" class="link-btn" data-load="${k}">Abrir</button></li>`;
  const cfgs = {};
  $('.profile-button').addEventListener('click', () => {
    const d = store.get('sw-draft', null), v = store.get('sw-vars', []), f = store.get('sw-fav', []);
    let n = 0; const reg = c => { cfgs[++n] = c; return n; };
    const sec = (t, a) => `<h3 style="font-size:16px">${t}</h3><ul class="acct-list">${a.length ? a.map(c => row(c, reg(c))).join('') : '<li class="muted">Nada guardado todavía.</li>'}</ul>`;
    $('#acctBody').innerHTML = sec('Borrador', d ? [d] : []) + sec('Variantes', v) + sec('Favoritos', f);
    $('#acctDlg').showModal(); $('#toast').classList.remove('show');
  });
  $('#acctBody').addEventListener('click', e => {
    const b = e.target.closest('[data-load]'); if (!b) return;
    apply(cfgs[b.dataset.load]); $('#acctDlg').close(); location.hash = '#personaliza'; say('Diseño abierto. Puedes seguir editándolo.');
  });
})();