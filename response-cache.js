// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Response Cache
//  Caché en memoria para respuestas del AI con TTL por categoría.
//  Reduce costos de API cacheando respuestas a preguntas frecuentes.
// ═══════════════════════════════════════════════════════════════════════════

// TTL por tipo de intención (en ms)
const TTL_BY_TYPE = {
  price:    15 * 60_000,   // 15 minutos (precios cambian)
  hours:    24 * 3600_000, // 24 horas
  shipping: 60 * 60_000,   // 1 hora
  payment:  60 * 60_000,   // 1 hora
  product:  30 * 60_000,   // 30 minutos
  greeting: 60 * 60_000,   // 1 hora
  help:     60 * 60_000,   // 1 hora
  default:  15 * 60_000,   // 15 minutos
};

const MAX_ENTRIES = 200;

function normalizeKey(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

class ResponseCache {
  #cache = new Map(); // key → { reply, expiresAt, type }

  /**
   * Busca una respuesta cacheada.
   * @param {string} query — Pregunta del usuario
   * @returns {string|null} — Respuesta cacheada o null
   */
  get(query) {
    const key = normalizeKey(query);
    if (!key) return null;

    const entry = this.#cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.#cache.delete(key);
      return null;
    }

    return entry.reply;
  }

  /**
   * Guarda una respuesta en el caché.
   * @param {string} query — Pregunta original
   * @param {string} reply — Respuesta del AI
   * @param {string} type — Tipo de intención (para determinar TTL)
   */
  set(query, reply, type = "default") {
    const key = normalizeKey(query);
    if (!key || !reply) return;

    // Evitar cachear respuestas de error
    if (reply.length < 10) return;

    const ttl = TTL_BY_TYPE[type] || TTL_BY_TYPE.default;

    // Limitar tamaño del caché
    if (this.#cache.size >= MAX_ENTRIES) {
      this.#evictExpired();
      // Si sigue lleno, eliminar el más viejo
      if (this.#cache.size >= MAX_ENTRIES) {
        const oldest = this.#cache.keys().next().value;
        this.#cache.delete(oldest);
      }
    }

    this.#cache.set(key, {
      reply,
      type,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  /**
   * Invalida todo el caché (usado cuando se actualiza la KB o el margen).
   */
  invalidate() {
    this.#cache.clear();
  }

  /**
   * Estadísticas del caché.
   */
  getStats() {
    this.#evictExpired();
    return {
      size:    this.#cache.size,
      maxSize: MAX_ENTRIES,
    };
  }

  #evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this.#cache) {
      if (now > entry.expiresAt) this.#cache.delete(key);
    }
  }
}

// Singleton
export const responseCache = new ResponseCache();
