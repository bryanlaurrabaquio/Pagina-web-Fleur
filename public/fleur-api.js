/* =====================================================================
   FLEUR — Capa de integración Frontend ↔ Backend (drop-in)
   ---------------------------------------------------------------------
   Cómo usar:
   1) Levanta el backend (http://localhost:4000).
   2) En tu fleur-enhanced.html, justo ANTES de </body> y DESPUÉS de tu
      <script> actual, agrega:
         <script src="http://localhost:4000/fleur-api.js"></script>
      (o copia este archivo junto al HTML y usa <script src="fleur-api.js">).
   3) Listo: este archivo sobrescribe addToCart, addToFav, checkout,
      handleSearch, handleFormSubmit y subscribeNewsletter para usar la API.

   Nota de auth: el carrito/favoritos/pedidos requieren sesión JWT.
   Para no modificar tu UI, se crea automáticamente una sesión "invitado"
   guardada en localStorage. Puedes reemplazarla por un login real luego.
   ===================================================================== */
(function () {
  const API = (window.FLEUR_API_URL || 'http://localhost:4000') + '/api';
  const TOKEN_KEY = 'fleur_token';

  // ---------- helpers HTTP ----------
  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);

  async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
    const res = await fetch(API + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Error de red');
    return data;
  }

  // ---------- catálogo real del backend (para resolver SKUs correctos) ----------
  let _catalogBySku = {};
  let _catalogByName = {};
  let _catalogLoaded = false;

  const normName = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quita acentos
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  async function loadCatalog() {
    try {
      const r = await api('/products?limit=100', { auth: false });
      _catalogBySku = {};
      _catalogByName = {};
      (r.data || []).forEach((p) => {
        if (p.sku) _catalogBySku[p.sku] = p;
        if (p.name) _catalogByName[normName(p.name)] = p;
      });
      _catalogLoaded = true;
    } catch (e) {
      console.warn('No se pudo cargar el catálogo:', e.message);
    }
  }
  async function ensureCatalog() {
    if (!_catalogLoaded) await loadCatalog();
  }

  // Resuelve el SKU real existente en el backend a partir de un producto del HTML.
  // Prioridad: data-sku/sku → id (si existe en catálogo) → coincidencia por nombre.
  function resolveProductSku(product) {
    if (!product) return null;
    const direct = product.sku || (product.dataset && product.dataset.sku) || product.id;
    if (direct && _catalogBySku[direct]) return direct;
    if (product.name) {
      const match = _catalogByName[normName(product.name)];
      if (match) return match.sku;
    }
    return direct || null; // último recurso: que el backend valide
  }

  // ---------- fallback global de imágenes rotas (no cambia el diseño) ----------
  const FALLBACK_IMG =
    'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=80';
  document.addEventListener(
    'error',
    (e) => {
      const t = e.target;
      if (t && t.tagName === 'IMG' && !t.dataset.fbk) {
        t.dataset.fbk = '1';
        t.src = FALLBACK_IMG;
      }
    },
    true // fase de captura: los errores de <img> no burbujean
  );

  // Barrido para imágenes que ya fallaron antes de registrar el listener.
  function sweepBrokenImages() {
    document.querySelectorAll('img').forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && !img.dataset.fbk) {
        img.dataset.fbk = '1';
        img.src = FALLBACK_IMG;
      }
    });
  }
  window.addEventListener('load', sweepBrokenImages);
  setTimeout(sweepBrokenImages, 1500);

  // ---------- sesión invitado automática ----------
  async function ensureSession() {
    if (getToken()) return;
    let creds = JSON.parse(localStorage.getItem('fleur_guest') || 'null');
    if (!creds) {
      const rnd = Math.random().toString(36).slice(2);
      creds = { email: `guest_${rnd}@fleur.guest`, password: `Guest_${rnd}A1`, name: 'Invitada Fleur' };
      localStorage.setItem('fleur_guest', JSON.stringify(creds));
    }
    try {
      const r = await api('/auth/login', { method: 'POST', auth: false, body: { email: creds.email, password: creds.password } });
      setToken(r.data.token);
    } catch {
      const r = await api('/auth/register', { method: 'POST', auth: false, body: creds });
      setToken(r.data.token);
    }
  }

  // ---------- normalización + render directo en el DOM ----------
  const el = (id) => document.getElementById(id);

  // Normaliza la respuesta del carrito a una forma estable.
  function normalizeCartResponse(response) {
    const cart = (response && response.data) || response || {};
    return {
      id: cart.id,
      items: Array.isArray(cart.items) ? cart.items : [],
      count: Number(cart.count || 0),
      subtotal: Number(cart.subtotal || 0),
      shipping: Number(cart.shipping != null ? cart.shipping : cart.shippingCost || 0),
      total: Number(cart.total || 0),
      freeShipping: Boolean(cart.freeShipping),
      freeShippingThreshold: Number(cart.freeShippingThreshold || 500),
    };
  }

  let _cart = normalizeCartResponse({});
  let _favs = [];

  // Renderiza el carrito usando los mismos IDs/clases de tu HTML (no cambia el diseño).
  function renderCartUI(n) {
    // Estado global para checkout / placeOrder / openCheckoutModal
    window.cart = n.items.map((i) => ({
      id: i.sku, productId: i.productId, name: i.name, price: i.price,
      img: i.image, qty: i.quantity, lineTotal: i.lineTotal,
    }));

    const badge = el('cartBadge');
    if (badge) { badge.textContent = n.count; badge.style.display = n.count > 0 ? 'flex' : 'none'; }
    const itemCount = el('cartItemCount');
    if (itemCount) itemCount.textContent = n.count + (n.count === 1 ? ' artículo' : ' artículos');

    const empty = el('cartEmpty');
    const items = el('cartItems');
    const footer = el('cartFooter');
    if (!items) return;

    if (n.items.length === 0) {
      if (empty) empty.style.display = 'flex';
      items.innerHTML = '';
      if (footer) footer.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (footer) footer.style.display = 'block';

    items.innerHTML = n.items.map((it) => {
      const line = it.lineTotal != null ? it.lineTotal : it.price * it.quantity;
      return `
      <div class="cart-item">
        <div class="cart-item-img"><img src="${it.image}" alt="${it.name}"></div>
        <div class="cart-item-info">
          <h5>${it.name}</h5>
          <p>Entrega: Mismo día CDMX</p>
          <div class="cart-item-price">$${Number(line).toLocaleString()} MXN</div>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="changeQty('${it.sku}',-1)">−</button>
            <span class="qty-num">${it.quantity}</span>
            <button class="qty-btn" onclick="changeQty('${it.sku}',1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${it.sku}')" title="Eliminar">✕</button>
      </div>`;
    }).join('');

    const sub = el('cartSubtotal'); if (sub) sub.textContent = '$' + n.subtotal.toLocaleString() + ' MXN';
    const ship = el('cartShipping'); if (ship) ship.textContent = n.shipping === 0 ? '¡Gratis!' : '$' + n.shipping + ' MXN';
    const tot = el('cartTotal'); if (tot) tot.textContent = '$' + n.total.toLocaleString() + ' MXN';

    const msg = el('cartShippingMsg');
    if (msg) {
      if (n.freeShipping || n.subtotal >= n.freeShippingThreshold) {
        msg.innerHTML = '🎉 ¡Felicidades! Tu pedido tiene <strong>envío gratis</strong>';
        msg.style.background = 'rgba(157,168,130,0.15)';
      } else {
        const diff = n.freeShippingThreshold - n.subtotal;
        msg.innerHTML = `🚚 Agrega <strong>$${diff} MXN</strong> más para obtener <strong>envío gratis</strong>`;
        msg.style.background = 'rgba(201,139,120,0.1)';
      }
    }
  }

  // Renderiza favoritos con los mismos IDs/clases de tu HTML.
  function renderFavUI(list) {
    window.favorites = list.map((f) => ({
      id: f.sku, productId: f.productId, name: f.name, price: f.price, img: f.image,
    }));
    const badge = el('favBadge');
    if (badge) { badge.textContent = list.length; badge.style.display = list.length > 0 ? 'flex' : 'none'; }

    const empty = el('favEmpty');
    const items = el('favItems');
    if (!items) return;

    if (list.length === 0) {
      if (empty) empty.style.display = 'flex';
      items.innerHTML = '';
      return;
    }
    if (empty) empty.style.display = 'none';
    items.innerHTML = list.map((f) => `
      <div class="fav-card">
        <div class="fav-card-img"><img src="${f.image}" alt="${f.name}"></div>
        <div class="fav-card-info">
          <h5>${f.name}</h5>
          <p>$${f.price} MXN</p>
          <div class="fav-card-actions">
            <button class="fav-card-btn fav-add-cart" onclick="addToCart({id:'${f.sku}'})">Al carrito</button>
            <button class="fav-card-btn fav-remove" onclick="removeFromFav('${f.sku}')">✕</button>
          </div>
        </div>
      </div>`).join('');
  }

  // ---------- sincronización del estado con el servidor ----------
  function syncCartFromServer(serverCart) {
    _cart = normalizeCartResponse(serverCart);
    renderCartUI(_cart);
  }
  function syncFavFromServer(serverFavs) {
    _favs = Array.isArray(serverFavs) ? serverFavs : (serverFavs && serverFavs.data) || [];
    renderFavUI(_favs);
  }

  // Sobrescribimos las funciones de tu HTML para que cualquier llamada interna
  // re-renderice desde el estado real del servidor (no desde la variable léxica vacía).
  window.updateCartUI = () => renderCartUI(_cart);
  window.updateFavUI = () => renderFavUI(_favs);

  // Busca el productId real a partir del sku que usa tu HTML (p1..p12)
  async function productIdBySku(sku) {
    const item = (window.cart || []).find((c) => c.id === sku);
    if (item && item.productId) return item.productId;
    const fav = (window.favorites || []).find((c) => c.id === sku);
    if (fav && fav.productId) return fav.productId;
    const r = await api(`/products/${encodeURIComponent(sku)}`, { auth: false });
    return r.data.id;
  }

  /* =================================================================
     OVERRIDES de tus funciones (mismo nombre que tu HTML)
     ================================================================= */

  // 1) CARRITO
  window.addToCart = async function (product) {
    try {
      await ensureSession();
      await ensureCatalog();
      const sku = resolveProductSku(product);
      if (!sku) return showToast('⚠️ Producto no disponible');
      const r = await api('/cart/items', { method: 'POST', body: { sku, quantity: 1 } });
      syncCartFromServer(r.data);
      showToast('🛒 Añadido al carrito');
      openCart();
    } catch (e) { showToast('⚠️ ' + e.message); }
  };

  window.removeFromCart = async function (sku) {
    try {
      const productId = await productIdBySku(sku);
      const r = await api(`/cart/items/${productId}`, { method: 'DELETE' });
      syncCartFromServer(r.data);
    } catch (e) { showToast('⚠️ ' + e.message); }
  };

  window.changeQty = async function (sku, delta) {
    try {
      const item = (window.cart || []).find((c) => c.id === sku);
      if (!item) return;
      const productId = item.productId || (await productIdBySku(sku));
      const r = await api(`/cart/items/${productId}`, { method: 'PATCH', body: { quantity: item.qty + delta } });
      syncCartFromServer(r.data);
    } catch (e) { showToast('⚠️ ' + e.message); }
  };

  // 2) CHECKOUT
  // Si fleur-ui.js está cargado, abre el formulario modal (recomendado).
  // Si no, cae a prompt() para seguir siendo funcional por sí solo.
  window.checkout = async function () {
    if (!window.cart || window.cart.length === 0) return;
    if (typeof window.openCheckoutModal === 'function') {
      return window.openCheckoutModal();
    }
    const address = prompt('📍 Dirección de entrega:');
    if (!address) return;
    const cardMessage = prompt('💌 Mensaje para la tarjeta floral (opcional):') || '';
    return window.placeOrder({ address, cardMessage });
  };

  // Crea el pedido + ejecuta el pago mock. Reutilizable por la UI modal.
  // data: { address, deliveryDate?, deliveryTime?, cardMessage? }
  window.placeOrder = async function (data) {
    try {
      showToast('💳 Procesando tu pedido...');
      const order = await api('/orders', { method: 'POST', body: data });
      const orderId = order.data.id;
      const checkout = await api('/payments/create-checkout', { method: 'POST', body: { orderId } });

      // Pasarela real (Stripe / Mercado Pago): redirigir al checkout externo.
      // El pago se confirma por webhook; al volver con ?payment=success se refresca.
      if (checkout.data.redirect && checkout.data.checkoutUrl) {
        showToast('Redirigiendo a la pasarela de pago...');
        localStorage.setItem('fleur_pending_order', String(orderId));
        window.location.href = checkout.data.checkoutUrl;
        return order.data;
      }

      // Mock: confirmar localmente.
      await api('/payments/confirm', { method: 'POST', body: { orderId, sessionId: checkout.data.sessionId } });
      const cart = await api('/cart');
      syncCartFromServer(cart.data);
      if (typeof closeCart === 'function') closeCart();
      showToast('🎉 ¡Pedido pagado con éxito! #' + orderId);
      return order.data;
    } catch (e) {
      showToast('⚠️ ' + e.message);
      throw e;
    }
  };

  // 3) FAVORITOS
  window.addToFav = async function (product) {
    try {
      await ensureSession();
      await ensureCatalog();
      const sku = resolveProductSku(product);
      if (!sku) return showToast('⚠️ Producto no disponible');
      const r = await api('/favorites', { method: 'POST', body: { sku } });
      syncFavFromServer(r.data);
      showToast('❤️ Añadido a favoritos');
    } catch (e) {
      if (/favoritos/.test(e.message)) showToast('💛 Ya está en favoritos');
      else showToast('⚠️ ' + e.message);
    }
  };

  window.removeFromFav = async function (sku) {
    try {
      const productId = await productIdBySku(sku);
      const r = await api(`/favorites/${productId}`, { method: 'DELETE' });
      syncFavFromServer(r.data);
      showToast('🗑️ Eliminado de favoritos');
    } catch (e) { showToast('⚠️ ' + e.message); }
  };

  // 4) BÚSQUEDA → usa el endpoint público de productos
  window.handleSearch = async function (q) {
    q = (q || '').trim();
    const label = document.getElementById('searchResultLabel');
    const container = document.getElementById('searchResults');
    try {
      const r = await api(`/products?q=${encodeURIComponent(q)}&limit=6`, { auth: false });
      const results = r.data;
      label.textContent = q ? `Resultados para "${q}"` : 'Sugerencias';
      if (!results.length) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--light);padding:24px;font-size:13px;">No encontramos resultados.</div>';
        return;
      }
      container.innerHTML = results.map((p) => `
        <div class="search-result-item" onclick="addToCart({id:'${p.sku}'});closeSearch();">
          <div class="search-result-img"><img src="${p.image}" alt="${p.name}"></div>
          <div class="search-result-info">
            <h5>${p.name}</h5>
            <p>$${p.price} MXN</p>
            <div style="font-size:10px;color:var(--light);margin-top:2px;">⭐ ${p.rating} · ${p.reviews} reseñas</div>
          </div>
        </div>`).join('');
    } catch (e) { showToast('⚠️ ' + e.message); }
  };

  // 5) FORMULARIO DE CONTACTO (público)
  window.handleFormSubmit = async function (e) {
    e.preventDefault();
    if (typeof validateForm === 'function' && !validateForm()) {
      showToast('⚠️ Por favor revisa los campos marcados');
      return;
    }
    const payload = {
      name: document.getElementById('fieldNombre').value.trim()
        + (document.getElementById('fieldApellido').value.trim() ? ' ' + document.getElementById('fieldApellido').value.trim() : ''),
      email: document.getElementById('fieldEmail').value.trim(),
      phone: document.getElementById('fieldTelefono').value.trim(),
      subject: document.getElementById('fieldAsunto').value,
      message: document.getElementById('fieldMensaje').value.trim(),
    };
    try {
      await api('/contact', { method: 'POST', auth: false, body: payload });
      showToast('✉️ ¡Mensaje enviado! Te contactaremos pronto.');
      e.target.reset();
      document.querySelectorAll('.form-input').forEach((el) => el.classList.remove('success', 'error'));
    } catch (err) { showToast('⚠️ ' + err.message); }
  };

  // 6) NEWSLETTER (público)
  window.subscribeNewsletter = async function () {
    const input = document.getElementById('newsletterInput');
    const val = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
      input.style.borderColor = '#E07070';
      showToast('⚠️ Ingresa un email válido');
      return;
    }
    try {
      await api('/newsletter', { method: 'POST', auth: false, body: { email: val } });
      input.style.borderColor = 'var(--olive)';
      showToast('🎉 ¡Bienvenida a Fleur!');
      input.value = '';
    } catch (err) {
      showToast(/suscrito/.test(err.message) ? '💛 Ese correo ya está suscrito' : '⚠️ ' + err.message);
    }
    setTimeout(() => (input.style.borderColor = ''), 2000);
  };

  // ---------- API pública para fleur-ui.js (login/registro/checkout) ----------
  // Refresca carrito + favoritos desde el servidor (tras login/logout).
  async function refreshState() {
    const [cart, favs] = await Promise.all([api('/cart'), api('/favorites')]);
    syncCartFromServer(cart.data);
    syncFavFromServer(favs.data);
  }

  window.Fleur = {
    api,                         // fetch helper con auth
    getToken,
    setToken,
    isGuest: () => {
      const g = JSON.parse(localStorage.getItem('fleur_guest') || 'null');
      return !!g; // hay sesión de invitado activa si no se ha hecho login real
    },
    // Login real: guarda token y marca que ya no es invitado
    async login(email, password) {
      const r = await api('/auth/login', { method: 'POST', auth: false, body: { email, password } });
      setToken(r.data.token);
      localStorage.removeItem('fleur_guest');
      await refreshState();
      window.dispatchEvent(new CustomEvent('fleur:auth', { detail: r.data.user }));
      return r.data.user;
    },
    async register(name, email, password) {
      const r = await api('/auth/register', { method: 'POST', auth: false, body: { name, email, password } });
      setToken(r.data.token);
      localStorage.removeItem('fleur_guest');
      await refreshState();
      window.dispatchEvent(new CustomEvent('fleur:auth', { detail: r.data.user }));
      return r.data.user;
    },
    async me() {
      try { return (await api('/auth/me')).data; } catch { return null; }
    },
    async logout() {
      setToken('');
      localStorage.removeItem('fleur_token');
      localStorage.removeItem('fleur_guest');
      await ensureSession();
      await refreshState();
      window.dispatchEvent(new CustomEvent('fleur:auth', { detail: null }));
    },
    async myOrders() {
      return (await api('/orders/my-orders')).data;
    },
    getMyOrders() { return this.myOrders(); }, // alias
    apiRequest: api,                            // alias genérico

    // --- Admin ---
    async getAdminDashboard() {
      return (await api('/admin/dashboard')).data;
    },
    async getAdminOrders(filters = {}) {
      const qs = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v != null && v !== '')
      ).toString();
      return (await api('/admin/orders' + (qs ? '?' + qs : ''))).data;
    },
    async getAdminSummary() {
      return (await api('/admin/sales-summary')).data;
    },
    async updateOrderStatus(orderId, status) {
      return (await api(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status } })).data;
    },

    // --- Pagos ---
    async createCheckout(orderId) {
      return (await api('/payments/create-checkout', { method: 'POST', body: { orderId } })).data;
    },

    refreshState,
    ensureSession,
  };

  // Maneja el regreso desde una pasarela externa (Stripe / Mercado Pago).
  async function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    if (!status) return;
    const orderId = params.get('order') || localStorage.getItem('fleur_pending_order');
    localStorage.removeItem('fleur_pending_order');
    if (status === 'success') {
      showToast('🎉 ¡Pago recibido! Pedido #' + (orderId || ''));
      try { await refreshState(); } catch {}
    } else if (status === 'pending') {
      showToast('⏳ Pago en proceso. Te avisaremos al confirmarse.');
      try { await refreshState(); } catch {}
    } else if (status === 'cancel') {
      showToast('⚠️ Pago cancelado. Tu pedido quedó pendiente.');
    }
    // Limpia los parámetros de la URL sin recargar
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  }

  // ---------- arranque: sesión + cargar estado guardado ----------
  (async function init() {
    try {
      await ensureSession();
      await loadCatalog();
      await refreshState();
      await handlePaymentReturn();
      console.log('🌸 Fleur API conectada:', API);
      window.dispatchEvent(new CustomEvent('fleur:ready'));
    } catch (e) {
      console.warn('Fleur API no disponible:', e.message);
    }
  })();
})();
