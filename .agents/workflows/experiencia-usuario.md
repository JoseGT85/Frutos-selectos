---
description: Agente de Experiencia de Usuario (UX) — Mejora de la interfaz, accesibilidad y flujos de DIFRUMARKET
---

# 🎨 Agente de Experiencia de Usuario — DIFRUMARKET

Este agente se enfoca exclusivamente en mejorar la experiencia del usuario final
y del administrador en la plataforma DIFRUMARKET. Cubre UI, UX, accesibilidad,
rendimiento percibido y diseño responsive.

---

## Áreas de trabajo

### 1. Rendimiento percibido y carga inicial
// turbo-all

**Archivos:** `src/App.jsx`, `FrutosSelectos-Platform.jsx`, `src/components/LoadingScreen.jsx`

**Problemas detectados:**
- El catálogo tarda ~900ms artificiales en modo mock — puede generar frustración
- No hay skeleton loading real para las tarjetas de producto
- No hay indicador de progreso durante la sincronización con Google Sheets

**Mejoras propuestas:**
- [ ] Implementar skeleton screens reales con shimmer en `ProductCard`
- [ ] Agregar transición suave de skeleton → contenido real
- [ ] Mostrar indicador de fuente de datos ("📡 Cargando desde Google Sheets…")
- [ ] Pre-cargar la fuente Cormorant Garamond con `font-display: swap`
- [ ] Agregar `<link rel="preconnect">` para Google Fonts y Sheets

### 2. Diseño responsive y mobile-first

**Archivos:** `FrutosSelectos-Platform.jsx` (estilos inline), `src/index.css`

**Problemas detectados:**
- Los estilos inline dificultan el responsive design
- La tabla de precios en admin no es scrollable en mobile
- El drawer del carrito ocupa todo el ancho en pantallas pequeñas (correcto) pero no tiene gesture de swipe para cerrar
- El chat FAB puede tapar contenido en pantallas chicas
- Los botones de categoría se apilan mal en mobile

**Mejoras propuestas:**
- [ ] Agregar breakpoints con media queries en `index.css` para:
  - Grid de productos: 1 columna en <480px, 2 en <768px, 3+ en desktop
  - Navegación: hamburger menu en mobile
  - Tabla admin: scroll horizontal con indicador visual
- [ ] Implementar gesture de swipe-to-close en el CartDrawer
- [ ] El chat FAB debe tener z-index correcto y no tapar el botón de carrito
- [ ] Botones de categoría con scroll horizontal en mobile

### 3. Accesibilidad (a11y)

**Archivos:** Todos los componentes JSX

**Problemas detectados:**
- ❌ Faltan roles ARIA en elementos interactivos
- ❌ No hay `aria-label` en botones de íconos (carrito, cerrar, +/-)
- ❌ El contraste de texto en algunos labels es insuficiente (#3a3530 sobre #060606)
- ❌ No hay soporte para navegación por teclado (tab order, focus visible)
- ❌ El modal de login no atrapa el foco (focus trap)
- ❌ Las animaciones no respetan `prefers-reduced-motion`

**Mejoras propuestas:**
- [ ] Agregar `aria-label` a todos los botones con solo ícono
- [ ] Implementar focus trap en modales (Login, Cart)
- [ ] Agregar `role="dialog"` y `aria-modal="true"` a los overlays
- [ ] Respetar `prefers-reduced-motion` desactivando animaciones
- [ ] Mejorar contraste: subir colores de texto secundario a ratio 4.5:1 mínimo
- [ ] Agregar `skip-to-content` link oculto
- [ ] La tabla de productos necesita `scope="col"` en los headers

### 4. Flujo de checkout (carrito → WhatsApp)

**Archivos:** `CartDrawer.jsx` / componente CartDrawer en FrutosSelectos-Platform.jsx

**Problemas detectados:**
- No hay confirmación antes de enviar por WhatsApp
- No se puede editar la cantidad directamente (solo +/-)
- No hay opción de "vaciar carrito"
- El carrito se pierde al recargar la página

**Mejoras propuestas:**
- [ ] Persistir el carrito en `localStorage`
- [ ] Agregar input numérico editable para la cantidad
- [ ] Botón "Vaciar carrito" con confirmación
- [ ] Modal de confirmación antes del checkout con resumen
- [ ] Animación de "producto agregado" (badge bounce o toast)

### 5. Búsqueda y filtrado

**Archivos:** Componente Catalog en `FrutosSelectos-Platform.jsx`

**Mejoras propuestas:**
- [ ] Búsqueda con debounce (300ms) para evitar re-renders excesivos
- [ ] Highlight del texto que coincide con la búsqueda
- [ ] Filtrado combinado: categoría + texto + rango de precio
- [ ] Ordenamiento por precio (menor/mayor) o nombre
- [ ] Mensaje "Sin resultados" más útil: sugerir categorías o limpiar filtro

### 6. Micro-interacciones y feedback visual

**Mejoras propuestas:**
- [ ] Toast notifications para acciones (producto agregado, KB guardada, error)
- [ ] Animación de "número bouncing" en el badge del carrito al agregar
- [ ] Hover states más ricos en las tarjetas de producto
- [ ] Transición suave entre vista catálogo ↔ admin
- [ ] Indicador de scroll en contenedores con overflow

### 7. Chat IA — Experiencia conversacional

**Archivos:** Componente ChatFAB en `FrutosSelectos-Platform.jsx`

**Mejoras propuestas:**
- [ ] Botones de respuesta rápida (quick replies): "Ver catálogo", "Horarios", "Envíos"
- [ ] Indicador de "usuario está escribiendo" para mensajes largos del AI
- [ ] Soporte para markdown en las respuestas (negrita, listas)
- [ ] Timestamp en cada mensaje
- [ ] Botón de "nueva conversación" para resetear el historial
- [ ] El chat debe recordar la conversación al cerrarse y abrirse

---

## Métricas de éxito

| Métrica | Objetivo |
|---------|----------|
| Lighthouse Mobile Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Cumulative Layout Shift | < 0.1 |

---

## Prioridad de implementación

| Prioridad | Área | Impacto |
|-----------|------|---------|
| 🔴 Alta | Accesibilidad básica (ARIA, contraste) | Legal + usabilidad |
| 🔴 Alta | Responsive mobile | 60%+ del tráfico |
| 🟠 Media | Persistencia del carrito | Retención |
| 🟠 Media | Skeleton loading | Percepción de velocidad |
| 🟡 Normal | Micro-interacciones | Engagement |
| 🟢 Baja | Chat quick replies | Conversión IA |
