---
description: Agente de Seguridad — Auditoría y hardening de la plataforma DIFRUMARKET
---

# 🔒 Agente de Seguridad — DIFRUMARKET

Este agente se enfoca exclusivamente en la seguridad de toda la plataforma:
frontend (React/Vite), backend (Express + Telegraf), integración con APIs de IA,
y la gestión de credenciales/tokens.

---

## Alcance de auditoría

El agente debe revisar y corregir las siguientes áreas:

### 1. Credenciales hardcodeadas en el frontend
// turbo-all

**Archivo crítico:** `FrutosSelectos-Platform.jsx` línea ~21
```js
ADMIN_PASSWORD: "difru2025",  // ⚠️ CRÍTICO — visible en el bundle JS del navegador
```

**Acción requerida:**
- Eliminar la contraseña del código fuente del frontend
- Mover la autenticación admin 100% al backend (ya existe en `admin.js` con JWT)
- El frontend solo debe enviar la contraseña al endpoint `/api/admin/login` y recibir un JWT
- Nunca comparar contraseñas en el lado del cliente

### 2. API Keys expuestas en el frontend
**Archivo:** `FrutosSelectos-Platform.jsx` línea ~214
```js
// La función callClaude() hace fetch directo a api.anthropic.com desde el navegador
// Esto expone la API key de Anthropic en el network tab del navegador
```

**Acción requerida:**
- Crear un endpoint proxy en el backend: `POST /api/chat`
- El frontend envía el mensaje al backend, el backend llama a Claude
- La API key nunca sale del servidor

### 3. Google Sheets URL hardcodeada
**Archivo:** `FrutosSelectos-Platform.jsx` línea ~16
```js
SHEETS_URL: "https://docs.google.com/spreadsheets/u/7/d/e/2PACX-..."
```

**Acción requerida:**
- Mover a variable de entorno `VITE_SHEETS_URL`
- No incluir URLs reales en el código fuente público

### 4. Backend — Validaciones de seguridad

**Archivos a revisar:** `index.js`, `admin.js`, `kb.js`, `settings-service.js`

Verificar:
- [ ] Rate limiting adecuado por IP y por usuario (ya existe parcialmente)
- [ ] Validación y sanitización de inputs en todos los endpoints
- [ ] Protección CSRF en endpoints que mutan estado
- [ ] Headers de seguridad con Helmet (ya existe, verificar configuración)
- [ ] JWT_SECRET no sea el default del `.env.example`
- [ ] CORS restringido en producción (no `*`)
- [ ] Logs de auditoría no contengan datos sensibles
- [ ] El `ADMIN_PASSWORD` en `.env.example` tenga un placeholder claro

### 5. Bot de Telegram — Inyección de prompts

**Archivo:** `index.js` líneas 220-273

Verificar:
- [ ] `security.detectPromptInjection()` cubre los vectores principales
- [ ] `security.sanitize()` elimina HTML/scripts
- [ ] Los mensajes del usuario no se interpolen directamente en templates sin escapar
- [ ] Los admin IDs se validan correctamente (no permiten spoofeo)

### 6. Dependencias con vulnerabilidades conocidas

**Acción:**
```bash
npm audit
```
- Revisar y actualizar paquetes con CVEs conocidas
- Verificar que no se usen versiones obsoletas de Express, Telegraf, etc.

### 7. Almacenamiento local del frontend

**Archivos:** `FrutosSelectos-Platform.jsx` líneas 132-138
```js
window.storage.get("difrumarket:kb")
```

**Verificar:**
- La KB almacenada localmente no contenga datos sensibles del negocio
- El token JWT no se guarde en localStorage (vulnerable a XSS) — preferir memory o httpOnly cookies

---

## Checklist de entregables

Al finalizar, el agente debe producir:

1. **Reporte de vulnerabilidades** — Lista priorizada (Crítica/Alta/Media/Baja)
2. **Parches aplicados** — Cambios directos al código
3. **Recomendaciones pendientes** — Lo que requiere infraestructura (HTTPS, secrets manager, etc.)

---

## Prioridad de corrección

| Prioridad | Descripción | Ejemplo |
|-----------|-------------|---------|
| 🔴 Crítica | Explotable ahora, expone datos o acceso | Contraseña en el bundle JS |
| 🟠 Alta | Riesgo significativo | API keys expuestas al navegador |
| 🟡 Media | Debería corregirse antes de producción | CORS con `*` |
| 🟢 Baja | Mejora de hardening | CSP headers más estrictos |
