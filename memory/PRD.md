# PRD — Frutos Secos Premium (E-commerce automatizado con IA)

## Problema original (usuario)
> "quiero que revises este repositorio y analices que mejoras podemos incluir para que la comunicación entre cliente y plataforma sea lo más eficiente posible y tenga la menor intervención de personas posible, necesito que el proceso de venta esté automatizado"

## Contexto del negocio
- **Rubro:** Frutos secos premium (ecommerce online).
- **Mercado:** Argentina, todo el país.
- **Pago:** Mercado Pago (mock por ahora, real al cierre).
- **Canales (Fase 1):** Web + Chatbot IA en sitio.
- **Canales (Fase 2):** WhatsApp Business, Telegram, Email (Resend).

## Personas
1. **Visitante:** llega al sitio, explora, chatea con Nuez IA, agrega al carrito y paga.
2. **Cliente recurrente:** ingresa con cuenta, ve su historial, recibe ofertas.
3. **Administrador:** gestiona productos, ve pedidos, leads (CRM), conversaciones IA y métricas.

## Stack
- **Backend:** FastAPI + Motor (MongoDB) + emergentintegrations (GPT-5.2) + mercadopago-sdk-py + bcrypt + PyJWT.
- **Frontend:** React 19 + React Router 7 + Tailwind + Shadcn UI + Lucide Icons.
- **LLM:** OpenAI GPT-5.2 vía Emergent Universal Key.
- **DB:** MongoDB (colecciones: users, products, orders, leads, chat_sessions, chat_messages).

## ✅ Implementado en Fase 1 (11/05/2026)

### Backend
- ✅ Auth JWT (registro, login, admin seed idempotente).
- ✅ Catálogo de productos (CRUD admin, listado público con filtros).
- ✅ Carrito client-side (localStorage).
- ✅ Órdenes con cálculo de envío automático (gratis > $25.000).
- ✅ Integración Mercado Pago Checkout Pro (modo mock fallback si no hay token).
- ✅ Webhook Mercado Pago `/api/webhook/mercadopago`.
- ✅ Endpoint `mock-pay` para simular pagos sin token real.
- ✅ CRM automático: cada chat/registro/checkout crea o actualiza un lead.
  - Estados: `new`, `contacted`, `customer`, `recurrent` (promoción automática al pagar).
- ✅ Chatbot IA con persona "Nuez" + contexto de productos en system prompt.
- ✅ Persistencia de conversaciones (chat_sessions + chat_messages).
- ✅ Dashboard admin con métricas (ingresos, pedidos, leads, conversaciones).
- ✅ Seed automático de 8 productos demo + admin.

### Frontend
- ✅ Storefront completo (Home, Catálogo, Producto, Carrito drawer, Checkout, About).
- ✅ Auth (Login/Registro con redirect según rol).
- ✅ Mi cuenta (placeholder, ampliable).
- ✅ Checkout 1-pago con Mercado Pago + páginas success/failure/pending/mock.
- ✅ Panel Admin con 5 secciones: Dashboard, Productos, Pedidos, CRM Leads, Conversaciones.
- ✅ Chatbot widget flotante "Nuez" con bubble proactivo a los 8s.
- ✅ Diseño premium "Organic & Earthy" — Cormorant Garamond + Manrope, paleta terracotta/cream.
- ✅ data-testid en todos los elementos interactivos.

## 🚀 Automatización del proceso de venta (cómo opera SIN intervención humana)
1. Visitante entra → ve hero + catálogo.
2. Chatbot proactivo aparece a los 8s con saludo.
3. Visitante chatea con "Nuez" IA: recomienda combos según necesidad.
4. Visitante agrega al carrito → checkout → MP.
5. Webhook MP confirma pago → orden marcada como `approved`.
6. Lead se promueve automáticamente a `customer` o `recurrent` en CRM.
7. Admin sólo necesita preparar el envío (todo lo digital es automático).

## 📋 Backlog priorizado

### P0 (próximo set de keys)
- [ ] Reemplazar `MP_ACCESS_TOKEN` con token real Mercado Pago.
- [ ] Reemplazar `RESEND_API_KEY` con key real y enviar email de confirmación + carrito abandonado.

### P1 (Fase 2)
- [ ] Integración WhatsApp Business (Twilio) — mismo agente IA.
- [ ] Telegram bot.
- [ ] Vista "Mis pedidos" funcional en `/mi-cuenta`.
- [ ] Cálculo de envío por provincia (tabla de tarifas).
- [ ] Tracking de envío.

### P2 (Crecimiento)
- [ ] Combos/promos con descuentos por volumen.
- [ ] Wishlist / favoritos.
- [ ] Sistema de cupones.
- [ ] Reseñas de productos.
- [ ] Programa de referidos.

## Decisiones técnicas clave
- **Mock MP por defecto:** permite testear el flow E2E sin esperar credenciales del cliente.
- **CRM unificado:** un solo `lead.email` es la clave; se enriquece desde chat, registro, checkout y pagos.
- **Chat per-session:** `session_id` en localStorage permite continuar la conversación al volver.
- **Admin único:** seed idempotente, password sincronizada desde `.env`.

## Next Action Items
- Ejecutar testing agent en backend (auth, productos, órdenes, chat, mock pay, webhook).
- Posterior: testing frontend.
- Después: integrar credenciales reales de Mercado Pago + Resend.
