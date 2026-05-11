# PRD — Frutos Secos Premium (E-commerce automatizado con IA)

## Problema original (usuario)
> "quiero que revises este repositorio y analices que mejoras podemos incluir para que la comunicación entre cliente y plataforma sea lo más eficiente posible y tenga la menor intervención de personas posible, necesito que el proceso de venta esté automatizado"

## Contexto del negocio
- **Rubro:** Frutos secos premium (ecommerce online).
- **Distribuidor:** DIFRUMARKET (Argentina).
- **Mercado:** Argentina, todo el país.
- **Pago:** Mercado Pago (mock por ahora).
- **Canales (Fase 1):** Web + Chatbot IA en sitio.
- **Canales (Fase 2):** WhatsApp Business, Telegram, Email.

## ✅ Implementado

### Iteración 1 — MVP base (11/05/2026)
- Auth JWT + admin seed idempotente.
- Storefront completo (Home, Catálogo, Producto, Carrito, Checkout, About).
- Mercado Pago Checkout Pro con modo MOCK (placeholder).
- Webhook automático para confirmar pagos.
- CRM automático: cada chat/signup/checkout crea/actualiza lead.
- Chatbot IA "Nuez" con GPT-5.2 (Emergent Universal Key).
- Panel admin: Dashboard, Productos CRUD, Pedidos, CRM Leads, Conversaciones IA.
- Diseño premium "Organic & Earthy".

### Iteración 2 — Productos reales DIFRUMARKET (11/05/2026)
- **50 productos reales** seedeados con datos del distribuidor (CSV oficial DIFRUMARKET).
- **Modelo de precios mejorado:**
  - `cost_per_kg` (columna 1 — lo que paga el dueño al supplier).
  - `supplier_price_5kg` y `supplier_price_1kg` (columnas 2 y 3 — referencia).
  - `margin_percent` (slider 10-50%, default 25%).
  - `weight_options` con `weight_kg` numérico para cálculo automático.
- **Slider de margen 10-50% por producto:**
  - Inline en la tabla de productos del admin.
  - Live preview de precios en el formulario de edición.
  - PATCH `/api/admin/products/{id}/margin` recalcula automáticamente los precios.
- **Sync automático desde Google Sheet del proveedor:**
  - Endpoint manual: POST `/api/admin/sync-supplier` (botón en admin).
  - Endpoint estado: GET `/api/admin/sync-status` (muestra last_synced_at).
  - Scheduler diario automático (asyncio task cada 24h).
  - Matching fuzzy (token Jaccard >= 0.5) tolera diferencias menores de nombre.
- Imágenes Unsplash/Pexels verificadas por categoría (20 categorías).
- Función `enrich_product` calcula precios on-the-fly desde cost × peso × (1 + margen).
- Chatbot IA actualizado para conocer todos los productos DIFRUMARKET con precios reales.

## 🚀 Automatización del proceso de venta (cómo opera SIN intervención humana)
1. Visitante entra → ve hero + 50 productos reales del catálogo DIFRUMARKET.
2. Chatbot proactivo aparece a los 8s.
3. Visitante chatea con "Nuez" IA: recomienda combos según necesidad (con precios reales).
4. Visitante agrega al carrito → checkout → MP.
5. Webhook MP confirma pago → orden `approved`.
6. Lead se promueve automáticamente a `customer` o `recurrent` en CRM.
7. Admin sólo prepara el envío.
8. Cada 24h se sincronizan los costos desde DIFRUMARKET (Google Sheet) → margen actualizado en tiempo real.

## 📊 Backend (Tech)
- FastAPI + Motor (MongoDB) + emergentintegrations (GPT-5.2) + mercadopago-sdk-py + bcrypt + PyJWT.
- Endpoints principales:
  - `/api/auth/*` (register, login, me)
  - `/api/products` + `/api/products/{slug}` + `/api/categories`
  - `/api/admin/products` (POST/PUT/DELETE)
  - `/api/admin/products/{id}/margin` (PATCH — slider)
  - `/api/admin/sync-supplier` (POST — manual sync)
  - `/api/admin/sync-status` (GET)
  - `/api/orders` + `/api/orders/{ref}/mock-pay`
  - `/api/webhook/mercadopago`
  - `/api/chat` + `/api/chat/{session_id}/messages`
  - `/api/admin/{dashboard,orders,leads,chat-sessions}`

## 📋 Backlog priorizado

### P0 (cuando el usuario provea credenciales)
- [ ] Reemplazar `MP_ACCESS_TOKEN` real Mercado Pago → activa pagos producción.
- [ ] Reemplazar `RESEND_API_KEY` real → emails confirmación + carrito abandonado.

### P1 (Fase 2)
- [ ] WhatsApp Business (Twilio) conectado al agente "Nuez".
- [ ] Telegram bot.
- [ ] Vista "Mis pedidos" funcional en `/mi-cuenta`.
- [ ] Tarifas de envío por provincia.
- [ ] Tracking de envío.

### P2 (Crecimiento)
- [ ] Combos con descuento por volumen.
- [ ] Wishlist / favoritos.
- [ ] Sistema de cupones.
- [ ] Reseñas de productos.
- [ ] Programa de referidos.
- [ ] Sync notification (alerta al admin si un producto del proveedor desaparece).

## Test results
- Iteration 1: 33/33 backend pasados ✅
- Iteration 2: 30/30 backend pasados ✅ (incluye PATCH /margin con validación 10-50, sync con Google Sheet real, enrich_product, regression de iteration 1)

## Credenciales
- Admin: `admin@frutossecos.com.ar` / `Admin123!`
- Acceso: `/login` → redirige a `/admin`
