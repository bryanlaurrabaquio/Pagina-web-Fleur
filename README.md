# 🌸 Fleur Backend — API REST de la Florería de Boutique

Backend completo para la tienda **Fleur**: autenticación JWT con roles, catálogo,
carrito, favoritos, pedidos, panel de administración/vendedor, contacto, newsletter y
**pagos con mock / Stripe / Mercado Pago** (cambiables desde `.env`).

**Stack:** Node.js · Express · PostgreSQL · Prisma ORM · JWT · bcrypt · Zod · Helmet · CORS · Rate-limit · Stripe · Mercado Pago

Arquitectura por capas:

```
routes → controllers → services → repositories → prisma → PostgreSQL
                         ↑ validators (Zod) · middlewares (auth/admin/error/rate-limit)
   services/payments/   → stripe.provider.js · mercadopago.provider.js
```

---

## 📦 Requisitos

- **Node.js 18+**
- **PostgreSQL 13+** corriendo localmente
- (opcional) **Stripe CLI** y/o **ngrok** para probar webhooks de pago

---

## 🛠️ Instalación

```bash
cd fleur-backend
npm install
```

---

## 🔐 Variables de entorno (`.env`)

Copia `.env.example` a `.env` y ajusta:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno | `development` |
| `PORT` | Puerto del backend | `4000` |
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://postgres:Admin123!@localhost:5432/fleur?schema=public` |
| `JWT_SECRET` | Secreto para firmar tokens | `un_secreto_largo_aleatorio` |
| `JWT_EXPIRES_IN` | Expiración del token | `7d` |
| `CORS_ORIGINS` | Orígenes permitidos (coma) | `http://localhost:5500,http://127.0.0.1:5500` |
| `FRONTEND_URL` | URL del frontend (retorno de pagos) | `http://localhost:5500` |
| `BACKEND_URL` | URL pública del backend (webhooks MP) | *(vacío en local; usa ngrok)* |
| `FREE_SHIPPING_THRESHOLD` | Umbral envío gratis (MXN) | `500` |
| `SHIPPING_COST` | Costo de envío | `80` |
| `PAYMENT_PROVIDER` | `mock` \| `stripe` \| `mercadopago` | `mock` |
| `STRIPE_SECRET_KEY` | Llave secreta de Stripe | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe | `whsec_...` |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token de Mercado Pago | `TEST-...` |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secreto del webhook de MP | *(del panel MP)* |

> El frontend con Live Server suele ser `http://127.0.0.1:5500`. Inclúyelo en `CORS_ORIGINS`.

---

## 🐘 Conectar PostgreSQL (primera vez)

1. Instala PostgreSQL y anota usuario/contraseña (por defecto `postgres`).
2. Crea la base de datos (psql o pgAdmin):
   ```sql
   CREATE DATABASE fleur;
   ```
3. Pon tus credenciales en `DATABASE_URL` dentro de `.env`.
4. Aplica el esquema y los datos:
   ```powershell
   npx.cmd prisma migrate dev --name init
   npx.cmd prisma generate
   npm.cmd run seed
   ```

---

## 🚀 Comandos

```powershell
npm.cmd run dev            # desarrollo con nodemon
npm.cmd start             # producción

npx.cmd prisma migrate dev --name <nombre>   # crear/aplicar migración (dev)
npx.cmd prisma migrate deploy                # aplicar migraciones (producción)
npx.cmd prisma generate                      # regenerar cliente Prisma
npx.cmd prisma studio                        # GUI de la base de datos
npm.cmd run seed                             # cargar datos de ejemplo
```

> ⚠️ No uses `prisma migrate reset` salvo que quieras **borrar** la base de datos.

---

## 🔌 Arrancar el backend después de apagar la PC

1. Verifica que **PostgreSQL** esté corriendo (servicio de Windows `postgresql-x64-…` → *Iniciar*, o desde *Servicios*).
2. Abre una terminal en `fleur-backend/`.
3. (Solo si cambiaste el esquema) `npx.cmd prisma migrate dev`.
4. Arranca:
   ```powershell
   npm.cmd run dev
   ```
5. Comprueba: abre `http://localhost:4000/api/health` → `{ "status": "ok" }`.
6. Abre tu `fleur-enhanced.html` (con Live Server) y úsalo normalmente.

No necesitas re-seed cada vez; los datos persisten en PostgreSQL.

### ⚡ Arranque de un clic (Windows)

Para no escribir comandos:
- **`setup.bat`** — ejecútalo **una sola vez**: verifica Node, crea `.env` si falta,
  instala dependencias, genera el cliente Prisma, migra y carga el seed.
- **`start.bat`** — doble clic para **iniciar el backend** cada día (instala dependencias
  si faltan y levanta `http://localhost:4000`).

> Asegúrate de que PostgreSQL esté corriendo antes de `start.bat`.

---

## 🗄️ Modelo de datos

`User`, `Category`, `Product`, `Cart`, `CartItem`, `Favorite`, `Order`, `OrderItem`,
`Payment`, `ContactMessage`, `NewsletterSubscriber`.

- `Order`: `status` (logístico) y `paymentStatus` (pago) separados; `deliveryName`,
  `deliveryPhone`, `deliveryAddress`, `deliveryDate`, `deliveryTime`, `cardMessage`,
  `subtotal`, `shippingCost`, `total`.
- `Payment`: `provider`, `status`, `amount`, `currency`, `externalPaymentId`,
  `stripeSessionId`, `mercadoPagoPreferenceId`, `rawResponse`.
- `Product.sku` (`p1`…`p12`) coincide con los IDs del HTML para integración directa.
- Envío gratis automático si subtotal ≥ `FREE_SHIPPING_THRESHOLD`. **El total se
  recalcula siempre en el backend con precios de la BD** (el frontend no puede alterarlo).

---

## 👥 Roles y usuarios seed

| Rol | Email | Password | Puede |
|-----|-------|----------|-------|
| **admin** | `admin@fleur.mx` | `Admin123!` | Panel admin: dashboard, ver/gestionar todos los pedidos, cambiar estados, ver pagos |
| **cliente** | `cliente@fleur.mx` | `Cliente123!` | Comprar, carrito, favoritos, su propio historial |

El registro público (`/api/auth/register`) siempre crea rol `cliente`.

---

## 🔌 Endpoints

Base URL: `http://localhost:4000/api`

### Auth
| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/auth/register` | público |
| POST | `/auth/login` | público |
| GET | `/auth/me` | sesión |

### Products
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/products` | público (`q`, `category`, `featured`, `discount`, `inStock`, `minPrice`, `maxPrice`, `page`, `limit`, `sort`) |
| GET | `/products/featured` · `/products/discounted` | público |
| GET | `/products/:identifier` | público (id, sku o slug) |
| POST · PUT · DELETE | `/products` · `/products/:id` | admin |

### Categories
`GET /categories`, `GET /categories/:slug` (público) · `POST/PUT/DELETE` (admin)

### Cart (sesión)
`GET /cart` · `POST /cart/items` · `PATCH /cart/items/:productId` · `DELETE /cart/items/:productId` · `DELETE /cart`

### Favorites (sesión)
`GET /favorites` · `POST /favorites` · `DELETE /favorites/:productId`

### Orders
| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/orders` | sesión (crea desde carrito) |
| GET | `/orders/my-orders` (alias `/orders/mine`) | sesión |
| GET | `/orders/:id` | dueño/admin |

### Admin (sesión + rol admin)
| Método | Ruta | Devuelve |
|--------|------|----------|
| GET | `/admin/dashboard` | total vendido, # pedidos, conteo por estado, por pasarela, últimos pedidos |
| GET | `/admin/sales-summary` | totales de venta y por pasarela |
| GET | `/admin/orders` | todos los pedidos (`?status=&paymentStatus=&page=&limit=`) |
| GET | `/admin/orders/summary` | conteo por estado de pedido y de pago |
| GET | `/admin/orders/pending-shipments` | pagados pendientes de envío |
| PATCH | `/admin/orders/:id/status` | cambia estado del pedido |

### Payments
| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/payments/create-checkout` | sesión (`{ orderId }`) |
| POST | `/payments/confirm` | sesión (mock) |
| GET | `/payments/:orderId` | dueño/admin |
| POST | `/payments/stripe/webhook` | **público** (firma Stripe) |
| POST | `/payments/mercadopago/webhook` | **público** (firma MP) |

---

## 🧪 Pruebas con Bruno

Hay una **colección lista** en la carpeta [`bruno/`](./bruno). En Bruno:
**Open Collection → selecciona `fleur-backend/bruno`** y elige el entorno **Local**.

La petición **Login** guarda el token automáticamente en la variable `{{token}}`, así que
las rutas protegidas ya lo usan sin que lo copies a mano.

### Manual (si lo haces a mano)

**1) Login**
- Método `POST` · URL `http://localhost:4000/api/auth/login`
- Body → JSON:
```json
{ "email": "admin@fleur.mx", "password": "Admin123!" }
```
- Respuesta:
```json
{ "success": true, "data": { "user": { "role": "admin" }, "token": "eyJhbGciOi..." } }
```
- **Copia** `data.token`.

**2) Usar el token en rutas protegidas**
- Pestaña **Auth → Bearer Token** → pega el token, **o** Header:
  `Authorization: Bearer eyJhbGciOi...`
- Prueba: `GET /api/auth/me`.

**3) Probar rol admin**
- Con token admin: `GET /api/admin/dashboard` → `200`.
- Con token cliente: `GET /api/admin/dashboard` → `403`.
- Sin token / token vencido → `401`.

**4) Flujo de compra completo (cliente)**
1. `POST /api/auth/login` (cliente) → token.
2. `POST /api/cart/items` `{ "sku": "p4", "quantity": 1 }`.
3. `POST /api/orders` `{ "address": "Roma 123, CDMX", "deliveryPhone": "5512345678", "cardMessage": "¡Felicidades!" }` → copia `id`.
4. `POST /api/payments/create-checkout` `{ "orderId": <id> }`.
5. `POST /api/payments/confirm` `{ "orderId": <id> }` (modo mock) → pedido `pagado`.

---

## 💳 Pagos: mock / Stripe / Mercado Pago

Cambia el proveedor con `PAYMENT_PROVIDER` en `.env` y reinicia.

### Mock (por defecto, para desarrollo)
`PAYMENT_PROVIDER="mock"`. El checkout se confirma con `POST /api/payments/confirm`.
No requiere llaves. Ideal para probar todo el flujo localmente.

### Stripe
1. `.env`: `PAYMENT_PROVIDER="stripe"`, `STRIPE_SECRET_KEY="sk_test_..."`.
2. Webhook local con Stripe CLI:
   ```powershell
   stripe listen --forward-to localhost:4000/api/payments/stripe/webhook
   ```
   Copia el `whsec_...` a `STRIPE_WEBHOOK_SECRET` y reinicia.
3. En el frontend, el checkout **redirige a Stripe**. Tarjeta de prueba `4242 4242 4242 4242`, fecha futura, CVC cualquiera.
4. El webhook `checkout.session.completed` marca el pedido **pagado**.

### Mercado Pago
1. `.env`: `PAYMENT_PROVIDER="mercadopago"`, `MERCADOPAGO_ACCESS_TOKEN="TEST-..."`.
2. Expón el backend para el webhook:
   ```powershell
   ngrok http 4000
   ```
   Pon la URL pública en `BACKEND_URL`, opcional `MERCADOPAGO_WEBHOOK_SECRET`, y reinicia.
3. El checkout **redirige al `init_point`** de MP. Paga con [usuario y tarjeta de prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/test-cards).
4. El webhook consulta el pago real; si está `approved`, marca el pedido **pagado**.

> Seguridad: ambos webhooks verifican **firma**; el estado del pago se confirma del lado del
> proveedor (no se confía en datos del cliente). El total se recalcula en el backend.

---

## 🖥️ Panel Admin (frontend)

Con la sesión de **admin** iniciada desde el modal de login, aparece el botón
**“Panel Admin”** en el navbar (y dentro de 👤). Ahí puedes:
- Ver métricas (total vendido, # pedidos y conteos por estado).
- Ver cada pedido: cliente, email, teléfono, productos+cantidades, subtotal/envío/total,
  dirección, fecha/horario, mensaje de tarjeta, estado de pago, pasarela e ID externo.
- Cambiar el estado del pedido (pendiente → pagado → preparando → enviado → entregado / cancelado).

Para probar: entra como `admin@fleur.mx` / `Admin123!`.

---

## 🔗 Integración con tu frontend (`fleur-enhanced.html`)

Antes de `</body>`, después de tu `<script>` actual:

```html
<script>window.FLEUR_API_URL = 'http://localhost:4000';</script>
<script src="http://localhost:4000/fleur-api.js"></script>
<script src="http://localhost:4000/fleur-ui.js"></script>
```

- `fleur-api.js` conecta `addToCart`, `addToFav`, `checkout`, `handleSearch`,
  `handleFormSubmit`, `subscribeNewsletter` a la API, y expone `window.Fleur`
  (`login`, `register`, `getMe`, `logout`, `getMyOrders`, `getAdminDashboard`,
  `getAdminOrders`, `updateOrderStatus`, `createCheckout`, `getToken`, `setToken`, `apiRequest`…).
- `fleur-ui.js` inyecta el login/registro, el botón de cuenta, el **panel admin** y el
  **checkout** con resumen de compra — sin modificar tu HTML.

> Sesión invitado automática para que carrito/favoritos funcionen sin login; al iniciar
> sesión real se conserva el carrito.

---

## 🔒 Seguridad

- **Helmet**, **CORS** por origen, **Rate-limit** (global + estricto en `/auth`).
- **Zod** en cada endpoint de escritura · **bcrypt** para contraseñas (nunca se exponen).
- **JWT** con claims `userId`, `email`, `role`; errores claros de token inválido/expirado.
- **Roles** validados (`requireAdmin`/`requireRole`).
- **Totales recalculados en el backend** con precios de la BD.
- **Webhooks firmados** (Stripe y Mercado Pago).
- Manejo **centralizado de errores** (sin stack ni datos sensibles en producción).

---

## 🌱 Migraciones

- Cambiaste `schema.prisma` → `npx.cmd prisma migrate dev --name <nombre>`.
- En servidor → `npx.cmd prisma migrate deploy`.
- Regenerar cliente → `npx.cmd prisma generate`.
- Inspeccionar datos → `npx.cmd prisma studio`.

---

Hecho con 🌸 para Fleur.
