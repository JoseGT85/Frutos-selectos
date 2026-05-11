# 🌰 Reporte Integral: Frutos Selectos (DIFRUMARKET)
**Estado del Proyecto:** 🚀 Fase de Pre-Lanzamiento (Producción Ready)
**Fecha:** Mayo 2026

---

## 1. Visión General
Frutos Selectos es una plataforma de **Comercio Conversacional** diseñada para optimizar la venta de frutos secos y productos premium de Mendoza. El sistema une un catálogo web moderno con la potencia de la Inteligencia Artificial y la cercanía de WhatsApp/Telegram.

---

## 2. Pilares Tecnológicos (Tech Stack)
- **Frontend:** React 19 + Vite (Interfaz Ultra-Premium, Dark Mode, Responsive).
- **Backend:** Node.js + Express (Servidor central orquestador).
- **Base de Datos:** Supabase (SQL) para persistencia de órdenes y conocimientos.
- **Bot de Telegram:** Telegraf.js (Atención al cliente y notificaciones admin).
- **WhatsApp API:** Integración oficial con WhatsApp Cloud API (Meta).
- **Inteligencia Artificial:** Orquestación dual (Claude 3.5 Anthropic / Ollama Local).
- **Catálogo Dinámico:** Sincronización en tiempo real con Google Sheets.

---

## 3. Lógica de Negocio Implementada
Se han configurado reglas estrictas para garantizar la rentabilidad y el servicio:
- ✅ **Compra Mínima:** 10 kg (Obligatorio para habilitar el checkout).
- ✅ **Envío Gratis:** Únicamente para la **1ra compra** que supere los **$400.000 ARS**.
- ✅ **Margen de Ganancia:** Sistema de margen dinámico (actualmente 30%) configurable desde el panel admin que afecta a todo el catálogo.

---

## 4. Funcionalidades Clave

### 🛒 Experiencia de Compra
- **CartDrawer Premium:** Visualización de barras de progreso duales para peso y monto de envío gratis.
- **Filtros Avanzados:** Buscador inteligente y etiquetas de categorías.
- **Checkout Híbrido:** Generación de pedido formateado para envío por WhatsApp.

### 🤖 Inteligencia y Atención
- **Knowledge Base (KB):** Sistema de "memoria" del bot. Podés cargarle información de horarios, pagos y envíos para que la IA responda sola.
- **WhatsApp-Telegram Bridge:** Los mensajes que entran por WhatsApp se notifican en Telegram, donde el admin puede ver respuestas sugeridas por la IA.
- **AI Orchestrator:** Capacidad de analizar el catálogo para recomendar productos según la consulta del cliente.

### ⚙️ Administración y Seguridad
- **Admin Panel:** Gestión de márgenes, overrides de nombres/fotos y limpieza de caché.
- **Security Hardening:** Rate limiting (3 pedidos por 15min) y sanitización de prompts para evitar abusos.
- **Cloud Persistence:** Las órdenes no se pierden; se guardan en Supabase antes de notificarse.

---

## 5. Infraestructura y Despliegue
- **Almacenamiento:** Uso de Supabase Storage para fotos de productos (evita links rotos de Drive).
- **Servidor:** Configurado para **Vercel** (Serverless functions).
- **Variables de Entorno:** Centralizadas en un `.env` protegido.

---

## 🛣️ Próximos Pasos (Roadmap)
1. **Automatización de Seguimiento:** Integrar n8n para avisar al cliente por WhatsApp cuando su pedido cambie a "ENVIADO".
2. **Dashboard de Ventas:** Visualización de métricas mensuales en el panel admin.
3. **Optimización de SEO:** Finalizar meta-tags para posicionamiento en Google.

---
*Reporte generado por Antigravity AI Coding Assistant.*
