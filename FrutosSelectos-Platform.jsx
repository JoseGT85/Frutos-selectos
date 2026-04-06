import { useState, useEffect, useRef, useCallback } from "react";
import {
  ShoppingCart, X, Plus, Minus, Package, RefreshCw,
  MessageCircle, ChevronRight, Lock, TrendingUp,
  DollarSign, Eye, EyeOff, CheckCircle, AlertCircle,
  Send, Bot, Search, Activity, BookOpen, Edit3,
  Trash2, Save, PlusCircle, HelpCircle, Truck,
  CreditCard, Clock, Star, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Copy, FileText
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  // ⚠️ URLs y credenciales movidas a variables de entorno por seguridad
  SHEETS_URL: import.meta.env.VITE_SHEETS_URL || "https://docs.google.com/spreadsheets/u/0/d/e/2PACX-1vSG8HiC02weCi6VOkBZO_DvChdbviKFEeE2WCJEZ-9awel9e4BqFnuvT8iXdRXNMK6orDFk8eiVibmX/pubhtml?gid=0&single=true",
  MARGIN: Number(import.meta.env.VITE_MARGIN_DEFAULT) || 30,
  WHATSAPP: import.meta.env.VITE_WHATSAPP_NUMBER || "5491112345678",
  BUSINESS_NAME: import.meta.env.VITE_BUSINESS_NAME || "Frutos Selectos · DIFRUMARKET",
  // 🔒 La contraseña ya NO se guarda en el frontend.
  // La autenticación se hace 100% via JWT del backend.
  // Si el backend no está disponible, se usa este fallback temporal.
  ADMIN_PASSWORD: null, // Se valida solo contra el backend
  // Cuántos clicks en el logo activan el formulario de login
  LOGO_CLICKS_TO_LOGIN: 5,
  // URL del backend Node.js (bot Telegram + API KB)
  // En producción: configurar VITE_BACKEND_URL en .env
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "http://localhost:3000",
};

// ═══════════════════════════════════════════════════════════════
// KB CATEGORIES
// ═══════════════════════════════════════════════════════════════
const KB_CATS = [
  { id:"faq",      label:"Preguntas Frecuentes", icon:"❓", color:"#c9a84c" },
  { id:"shipping", label:"Envíos & Entrega",      icon:"🚚", color:"#7eb8f7" },
  { id:"payment",  label:"Medios de Pago",        icon:"💳", color:"#a8c9a8" },
  { id:"hours",    label:"Horarios & Contacto",   icon:"🕐", color:"#c9a47e" },
  { id:"products", label:"Info de Productos",     icon:"🌰", color:"#c97eb8" },
  { id:"custom",   label:"Respuestas Custom",      icon:"⭐", color:"#7ec9c9" },
  { id:"ai_rules", label:"Instrucciones IA",      icon:"🤖", color:"#9a84c9" },
];

const DEFAULT_KB = [
  { id:"kb1", cat:"faq",      active:true,  priority:1, triggers:"horario,cuándo,cuando,atienden", question:"¿Cuál es el horario de atención?", answer:"Atendemos Lunes a Viernes de 9 a 18hs y Sábados de 9 a 13hs. Fuera de ese horario podés dejar tu mensaje y te respondemos al siguiente día hábil." },
  { id:"kb2", cat:"shipping", active:true,  priority:1, triggers:"envío,envio,mandan,despacho,llega", question:"¿Hacen envíos a todo el país?", answer:"Sí, enviamos a todo el país con Andreani y OCA. El costo varía según destino y peso. Los envíos salen dentro de las 24-48hs de confirmado el pago." },
  { id:"kb3", cat:"shipping", active:true,  priority:2, triggers:"mínimo,minimo,pedido mínimo", question:"¿Hay pedido mínimo para envío?", answer:"El pedido mínimo para envíos es de $10.000. Para retiro en local no hay mínimo." },
  { id:"kb4", cat:"payment",  active:true,  priority:1, triggers:"pago,pagar,transferencia,mercadopago,tarjeta,cuotas", question:"¿Cómo puedo pagar?", answer:"Aceptamos transferencia bancaria, MercadoPago (débito, crédito y cuotas) y efectivo en retiros. Para tarjeta en cuotas el costo financiero corre por cuenta del cliente." },
  { id:"kb5", cat:"products", active:true,  priority:1, triggers:"vencimiento,vence,expira,duran,fecha", question:"¿Cuánto duran los productos?", answer:"Entre 6 y 12 meses dependiendo del producto. Se conservan mejor en lugar fresco y seco, idealmente en recipiente hermético." },
  { id:"kb6", cat:"faq",      active:true,  priority:2, triggers:"mayorista,por mayor,descuento,volumen", question:"¿Venden por mayor?", answer:"Sí! Precios mayoristas a partir de 3kg por producto. Consultanos por WhatsApp mencionando la cantidad que necesitás." },
  { id:"kb7", cat:"hours",    active:true,  priority:1, triggers:"local,retiro,dirección,donde,dónde,ubicados", question:"¿Dónde están y cómo retiro?", answer:"Estamos en Mendoza. Para coordinar retiro en local, consultanos la dirección exacta por WhatsApp." },
  { id:"kb8", cat:"faq",      active:true,  priority:3, triggers:"alérgeno,alergia,gluten,celiaco,celíaco", question:"¿Tienen productos para celíacos?", answer:"Muchos de nuestros productos son naturalmente libres de gluten, pero se procesan en instalaciones que también trabajan con cereales. Para alergias graves, consultanos el producto específico." },
  { id:"kb9", cat:"ai_rules", active:true,  priority:0, triggers:"", question:"Tono y estilo", answer:"Respondé siempre en español argentino (vos, che). Sé amable pero conciso (máx 3-4 líneas). Usá emojis con moderación. Para pedidos, siempre derivá a finalizar por WhatsApp. No inventes precios ni disponibilidades. Si no sabés algo, decilo honestamente." },
];

// ═══════════════════════════════════════════════════════════════
// FALLBACK PRODUCTS
// ═══════════════════════════════════════════════════════════════
const rawFallbackParams = [
  { id:1,  name:"Almendras Natural",    cost:2800, category:"Nueces",       unit:"500g", emoji:"🌰" },
  { id:2,  name:"Almendras Blanqueadas",cost:3200, category:"Nueces",       unit:"500g", emoji:"🌰" },
  { id:3,  name:"Nueces Mariposa",      cost:4500, category:"Nueces",       unit:"500g", emoji:"🥜" },
  { id:4,  name:"Pistachos Iraníes",    cost:5800, category:"Nueces",       unit:"250g", emoji:"🫘" },
  { id:5,  name:"Anacardos Natural",    cost:4200, category:"Nueces",       unit:"500g", emoji:"🌿" },
  { id:6,  name:"Maní Tostado Salado",  cost:800,  category:"Nueces",       unit:"500g", emoji:"🥜" },
  { id:7,  name:"Pecán Entero",         cost:6800, category:"Nueces",       unit:"500g", emoji:"🌰" },
  { id:8,  name:"Arándanos Secos",      cost:3500, category:"Frutas Secas", unit:"250g", emoji:"🫐" },
  { id:9,  name:"Dátiles Medjool",      cost:6800, category:"Frutas Secas", unit:"500g", emoji:"🟤" },
  { id:10, name:"Higos Secos Premium",  cost:2200, category:"Frutas Secas", unit:"500g", emoji:"🍂" },
  { id:11, name:"Pasas de Uva Rubias",  cost:1400, category:"Frutas Secas", unit:"500g", emoji:"🍇" },
  { id:12, name:"Damascos Secos",       cost:2800, category:"Frutas Secas", unit:"500g", emoji:"🍑" },
  { id:13, name:"Ciruela Sin Carozo",   cost:2600, category:"Frutas Secas", unit:"500g", emoji:"🍑" },
  { id:14, name:"Coco Rallado",         cost:1600, category:"Frutas Secas", unit:"500g", emoji:"🥥" },
  { id:15, name:"Mix Mediterráneo",     cost:3800, category:"Mezclas",      unit:"500g", emoji:"✨" },
  { id:16, name:"Trail Mix Energético", cost:2900, category:"Mezclas",      unit:"500g", emoji:"⚡" },
  { id:17, name:"Semillas de Chía",     cost:1200, category:"Semillas",     unit:"500g", emoji:"🌱" },
  { id:18, name:"Semillas de Lino",     cost:800,  category:"Semillas",     unit:"500g", emoji:"🌾" },
  { id:19, name:"Semillas de Girasol",  cost:600,  category:"Semillas",     unit:"500g", emoji:"🌻" },
  { id:20, name:"Granola Artesanal",    cost:2400, category:"Cereales",     unit:"500g", emoji:"🥣" },
];

function inferWeightAndType(unit, name) {
  let peso_kg = 1;
  let tipo_producto = "fraccionado";
  const u = (unit || "").toLowerCase();
  const n = (name || "").toLowerCase();
  let matchKg = u.match(/(\d+(?:[\.,]\d+)?)\s*kg/);
  if (matchKg) {
    peso_kg = parseFloat(matchKg[1].replace(',', '.'));
  } else {
    let matchG = u.match(/(\d+)\s*g/);
    if (matchG) {
      peso_kg = parseInt(matchG[1], 10) / 1000;
    }
  }
  if (u.includes("bulto") || n.includes("bulto") || peso_kg >= 10) {
    if (!matchKg && !matchG) peso_kg = 10;
    tipo_producto = "bulto_10kg";
  }
  return { peso_kg, tipo_producto };
}

const FALLBACK = rawFallbackParams.map(p => ({
  ...p,
  ...inferWeightAndType(p.unit, p.name)
}));

// ═══════════════════════════════════════════════════════════════
// SHEETS PARSER
// ═══════════════════════════════════════════════════════════════
function inferCat(name) {
  const n=(name||"").toLowerCase();
  if(/almedr|pecan|nuez|pistacho|anacardo|castaña|maní|macadam/i.test(n)) return {category:"Nueces",emoji:"🥜"};
  if(/arándano|dátil|higo|pasa|damasco|ciruela|coco|goji/i.test(n))       return {category:"Frutas Secas",emoji:"🍇"};
  if(/mix|mezcla|trail/i.test(n))                                           return {category:"Mezclas",emoji:"✨"};
  if(/semilla|girasol|lino|chía|sésamo|zapallo/i.test(n))                  return {category:"Semillas",emoji:"🌱"};
  if(/granola|avena|cereal/i.test(n))                                       return {category:"Cereales",emoji:"🥣"};
  return {category:"Otros",emoji:"🌿"};
}
async function fetchSheet() {
  try {
    const res = await fetch(CONFIG.SHEETS_URL);
    if (!res.ok) throw new Error("Error HTTP");
    const csvText = await res.text();
    
    // Helper para parsear CSV respetando comillas
    const parseCSV = (text) => {
      const rows = [];
      let currentRow = [];
      let inQuotes = false;
      let currentValue = "";
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (inQuotes) {
          if (char === '"' && nextChar === '"') { currentValue += '"'; i++; }
          else if (char === '"') inQuotes = false;
          else currentValue += char;
        } else {
          if (char === '"') inQuotes = true;
          else if (char === ',') { currentRow.push(currentValue); currentValue = ""; }
          else if (char === '\n' || char === '\r') {
            currentRow.push(currentValue);
            if (currentRow.length > 1 || currentRow[0] !== "") rows.push(currentRow);
            currentRow = []; currentValue = "";
            if (char === '\r' && nextChar === '\n') i++;
          } else currentValue += char;
        }
      }
      if (currentValue || currentRow.length > 0) { currentRow.push(currentValue); rows.push(currentRow); }
      return rows;
    };

    const rows = parseCSV(csvText);

    // Detectar estructura: buscar fila con "REMITO" y la sub-fila con "BULTO"
    let nc = 0, presCol = 1, bultoCol = -1, kgCol = -1;
    let foundHeader = false;

    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].map(c => c.toLowerCase().trim());
      const remitoIdx = cells.findIndex(c => c.includes("remito"));
      if (remitoIdx > -1) {
        nc = cells.findIndex(c => /producto|artículo|descripción|nombre/.test(c));
        if (nc === -1) nc = 0;
        presCol = cells.findIndex(c => /presentac/.test(c));
        if (presCol === -1) presCol = 1;

        // Sub-fila con KG y BULTO
        if (i + 1 < rows.length) {
          const sub = rows[i + 1].map(c => c.toLowerCase().trim());
          for (let j = remitoIdx; j < Math.min(remitoIdx + 3, sub.length); j++) {
            if (sub[j].includes("bulto")) bultoCol = j;
            if (sub[j] === "kg") kgCol = j;
          }
        }
        if (bultoCol === -1) bultoCol = remitoIdx + 1;
        if (kgCol === -1) kgCol = remitoIdx;
        foundHeader = true;
        break;
      }
    }

    if (!foundHeader) return { products: FALLBACK, source: "fallback" };

    const products = [];
    let pid = 0;
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i];
      if (!cells || cells.length < 2) continue;
      const cell0 = (cells[0] || "").trim();
      // Saltar headers/sub-headers
      if (cell0.toLowerCase().includes("producto") && (cells[1]||"").toLowerCase().includes("presentac")) continue;
      if (!cell0) {
        const c3 = (cells[3]||"").toLowerCase().trim();
        if (c3 === "kg" || c3.includes("unidad")) continue;
      }
      // Detectar secciones (sin precio BULTO)
      const bultoRaw = (cells[bultoCol] || "").trim();
      if (cell0 && !bultoRaw && cell0.length > 3) continue;

      const name = cells[nc]?.trim();
      if (!name || name.length < 2) continue;
      if (/^(mix .+\(|recetas sujetas)/i.test(name) && !bultoRaw) continue;

      const raw = bultoRaw.replace(/[^0-9,.]/g, "").replace(/\./g, "").replace(",", ".");
      const cost = parseFloat(raw);
      if (isNaN(cost) || cost <= 0) continue;

      const unit = cells[presCol]?.trim() || "Bulto";
      const { category, emoji } = inferCat(name);
      const { peso_kg, tipo_producto } = inferWeightAndType(unit, name);
      pid++;
      products.push({ id: pid, name, cost, category, unit, emoji, peso_kg, tipo_producto });
    }
    return products.length > 3 ? { products, source: "sheets" } : { products: FALLBACK, source: "fallback" };
  } catch (err) {
    console.error("Error fetching CSV:", err);
    return { products: FALLBACK, source: "fallback" };
  }
}

// ═══════════════════════════════════════════════════════════════
// BACKEND CATALOG FETCH — Fuente primaria (incluye name overrides, imágenes, etc)
// ═══════════════════════════════════════════════════════════════
async function fetchCatalog() {
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/catalog`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();
    if (!Array.isArray(products) || products.length < 3) {
      throw new Error("Catálogo vacío o inválido");
    }
    return { products, source: "backend", fromBackend: true };
  } catch (err) {
    console.warn("[Catalog] Backend no disponible, usando Sheets directo:", err.message);
    return null; // null = usar fallback a fetchSheet()
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
const sale=(cost,m=CONFIG.MARGIN)=>Math.round(cost*(1+m/100));
const fmt=n=>"$"+Math.round(n).toLocaleString("es-AR",{minimumFractionDigits:0});
const uid=()=>"kb"+Math.random().toString(36).slice(2,9);

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════
async function loadKB(){
  try{ const r=await window.storage.get("difrumarket:kb"); if(r?.value) return JSON.parse(r.value); }catch{}
  return DEFAULT_KB;
}
async function saveKB(e){
  try{ await window.storage.set("difrumarket:kb",JSON.stringify(e)); }catch{}
}

// ═══════════════════════════════════════════════════════════════
// BACKEND SYNC — KB y Margen hacia el bot de Telegram
// ═══════════════════════════════════════════════════════════════

// Sincroniza la KB completa al backend con debounce de 1.2s
const _kbSyncTimerRef = { current: null };
async function syncKBToBackend(entries, token, onStatus) {
  if (_kbSyncTimerRef.current) clearTimeout(_kbSyncTimerRef.current);
  _kbSyncTimerRef.current = setTimeout(async () => {
    onStatus({ syncing: true, error: null });
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/api/kb`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      onStatus({ syncing: false, error: null, lastSync: new Date().toISOString(), count: data.count });
    } catch (e) {
      // No es fatal — la KB ya se guardó en window.storage localmente
      onStatus({ syncing: false, error: e.message });
    }
  }, 1200);
}

// Sincroniza el margen al backend (sin debounce — se llama al soltar el slider)
async function syncMarginToBackend(margin, token, onStatus) {
  onStatus({ syncing: true, error: null });
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/admin/margin`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ margin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    onStatus({ syncing: false, error: null, lastSync: new Date().toISOString() });
  } catch (e) {
    onStatus({ syncing: false, error: e.message });
  }
}

// ═══════════════════════════════════════════════════════════════
// CLAUDE API — system prompt enriquecido por KB
// ═══════════════════════════════════════════════════════════════
function buildPrompt(products,kb){
  const active=[...kb].filter(e=>e.active).sort((a,b)=>a.priority-b.priority);
  const rules=active.filter(e=>e.cat==="ai_rules").map(e=>e.answer).join("\n");
  const entries=active.filter(e=>e.cat!=="ai_rules")
    .map(e=>{const t=e.triggers?` [clave: ${e.triggers}]`:"";return `P: ${e.question}${t}\nR: ${e.answer}`;}).join("\n\n");
  return `Sos el asistente virtual de ${CONFIG.BUSINESS_NAME}, frutos secos premium en Mendoza, Argentina.
${rules||"Respondé en español argentino. Sé amable y conciso. Para pedidos derivar a WhatsApp."}

━━ BASE DE CONOCIMIENTO (${active.filter(e=>e.cat!=="ai_rules").length} entradas activas) ━━
${entries||"Sin entradas cargadas."}

━━ CATÁLOGO (${products.length} productos) ━━
${products.slice(0,30).map(p=>`• ${p.name} (${p.unit}) → ${fmt(sale(p.cost))}`).join("\n")}

REGLAS: No inventes precios fuera del catálogo. Para pedidos siempre indicar WhatsApp. Usá la base de conocimiento para responder FAQs.`.trim();
}
// 🔒 PROXY — las llamadas a IA pasan por el backend (API keys seguras)
async function callAI(messages, products, kb) {
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/admin/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        context: { platform: "web", userName: "cliente" },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.reply || "No pude procesar tu consulta. Intentá de nuevo.";
  } catch (err) {
    console.warn("[Chat] Backend no disponible, usando fallback:", err.message);
    // Fallback: construir respuesta básica sin LLM
    return "Disculpá, no puedo conectarme al asistente en este momento. " +
           `Consultanos directo por WhatsApp al +${CONFIG.WHATSAPP}. 🌰`;
  }
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const S=`
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@200;300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#060606;color:#e8e0d0;font-family:'Jost',sans-serif;-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#0f0f0f}::-webkit-scrollbar-thumb{background:#2a2010;border-radius:2px}
  .serif{font-family:'Cormorant Garamond',serif!important}
  @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes slideIn{from{transform:translateX(110%)}to{transform:translateX(0)}}
  @keyframes slideUp{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes pulseG{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.3)}50%{box-shadow:0 0 0 10px rgba(201,168,76,0)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  @keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}
  @keyframes loginShake{
    10%,90%{transform:translateX(-3px)}
    20%,80%{transform:translateX(5px)}
    30%,50%,70%{transform:translateX(-6px)}
    40%,60%{transform:translateX(6px)}
    100%{transform:translateX(0)}
  }
  .anim{animation:fadeUp 0.5s ease both}
  .card{transition:transform 0.3s,box-shadow 0.3s,border-color 0.3s}
  .card:hover{transform:translateY(-6px);box-shadow:0 28px 56px rgba(0,0,0,0.6);border-color:rgba(201,168,76,0.2)!important}
  .gold{background:linear-gradient(135deg,#c9a84c,#dbbe6a);color:#060606;font-family:'Jost',sans-serif;font-weight:600;letter-spacing:0.1em;font-size:0.68rem;text-transform:uppercase;border:none;cursor:pointer;transition:all 0.2s}
  .gold:hover{filter:brightness(1.12);transform:translateY(-1px)}.gold:active{transform:none}.gold:disabled{opacity:0.3;cursor:not-allowed;transform:none;filter:none}
  .glass{background:rgba(255,255,255,0.022);border:1px solid rgba(255,255,255,0.05)}
  .pill{background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.18);color:#c9a84c;font-size:0.53rem;letter-spacing:0.2em;text-transform:uppercase;padding:3px 9px;border-radius:20px;font-family:'Jost',sans-serif;white-space:nowrap}
  input[type='range']{-webkit-appearance:none;width:100%;height:2px;background:linear-gradient(to right,#c9a84c var(--pct,30%),#1a1a1a var(--pct,30%));border-radius:2px;cursor:pointer;outline:none}
  input[type='range']::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;background:#c9a84c;border-radius:50%;cursor:pointer;animation:pulseG 2.5s infinite}
  .nav{background:none;border:none;cursor:pointer;font-family:'Jost',sans-serif;font-weight:300;font-size:0.68rem;letter-spacing:0.24em;text-transform:uppercase;transition:color 0.2s}
  .qb{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#aaa;width:28px;height:28px;border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s}
  .qb:hover{border-color:rgba(201,168,76,0.4);background:rgba(201,168,76,0.08);color:#c9a84c}
  tr.rh{transition:background 0.15s}tr.rh:hover{background:rgba(201,168,76,0.04)!important}
  .ci{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:3px;color:#e8e0d0;font-family:'Jost',sans-serif;font-size:0.82rem;padding:10px 14px;outline:none;width:100%;transition:border-color 0.2s;resize:none}
  .ci:focus{border-color:rgba(201,168,76,0.35)}.ci::placeholder{color:#444}
  .si{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:2px;color:#e8e0d0;font-family:'Jost',sans-serif;font-size:0.78rem;padding:9px 14px 9px 38px;outline:none;width:100%;transition:border-color 0.2s}
  .si:focus{border-color:rgba(201,168,76,0.3)}.si::placeholder{color:#3a3530}
  .fi{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:2px;color:#e8e0d0;font-family:'Jost',sans-serif;font-size:0.8rem;padding:9px 13px;outline:none;width:100%;transition:border-color 0.2s;resize:vertical}
  .fi:focus{border-color:rgba(201,168,76,0.4)}.fi::placeholder{color:#2a2520}
  .sk{background:linear-gradient(90deg,#111 25%,#1a1a1a 50%,#111 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:2px}
  .tab{background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:'Jost',sans-serif;font-size:0.62rem;letter-spacing:0.18em;text-transform:uppercase;padding:12px 20px;transition:all 0.2s;white-space:nowrap;color:#555}
  .tab.on{color:#c9a84c;border-bottom-color:#c9a84c}.tab:hover:not(.on){color:#888}
  .tog{width:38px;height:20px;border-radius:10px;border:none;cursor:pointer;transition:background 0.25s;position:relative;flex-shrink:0}
  .tog::after{content:'';position:absolute;top:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left 0.25s}
`;

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [products,setProducts]=useState([]);
  const [src,setSrc]=useState(null);
  const [margin,setMargin]=useState(CONFIG.MARGIN);
  const [cart,setCart]=useState([]);
  const [cartOpen,setCartOpen]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [view,setView]=useState("catalog");
  const [tab,setTab]=useState("kb");
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [syncOk,setSyncOk]=useState(null);
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState("Todos");
  const [tipoFiltro,setTipoFiltro]=useState("Todos");
  const [kb,setKb]=useState([]);
  const [kbReady,setKbReady]=useState(false);

  // ── Auth admin ─────────────────────────────────────────────────
  const [adminAuth,setAdminAuth]   = useState(false);
  const [adminToken,setAdminToken] = useState(null);  // JWT del backend
  const [showLogin,setShowLogin]   = useState(false);
  const [logoClicks,setLogoClicks] = useState(0);
  const logoTimerRef = useRef(null);

  // ── Sync status — KB y Margen ──────────────────────────────────
  const [kbSync,setKbSync]         = useState({ syncing:false, error:null, lastSync:null });
  const [marginSync,setMarginSync] = useState({ syncing:false, error:null, lastSync:null });

  // Limpieza del timer al desmontar
  useEffect(() => () => { if(logoTimerRef.current) clearTimeout(logoTimerRef.current); }, []);

  // 5 clicks en el logo → mostrar login
  const handleLogoClick=()=>{
    const next=logoClicks+1;
    setLogoClicks(next);
    if(logoTimerRef.current) clearTimeout(logoTimerRef.current);
    logoTimerRef.current=setTimeout(()=>setLogoClicks(0),2000);
    if(next>=CONFIG.LOGO_CLICKS_TO_LOGIN){
      setLogoClicks(0);
      if(adminAuth) { setView("admin"); }
      else          { setShowLogin(true); }
    }
  };

  // 🔒 Login: autenticación 100% vía backend (JWT)
  // La contraseña NUNCA se compara en el frontend.
  const handleLogin = async (password) => {
    if (!password) { setShowLogin(false); return; }

    // Enviar al backend — la validación se hace del lado del servidor
    let token = null;
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.status === 401) return "wrong"; // contraseña incorrecta
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      token = data.token || null;
    } catch (err) {
      // Backend no disponible
      console.warn("[Auth] Backend no disponible:", err.message);
      // Sin backend, no hay forma segura de autenticar
      return "wrong";
    }

    if (!token) return "wrong";

    setAdminToken(token);
    setAdminAuth(true);
    setShowLogin(false);
    setView("admin");
    return "ok";
  };

  const handleLogout=()=>{
    setAdminAuth(false); setAdminToken(null);
    setView("catalog"); setLogoClicks(0);
  };

  // Si alguien llega al admin sin auth (navegación manual), redirigir
  useEffect(()=>{ if(view==="admin"&&!adminAuth) setView("catalog"); },[view,adminAuth]);

  useEffect(()=>{
    doSync();
    loadKB().then(e=>{setKb(e);setKbReady(true);});
  },[]);

  const doSync = async () => {
    setSyncing(true);
    setSyncOk(null);
    try {
      // Intentar notificar al backend para que limpie su cache si somos admin
      if (adminAuth && adminToken) {
        try {
          await fetch(`${CONFIG.BACKEND_URL}/api/admin/catalog/sync`, {
            method: "POST",
            headers: { 
              "Authorization": `Bearer ${adminToken}`,
              "Content-Type": "application/json"
            }
          });
        } catch (e) {
          console.warn("[Sync] No se pudo notificar al backend:", e.message);
        }
      }

      // Intentar primero desde el backend (tiene name overrides, imágenes, etc)
      let result = await fetchCatalog();
      if (!result) {
        // Fallback: fetch directo a Google Sheets (sin enrichment)
        result = await fetchSheet();
      }
      
      setProducts(result.products);
      setSrc(result.source);
      setSyncOk(true);
    } catch (err) {
      console.error("[Sync] Error:", err.message);
      setSyncOk(false);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  // KB — guarda localmente Y sincroniza al backend
  const updateKb=useCallback(entries=>{
    setKb(entries);
    saveKB(entries);
    syncKBToBackend(entries, adminToken, setKbSync);
  },[adminToken]);

  // Margen — actualiza estado local; sincroniza al backend solo al soltar (shouldSync=true)
  const handleMarginChange=useCallback((newMargin, shouldSync=false)=>{
    setMargin(newMargin);
    if(shouldSync) syncMarginToBackend(newMargin, adminToken, setMarginSync);
  },[adminToken]);

  const addToCart=useCallback(p=>setCart(prev=>{const f=prev.find(i=>i.id===p.id);if(f)return prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i);return[...prev,{...p,qty:1}];}),[]);
  const updateQty=useCallback((id,d)=>setCart(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0)),[]);
  const removeItem=useCallback(id=>setCart(p=>p.filter(i=>i.id!==id)),[]);
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal=cart.reduce((s,i)=>s+(i.salePrice||sale(i.cost,margin))*i.qty,0);

  const openWA=(shippingStatus = "", totalKg = 0, clientData = null)=>{
    const lines=cart.map(i=>`• ${i.name} (${i.unit}) ×${i.qty}  →  ${fmt((i.salePrice||sale(i.cost,margin))*i.qty)}`);
    const statusBox = clientData ? [
      "",
      `👤 *Cliente:* ${clientData.name} ${clientData.lastname}`,
      `📞 *Tel:* ${clientData.phone}`,
      `📍 *Envío:* ${clientData.address}`,
      `📄 *CUIT/CUIL:* ${clientData.cuit}`,
      `⚖️ *Peso Total:* ${totalKg.toFixed(2)} kg`,
      `🚚 *Estado Envío:* ${shippingStatus}`
    ] : ["","Confirmar disponibilidad y coordinar entrega. ¡Gracias! 🙌"];
    
    const msg=[`🌰 *Pedido — ${CONFIG.BUSINESS_NAME}*`,"━━━━━━━━━━━━━━━━━━━━━━━",...lines,"━━━━━━━━━━━━━━━━━━━━━━━",`💰 *Total: ${fmt(cartTotal)}*`, ...statusBox].join("\n");
    window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  const cats=["Todos",...Array.from(new Set(products.map(p=>p.category)))];
  const shown=products.filter(p=>{
    const matchCat = (cat==="Todos"||p.category===cat);
    const matchTipo = (tipoFiltro==="Todos" || (tipoFiltro==="Bultos (10 kg)" && p.tipo_producto==="bulto_10kg") || (tipoFiltro==="Fraccionados" && p.tipo_producto==="fraccionado"));
    const matchSearch = (!search||p.name.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchTipo && matchSearch;
  });
  const cMap=cart.reduce((a,i)=>({...a,[i.id]:i.qty}),{});

  return (
    <>
      <style>{S}</style>
      <div style={{background:"#c9a84c",color:"#060606",textAlign:"center",padding:"8px",fontSize:"0.62rem",letterSpacing:"0.12em",fontWeight:600,textTransform:"uppercase"}}>📦 Envío gratis en tu primer pedido desde 10 kg (podés combinar productos)</div>
      <div style={{minHeight:"100vh",background:"#060606"}}>
        <Nav view={view} setView={setView} cartCount={cartCount}
          onCart={()=>setCartOpen(true)} syncing={syncing} src={src}
          adminAuth={adminAuth} onLogoClick={handleLogoClick}
          onLogout={handleLogout}/>

        {view==="catalog"
          ?<Catalog products={shown} all={products} cats={cats} cat={cat} setCat={setCat} tipoFiltro={tipoFiltro} setTipoFiltro={setTipoFiltro} search={search} setSearch={setSearch} margin={margin} loading={loading} addToCart={addToCart} cMap={cMap}/>
          : adminAuth
            ?<Admin products={products} margin={margin} setMargin={handleMarginChange}
                syncing={syncing} syncOk={syncOk} src={src} onSync={doSync}
                kb={kb} onKb={updateKb} kbReady={kbReady} tab={tab} setTab={setTab}
                kbSync={kbSync} marginSync={marginSync} adminToken={adminToken}/>
            :null
        }
      </div>

      <ChatFAB open={chatOpen} setOpen={setChatOpen} products={products} kb={kb}/>

      {cartOpen&&<CartDrawer cart={cart} margin={margin} total={cartTotal} count={cartCount} updateQty={updateQty} remove={removeItem} onClose={()=>setCartOpen(false)} onWA={openWA}/>}

      {showLogin&&<AdminLoginModal onResult={handleLogin}/>}
    </>
  );
}

// ── NAV ──────────────────────────────────────────────────────────
function Nav({view,setView,cartCount,onCart,syncing,src,adminAuth,onLogoClick,onLogout}){
  return(
    <header style={{position:"sticky",top:0,zIndex:50,background:"rgba(6,6,6,0.94)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(255,255,255,0.045)"}}>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"0 28px",height:70,display:"flex",alignItems:"center",justifyContent:"space-between"}}>

        {/* Logo — clicable secretamente para el admin */}
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div onClick={onLogoClick} style={{cursor:"default",userSelect:"none"}}>
            <h1 className="serif" style={{fontSize:"1.45rem",fontWeight:300,letterSpacing:"0.14em",color:"#e8e0d0"}}>
              FRUTOS <span style={{color:"#c9a84c",fontStyle:"italic"}}>Selectos</span>
            </h1>
            <p style={{fontSize:"0.5rem",letterSpacing:"0.36em",color:"#444",textTransform:"uppercase",marginTop:2}}>
              DIFRUMARKET · Mendoza
            </p>
          </div>
          {src&&(
            <span style={{fontSize:"0.46rem",letterSpacing:"0.16em",padding:"3px 8px",borderRadius:20,textTransform:"uppercase",
              background:(src==="sheets"||src==="backend")?"rgba(100,200,100,0.08)":"rgba(200,150,50,0.08)",
              border:`1px solid ${(src==="sheets"||src==="backend")?"rgba(100,200,100,0.2)":"rgba(200,150,50,0.2)"}`,
              color:(src==="sheets"||src==="backend")?"#6acc6a":"#c9a84c"}}>
              {(src==="sheets"||src==="backend")?"📡 Live":"📦 Offline"}
            </span>
          )}
        </div>

        {/* Nav — sin botón admin visible */}
        <nav style={{display:"flex",alignItems:"center",gap:20}}>

          {/* Si está logueado como admin: mostrar tabs de navegación + logout */}
          {adminAuth&&(
            <>
              <button className="nav" onClick={()=>setView("catalog")}
                style={{color:view==="catalog"?"#c9a84c":"#555"}}>
                Catálogo
              </button>
              <button className="nav" onClick={()=>setView("admin")}
                style={{color:view==="admin"?"#c9a84c":"#555",fontSize:"0.62rem"}}>
                ⚙ Admin
              </button>
              {/* Indicador de sesión admin */}
              <span style={{display:"flex",alignItems:"center",gap:6,
                fontSize:"0.5rem",letterSpacing:"0.16em",textTransform:"uppercase",
                color:"#4a6640",padding:"3px 9px",borderRadius:20,
                background:"rgba(100,180,80,0.07)",border:"1px solid rgba(100,180,80,0.15)"}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:"#6acc6a",display:"inline-block"}}/>
                Admin
              </span>
              <button onClick={onLogout}
                style={{background:"none",border:"none",cursor:"pointer",
                  color:"#3a3530",fontSize:"0.58rem",letterSpacing:"0.12em",
                  textTransform:"uppercase",fontFamily:"Jost,sans-serif",
                  transition:"color 0.2s",padding:"4px 0"}}
                onMouseEnter={e=>e.currentTarget.style.color="#c97a7a"}
                onMouseLeave={e=>e.currentTarget.style.color="#3a3530"}>
                Salir
              </button>
            </>
          )}

          {/* Solo catálogo visible para usuarios normales */}
          {!adminAuth&&(
            <button className="nav" onClick={()=>setView("catalog")}
              style={{color:"#c9a84c",opacity:view==="catalog"?1:0.6}}>
              Catálogo
            </button>
          )}

          {/* Carrito — siempre visible */}
          <button onClick={onCart}
            style={{background:"none",border:"1px solid rgba(201,168,76,0.25)",
              padding:"8px 14px",borderRadius:2,cursor:"pointer",color:"#c9a84c",
              display:"flex",alignItems:"center",gap:8,position:"relative",
              transition:"all 0.2s",fontFamily:"Jost,sans-serif"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(201,168,76,0.07)";e.currentTarget.style.borderColor="rgba(201,168,76,0.5)"}}
            onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor="rgba(201,168,76,0.25)"}}>
            <ShoppingCart size={15}/>
            <span style={{fontSize:"0.68rem",letterSpacing:"0.08em"}}>Carrito</span>
            {cartCount>0&&(
              <span style={{position:"absolute",top:-8,right:-8,background:"#c9a84c",color:"#060606",
                borderRadius:"50%",width:20,height:20,fontSize:"0.62rem",fontWeight:700,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {cartCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

// ── CATALOG ──────────────────────────────────────────────────────
function Catalog({products,all,cats,cat,setCat,tipoFiltro,setTipoFiltro,search,setSearch,margin,loading,addToCart,cMap}){
  if(loading) return <LoadingScreen/>;
  return(
    <main style={{maxWidth:1280,margin:"0 auto",padding:"64px 28px 100px"}}>
      <div className="anim" style={{textAlign:"center",marginBottom:64}}>
        <p style={{fontSize:"0.58rem",letterSpacing:"0.45em",color:"#444",textTransform:"uppercase",marginBottom:18}}>Selección Curada · {all.length} productos</p>
        <h2 className="serif" style={{fontSize:"clamp(2.2rem,5vw,3.6rem)",fontWeight:300,lineHeight:1.08,color:"#e8e0d0"}}>La naturaleza en su forma más <em style={{color:"#c9a84c"}}>pura</em></h2>
        <div style={{width:40,height:1,background:"linear-gradient(90deg,transparent,#c9a84c,transparent)",margin:"24px auto 0"}}/>
      </div>
      <div className="anim" style={{display:"flex",gap:14,marginBottom:36,flexWrap:"wrap",alignItems:"center",animationDelay:"80ms"}}>
        <div style={{position:"relative",flex:"1 1 260px"}}>
          <Search size={14} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#444"}}/>
          <input className="si" type="text" placeholder="Buscar producto…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",border:`1px solid ${cat===c?"#c9a84c":"rgba(255,255,255,0.06)"}`,background:cat===c?"rgba(201,168,76,0.1)":"none",color:cat===c?"#c9a84c":"#555",fontSize:"0.62rem",letterSpacing:"0.12em",fontFamily:"Jost,sans-serif",textTransform:"uppercase",transition:"all 0.18s"}}>{c}</button>
          ))}
        </div>
        <div style={{width:1,height:24,background:"rgba(255,255,255,0.1)",margin:"0 4px"}}/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["Todos", "Bultos (10 kg)", "Fraccionados"].map(c=>(
            <button key={c} onClick={()=>setTipoFiltro(c)} style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",border:`1px solid ${tipoFiltro===c?"#6acc6a":"rgba(255,255,255,0.06)"}`,background:tipoFiltro===c?"rgba(100,204,106,0.1)":"none",color:tipoFiltro===c?"#6acc6a":"#555",fontSize:"0.62rem",letterSpacing:"0.12em",fontFamily:"Jost,sans-serif",textTransform:"uppercase",transition:"all 0.18s"}}>{c}</button>
          ))}
        </div>
      </div>
      {products.length===0
        ?<div style={{textAlign:"center",padding:"80px 0",color:"#333"}}><Package size={36} style={{margin:"0 auto 14px",display:"block"}}/><p style={{fontSize:"0.8rem",letterSpacing:"0.1em"}}>Sin resultados</p></div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))",gap:20}}>
          {products.map((p,i)=><ProductCard key={p.id} p={p} margin={margin} inCart={cMap[p.id]||0} onAdd={()=>addToCart(p)} delay={Math.min(i,12)*55}/>)}
        </div>
      }
    </main>
  );
}

function ProductCard({p,margin,inCart,onAdd,delay}){
  const price=p.salePrice||sale(p.cost,margin);
  const bgs={"Nueces":"linear-gradient(135deg,#1c1508,#0e0b04)","Frutas Secas":"linear-gradient(135deg,#150a0a,#0a0505)","Mezclas":"linear-gradient(135deg,#0a0f14,#060a0d)","Semillas":"linear-gradient(135deg,#0d1308,#060a04)","Cereales":"linear-gradient(135deg,#140f08,#0a0804)"};
  return(
    <div className="card glass anim" style={{borderRadius:3,overflow:"hidden",animationDelay:`${delay}ms`}}>
      <div style={{height:200,background:bgs[p.category]||"linear-gradient(135deg,#111,#080808)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 40% 45%,rgba(201,168,76,0.07),transparent 65%)"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(201,168,76,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.025) 1px,transparent 1px)",backgroundSize:"32px 32px"}}/>
        {p.imageUrl
          ? <img src={p.imageUrl} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="block";}}/>
          : null
        }
        <span style={{fontSize:"3.6rem",position:"relative",filter:"drop-shadow(0 4px 16px rgba(0,0,0,0.7))",display:p.imageUrl?"none":"block"}}>{p.emoji}</span>
        <span className="pill" style={{position:"absolute",top:12,right:12}}>{p.category}</span>
        {inCart>0&&<div style={{position:"absolute",top:12,left:12,background:"#c9a84c",color:"#060606",borderRadius:"50%",width:22,height:22,fontSize:"0.65rem",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{inCart}</div>}
      </div>
      <div style={{padding:"18px 20px 22px"}}>
        <h3 className="serif" style={{fontSize:"1.08rem",fontWeight:400,color:"#e0d8c8",marginBottom:4}}>{p.name}</h3>
        <p style={{fontSize:"0.6rem",color:"#3a3530",letterSpacing:"0.16em",marginBottom:18}}>{p.unit}</p>
        <p style={{fontSize:"0.52rem",color:p.tipo_producto==="bulto_10kg"?"#6acc6a":"#888",marginBottom:16,display:"flex",alignItems:"center",gap:4}}><Truck size={10}/> {p.tipo_producto==="bulto_10kg"?"Envío gratis en primer pedido":"Envío a cargo del comprador"}</p>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span className="serif" style={{fontSize:"1.5rem",fontWeight:300,color:"#c9a84c"}}>{fmt(price)}</span>
          <button onClick={onAdd} className="gold" style={{padding:"9px 16px",borderRadius:2,display:"flex",alignItems:"center",gap:6}}><Plus size={11}/>{inCart>0?"Agregar más":"Agregar"}</button>
        </div>
      </div>
    </div>
  );
}

// ── CART DRAWER ──────────────────────────────────────────────────
function CartDrawer({cart,margin,total,count,updateQty,remove,onClose,onWA}){
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [formData, setFormData] = useState({ name:"", lastname:"", email:"", phone:"", address:"", cuit:"" });
  const [submitting, setSubmitting] = useState(false);
  const totalKg = cart.reduce((s,i) => s + ((i.peso_kg || 1) * i.qty), 0);

  const handleProceed = async () => {
    if (!formData.name || !formData.lastname || !formData.phone || !formData.address) {
      return alert("Por favor completá los datos obligatorios (Nombre, Apellido, Teléfono y Dirección)");
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientData: formData, cartData: cart, totalKg })
      });
      if (!res.ok) throw new Error("Error del servidor");
      const data = await res.json();
      onWA(data.order.shippingStatus, totalKg, formData);
      onClose();
    } catch (e) {
      alert("No pudimos procesar la validación. Redirigiendo directo a WhatsApp...");
      onWA("Sin validar (error de conexión)", totalKg, formData);
      onClose();
    }
  };

  const fv = (k,v) => setFormData(p => ({...p, [k]: v}));

  return(
    <div style={{position:"fixed",inset:0,zIndex:100}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)"}}/>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:"min(440px,100vw)",background:"#0d0d0d",borderLeft:"1px solid rgba(255,255,255,0.05)",display:"flex",flexDirection:"column",animation:"slideIn 0.3s cubic-bezier(0.4,0,0.2,1) both"}}>
        <div style={{padding:"22px 28px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {checkoutStep && <button onClick={()=>setCheckoutStep(false)} style={{background:"none",border:"none",color:"#c9a84c",cursor:"pointer"}}><ChevronRight size={16} style={{transform:"rotate(180deg)"}}/></button>}
            <div>
              <h2 className="serif" style={{fontSize:"1.3rem",fontWeight:300,color:"#e8e0d0"}}>{checkoutStep?"Tus Datos":"Tu Pedido"}</h2>
              <p style={{fontSize:"0.56rem",letterSpacing:"0.24em",color:"#444",textTransform:"uppercase",marginTop:3}}>
                {checkoutStep ? "Paso final" : `${count} artículo${count!==1?"s":""} · ${totalKg.toFixed(2)} kg`}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"1px solid rgba(255,255,255,0.07)",padding:8,borderRadius:2,cursor:"pointer",color:"#555"}}><X size={14}/></button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"8px 28px"}}>
          {!checkoutStep ? (
            cart.length===0
              ?<div style={{textAlign:"center",padding:"64px 0",color:"#2a2a2a"}}><Package size={36} style={{margin:"0 auto 14px",display:"block"}}/><p style={{fontSize:"0.75rem",letterSpacing:"0.1em"}}>Tu carrito está vacío</p></div>
              :cart.map(item=>{const p=item.salePrice||sale(item.cost,margin);return(
                <div key={item.id} style={{padding:"16px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:"1.6rem",flexShrink:0}}>{item.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p className="serif" style={{fontSize:"0.92rem",color:"#ddd",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</p>
                    <p style={{fontSize:"0.6rem",color:"#c9a84c",marginTop:2,display:"flex",alignItems:"center",gap:6}}>
                      {fmt(p)} × unidad <span style={{color:"#555"}}>· {(item.peso_kg||1)}kg</span>
                    </p>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    <button className="qb" onClick={()=>updateQty(item.id,-1)}><Minus size={11}/></button>
                    <span style={{fontSize:"0.88rem",color:"#e8e0d0",minWidth:18,textAlign:"center"}}>{item.qty}</span>
                    <button className="qb" onClick={()=>updateQty(item.id,1)}><Plus size={11}/></button>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{fontSize:"0.9rem",color:"#e8e0d0"}}>{fmt(p*item.qty)}</p>
                    <button onClick={()=>remove(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#2a2520",fontSize:"0.56rem",letterSpacing:"0.1em",marginTop:4,transition:"color 0.2s",fontFamily:"Jost,sans-serif"}}
                      onMouseEnter={e=>e.currentTarget.style.color="#c97a7a"} onMouseLeave={e=>e.currentTarget.style.color="#2a2520"}>quitar</button>
                  </div>
                </div>
              )})
          ) : (
            <div style={{padding:"12px 0",display:"flex",flexDirection:"column",gap:14}} className="anim">
              <p style={{fontSize:"0.62rem",color:"#888",marginBottom:8}}>Completá tus datos para agilizar el envío y validar si aplicás a beneficios de compra.</p>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Nombre *</p><input className="ci" autoFocus value={formData.name} onChange={e=>fv("name",e.target.value)} /></div>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Apellido *</p><input className="ci" value={formData.lastname} onChange={e=>fv("lastname",e.target.value)} /></div>
              </div>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Teléfono (WA) *</p><input className="ci" type="tel" value={formData.phone} onChange={e=>fv("phone",e.target.value)} /></div>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>CUIT / CUIL</p><input className="ci" value={formData.cuit} onChange={e=>fv("cuit",e.target.value)} /></div>
              </div>
              <div><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Dirección de Envío *</p><input className="ci" value={formData.address} onChange={e=>fv("address",e.target.value)} /></div>
              <div><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Email (Opcional)</p><input className="ci" type="email" value={formData.email} onChange={e=>fv("email",e.target.value)} /></div>
            </div>
          )}
        </div>
        
        <div style={{padding:"22px 28px",borderTop:"1px solid rgba(255,255,255,0.05)",background:(totalKg>=10 && !checkoutStep)?"rgba(100,200,100,0.03)":"transparent"}}>
          {!checkoutStep && (
            <div style={{marginBottom:16}}>
              {totalKg >= 10 ? (
                <p style={{fontSize:"0.6rem",color:"#6acc6a",display:"flex",alignItems:"center",gap:6}}><CheckCircle size={12}/> Este pedido califica para <b>Validación de Envío Gratis</b>.</p>
              ) : (
                <p style={{fontSize:"0.6rem",color:"#888",display:"flex",alignItems:"center",gap:6}}><Truck size={12} style={{color:"#c9a84c"}}/> Te faltan {(10 - totalKg).toFixed(2)} kg para acceder a envío gratis en tu primer pedido.</p>
              )}
            </div>
          )}
          
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
            <span style={{fontSize:"0.6rem",letterSpacing:"0.26em",color:"#444",textTransform:"uppercase"}}>Total estimado</span>
            <span className="serif" style={{fontSize:"2rem",fontWeight:300,color:"#c9a84c"}}>{fmt(total)}</span>
          </div>
          <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(201,168,76,0.2),transparent)",marginBottom:20}}/>
          
          {!checkoutStep ? (
            <button onClick={()=>setCheckoutStep(true)} disabled={cart.length===0} className="gold" style={{width:"100%",padding:"14px",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:"0.7rem",letterSpacing:"0.14em"}}>
              Continuar <ChevronRight size={14}/>
            </button>
          ) : (
            <button onClick={handleProceed} disabled={submitting} className="gold" style={{width:"100%",padding:"14px",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:"0.7rem",letterSpacing:"0.14em",background:submitting?"#555":"linear-gradient(135deg,#c9a84c,#dbbe6a)"}}>
              <MessageCircle size={15}/> {submitting ? "Validando..." : "Finalizar por WhatsApp"}
            </button>
          )}
          <p style={{textAlign:"center",marginTop:12,fontSize:"0.54rem",color:"#2a2520",letterSpacing:"0.14em",textTransform:"uppercase"}}>{checkoutStep ? "Tus datos se guardarán de forma segura" : "Checkout rápido y seguro"}</p>
        </div>
      </div>
    </div>
  );
}

// ── AI CHAT FAB ──────────────────────────────────────────────────
function ChatFAB({open,setOpen,products,kb}){
  const [msgs,setMsgs]=useState([{r:"a",t:"¡Hola! 👋 Soy el asistente de Frutos Selectos. ¿En qué te puedo ayudar?"}]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{ if(open) endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,open]);
  const send=async()=>{
    const t=input.trim();if(!t||busy)return;
    setInput("");const next=[...msgs,{r:"u",t}];setMsgs(next);setBusy(true);
    try{
      const api=next.map(m=>({role:m.r==="u"?"user":"assistant",content:m.t}));
      const reply=await callAI(api,products,kb);
      setMsgs(p=>[...p,{r:"a",t:reply}]);
    }catch{setMsgs(p=>[...p,{r:"a",t:"Ups, algo falló. Intentá de nuevo."}]);}
    finally{setBusy(false);}
  };
  const activeKb=kb.filter(e=>e.active&&e.cat!=="ai_rules").length;
  return(
    <>
      <button onClick={()=>setOpen(!open)} style={{position:"fixed",bottom:28,right:28,zIndex:200,width:54,height:54,borderRadius:"50%",background:"linear-gradient(135deg,#c9a84c,#dbbe6a)",border:"none",cursor:"pointer",color:"#060606",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 32px rgba(201,168,76,0.35)",transition:"transform 0.2s",animation:"pulseG 3s infinite"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
        {open?<X size={22}/>:<Bot size={22}/>}
      </button>
      {open&&(
        <div style={{position:"fixed",bottom:94,right:28,zIndex:199,width:"min(380px,calc(100vw - 48px))",height:480,background:"#0d0d0d",border:"1px solid rgba(201,168,76,0.18)",borderRadius:4,display:"flex",flexDirection:"column",animation:"slideUp 0.28s ease both",boxShadow:"0 24px 64px rgba(0,0,0,0.7)",overflow:"hidden"}}>
          <div style={{padding:"14px 18px",background:"rgba(201,168,76,0.06)",borderBottom:"1px solid rgba(201,168,76,0.12)",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#c9a84c,#dbbe6a)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Bot size={16} color="#060606"/></div>
            <div style={{flex:1}}>
              <p style={{fontSize:"0.78rem",fontWeight:500,color:"#e8e0d0"}}>Asistente IA</p>
              <p style={{fontSize:"0.5rem",color:"#888",letterSpacing:"0.12em",textTransform:"uppercase"}}>Claude · {activeKb} respuestas en base</p>
            </div>
            <span style={{fontSize:"0.5rem",color:"#6acc6a",display:"flex",alignItems:"center",gap:4}}><span style={{width:5,height:5,borderRadius:"50%",background:"#6acc6a",animation:"blink 2s infinite",display:"inline-block"}}/>En línea</span>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.r==="u"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"82%",padding:"10px 13px",borderRadius:m.r==="u"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.r==="u"?"linear-gradient(135deg,#c9a84c,#dbbe6a)":"rgba(255,255,255,0.05)",border:m.r==="u"?"none":"1px solid rgba(255,255,255,0.06)",color:m.r==="u"?"#060606":"#d8d0c0",fontSize:"0.8rem",lineHeight:1.55,fontWeight:m.r==="u"?500:300}}>{m.t}</div>
              </div>
            ))}
            {busy&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"10px 14px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"12px 12px 12px 2px",display:"flex",gap:5,alignItems:"center"}}>{[0,1,2].map(j=><span key={j} style={{width:5,height:5,borderRadius:"50%",background:"#c9a84c",opacity:.6,animation:`blink 1.2s ${j*.2}s infinite`,display:"inline-block"}}/>)}</div></div>}
            <div ref={endRef}/>
          </div>
          <div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.05)",display:"flex",gap:10}}>
            <textarea className="ci" rows={1} placeholder="Escribí tu consulta…" value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} style={{height:40,paddingTop:10}}/>
            <button onClick={send} disabled={!input.trim()||busy} style={{background:"linear-gradient(135deg,#c9a84c,#dbbe6a)",border:"none",borderRadius:3,width:40,height:40,flexShrink:0,cursor:!input.trim()||busy?"not-allowed":"pointer",opacity:!input.trim()||busy?.35:1,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
              <Send size={15} color="#060606"/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════
function Admin({products,margin,setMargin,syncing,syncOk,src,onSync,kb,onKb,kbReady,tab,setTab,kbSync,marginSync,adminToken}){
  return(
    <main style={{maxWidth:1100,margin:"0 auto",padding:"44px 28px 100px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:32}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><Lock size={11} style={{color:"#c9a84c"}}/><p style={{fontSize:"0.54rem",letterSpacing:"0.36em",color:"#3a3530",textTransform:"uppercase"}}>Panel Interno — Solo Administradores</p></div>
          <h2 className="serif" style={{fontSize:"2.1rem",fontWeight:300,color:"#e8e0d0",lineHeight:1.1}}>Gestión <em style={{color:"#c9a84c"}}>DIFRUMARKET</em></h2>
        </div>
        <button onClick={onSync} disabled={syncing} style={{background:"none",border:"1px solid rgba(201,168,76,0.25)",color:"#c9a84c",padding:"9px 18px",borderRadius:2,cursor:syncing?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8,fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:"Jost,sans-serif",opacity:syncing?.5:1,transition:"all 0.2s"}}>
          <RefreshCw size={13} style={{animation:syncing?"spin 0.9s linear infinite":"none"}}/>{syncing?"Sincronizando…":"Sincronizar"}
        </button>
      </div>
      {syncOk===true&&(
        <div style={{background:(src==="sheets"||src==="backend")?"rgba(100,180,100,0.05)":"rgba(200,150,50,0.05)",border:`1px solid ${(src==="sheets"||src==="backend")?"rgba(100,180,100,0.18)":"rgba(200,150,50,0.18)"}`,borderRadius:2,padding:"10px 16px",marginBottom:24,display:"flex",alignItems:"center",gap:10,fontSize:"0.68rem",color:(src==="sheets"||src==="backend")?"#80b880":"#c9a84c",letterSpacing:"0.06em"}}>
          <CheckCircle size={13}/>{(src==="sheets"||src==="backend")?`✅ Catálogo sincronizado · ${products.length} productos · ${margin}% margen`:`⚠️ Datos offline (${products.length} productos).`}
        </div>
      )}
      {syncOk===false&&(
        <div style={{background:"rgba(200,80,80,0.05)",border:"1px solid rgba(200,80,80,0.18)",borderRadius:2,padding:"10px 16px",marginBottom:24,display:"flex",alignItems:"center",gap:10,fontSize:"0.68rem",color:"#c97a7a",letterSpacing:"0.06em"}}>
          <AlertCircle size={13}/>❌ Error al sincronizar: El listado no está disponible o el formato ha cambiado. Se están usando datos locales/fallback.
        </div>
      )}
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.05)",marginBottom:32,overflowX:"auto"}}>
        {[{k:"kb",l:"🧠 Base de Conocimiento"},{k:"prices",l:"💰 Precios y Nombres"},{k:"bot",l:"📱 Bot WA→Telegram"}].map(t=>(
          <button key={t.k} className={`tab${tab===t.k?" on":""}`} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>
      {tab==="kb"     && <KBEditor kb={kb} onKb={onKb} kbReady={kbReady} kbSync={kbSync}/>}
      {tab==="prices" && <PricesTab products={products} margin={margin} setMargin={setMargin} marginSync={marginSync} adminToken={adminToken} onSync={onSync}/>}
      {tab==="bot"    && <BotTab/>}
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// KB EDITOR — corazón de la customización
// ═══════════════════════════════════════════════════════════════
function KBEditor({kb,onKb,kbReady,kbSync}){
  const [catF,setCatF]=useState("all");
  const [search,setSearch]=useState("");
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({});
  const [isNew,setIsNew]=useState(false);
  const [flash,setFlash]=useState(false);

  const shown=kb.filter(e=>{
    const mc=catF==="all"||e.cat===catF;
    const ms=!search||e.question.toLowerCase().includes(search.toLowerCase())||e.answer.toLowerCase().includes(search.toLowerCase());
    return mc&&ms;
  });
  const catMeta=id=>KB_CATS.find(c=>c.id===id)||KB_CATS[0];
  const activeCount=kb.filter(e=>e.active&&e.cat!=="ai_rules").length;

  const startEdit=e=>{setEditId(e.id);setForm({...e});setIsNew(false);};
  const startNew=()=>{const blank={id:uid(),cat:"faq",active:true,priority:2,triggers:"",question:"",answer:""};setForm(blank);setIsNew(true);setEditId(blank.id);};
  const cancel=()=>{setEditId(null);setIsNew(false);setForm({});};
  const save=()=>{
    if(!form.question?.trim()||!form.answer?.trim()) return;
    onKb(isNew?[...kb,form]:kb.map(e=>e.id===form.id?form:e));
    cancel();setFlash(true);setTimeout(()=>setFlash(false),2000);
  };
  const del=id=>onKb(kb.filter(e=>e.id!==id));
  const toggle=id=>onKb(kb.map(e=>e.id===id?{...e,active:!e.active}:e));
  const fv=(k,v)=>setForm(f=>({...f,[k]:v}));

  // Indicador de sincronización con el bot
  const SyncStatus = () => {
    if (kbSync?.syncing) return (
      <span style={{fontSize:"0.58rem",color:"#888",display:"flex",alignItems:"center",gap:6}}>
        <span style={{width:10,height:10,border:"1.5px solid #555",borderTopColor:"#888",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}/>
        Sincronizando con bot…
      </span>
    );
    if (kbSync?.error) return (
      <span style={{fontSize:"0.58rem",color:"#c97a7a",display:"flex",alignItems:"center",gap:5}} title={kbSync.error}>
        <AlertCircle size={11}/>Sin conexión con bot · guardado local
      </span>
    );
    if (kbSync?.lastSync) return (
      <span style={{fontSize:"0.58rem",color:"#6acc6a",display:"flex",alignItems:"center",gap:5}}>
        <CheckCircle size={11}/>Bot sincronizado · {new Date(kbSync.lastSync).toLocaleTimeString("es-AR")}
      </span>
    );
    return null;
  };

  return(
    <div className="anim">
      {/* header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:12}}>
        <div>
          <h3 className="serif" style={{fontSize:"1.5rem",fontWeight:300,color:"#e8e0d0",marginBottom:4}}>Base de Conocimiento</h3>
          <p style={{fontSize:"0.62rem",color:"#555",letterSpacing:"0.08em"}}>{activeCount} respuestas activas · Claude y el bot Telegram las usan en cada consulta</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <SyncStatus/>
          {flash&&<span style={{fontSize:"0.62rem",color:"#6acc6a",display:"flex",alignItems:"center",gap:6,letterSpacing:"0.08em"}}><CheckCircle size={12}/>Guardado</span>}
          <button onClick={startNew} className="gold" style={{padding:"10px 18px",borderRadius:2,display:"flex",alignItems:"center",gap:8}}><PlusCircle size={14}/>Nueva entrada</button>
        </div>
      </div>

      {/* cat filter */}
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        <CatPill active={catF==="all"} onClick={()=>setCatF("all")} label={`Todas (${kb.length})`}/>
        {KB_CATS.map(c=><CatPill key={c.id} active={catF===c.id} onClick={()=>setCatF(c.id)} label={`${c.icon} ${c.label} (${kb.filter(e=>e.cat===c.id).length})`} color={c.color}/>)}
      </div>

      {/* search */}
      <div style={{position:"relative",marginBottom:22}}>
        <Search size={14} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#444"}}/>
        <input className="si" type="text" placeholder="Buscar en la base de conocimiento…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* FORM */}
      {editId&&(
        <div className="glass" style={{borderRadius:3,padding:"24px 26px",marginBottom:22,border:"1px solid rgba(201,168,76,0.22)"}}>
          <p style={{fontSize:"0.6rem",letterSpacing:"0.24em",color:"#c9a84c",textTransform:"uppercase",marginBottom:18}}>{isNew?"➕ Nueva entrada":"✏️ Editando entrada"}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div>
              <Label text="Categoría"/>
              <select className="fi" value={form.cat||"faq"} onChange={e=>fv("cat",e.target.value)} style={{cursor:"pointer"}}>
                {KB_CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <Label text="Prioridad (0 = más alta)"/>
              <input className="fi" type="number" min={0} max={10} value={form.priority??2} onChange={e=>fv("priority",+e.target.value)} style={{resize:"none"}}/>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <Label text="Palabras clave que activan esta respuesta (separadas por coma)"/>
            <input className="fi" type="text" placeholder="envío, mandan, despacho, llega…" value={form.triggers||""} onChange={e=>fv("triggers",e.target.value)} style={{resize:"none"}}/>
          </div>
          <div style={{marginBottom:14}}>
            <Label text="Pregunta / contexto *"/>
            <input className="fi" type="text" placeholder="¿Hacen envíos a todo el país?" value={form.question||""} onChange={e=>fv("question",e.target.value)} style={{resize:"none"}}/>
          </div>
          <div style={{marginBottom:20}}>
            <Label text="Respuesta que debe dar la IA *"/>
            <textarea className="fi" rows={4} placeholder="Sí, enviamos a todo el país con Andreani y OCA. El costo varía según destino…" value={form.answer||""} onChange={e=>fv("answer",e.target.value)}/>
            <p style={{fontSize:"0.54rem",color:"#3a3530",marginTop:5,letterSpacing:"0.06em"}}>La IA adapta este texto al estilo natural de la conversación. No hace falta que sea perfecto.</p>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={cancel} style={{padding:"9px 18px",borderRadius:2,background:"none",border:"1px solid rgba(255,255,255,0.07)",color:"#555",cursor:"pointer",fontFamily:"Jost,sans-serif",fontSize:"0.62rem",letterSpacing:"0.12em",textTransform:"uppercase",transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.18)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>Cancelar</button>
            <button onClick={save} disabled={!form.question?.trim()||!form.answer?.trim()} className="gold" style={{padding:"9px 22px",borderRadius:2,display:"flex",alignItems:"center",gap:8}}>
              <Save size={13}/>{isNew?"Agregar":"Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* LIST */}
      {!kbReady
        ?<div style={{display:"flex",flexDirection:"column",gap:10}}>{[1,2,3].map(i=><div key={i} className="sk" style={{height:92}}/>)}</div>
        :shown.length===0
          ?<div style={{textAlign:"center",padding:"60px 0",color:"#333"}}><BookOpen size={32} style={{margin:"0 auto 14px",display:"block"}}/><p style={{fontSize:"0.78rem",letterSpacing:"0.1em"}}>Sin entradas. Agregá la primera.</p></div>
          :<div style={{display:"flex",flexDirection:"column",gap:9}}>
            {shown.map(entry=>{
              const meta=catMeta(entry.cat);
              const isEditing=editId===entry.id&&!isNew;
              return(
                <div key={entry.id} className="glass" style={{borderRadius:3,overflow:"hidden",opacity:entry.active?1:0.45,transition:"opacity 0.2s"}}>
                  <div style={{padding:"15px 18px",display:"flex",alignItems:"flex-start",gap:12}}>
                    {/* toggle */}
                    <button className="tog" onClick={()=>toggle(entry.id)} style={{background:entry.active?"#c9a84c":"#252525",marginTop:2}}>
                      <span style={{position:"absolute",top:3,left:entry.active?21:3,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.25s"}}/>
                    </button>
                    {/* cat badge */}
                    <span style={{fontSize:"0.5rem",padding:"3px 9px",borderRadius:20,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"Jost,sans-serif",background:`${meta.color}16`,border:`1px solid ${meta.color}2a`,color:meta.color,flexShrink:0,marginTop:2,whiteSpace:"nowrap"}}>
                      {meta.icon} {meta.label}
                    </span>
                    {/* content */}
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:"0.82rem",color:"#d8d0c0",fontWeight:500,marginBottom:4,lineHeight:1.4}}>{entry.question}</p>
                      <p style={{fontSize:"0.74rem",color:"#666",lineHeight:1.55}}>{entry.answer}</p>
                      {entry.triggers&&(
                        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:7}}>
                          {entry.triggers.split(",").filter(Boolean).map(t=>(
                            <span key={t} style={{fontSize:"0.48rem",padding:"2px 7px",borderRadius:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"#555",letterSpacing:"0.1em"}}>{t.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* actions */}
                    <div style={{display:"flex",gap:7,flexShrink:0}}>
                      <button onClick={()=>isEditing?cancel():startEdit(entry)} style={{background:"none",border:`1px solid ${isEditing?"rgba(201,168,76,0.4)":"rgba(255,255,255,0.07)"}`,borderRadius:2,padding:"6px 10px",cursor:"pointer",color:isEditing?"#c9a84c":"#555",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5,fontSize:"0.56rem",fontFamily:"Jost,sans-serif",letterSpacing:"0.1em",textTransform:"uppercase"}}
                        onMouseEnter={e=>!isEditing&&(e.currentTarget.style.borderColor="rgba(201,168,76,0.3)",e.currentTarget.style.color="#c9a84c")} onMouseLeave={e=>!isEditing&&(e.currentTarget.style.borderColor="rgba(255,255,255,0.07)",e.currentTarget.style.color="#555")}>
                        <Edit3 size={11}/>{isEditing?"Cerrar":"Editar"}
                      </button>
                      <button onClick={()=>del(entry.id)} style={{background:"none",border:"1px solid rgba(255,255,255,0.05)",borderRadius:2,padding:"6px 8px",cursor:"pointer",color:"#3a3530",transition:"all 0.2s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(200,80,80,0.3)";e.currentTarget.style.color="#c96060"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.05)";e.currentTarget.style.color="#3a3530"}}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      }
      <div style={{marginTop:20,padding:"13px 16px",border:"1px solid rgba(255,255,255,0.03)",borderRadius:2}}>
        <p style={{fontSize:"0.56rem",color:"#3a3530",lineHeight:1.9,letterSpacing:"0.06em"}}>
          <span style={{color:"#555"}}>💡 Cómo funciona:</span> cada entrada activa se inyecta automáticamente en el system prompt de Claude (chat web) y en el bot de Telegram.
          Las <span style={{color:"#666"}}>palabras clave</span> son una guía para la IA. Las entradas <span style={{color:"#9a84c9"}}>🤖 Instrucciones IA</span> definen el tono y las reglas del asistente.
        </p>
      </div>
    </div>
  );
}

function CatPill({active,onClick,label,color}){
  return(
    <button onClick={onClick} style={{padding:"5px 13px",borderRadius:20,cursor:"pointer",fontFamily:"Jost,sans-serif",fontSize:"0.58rem",letterSpacing:"0.12em",textTransform:"uppercase",border:`1px solid ${active?(color||"#c9a84c"):"rgba(255,255,255,0.06)"}`,background:active?"rgba(201,168,76,0.1)":"none",color:active?(color||"#c9a84c"):"#555",transition:"all 0.18s"}}>{label}</button>
  );
}
function Label({text}){
  return <p style={{fontSize:"0.56rem",color:"#555",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:7}}>{text}</p>;
}

// ═══════════════════════════════════════════════════════════════
// PRICES TAB
// ═══════════════════════════════════════════════════════════════
function PricesTab({products,margin,setMargin,marginSync,adminToken,onSync}){
  const [showCosts,setShowCosts]=useState(false);
  const [editingName,setEditingName]=useState(null); // product id being edited
  const [nameInput,setNameInput]=useState("");
  const [savingName,setSavingName]=useState(null);
  const [nameFlash,setNameFlash]=useState(null); // product id that just saved
  const rangeStyle={"--pct":`${margin}%`};

  // Guardar nombre personalizado
  const saveNameOverride = async (product) => {
    const newName = nameInput.trim();
    const originalName = product.originalName || product.name;
    if (!newName || newName === product.name) {
      setEditingName(null);
      return;
    }
    setSavingName(product.id);
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/api/admin/catalog/name-override`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({ originalName, customName: newName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditingName(null);
      setNameFlash(product.id);
      setTimeout(() => setNameFlash(null), 2500);
      // Resync catalog to reflect changes
      if (onSync) onSync();
    } catch (err) {
      console.error("[NameOverride] Error:", err);
      alert("Error guardando nombre: " + err.message);
    } finally {
      setSavingName(null);
    }
  };

  // Resetear nombre al original
  const resetName = async (product) => {
    const originalName = product.originalName || product.name;
    setSavingName(product.id);
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/api/admin/catalog/name-override`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({ originalName, customName: "" }), // empty = remove override
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditingName(null);
      setNameFlash(product.id);
      setTimeout(() => setNameFlash(null), 2500);
      if (onSync) onSync();
    } catch (err) {
      console.error("[NameReset] Error:", err);
    } finally {
      setSavingName(null);
    }
  };

  // Indicador de sincronización del margen con el bot
  const MarginSyncStatus = () => {
    if (marginSync?.syncing) return (
      <span style={{fontSize:"0.56rem",color:"#888",display:"flex",alignItems:"center",gap:5}}>
        <span style={{width:9,height:9,border:"1.5px solid #555",borderTopColor:"#888",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}/>
        Enviando al bot…
      </span>
    );
    if (marginSync?.error) return (
      <span style={{fontSize:"0.56rem",color:"#c97a7a",display:"flex",alignItems:"center",gap:5}} title={marginSync.error}>
        <AlertCircle size={10}/>Sin conexión · margen actualizado localmente
      </span>
    );
    if (marginSync?.lastSync) return (
      <span style={{fontSize:"0.56rem",color:"#6acc6a",display:"flex",alignItems:"center",gap:5}}>
        <CheckCircle size={10}/>Bot actualizado · {new Date(marginSync.lastSync).toLocaleTimeString("es-AR")}
      </span>
    );
    return null;
  };
  const agents=[
    {name:"Claude (Anthropic)",model:"claude-sonnet-4-20250514",status:"active",role:"Chat web + Bot Telegram",icon:"🧠",color:"#c9a84c"},
    {name:"Grok (xAI)",        model:"grok-3-beta",             status:"standby",role:"Fallback secundario",   icon:"⚡",color:"#7eb8f7"},
    {name:"Mistral 7B (HF)",   model:"mistral-7b-instruct",     status:"standby",role:"Fallback gratuito",     icon:"🌀",color:"#a8c9a8"},
    {name:"Telegram Bot",      model:"Telegraf · WA bridge",    status:"active", role:"Gateway WA → IA",       icon:"📱",color:"#6aafcc"},
  ];
  return(
    <div className="anim">
      <div className="glass" style={{borderRadius:3,padding:"22px 24px",marginBottom:20}}>
        <SectionTitle icon="⚙️" label="Estado de Agentes"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:11}}>
          {agents.map(a=>(
            <div key={a.name} style={{padding:"13px 15px",borderRadius:2,background:a.status==="active"?`${a.color}0a`:"rgba(255,255,255,0.02)",border:`1px solid ${a.status==="active"?a.color+"28":"rgba(255,255,255,0.04)"}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:"1.2rem"}}>{a.icon}</span>
                <span style={{fontSize:"0.44rem",letterSpacing:"0.16em",textTransform:"uppercase",padding:"2px 7px",borderRadius:20,background:a.status==="active"?"rgba(100,200,100,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${a.status==="active"?"rgba(100,200,100,0.22)":"rgba(255,255,255,0.05)"}`,color:a.status==="active"?"#6acc6a":"#555"}}>
                  {a.status==="active"?"● Activo":"○ Standby"}
                </span>
              </div>
              <p style={{fontSize:"0.72rem",color:a.color,fontWeight:500,marginBottom:2}}>{a.name}</p>
              <p style={{fontSize:"0.56rem",color:"#555",marginBottom:3,letterSpacing:"0.04em"}}>{a.role}</p>
              <p style={{fontSize:"0.48rem",color:"#2a2520",fontFamily:"monospace"}}>{a.model}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="glass" style={{padding:"22px 24px",borderRadius:3,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <SectionTitle icon="📊" label="Margen sobre Precio Remito"/>
          <MarginSyncStatus/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:28}}>
          <input type="range" min={0} max={100} step={1} value={margin}
            style={{...rangeStyle,flex:1}}
            onChange={e=>setMargin(+e.target.value, false)}
            onMouseUp={e=>setMargin(+e.target.value, true)}
            onTouchEnd={e=>setMargin(+e.target.value, true)}
          />
          <span className="serif" style={{fontSize:"2.2rem",fontWeight:300,color:"#c9a84c",minWidth:90,textAlign:"right"}}>{margin}%</span>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          {[15,20,25,30,35,50].map(v=><button key={v} onClick={()=>setMargin(v, true)} style={{padding:"4px 11px",borderRadius:20,border:`1px solid ${margin===v?"#c9a84c":"rgba(255,255,255,0.06)"}`,background:margin===v?"rgba(201,168,76,0.1)":"none",color:margin===v?"#c9a84c":"#444",fontSize:"0.62rem",cursor:"pointer",fontFamily:"Jost,sans-serif",transition:"all 0.18s"}}>{v}%</button>)}
        </div>
        <div style={{marginTop:12,padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:2}}>
          <p style={{fontSize:"0.6rem",color:"#555",fontFamily:"monospace"}}>Precio Venta = Precio Remito × (1 + <span style={{color:"#c9a84c"}}>{margin}</span>/100) → factor: <span style={{color:"#c9a84c"}}>×{(1+margin/100).toFixed(2)}</span></p>
        </div>
      </div>

      {/* Nota explicativa sobre nombres editables */}
      <div style={{background:"rgba(201,168,76,0.04)",border:"1px solid rgba(201,168,76,0.12)",borderRadius:2,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"flex-start",gap:10}}>
        <Edit3 size={14} style={{color:"#c9a84c",flexShrink:0,marginTop:2}}/>
        <div>
          <p style={{fontSize:"0.68rem",color:"#c9a84c",fontWeight:500,marginBottom:3}}>Nombres editables</p>
          <p style={{fontSize:"0.6rem",color:"#666",lineHeight:1.6}}>Podés personalizar el nombre de cada producto como se muestra en la tienda y el bot. La referencia al nombre original de la lista siempre aparece debajo. Los cambios se aplican en la web, chat IA, y bot Telegram/WhatsApp.</p>
        </div>
      </div>

      <div className="glass" style={{borderRadius:3,overflow:"hidden"}}>
        <div style={{padding:"13px 20px",borderBottom:"1px solid rgba(255,255,255,0.045)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:"0.56rem",letterSpacing:"0.22em",color:"#555",textTransform:"uppercase"}}>{products.length} productos · {products.filter(p=>p.isNameOverride).length} con nombre personalizado</span>
          <button onClick={()=>setShowCosts(!showCosts)} style={{background:"none",border:"none",cursor:"pointer",color:"#444",display:"flex",alignItems:"center",gap:6,fontSize:"0.56rem",letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"Jost,sans-serif",transition:"color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#c9a84c"} onMouseLeave={e=>e.currentTarget.style.color="#444"}>
            {showCosts?<EyeOff size={12}/>:<Eye size={12}/>}{showCosts?"Ocultar costos":"Ver costos (remito)"}
          </button>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            {["Producto (editable)","Ref. Lista",...(showCosts?["Costo Remito"]:[]),"Precio Venta","Ganancia",""].map(h=>(
              <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:"0.52rem",letterSpacing:"0.2em",color:"#3a3530",textTransform:"uppercase",fontWeight:400}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {products.map((p,i)=>{
              const s=p.salePrice||sale(p.cost,margin);const g=s-p.cost;const gp=p.cost>0?((g/p.cost)*100).toFixed(1):"0";
              const hasCustomName = p.isNameOverride && p.originalName && p.name !== p.originalName;
              const isEditing = editingName === p.id;
              const isSaving = savingName === p.id;
              const justSaved = nameFlash === p.id;
              return(
                <tr key={p.id} className="rh" style={{borderBottom:"1px solid rgba(255,255,255,0.028)",background:i%2===0?"transparent":"rgba(255,255,255,0.007)"}}>
                  {/* Nombre editable */}
                  <td style={{padding:"10px 14px",minWidth:220}}>
                    {isEditing ? (
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:"1.1rem",flexShrink:0}}>{p.emoji}</span>
                        <input
                          className="fi"
                          type="text"
                          value={nameInput}
                          onChange={e=>setNameInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter")saveNameOverride(p);if(e.key==="Escape")setEditingName(null);}}
                          autoFocus
                          style={{fontSize:"0.82rem",padding:"6px 10px",minWidth:160}}
                          placeholder="Nombre para la tienda"
                        />
                        <button onClick={()=>saveNameOverride(p)} disabled={isSaving}
                          style={{background:"none",border:"1px solid rgba(100,200,100,0.3)",borderRadius:2,padding:"5px 8px",cursor:"pointer",color:"#6acc6a",display:"flex",alignItems:"center",flexShrink:0}}
                          title="Guardar">
                          {isSaving?<span style={{width:12,height:12,border:"1.5px solid #6acc6a",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.6s linear infinite",display:"inline-block"}}/>:<Save size={13}/>}
                        </button>
                        <button onClick={()=>setEditingName(null)}
                          style={{background:"none",border:"1px solid rgba(255,255,255,0.07)",borderRadius:2,padding:"5px 8px",cursor:"pointer",color:"#555",display:"flex",alignItems:"center",flexShrink:0}}
                          title="Cancelar">
                          <X size={13}/>
                        </button>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <span style={{fontSize:"1.1rem",flexShrink:0}}>{p.emoji}</span>
                        <div style={{minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span className="serif" style={{fontSize:"0.88rem",color:hasCustomName?"#c9a84c":"#d0c8b8"}}>{p.name}</span>
                            {hasCustomName && <span style={{fontSize:"0.44rem",padding:"1px 5px",borderRadius:10,background:"rgba(201,168,76,0.12)",border:"1px solid rgba(201,168,76,0.22)",color:"#c9a84c",letterSpacing:"0.1em",textTransform:"uppercase",flexShrink:0}}>editado</span>}
                            {justSaved && <span style={{fontSize:"0.5rem",color:"#6acc6a",display:"flex",alignItems:"center",gap:3}}><CheckCircle size={10}/>ok</span>}
                          </div>
                          <span className="pill" style={{fontSize:"0.44rem",marginTop:2,display:"inline-block"}}>{p.category} · {p.unit}</span>
                        </div>
                        <button
                          onClick={()=>{setEditingName(p.id);setNameInput(p.name);}}
                          style={{background:"none",border:"1px solid rgba(255,255,255,0.06)",borderRadius:2,padding:"4px 7px",cursor:"pointer",color:"#3a3530",display:"flex",alignItems:"center",flexShrink:0,transition:"all 0.2s",marginLeft:"auto"}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(201,168,76,0.3)";e.currentTarget.style.color="#c9a84c";}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";e.currentTarget.style.color="#3a3530";}}
                          title="Editar nombre">
                          <Edit3 size={11}/>
                        </button>
                      </div>
                    )}
                  </td>
                  {/* Referencia al nombre original de la lista */}
                  <td style={{padding:"10px 14px",maxWidth:180}}>
                    {(p.originalName && p.originalName !== p.name) ? (
                      <div>
                        <p style={{fontSize:"0.62rem",color:"#444",lineHeight:1.3,fontStyle:"italic"}} title={`Nombre en la lista de precios: ${p.originalName}`}>
                          🏷️ {p.originalName}
                        </p>
                        <button onClick={()=>resetName(p)} disabled={isSaving}
                          style={{background:"none",border:"none",cursor:"pointer",color:"#3a3530",fontSize:"0.48rem",letterSpacing:"0.08em",marginTop:3,padding:0,fontFamily:"Jost,sans-serif",transition:"color 0.2s",textTransform:"uppercase"}}
                          onMouseEnter={e=>e.currentTarget.style.color="#c97a7a"}
                          onMouseLeave={e=>e.currentTarget.style.color="#3a3530"}>
                          restaurar original
                        </button>
                      </div>
                    ) : (
                      <span style={{fontSize:"0.56rem",color:"#2a2520",fontStyle:"italic"}}>= nombre de lista</span>
                    )}
                  </td>
                  {showCosts&&<td style={{padding:"10px 14px",fontSize:"0.8rem",color:"#555",fontFamily:"monospace"}}>{fmt(p.cost)}</td>}
                  <td style={{padding:"10px 14px"}}><span className="serif" style={{fontSize:"0.96rem",color:"#c9a84c"}}>{fmt(s)}</span></td>
                  <td style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:"0.76rem",color:"#6aaf6a"}}>+{fmt(g)}</span><span style={{fontSize:"0.5rem",color:"#4a804a",background:"rgba(100,180,100,0.07)",border:"1px solid rgba(100,180,100,0.14)",padding:"2px 6px",borderRadius:20}}>{gp}%</span></div></td>
                  <td style={{padding:"10px 14px"}}></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOT TAB — guía WA → Telegram
// ═══════════════════════════════════════════════════════════════
function BotTab(){
  const [copied,setCopied]=useState(null);
  const copy=(text,key)=>{ navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),2200); };

  return(
    <div className="anim">
      <div style={{marginBottom:26}}>
        <h3 className="serif" style={{fontSize:"1.5rem",fontWeight:300,color:"#e8e0d0",marginBottom:6}}>Bot WA → Telegram → IA</h3>
        <p style={{fontSize:"0.64rem",color:"#555",lineHeight:1.7,letterSpacing:"0.06em"}}>
          Arquitectura <strong style={{color:"#6acc6a"}}>$0 API de WhatsApp</strong> — los clientes te escriben por WA normal, vos reenviás al bot de Telegram, la IA responde en segundos y vos pegás la respuesta de vuelta.
        </p>
      </div>

      {/* Diagrama de flujo */}
      <div className="glass" style={{padding:"20px 24px",borderRadius:3,marginBottom:24}}>
        <p style={{fontSize:"0.54rem",letterSpacing:"0.24em",color:"#555",textTransform:"uppercase",marginBottom:16}}>Flujo de mensajes</p>
        <div style={{display:"flex",alignItems:"center",overflowX:"auto",paddingBottom:8,gap:4}}>
          {[
            {icon:"💬",l:"Cliente WA",s:"Escribe consulta"},null,
            {icon:"📱",l:"Tu WA Business",s:"Recibís normal"},null,
            {icon:"✈️",l:"Reenviás",s:"al Bot Telegram"},null,
            {icon:"🤖",l:"Bot Telegram",s:"Claude/Grok/Mistral"},null,
            {icon:"📋",l:"Respuesta lista",s:"La pegás en WA"},
          ].map((s,i)=>s===null
            ?<ChevronRight key={i} size={18} style={{color:"#2a2520",flexShrink:0}}/>
            :<div key={i} style={{textAlign:"center",flexShrink:0,padding:"0 10px"}}>
               <div style={{fontSize:"1.6rem",marginBottom:4}}>{s.icon}</div>
               <p style={{fontSize:"0.58rem",color:"#c9a84c",fontWeight:500,whiteSpace:"nowrap"}}>{s.l}</p>
               <p style={{fontSize:"0.5rem",color:"#3a3530",whiteSpace:"nowrap"}}>{s.s}</p>
             </div>
          )}
        </div>
      </div>

      {/* Steps */}
      {[
        {
          n:"01",color:"#c9a84c",title:"Crear bot en Telegram (@BotFather)",
          body:<>
            <p style={{fontSize:"0.76rem",color:"#888",lineHeight:1.7,marginBottom:12}}>Abrí <strong style={{color:"#7eb8f7"}}>@BotFather</strong> en Telegram → <code style={{background:"rgba(201,168,76,0.1)",color:"#c9a84c",padding:"1px 6px",borderRadius:2}}>/newbot</code> → seguí los pasos → copiá el token.</p>
            <Code text={`TELEGRAM_BOT_TOKEN=123456789:AAFxxx...\nADMIN_CHAT_IDS=tu_chat_id`} label=".env" k="t1" copy={copy} cp={copied}/>
            <p style={{fontSize:"0.64rem",color:"#444",marginTop:8}}>Para saber tu Chat ID escribile a <code style={{color:"#c9a84c"}}>@userinfobot</code> en Telegram.</p>
          </>
        },
        {
          n:"02",color:"#7eb8f7",title:"Instalar y arrancar el bot",
          body:<Code text={`cd telegram-bot\nnpm install\ncp .env.example .env  # completar\nnode index.js         # desarrollo\n\n# Producción:\nnpm install -g pm2\npm2 start index.js --name difrumarket-bot\npm2 save && pm2 startup`} label="terminal" k="t2" copy={copy} cp={copied}/>
        },
        {
          n:"03",color:"#a8c9a8",title:"Flujo diario: WA → Telegram → respuesta",
          body:<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[
                {e:"📱",t:"1. WA del cliente",d:"Recibís la consulta en tu WhatsApp Business normal, sin ninguna integración."},
                {e:"📨",t:"2. Reenviás al bot",d:"Abrís Telegram y reenviás ese mensaje al bot @TuBot. También podés tipear el texto."},
                {e:"🤖",t:"3. IA responde",d:"Claude genera la respuesta en 2-5 segundos usando tu Base de Conocimiento y el catálogo."},
                {e:"✅",t:"4. Respondés en WA",d:"Copiás la respuesta del bot y la pegás en el WhatsApp del cliente. ¡Listo!"},
              ].map(s=>(
                <div key={s.e} style={{padding:"12px 14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:2}}>
                  <p style={{fontSize:"1.3rem",marginBottom:5}}>{s.e}</p>
                  <p style={{fontSize:"0.72rem",color:"#d0c8b8",fontWeight:500,marginBottom:3}}>{s.t}</p>
                  <p style={{fontSize:"0.64rem",color:"#555",lineHeight:1.5}}>{s.d}</p>
                </div>
              ))}
            </div>
            <div style={{padding:"12px 16px",background:"rgba(100,200,100,0.04)",border:"1px solid rgba(100,200,100,0.14)",borderRadius:2}}>
              <p style={{fontSize:"0.68rem",color:"#6acc6a",lineHeight:1.8}}>
                ✅ <strong>Costo API de WhatsApp: $0</strong> — usás tu número de WA Business normal sin Meta.<br/>
                ✅ Telegram polling es completamente gratuito.<br/>
                ✅ Solo pagás los tokens de IA (~$3-8 USD/mes para 1000 consultas con Claude).
              </p>
            </div>
          </>
        },
        {
          n:"04",color:"#c97eb8",title:"Variables de entorno — agentes IA",
          body:<Code text={`# Primario\nANTHROPIC_API_KEY=sk-ant-...\n\n# Secundario (opcional)\nGROK_API_KEY=xai-...\n\n# Fallback gratis — huggingface.co\nHF_API_KEY=hf_...\n\n# Ollama en tu servidor (sin internet)\nOLLAMA_URL=http://localhost:11434\nOLLAMA_MODEL=llama3.1:8b\n\n# Margen y número WA\nMARGIN_PCT=30\nWA_NUMBER=5491112345678`} label=".env" k="t4" copy={copy} cp={copied}/>
        },
        {
          n:"05",color:"#7ec9c9",title:"Escalar: automatización sin costo de API (futuro)",
          body:<>
            <p style={{fontSize:"0.74rem",color:"#888",lineHeight:1.7,marginBottom:12}}>Cuando quieras eliminar el paso manual, estas opciones no usan la API paga de Meta:</p>
            {[
              {e:"🐳",t:"Waha (open source)",d:"Expone una API HTTP sobre WhatsApp Web. Gratis, corre en Docker en tu servidor.",u:"github.com/devlikeapro/waha"},
              {e:"📦",t:"Baileys (Node.js)",d:"Librería de reverse engineering del protocolo WA. Gratuita, se integra directo al bot existente.",u:"github.com/WhiskeySockets/Baileys"},
            ].map(o=>(
              <div key={o.e} style={{padding:"11px 14px",marginBottom:8,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:2,display:"flex",gap:12,alignItems:"flex-start"}}>
                <span style={{fontSize:"1.2rem",flexShrink:0}}>{o.e}</span>
                <div><p style={{fontSize:"0.72rem",color:"#d0c8b8",fontWeight:500,marginBottom:3}}>{o.t}</p><p style={{fontSize:"0.64rem",color:"#666",lineHeight:1.5,marginBottom:3}}>{o.d}</p><code style={{fontSize:"0.56rem",color:"#444"}}>{o.u}</code></div>
              </div>
            ))}
          </>
        },
      ].map(step=><Step key={step.n} step={step}/>)}
    </div>
  );
}

function Step({step}){
  const [open,setOpen]=useState(step.n==="01");
  return(
    <div className="glass" style={{borderRadius:3,overflow:"hidden",border:`1px solid ${step.color}18`,marginBottom:12}}>
      <button onClick={()=>setOpen(!open)} style={{width:"100%",padding:"15px 20px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
        <span style={{fontSize:"0.56rem",fontFamily:"monospace",color:step.color,background:`${step.color}14`,padding:"3px 8px",borderRadius:2,letterSpacing:"0.1em",flexShrink:0}}>{step.n}</span>
        <p style={{flex:1,fontSize:"0.82rem",color:"#d8d0c0",fontWeight:500,letterSpacing:"0.04em"}}>{step.title}</p>
        {open?<ChevronUp size={13} style={{color:"#444",flexShrink:0}}/>:<ChevronDown size={13} style={{color:"#444",flexShrink:0}}/>}
      </button>
      {open&&<div style={{padding:"0 20px 20px"}}>{step.body}</div>}
    </div>
  );
}

function Code({text,label,k,copy,cp}){
  return(
    <div style={{borderRadius:2,overflow:"hidden"}}>
      <div style={{padding:"6px 12px",background:"rgba(201,168,76,0.07)",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:"0.52rem",color:"#555",fontFamily:"monospace",letterSpacing:"0.12em"}}>{label}</span>
        <button onClick={()=>copy(text,k)} style={{background:"none",border:"none",cursor:"pointer",color:cp===k?"#6acc6a":"#555",display:"flex",alignItems:"center",gap:5,fontSize:"0.54rem",fontFamily:"Jost,sans-serif",transition:"color 0.2s",letterSpacing:"0.1em"}}>
          {cp===k?<><CheckCircle size={10}/>Copiado</>:<><Copy size={10}/>Copiar</>}
        </button>
      </div>
      <pre style={{background:"rgba(0,0,0,0.4)",padding:"13px 16px",overflowX:"auto",fontSize:"0.7rem",color:"#a8c9a8",lineHeight:1.7,margin:0,fontFamily:"monospace"}}>{text}</pre>
    </div>
  );
}

function SectionTitle({icon,label}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:16}}>
      <span style={{fontSize:"0.9rem"}}>{icon}</span>
      <span style={{fontSize:"0.56rem",letterSpacing:"0.24em",color:"#666",textTransform:"uppercase"}}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN LOGIN MODAL
// ═══════════════════════════════════════════════════════════════
function AdminLoginModal({onResult}){
  const [pass,setPass]       = useState("");
  const [error,setError]     = useState(false);
  const [shaking,setShaking] = useState(false);
  const [visible,setVisible] = useState(false);
  const [loading,setLoading] = useState(false);
  const inputRef             = useRef(null);

  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(),80); },[]);

  const attempt=async()=>{
    if(!pass||loading) return;
    setLoading(true);
    const result = await onResult(pass);
    setLoading(false);
    if(result==="wrong"){
      setError(true); setShaking(true); setPass("");
      setTimeout(()=>setShaking(false),440);
      setTimeout(()=>setError(false),2800);
      inputRef.current?.focus();
    }
    // "ok" → onResult ya cerró el modal y navegó al admin
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {/* Backdrop */}
      <div onClick={()=>onResult(null)}
        style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(12px)"}}/>

      {/* Modal */}
      <div style={{
        position:"relative",zIndex:1,
        width:"min(360px,calc(100vw - 40px))",
        background:"#0d0d0d",
        border:`1px solid ${error?"rgba(200,80,80,0.3)":"rgba(255,255,255,0.07)"}`,
        borderRadius:4,
        padding:"36px 30px 28px",
        boxShadow:"0 32px 80px rgba(0,0,0,0.85)",
        transition:"border-color 0.3s",
        animation:shaking
          ? "loginShake 0.42s cubic-bezier(0.36,0.07,0.19,0.97)"
          : "slideUp 0.26s ease both",
      }}>
        {/* Icono */}
        <div style={{
          width:48,height:48,borderRadius:"50%",margin:"0 auto 22px",
          background:error?"rgba(200,80,80,0.1)":"rgba(201,168,76,0.09)",
          border:`1px solid ${error?"rgba(200,80,80,0.25)":"rgba(201,168,76,0.2)"}`,
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"all 0.3s",
        }}>
          <Lock size={20} style={{color:error?"#c97a7a":"#c9a84c",transition:"color 0.3s"}}/>
        </div>

        {/* Título */}
        <h2 className="serif" style={{fontSize:"1.45rem",fontWeight:300,color:"#e8e0d0",textAlign:"center",marginBottom:5}}>
          Acceso Restringido
        </h2>
        <p style={{fontSize:"0.56rem",color:"#3a3530",letterSpacing:"0.22em",textTransform:"uppercase",textAlign:"center",marginBottom:26}}>
          Panel de Administración · DIFRUMARKET
        </p>

        {/* Input contraseña */}
        <div style={{position:"relative",marginBottom:14}}>
          <input
            ref={inputRef}
            type={visible?"text":"password"}
            className="fi"
            placeholder="Contraseña"
            value={pass}
            onChange={e=>{setPass(e.target.value);setError(false);}}
            onKeyDown={e=>e.key==="Enter"&&attempt()}
            style={{
              paddingRight:42,
              borderColor:error?"rgba(200,80,80,0.45)":"rgba(255,255,255,0.07)",
              background:error?"rgba(200,80,80,0.04)":"rgba(255,255,255,0.03)",
              letterSpacing:visible?"0.04em":"0.25em",
              fontSize:visible?"0.8rem":"1.1rem",
              transition:"border-color 0.25s, background 0.25s",
            }}
          />
          <button onClick={()=>setVisible(v=>!v)}
            style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",
              background:"none",border:"none",cursor:"pointer",
              color:"#2a2520",padding:4,transition:"color 0.2s",lineHeight:0}}
            onMouseEnter={e=>e.currentTarget.style.color="#777"}
            onMouseLeave={e=>e.currentTarget.style.color="#2a2520"}>
            {visible?<EyeOff size={14}/>:<Eye size={14}/>}
          </button>
        </div>

        {/* Mensaje de error */}
        <div style={{height:18,marginBottom:14}}>
          {error&&(
            <p style={{fontSize:"0.6rem",color:"#c97a7a",textAlign:"center",
              letterSpacing:"0.08em",animation:"fadeUp 0.2s ease"}}>
              Contraseña incorrecta. Intentá de nuevo.
            </p>
          )}
        </div>

        {/* Botones */}
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>onResult(null)}
            style={{flex:1,padding:"11px",borderRadius:2,background:"none",
              border:"1px solid rgba(255,255,255,0.07)",color:"#555",cursor:"pointer",
              fontFamily:"Jost,sans-serif",fontSize:"0.62rem",letterSpacing:"0.14em",
              textTransform:"uppercase",transition:"all 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.16)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>
            Cancelar
          </button>
          <button onClick={attempt} disabled={!pass||loading}
            className="gold"
            style={{flex:2,padding:"11px",borderRadius:2,
              display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loading
              ? <span style={{width:14,height:14,border:"2px solid rgba(6,6,6,0.3)",borderTopColor:"#060606",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block"}}/>
              : <><Lock size={13}/>Ingresar</>
            }
          </button>
        </div>

        {/* Hint */}
        <p style={{textAlign:"center",marginTop:18,fontSize:"0.5rem",
          color:"#1e1e1e",letterSpacing:"0.14em",textTransform:"uppercase"}}>
          Sesión activa hasta cerrar el navegador
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOADING
// ═══════════════════════════════════════════════════════════════
function LoadingScreen(){
  return(
    <div style={{height:"65vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18}}>
      <div style={{width:38,height:38,border:"1px solid rgba(201,168,76,0.35)",borderTopColor:"#c9a84c",borderRadius:"50%",animation:"spin 0.85s linear infinite"}}/>
      <p style={{fontSize:"0.58rem",letterSpacing:"0.4em",color:"#333",textTransform:"uppercase"}}>Cargando catálogo</p>
      <div style={{display:"flex",gap:16,marginTop:16}}>
        {[1,2,3].map(i=><div key={i} className="sk" style={{width:190,height:210,borderRadius:3,opacity:0.4}}/>)}
      </div>
    </div>
  );
}
