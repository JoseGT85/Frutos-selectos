// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Security Middleware
//  Autenticación JWT, rate limiting por usuario, sanitización de inputs,
//  detección de prompt injection y logging de auditoría.
// ═══════════════════════════════════════════════════════════════════════════
import jwt       from "jsonwebtoken";
import fs        from "fs";
import path      from "path";

const JWT_SECRET  = process.env.JWT_SECRET || "CHANGE_ME_IN_PRODUCTION_min_32_chars!!";
const JWT_EXPIRES = "8h";
const isVercel = !!(process.env.VERCEL || process.env.NOW_REGION);
const LOG_DIR     = isVercel ? "/tmp/logs" : (process.env.LOG_DIR || "./logs");
const BANNED_IDS  = (process.env.BANNED_USER_IDS || "")
  .split(",").map(Number).filter(Boolean);

// Crear directorio de logs si no existe (en Vercel usa /tmp que sí es escribible)
try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  console.warn("[SECURITY] No se pudo crear directorio de logs:", LOG_DIR);
}

// ─── Patrones de prompt injection ────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(todo|todas)\s+(l[oa]s?\s+)?instrucciones/i,
  /you\s+are\s+now\s+/i,
  /ahora\s+sos\s+/i,
  /act\s+as\s+(a\s+)?/i,
  /actua\s+como\s+/i,
  /actuá\s+como\s+/i,
  /override\s+(system|prompt)/i,
  /system\s*prompt/i,
  /\bDAN\b.*mode/i,
  /jailbreak/i,
  /pretend\s+(you('re|\s+are)\s+|que\s+(sos|eres)\s+)/i,
  /reveal\s+(your\s+)?(system|instructions|prompt|api.?key)/i,
  /mostrá?\s+(tu[s]?\s+)?(instrucciones|prompt|clave|api)/i,
  /olvidate?\s+de\s+(todo|las\s+reglas)/i,
  /forget\s+(all|everything|your\s+rules)/i,
];

export class SecurityMiddleware {
  #rateLimits = new Map(); // userId -> { count, resetAt }

  // ─── Rate Limiting por usuario ────────────────────────────────────────────
  /**
   * Verifica si el usuario excedió el rate limit.
   * @param {number} userId - ID del usuario
   * @param {number} maxRequests - Máximo de requests permitidas
   * @param {number} windowMs - Ventana de tiempo en ms
   * @returns {boolean} true si el request es permitido, false si excedió
   */
  checkRateLimit(userId, maxRequests = 10, windowMs = 60_000) {
    const now = Date.now();
    const entry = this.#rateLimits.get(userId);

    if (!entry || now > entry.resetAt) {
      this.#rateLimits.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      this.log({
        event: "rate_limit_exceeded",
        userId,
        count: entry.count,
        limit: maxRequests,
      });
      return false;
    }

    return true;
  }

  // ─── Sanitización de input ─────────────────────────────────────────────────
  /**
   * Limpia el texto de entrada eliminando HTML, scripts y caracteres peligrosos.
   * @param {string} text - Texto crudo del usuario
   * @returns {string} Texto sanitizado
   */
  sanitize(text) {
    if (!text || typeof text !== "string") return "";

    return text
      // Eliminar tags HTML/XML
      .replace(/<[^>]*>/g, "")
      // Eliminar entidades HTML
      .replace(/&[a-z]+;/gi, "")
      // Eliminar caracteres de control (excepto newlines)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Eliminar secuencias de escape
      .replace(/\\[nrtbfv0]/g, " ")
      // Limitar longitud
      .slice(0, 2000)
      .trim();
  }

  // ─── Detección de prompt injection ─────────────────────────────────────────
  /**
   * Detecta intentos de prompt injection en el mensaje del usuario.
   * @param {string} text - Texto ya sanitizado
   * @returns {boolean} true si se detecta un intento de injection
   */
  detectPromptInjection(text) {
    if (!text) return false;
    const normalized = text.toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // quitar acentos para matching

    return INJECTION_PATTERNS.some(pattern => pattern.test(normalized));
  }

  // ─── Verificar si un usuario está baneado ──────────────────────────────────
  isBanned(userId) {
    return BANNED_IDS.includes(userId);
  }

  // ─── JWT — Generación ──────────────────────────────────────────────────────
  /**
   * Genera un token JWT para el admin.
   * @param {string} subject - Identificador del admin
   * @returns {string} Token JWT firmado
   */
  generateAdminToken(subject = "admin") {
    return jwt.sign(
      { sub: subject, role: "admin", iat: Date.now() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
  }

  // ─── JWT — Verificación ────────────────────────────────────────────────────
  /**
   * Verifica un token JWT.
   * @param {string} token - Token a verificar
   * @returns {Object|null} Payload decodificado o null si inválido
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }

  // ─── Express Middleware — requireAdmin ──────────────────────────────────────
  /**
   * Middleware de Express que requiere autenticación JWT de admin.
   * Busca el token en el header Authorization: Bearer <token>
   * @returns {Function} Express middleware
   */
  requireAdmin() {
    return (req, res, next) => {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({ ok: false, error: "Token requerido" });
      }

      const token = auth.slice(7);
      const payload = this.verifyToken(token);

      if (!payload) {
        this.log({ event: "auth_failed", ip: req.ip, path: req.path });
        return res.status(401).json({ ok: false, error: "Token inválido o expirado" });
      }

      req.admin = payload;
      next();
    };
  }

  // ─── Logging de auditoría ──────────────────────────────────────────────────
  /**
   * Escribe un evento de auditoría en el log diario (JSONL).
   * @param {Object} entry - Datos del evento
   */
  log(entry) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const logFile = path.join(LOG_DIR, `audit-${today}.jsonl`);
      const line = JSON.stringify({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      });
      fs.appendFileSync(logFile, line + "\n", "utf-8");
    } catch (err) {
      console.error("[SECURITY] Error escribiendo log:", err.message);
    }
  }

  // ─── Limpiar rate limits expirados (mantenimiento periódico) ────────────────
  cleanup() {
    const now = Date.now();
    for (const [key, val] of this.#rateLimits) {
      if (now > val.resetAt) this.#rateLimits.delete(key);
    }
  }
}
