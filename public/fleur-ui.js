/* =====================================================================
   FLEUR — UI de Login/Registro + Checkout (drop-in)
   ---------------------------------------------------------------------
   Requiere fleur-api.js cargado ANTES que este archivo.
   Inyecta (sin tocar tu HTML):
     • Botón de cuenta 👤 en el navbar
     • Modal de Login / Registro
     • Modal de Checkout (dirección, fecha, horario, mensaje de tarjeta)
   Uso en fleur-enhanced.html, antes de </body>:
     <script>window.FLEUR_API_URL = 'http://localhost:4000';</script>
     <script src="http://localhost:4000/fleur-api.js"></script>
     <script src="http://localhost:4000/fleur-ui.js"></script>
   ===================================================================== */
(function () {
  const $ = (sel) => document.querySelector(sel);
  const toast = (m) => (typeof showToast === 'function' ? showToast(m) : alert(m));

  /* ---------- estilos (reutilizan las variables CSS de Fleur) ---------- */
  const css = `
  .fl-overlay{position:fixed;inset:0;z-index:9500;background:rgba(42,36,32,0.6);
    backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:20px;}
  .fl-overlay.open{display:flex;animation:overlayIn .3s var(--ease,ease);}
  .fl-modal{background:var(--cream,#FAF7F2);border-radius:24px;width:100%;max-width:440px;
    box-shadow:var(--shadow-lg,0 24px 80px rgba(42,36,32,.14));overflow:hidden;
    animation:fadeUp .35s var(--ease,ease);max-height:92vh;overflow-y:auto;}
  .fl-modal.wide{max-width:520px;}
  .fl-head{padding:26px 30px 18px;border-bottom:1px solid var(--border,#EDE5DC);
    display:flex;align-items:center;justify-content:space-between;}
  .fl-head h3{font-family:var(--font-serif,'Playfair Display',serif);font-size:24px;font-weight:400;}
  .fl-head p{font-size:12px;color:var(--light,#A8998F);margin-top:3px;}
  .fl-x{width:36px;height:36px;border-radius:50%;background:#fff;border:1px solid var(--border,#EDE5DC);
    font-size:17px;transition:.3s;cursor:pointer;}
  .fl-x:hover{background:var(--rose,#EFC5C5);}
  .fl-body{padding:24px 30px 30px;display:flex;flex-direction:column;gap:14px;}
  .fl-field{display:flex;flex-direction:column;gap:6px;}
  .fl-field label{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--mid,#6A5F58);}
  .fl-field input,.fl-field textarea,.fl-field select{padding:12px 15px;border:1.5px solid var(--border,#EDE5DC);
    border-radius:12px;font-size:13px;font-family:var(--font-sans,'Jost',sans-serif);background:#fff;
    color:var(--dark,#2A2420);outline:none;transition:.3s;}
  .fl-field input:focus,.fl-field textarea:focus,.fl-field select:focus{border-color:var(--terra,#C98B78);
    box-shadow:0 0 0 3px rgba(201,139,120,.12);}
  .fl-field textarea{height:80px;resize:none;}
  .fl-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .fl-btn{width:100%;background:var(--dark,#2A2420);color:#fff;padding:14px;border-radius:30px;
    font-size:12px;font-weight:500;letter-spacing:1px;text-transform:uppercase;cursor:pointer;
    transition:.35s var(--ease-spring,ease);}
  .fl-btn:hover{background:var(--terra,#C98B78);transform:translateY(-2px);}
  .fl-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
  .fl-switch{text-align:center;font-size:12px;color:var(--mid,#6A5F58);margin-top:4px;}
  .fl-switch a{color:var(--terra,#C98B78);font-weight:600;cursor:pointer;}
  .fl-summary{background:#fff;border:1px solid var(--border,#EDE5DC);border-radius:14px;padding:14px 16px;margin-bottom:4px;}
  .fl-summary .r{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;}
  .fl-summary .r.tot{font-weight:600;font-size:15px;border-top:1px solid var(--border,#EDE5DC);margin-top:6px;padding-top:8px;}
  .fl-summary .r.tot span:last-child{color:var(--terra,#C98B78);font-family:var(--font-serif,serif);font-size:18px;}
  .fl-acct{display:flex;flex-direction:column;gap:10px;}
  .fl-acct .who{font-size:13px;color:var(--mid,#6A5F58);}
  .fl-acct .who strong{color:var(--dark,#2A2420);}
  .fl-orders{display:flex;flex-direction:column;gap:8px;max-height:240px;overflow-y:auto;}
  .fl-order{border:1px solid var(--border,#EDE5DC);border-radius:12px;padding:10px 12px;font-size:12px;background:#fff;}
  .fl-order .top{display:flex;justify-content:space-between;font-weight:600;}
  .fl-badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;
    letter-spacing:.5px;text-transform:uppercase;background:rgba(201,139,120,.14);color:var(--terra,#C98B78);}
  /* Panel admin */
  .fl-modal.admin{max-width:920px;}
  .fl-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;}
  .fl-metric{background:#fff;border:1px solid var(--border,#EDE5DC);border-radius:14px;padding:14px;}
  .fl-metric .v{font-family:var(--font-serif,serif);font-size:26px;color:var(--dark,#2A2420);line-height:1;}
  .fl-metric .l{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--light,#A8998F);margin-top:6px;}
  .fl-metric.sold .v{color:var(--terra,#C98B78);}
  .fl-toolbar{display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap;}
  .fl-toolbar select{padding:9px 12px;border:1.5px solid var(--border,#EDE5DC);border-radius:10px;font-size:12px;background:#fff;font-family:var(--font-sans,sans-serif);}
  .fl-otable{display:flex;flex-direction:column;gap:10px;max-height:50vh;overflow-y:auto;}
  .fl-ocard{border:1px solid var(--border,#EDE5DC);border-radius:14px;padding:14px 16px;background:#fff;font-size:12px;}
  .fl-ocard .hd{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
  .fl-ocard .hd b{font-size:14px;}
  .fl-ocard .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;color:var(--mid,#6A5F58);}
  .fl-ocard .grid .k{color:var(--light,#A8998F);font-size:10px;letter-spacing:.5px;text-transform:uppercase;}
  .fl-ocard ul{margin:4px 0 0;padding-left:16px;}
  .fl-ocard .statusrow{display:flex;gap:8px;align-items:center;margin-top:10px;}
  .fl-ocard .statusrow select{flex:1;padding:8px 10px;border:1.5px solid var(--border,#EDE5DC);border-radius:10px;font-size:12px;background:var(--cream,#FAF7F2);}
  .fl-ocard .statusrow button{background:var(--dark,#2A2420);color:#fff;border-radius:10px;padding:8px 14px;font-size:11px;font-weight:600;cursor:pointer;}
  .fl-ocard .statusrow button:hover{background:var(--terra,#C98B78);}
  @media(max-width:720px){.fl-metrics{grid-template-columns:1fr 1fr;}.fl-ocard .grid{grid-template-columns:1fr;}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- botón de cuenta en el navbar ---------- */
  function injectAccountButton() {
    const actions = $('.nav-actions');
    if (!actions || $('#flAccountBtn')) return;
    const btn = document.createElement('button');
    btn.className = 'nav-icon';
    btn.id = 'flAccountBtn';
    btn.setAttribute('aria-label', 'Cuenta');
    btn.textContent = '👤';
    btn.onclick = openAccount;
    // Insertar antes del CTA "Ordenar" si existe
    const cta = actions.querySelector('.nav-cta');
    actions.insertBefore(btn, cta || null);
  }

  /* ---------- markup de los modales ---------- */
  const modalsHTML = `
  <div class="fl-overlay" id="flAuthOverlay">
    <div class="fl-modal" role="dialog" aria-modal="true">
      <div class="fl-head">
        <div><h3 id="flAuthTitle">Iniciar sesión</h3><p id="flAuthSub">Bienvenida de vuelta a Fleur</p></div>
        <button class="fl-x" data-close="flAuthOverlay">✕</button>
      </div>
      <div class="fl-body">
        <div class="fl-field" id="flNameWrap" style="display:none;">
          <label>Nombre</label><input type="text" id="flName" placeholder="Tu nombre" autocomplete="name">
        </div>
        <div class="fl-field"><label>Email</label>
          <input type="email" id="flEmail" placeholder="tu@email.com" autocomplete="email"></div>
        <div class="fl-field"><label>Contraseña</label>
          <input type="password" id="flPass" placeholder="Mínimo 8 caracteres" autocomplete="current-password"></div>
        <button class="fl-btn" id="flAuthSubmit">Entrar</button>
        <div class="fl-switch" id="flAuthSwitch"></div>
      </div>
    </div>
  </div>

  <div class="fl-overlay" id="flAccountOverlay">
    <div class="fl-modal" role="dialog" aria-modal="true">
      <div class="fl-head">
        <div><h3>Mi cuenta</h3><p id="flAccountSub"></p></div>
        <button class="fl-x" data-close="flAccountOverlay">✕</button>
      </div>
      <div class="fl-body fl-acct" id="flAccountBody"></div>
    </div>
  </div>

  <div class="fl-overlay" id="flAdminOverlay">
    <div class="fl-modal admin" role="dialog" aria-modal="true">
      <div class="fl-head">
        <div><h3>Panel Admin · Fleur</h3><p id="flAdminSub">Dashboard del vendedor</p></div>
        <button class="fl-x" data-close="flAdminOverlay">✕</button>
      </div>
      <div class="fl-body">
        <div class="fl-metrics" id="flAdminMetrics"></div>
        <div class="fl-toolbar">
          <strong style="font-size:13px;">Pedidos</strong>
          <select id="flAdminFilter">
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagado">Pagados</option>
            <option value="preparando">Preparando</option>
            <option value="enviado">Enviados</option>
            <option value="entregado">Entregados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <button class="fl-x" id="flAdminReload" title="Recargar" style="width:34px;height:34px;">⟳</button>
        </div>
        <div class="fl-otable" id="flAdminOrders">Cargando...</div>
      </div>
    </div>
  </div>

  <div class="fl-overlay" id="flCheckoutOverlay">
    <div class="fl-modal wide" role="dialog" aria-modal="true">
      <div class="fl-head">
        <div><h3>Finalizar pedido</h3><p>Datos de entrega y tarjeta</p></div>
        <button class="fl-x" data-close="flCheckoutOverlay">✕</button>
      </div>
      <div class="fl-body">
        <div class="fl-summary" id="flCheckoutSummary"></div>
        <div class="fl-field"><label>Dirección de entrega *</label>
          <input type="text" id="flCoAddress" placeholder="Calle, número, colonia, ciudad"></div>
        <div class="fl-row">
          <div class="fl-field"><label>Fecha de entrega</label><input type="date" id="flCoDate"></div>
          <div class="fl-field"><label>Horario</label>
            <select id="flCoTime">
              <option value="">Sin preferencia</option>
              <option>09:00 - 12:00</option>
              <option>12:00 - 15:00</option>
              <option>15:00 - 18:00</option>
              <option>18:00 - 20:00</option>
            </select></div>
        </div>
        <div class="fl-field"><label>Mensaje para la tarjeta floral</label>
          <textarea id="flCoMsg" placeholder="Ej: ¡Feliz cumpleaños! Con cariño..."></textarea></div>
        <div id="flCoMockNote" style="background:rgba(157,168,130,.12);border:1px solid var(--olive-soft,#D4D9C4);border-radius:12px;padding:10px 14px;font-size:11px;line-height:1.5;color:var(--olive,#9DA882);">
          🧪 <strong>Pago de prueba:</strong> no se solicitará tarjeta. El pedido se marcará como pagado para demostración.
        </div>
        <button class="fl-btn" id="flCoSubmit">Pagar (prueba) y confirmar pedido →</button>
      </div>
    </div>
  </div>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = modalsHTML;
  document.body.appendChild(wrap);

  // Cierre por botón ✕ y por click en backdrop
  document.querySelectorAll('[data-close]').forEach((b) => {
    b.onclick = () => closeOverlay(b.getAttribute('data-close'));
  });
  document.querySelectorAll('.fl-overlay').forEach((ov) => {
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('open'); });
  });
  const openOverlay = (id) => $('#' + id).classList.add('open');
  const closeOverlay = (id) => $('#' + id).classList.remove('open');

  /* ---------- Login / Registro ---------- */
  let mode = 'login';
  function renderAuth() {
    const isLogin = mode === 'login';
    $('#flAuthTitle').textContent = isLogin ? 'Iniciar sesión' : 'Crear cuenta';
    $('#flAuthSub').textContent = isLogin ? 'Bienvenida de vuelta a Fleur' : 'Únete a Fleur';
    $('#flNameWrap').style.display = isLogin ? 'none' : 'flex';
    $('#flAuthSubmit').textContent = isLogin ? 'Entrar' : 'Registrarme';
    $('#flAuthSwitch').innerHTML = isLogin
      ? '¿No tienes cuenta? <a id="flToReg">Regístrate</a>'
      : '¿Ya tienes cuenta? <a id="flToLogin">Inicia sesión</a>';
    const toReg = $('#flToReg'); if (toReg) toReg.onclick = () => { mode = 'register'; renderAuth(); };
    const toLogin = $('#flToLogin'); if (toLogin) toLogin.onclick = () => { mode = 'login'; renderAuth(); };
  }
  function openAuth(initial = 'login') { mode = initial; renderAuth(); openOverlay('flAuthOverlay'); }

  $('#flAuthSubmit').onclick = async () => {
    const email = $('#flEmail').value.trim();
    const pass = $('#flPass').value;
    const name = $('#flName').value.trim();
    if (!email || !pass) return toast('⚠️ Completa email y contraseña');
    if (mode === 'register' && name.length < 2) return toast('⚠️ Ingresa tu nombre');
    if (mode === 'register' && pass.length < 8) return toast('⚠️ La contraseña debe tener 8+ caracteres');
    const btn = $('#flAuthSubmit'); btn.disabled = true;
    try {
      if (mode === 'login') { await window.Fleur.login(email, pass); toast('🌸 ¡Hola de nuevo!'); }
      else { await window.Fleur.register(name, email, pass); toast('🎉 ¡Cuenta creada!'); }
      closeOverlay('flAuthOverlay');
      $('#flPass').value = '';
    } catch (e) { toast('⚠️ ' + e.message); }
    finally { btn.disabled = false; }
  };

  /* ---------- Mi cuenta ---------- */
  async function openAccount() {
    const user = await window.Fleur.me();
    const isGuest = !user || window.Fleur.isGuest();
    const body = $('#flAccountBody');
    const sub = $('#flAccountSub');

    if (isGuest) {
      sub.textContent = 'No has iniciado sesión';
      body.innerHTML = `
        <p class="who">Inicia sesión o crea una cuenta para guardar tus pedidos y favoritos.</p>
        <button class="fl-btn" id="flGoLogin">Iniciar sesión</button>
        <button class="fl-btn" id="flGoReg" style="background:var(--terra,#C98B78);">Crear cuenta</button>`;
      openOverlay('flAccountOverlay');
      $('#flGoLogin').onclick = () => { closeOverlay('flAccountOverlay'); openAuth('login'); };
      $('#flGoReg').onclick = () => { closeOverlay('flAccountOverlay'); openAuth('register'); };
      return;
    }

    sub.textContent = user.email;
    const adminBtn = user.role === 'admin'
      ? '<button class="fl-btn" id="flGoAdmin" style="background:var(--terra,#C98B78);">🛠️ Abrir Panel Admin</button>'
      : '';
    body.innerHTML = `
      <p class="who">Sesión de <strong>${user.name}</strong> · <span class="fl-badge">${user.role}</span></p>
      ${adminBtn}
      <div><label style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--mid,#6A5F58);">Mis pedidos</label>
        <div class="fl-orders" id="flOrders" style="margin-top:8px;">Cargando...</div></div>
      <button class="fl-btn" id="flLogout" style="background:#fff;color:var(--dark,#2A2420);border:1.5px solid var(--border,#EDE5DC);">Cerrar sesión</button>`;
    openOverlay('flAccountOverlay');
    const goAdmin = $('#flGoAdmin');
    if (goAdmin) goAdmin.onclick = () => { closeOverlay('flAccountOverlay'); window.openAdminPanel(); };
    $('#flLogout').onclick = async () => { await window.Fleur.logout(); toast('👋 Sesión cerrada'); closeOverlay('flAccountOverlay'); };

    try {
      const orders = await window.Fleur.myOrders();
      const cont = $('#flOrders');
      cont.innerHTML = orders.length
        ? orders.map((o) => `
            <div class="fl-order">
              <div class="top"><span>Pedido #${o.id}</span><span class="fl-badge">${o.status}</span></div>
              <div style="color:var(--light,#A8998F);margin-top:4px;">
                ${new Date(o.createdAt).toLocaleDateString('es-MX')} · ${o.items.length} artículo(s) · $${o.total} MXN</div>
            </div>`).join('')
        : '<p style="font-size:12px;color:var(--light,#A8998F);">Aún no tienes pedidos.</p>';
    } catch { $('#flOrders').textContent = 'No se pudieron cargar los pedidos.'; }
  }

  /* ---------- Checkout ---------- */
  window.openCheckoutModal = function () {
    if (!window.cart || window.cart.length === 0) return toast('🛍️ Tu carrito está vacío');
    const subtotal = window.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = subtotal >= 500 ? 0 : 80;
    const lines = window.cart.map((i) => `
      <div class="r"><span>${i.qty}× ${i.name} <small style="color:var(--light,#A8998F);">($${i.price})</small></span>
        <span>$${(i.price * i.qty).toLocaleString()}</span></div>`).join('');
    $('#flCheckoutSummary').innerHTML = `
      <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--mid,#6A5F58);margin-bottom:6px;">Resumen de compra</div>
      ${lines}
      <div class="r" style="border-top:1px dashed var(--border,#EDE5DC);margin-top:6px;padding-top:8px;"><span>Subtotal</span><span>$${subtotal.toLocaleString()} MXN</span></div>
      <div class="r"><span>Envío ${shipping === 0 ? '<small style="color:var(--olive,#9DA882);">(gratis +$500)</small>' : ''}</span><span>${shipping === 0 ? '¡Gratis!' : '$' + shipping + ' MXN'}</span></div>
      <div class="r tot"><span>Total</span><span>$${(subtotal + shipping).toLocaleString()} MXN</span></div>`;
    openOverlay('flCheckoutOverlay');
  };

  $('#flCoSubmit').onclick = async () => {
    const address = $('#flCoAddress').value.trim();
    if (address.length < 5) return toast('⚠️ Ingresa una dirección de entrega válida');
    const payload = {
      address,
      deliveryDate: $('#flCoDate').value || undefined,
      deliveryTime: $('#flCoTime').value || undefined,
      cardMessage: $('#flCoMsg').value.trim() || undefined,
    };
    const btn = $('#flCoSubmit'); btn.disabled = true;
    try {
      await window.placeOrder(payload);
      closeOverlay('flCheckoutOverlay');
      ['flCoAddress', 'flCoDate', 'flCoMsg'].forEach((id) => ($('#' + id).value = ''));
    } catch (_) { /* el toast ya lo mostró placeOrder */ }
    finally { btn.disabled = false; }
  };

  /* ---------- Panel Admin ---------- */
  const ESTADOS = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado'];
  const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX') + ' MXN';
  const fdate = (d) => (d ? new Date(d).toLocaleString('es-MX') : '—');

  async function openAdmin() {
    openOverlay('flAdminOverlay');
    await Promise.all([renderAdminMetrics(), renderAdminOrders()]);
  }

  async function renderAdminMetrics() {
    try {
      const d = await window.Fleur.getAdminDashboard();
      $('#flAdminMetrics').innerHTML = `
        <div class="fl-metric sold"><div class="v">${money(d.sales.totalSold)}</div><div class="l">Total vendido</div></div>
        <div class="fl-metric"><div class="v">${d.sales.totalOrders}</div><div class="l">Pedidos</div></div>
        <div class="fl-metric"><div class="v">${d.orders.pendiente}</div><div class="l">Pendientes</div></div>
        <div class="fl-metric"><div class="v">${d.orders.pagado}</div><div class="l">Pagados</div></div>
        <div class="fl-metric"><div class="v">${d.orders.preparando}</div><div class="l">Preparando</div></div>
        <div class="fl-metric"><div class="v">${d.orders.enviado}</div><div class="l">Enviados</div></div>
        <div class="fl-metric"><div class="v">${d.orders.entregado}</div><div class="l">Entregados</div></div>
        <div class="fl-metric"><div class="v">${d.orders.cancelado}</div><div class="l">Cancelados</div></div>`;
    } catch (e) { $('#flAdminMetrics').innerHTML = `<p style="color:var(--light);">${e.message}</p>`; }
  }

  async function renderAdminOrders() {
    const cont = $('#flAdminOrders');
    cont.innerHTML = 'Cargando...';
    try {
      const status = $('#flAdminFilter').value;
      const orders = await window.Fleur.getAdminOrders({ status, limit: 50 });
      if (!orders.length) { cont.innerHTML = '<p style="color:var(--light);font-size:12px;">Sin pedidos.</p>'; return; }
      cont.innerHTML = orders.map((o) => {
        const items = o.items.map((i) => `<li>${i.quantity}× ${i.name} — ${money(i.lineTotal)}</li>`).join('');
        const pay = o.payment
          ? `${o.payment.provider} · ${o.payment.status}${o.payment.externalPaymentId ? ' · ' + o.payment.externalPaymentId : ''}`
          : 'Sin pago';
        const opts = ESTADOS.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('');
        return `
        <div class="fl-ocard">
          <div class="hd">
            <b>Pedido #${o.id}</b>
            <span><span class="fl-badge">${o.status}</span> <span class="fl-badge" style="background:rgba(157,168,130,.16);color:var(--olive,#9DA882);">pago: ${o.paymentStatus}</span></span>
          </div>
          <div class="grid">
            <div><span class="k">Cliente</span><br>${o.customer.name || '—'}<br>${o.customer.email || ''}</div>
            <div><span class="k">Teléfono</span><br>${o.customer.phone || o.delivery.phone || '—'}</div>
            <div><span class="k">Entrega</span><br>${o.delivery.address}<br>${fdate(o.delivery.date)} ${o.delivery.time || ''}</div>
            <div><span class="k">Pago</span><br>${pay}<br><span class="k">Total</span> <b>${money(o.total)}</b> <small>(sub ${money(o.subtotal)} + env ${money(o.shippingCost)})</small></div>
            <div style="grid-column:1/-1;"><span class="k">Productos</span><ul>${items}</ul></div>
            ${o.delivery.cardMessage ? `<div style="grid-column:1/-1;"><span class="k">Tarjeta</span><br>“${o.delivery.cardMessage}”</div>` : ''}
            <div style="grid-column:1/-1;"><span class="k">Fecha de compra</span> ${fdate(o.createdAt)}</div>
          </div>
          <div class="statusrow">
            <select data-order="${o.id}">${opts}</select>
            <button data-save="${o.id}">Actualizar estado</button>
          </div>
        </div>`;
      }).join('');

      cont.querySelectorAll('button[data-save]').forEach((btn) => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-save');
          const sel = cont.querySelector(`select[data-order="${id}"]`);
          btn.disabled = true;
          try {
            await window.Fleur.updateOrderStatus(Number(id), sel.value);
            toast('✅ Pedido #' + id + ' → ' + sel.value);
            await renderAdminMetrics();
          } catch (e) { toast('⚠️ ' + e.message); }
          finally { btn.disabled = false; }
        };
      });
    } catch (e) { cont.innerHTML = `<p style="color:var(--light);">${e.message}</p>`; }
  }

  $('#flAdminFilter').onchange = renderAdminOrders;
  $('#flAdminReload').onclick = () => Promise.all([renderAdminMetrics(), renderAdminOrders()]);
  window.openAdminPanel = openAdmin;

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.fl-overlay.open').forEach((o) => o.classList.remove('open'));
  });

  // Muestra/oculta el botón "Panel Admin" en el navbar según el rol.
  function injectAdminButton(isAdmin) {
    const actions = $('.nav-actions');
    let btn = $('#flAdminBtn');
    if (isAdmin) {
      if (!btn && actions) {
        btn = document.createElement('button');
        btn.className = 'nav-cta';
        btn.id = 'flAdminBtn';
        btn.textContent = 'Panel Admin';
        btn.style.cssText = 'background:var(--terra,#C98B78);';
        btn.onclick = () => window.openAdminPanel();
        actions.appendChild(btn);
      }
    } else if (btn) {
      btn.remove();
    }
  }

  // Sincroniza UI con el estado de sesión actual.
  async function syncUI() {
    const u = await window.Fleur.me();
    const logged = u && !window.Fleur.isGuest();
    const acc = $('#flAccountBtn');
    if (acc) acc.textContent = logged ? (u.role === 'admin' ? '🛠️' : '🙋‍♀️') : '👤';
    injectAdminButton(logged && u.role === 'admin');
  }

  /* ---------- arranque ---------- */
  function boot() {
    injectAccountButton();
    window.addEventListener('fleur:auth', syncUI);
    window.addEventListener('fleur:ready', syncUI);
    // Si fleur-api.js ya estaba listo antes que este script:
    if (window.Fleur) syncUI();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
