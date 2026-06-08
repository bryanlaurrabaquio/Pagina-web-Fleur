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

  // ---------- sincronización del estado local con el servidor ----------
  function syncCartFromServer(serverCart) {
    // Mapea el formato del backend al que espera tu updateCartUI()
    window.cart = (serverCart.items || []).map((i) => ({
      id: i.sku, name: i.name, price: i.price, img: i.image, qty: i.quantity, productId: i.productId,
    }));
    if (typeof updateCartUI === 'function') updateCartUI();
  }
  function syncFavFromServer(serverFavs) {
    window.favorites = (serverFavs || []).map((f) => ({
      id: f.sku, name: f.name, price: f.price, img: f.image, productId: f.productId,
    }));
    if (typeof updateFavUI === 'function') updateFavUI();
  }

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
      const r = await api('/cart/items', { method: 'POST', body: { sku: product.id, quantity: 1 } });
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
      const r = await api('/favorites', { method: 'POST', body: { sku: product.id } });
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
      await refreshState();
      await handlePaymentReturn();
      console.log('🌸 Fleur API conectada:', API);
      window.dispatchEvent(new CustomEvent('fleur:ready'));
    } catch (e) {
      console.warn('Fleur API no disponible:', e.message);
    }
  })();
})();
