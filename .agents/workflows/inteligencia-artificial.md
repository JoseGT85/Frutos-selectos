---
description: Agente de Inteligencia Artificial — Orquestación, prompts y automatización inteligente de DIFRUMARKET
---

# 🤖 Agente de Inteligencia Artificial — DIFRUMARKET

Este agente se enfoca exclusivamente en las implementaciones de IA de la plataforma:
orquestación multi-modelo, optimización de prompts, análisis inteligente de conversaciones,
recomendaciones de productos y automatización con agentes.

---

## Arquitectura actual de IA

```
┌────────────────┐     ┌──────────────────────────────────────────┐
│  Chat Web      │────►│  callClaude() — directo a Anthropic API  │ ← ⚠️ desde el navegador
│  (frontend)    │     └──────────────────────────────────────────┘
│                │
│  Bot Telegram  │────►│  AIOrchestrator — `ai-orchestrator.js`    │
│  (backend)     │     │  Claude → Grok → Mistral → Ollama         │
└────────────────┘     └──────────────────────────────────────────┘
```

**Problema principal:** El chat web llama a Claude directamente desde el navegador.
El bot de Telegram tiene un orquestador multi-modelo que el frontend no aprovecha.

---

## Áreas de trabajo

### 1. Unificar la capa de IA (frontend + backend)
// turbo-all

**Estado actual:**
- `FrutosSelectos-Platform.jsx` → `callClaude()` directo a `api.anthropic.com` (inseguro)
- `index.js` → `AIOrchestrator` con fallback multi-modelo (robusto)

**Acción requerida:**
- [ ] Crear endpoint `POST /api/chat` en el backend Express
- [ ] El endpoint debe:
  1. Recibir `{ messages, context }` del frontend
  2. Usar el `AIOrchestrator` existente (misma lógica que Telegram)
  3. Inyectar la KB y el catálogo automáticamente
  4. Devolver `{ reply, agent, latency }`
- [ ] Actualizar `ChatFAB` en el frontend para usar `/api/chat` en vez de Claude directo
- [ ] Eliminar la función `callClaude()` del frontend
- [ ] Beneficio: el chat web obtiene fallback multi-modelo gratis

### 2. Optimización del System Prompt

**Archivos:** `FrutosSelectos-Platform.jsx` función `buildPrompt()`, y el equivalente en `ai-orchestrator.js`

**Estado actual del prompt:**
```
Sos el asistente virtual de {BUSINESS_NAME}...
━━ BASE DE CONOCIMIENTO ({N} entradas activas) ━━
{FAQ entries}
━━ CATÁLOGO ({N} productos) ━━
{product list}
REGLAS: No inventes precios...
```

**Mejoras propuestas:**
- [ ] Estructurar el prompt con secciones XML para mejor parsing del LLM:
  ```xml
  <identidad>Sos el asistente de Frutos Selectos DIFRUMARKET...</identidad>
  <reglas>
    - No inventar precios
    - Derivar pedidos a WhatsApp
    - Responder en español argentino
  </reglas>
  <base_de_conocimiento>...</base_de_conocimiento>
  <catalogo>...</catalogo>
  <contexto_conversacion>
    - Plataforma: {telegram|web}
    - Usuario: {nombre}
    - Hora: {timestamp}
  </contexto_conversacion>
  ```
- [ ] Agregar few-shot examples al prompt para mejorar el tono
- [ ] Implementar compresión del catálogo: solo enviar productos relevantes al contexto
- [ ] Diferenciar el prompt según la plataforma (web más visual, Telegram más conciso)

### 3. Recomendaciones inteligentes de productos

**Objetivo:** Cuando un usuario pregunta "¿qué me recomendás?" o "quiero algo para snack",
la IA debe poder filtrar y recomendar productos del catálogo de forma inteligente.

**Implementación propuesta:**
- [ ] Crear un módulo `src/services/recommendations.js`
- [ ] Implementar matching basado en keywords:
  - "snack" → Mezclas, Trail Mix
  - "saludable" → Semillas, Frutos Secos sin sal
  - "regalo" → Productos premium (Pistachos, Dátiles Medjool)
  - "receta" / "cocina" → Almendras, Nueces, Coco
- [ ] Agregar intención de recomendación al system prompt
- [ ] El AI debe responder con productos específicos del catálogo con precio

### 4. Análisis de conversaciones (analytics IA)

**Objetivo:** Dashboard en el admin que muestre insights de las conversaciones del bot.

**Implementación propuesta:**
- [ ] Crear endpoint `GET /api/admin/analytics` que analice los logs
- [ ] Métricas a extraer:
  - **Intenciones más comunes** (compra, precio, envío, horario)
  - **Productos más consultados**
  - **Tasa de conversión:** consulta → pedido por WhatsApp
  - **Sentimiento promedio** de las conversaciones
  - **Horarios pico** de consultas
- [ ] Agregar tab "📊 Analytics IA" en el panel admin
- [ ] Opcionalmente: usar el propio LLM para clasificar intenciones en batch

### 5. Detección de intención y respuesta contextual

**Archivos:** `ai-orchestrator.js`, nuevo módulo `intent-detector.js`

**Implementación propuesta:**
- [ ] Crear un clasificador de intenciones rápido (sin LLM) por keywords:
  ```js
  const INTENTS = {
    'buy':      ['comprar', 'quiero', 'pedido', 'necesito', 'dame'],
    'price':    ['precio', 'cuánto', 'cuesta', 'vale', 'sale'],
    'shipping': ['envío', 'mandan', 'llega', 'despacho', 'retiro'],
    'hours':    ['horario', 'atienden', 'abierto', 'cerrado'],
    'product':  ['tienen', 'hay', 'almendra', 'nuez', 'mix'],
  };
  ```
- [ ] Pre-procesar la intención ANTES de llamar al LLM
- [ ] Si la intención matchea una entrada de la KB con alta confianza → responder directo sin LLM (ahorra tokens y latencia)
- [ ] Si no hay match → delegar al LLM con la intención como metadata

### 6. Caché inteligente de respuestas

**Objetivo:** Reducir costos de API cacheando respuestas a preguntas frecuentes.

**Implementación propuesta:**
- [ ] Crear `response-cache.js` con TTL configurable
- [ ] Hash de la pregunta normalizada como key
- [ ] Si una pregunta es "similar" a una ya respondida → servir desde caché
- [ ] Implementar similaridad básica con Jaccard o Levenshtein
- [ ] Invalidar caché cuando se actualiza la KB
- [ ] Configurar TTL por categoría: precios (15min), horarios (24h), info general (1h)

### 7. Multi-modelo — Mejora del orquestador

**Archivo:** `ai-orchestrator.js` (referenciado en index.js pero no presente en el repo)

**Mejoras propuestas:**
- [ ] Implementar o verificar la cascada de fallback:
  ```
  1. Claude (Anthropic) — primario, mejor calidad
  2. Grok (xAI) — secundario, rápido
  3. Mistral 7B (Hugging Face) — fallback gratuito
  4. Ollama local — último recurso, sin internet
  ```
- [ ] Agregar health check periódico para cada modelo
- [ ] Circuit breaker: si un modelo falla 3 veces seguidas, desactivar por 5 minutos
- [ ] Logging de latencia y tokens por modelo para optimización de costos
- [ ] A/B testing: rotar modelos aleatoriamente para comparar calidad de respuestas

### 8. Generación automática de KB entries

**Objetivo:** Cuando el admin responde manualmente a una pregunta frecuente por Telegram,
ofrecerle agregar esa Q&A a la KB automáticamente.

**Implementación propuesta:**
- [ ] Detectar cuando un admin responde a una consulta de cliente reenviada
- [ ] El bot sugiere: "¿Querés agregar esta respuesta a la KB? /addkb"
- [ ] Si el admin confirma → crear entrada automática con:
  - `question`: el mensaje original del cliente
  - `answer`: la respuesta del admin
  - `triggers`: keywords extraídas automáticamente
  - `cat`: categoría inferida
- [ ] Sincronizar con el panel admin React

---

## Arquitectura objetivo

```
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND EXPRESS + TELEGRAF                      │
│                                                                    │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐ │
│  │ Intent      │───►│ Response     │───►│ AI Orchestrator      │ │
│  │ Detector    │    │ Cache        │    │ Claude→Grok→Mistral  │ │
│  └─────────────┘    └──────────────┘    └──────────────────────┘ │
│         ▲                                        │                │
│         │              ┌──────────────┐          │                │
│  ┌──────┴──────┐       │ KB Service   │◄─────────┘                │
│  │ POST /api/  │       │ + Embeddings │                           │
│  │ chat        │       └──────────────┘                           │
│  └─────────────┘                                                  │
│    ▲         ▲                                                    │
└────│─────────│────────────────────────────────────────────────────┘
     │         │
┌────┴───┐ ┌───┴──────┐
│  Chat  │ │ Telegram  │
│  Web   │ │ Bot       │
└────────┘ └──────────┘
```

---

## Prioridad de implementación

| Prioridad | Tarea | Impacto |
|-----------|-------|---------|
| 🔴 Alta | Unificar IA (endpoint /api/chat) | Seguridad + consistencia |
| 🔴 Alta | Optimizar system prompt | Calidad de respuestas |
| 🟠 Media | Detección de intención sin LLM | Ahorro de tokens 40-60% |
| 🟠 Media | Caché de respuestas | Reduce costos API |
| 🟡 Normal | Recomendaciones inteligentes | Conversión |
| 🟡 Normal | Analytics de conversaciones | Insights de negocio |
| 🟢 Baja | Auto-generación de KB | Productividad admin |
| 🟢 Baja | A/B testing de modelos | Optimización a largo plazo |
