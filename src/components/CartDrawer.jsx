import { useEffect, useRef, useState } from "react";
import { X, Plus, Minus, Package, MessageCircle, ChevronRight, Trash2 } from "lucide-react";
import { calcSalePrice, fmt } from "../utils/pricing.js";

const PROVINCIAS = [
  "Mendoza", "Buenos Aires", "CABA", "Cordoba", "Santa Fe", "San Luis", "San Juan", "Otro"
];

const TARIFAS = {
  "Mendoza": 0, "Buenos Aires": 8500, "CABA": 8500, "Cordoba": 7500, "Santa Fe": 7500, "San Luis": 6000, "San Juan": 6000, "Otro": 9500
};

export default function CartDrawer({ cart, margin, cartTotal, cartCount, updateQty, removeFromCart, clearCart, onClose, onWhatsApp }) {
  const drawerRef = useRef(null);
  const closeRef  = useRef(null);
  
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [formData, setFormData] = useState({ name:"", lastname:"", email:"", phone:"", address:"", cuit:"", province:"Mendoza" });
  const [submitting, setSubmitting] = useState(false);
  const totalKg = cart.reduce((s,i) => s + ((i.peso_kg || 1) * i.qty), 0);

  // ── Focus trap: atrapar el foco dentro del drawer ──────────────────────
  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const handleProceed = async () => {
    if (!formData.name || !formData.lastname || !formData.phone || !formData.address || !formData.province) {
      return alert("Por favor completá los datos obligatorios (Nombre, Apellido, Teléfono, Provincia y Dirección)");
    }
    setSubmitting(true);
    try {
      const _isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const BACKEND_URL = _isLocal ? (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000") : "";
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientData: formData, cartData: cart, totalKg, totalAmount: cartTotal })
      });
      if (!res.ok) throw new Error("Error del servidor al validar orden");
      const data = await res.json();
      
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl; // Redirigir a Mercado Pago
      } else {
        onWhatsApp(data.order.shippingStatus, totalKg, formData);
        onClose();
      }
    } catch (e) {
      alert("Error al procesar el pago. Intentando por WhatsApp...");
      onWhatsApp("Error en pasarela (Pago pendiente)", totalKg, formData);
      onClose();
    }
  };

  const getShippingCost = () => {
    if (totalKg >= 10 && cartTotal >= 400000) return 0; // Podríamos validar si es 1ra compra en backend
    return TARIFAS[formData.province] || TARIFAS["Otro"];
  };

  const shippingCost = getShippingCost();

  const fv = (k,v) => setFormData(p => ({...p, [k]: v}));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100 }} role="dialog" aria-modal="true" aria-label="Carrito de compras">
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }} aria-hidden="true" />

      <div ref={drawerRef} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: "min(430px, 100vw)", background: "#0d0d0d",
        borderLeft: "1px solid rgba(255,255,255,0.055)", display: "flex", flexDirection: "column",
        animation: "slideIn 0.32s cubic-bezier(0.4,0,0.2,1) both",
      }}>
        <div style={{ padding: "22px 28px", borderBottom: "1px solid rgba(255,255,255,0.055)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            {checkoutStep && <button onClick={()=>setCheckoutStep(false)} style={{background:"none",border:"none",color:"#c9a84c",cursor:"pointer"}} aria-label="Volver atrás"><ChevronRight size={16} style={{transform:"rotate(180deg)"}}/></button>}
            <div>
              <h2 className="serif" style={{ fontSize: "1.3rem", fontWeight: 300, color: "#e8e0d0" }}>{checkoutStep?"Tus Datos":"Tu Pedido"}</h2>
              <p style={{ fontSize: "0.58rem", letterSpacing: "0.25em", color: "#555", textTransform: "uppercase", marginTop: 3 }}>
                {checkoutStep ? "Paso Final" : `${cartCount} artículo${cartCount !== 1 ? "s" : ""} · ${totalKg.toFixed(2)} kg`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!checkoutStep && cart.length > 0 && (
              <button onClick={clearCart} aria-label="Vaciar carrito" style={{
                background: "none", border: "1px solid rgba(255,255,255,0.08)", padding: 8, borderRadius: 2, cursor: "pointer", color: "#555",
                transition: "color 0.2s, border-color 0.2s", display: "flex", alignItems: "center", gap: 5, fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase",
              }} onMouseEnter={(e) => { e.currentTarget.style.color = "#c97a7a"; e.currentTarget.style.borderColor = "rgba(200,80,80,0.3)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
                <Trash2 size={12} aria-hidden="true" /> Vaciar
              </button>
            )}
            <button ref={closeRef} onClick={onClose} aria-label="Cerrar carrito" style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", padding: 8, borderRadius: 2, cursor: "pointer", color: "#666", transition: "color 0.2s" }}><X size={14} aria-hidden="true" /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 28px" }} role="list" aria-label="Productos en el carrito">
          {!checkoutStep ? (
            cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0", color: "#333" }}>
                <Package size={34} style={{ margin: "0 auto 14px", display: "block" }} aria-hidden="true" />
                <p style={{ fontSize: "0.78rem", letterSpacing: "0.12em" }}>Tu carrito está vacío</p>
              </div>
            ) : (
              cart.map((item) => {
                const price = calcSalePrice(item.cost, margin);
                return (
                  <div key={item.id} role="listitem" style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: "1.7rem", flexShrink: 0 }} aria-hidden="true">{item.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="serif" style={{ fontSize: "0.95rem", color: "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                      <p style={{ fontSize: "0.62rem", color: "#c9a84c", marginTop: 2, display:"flex", alignItems:"center", gap:6 }}>
                        {fmt(price)} × unidad <span style={{color:"#555"}}>· {(item.peso_kg||1)}kg</span>
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} role="group" aria-label={`Cantidad de ${item.name}`}>
                      <button className="qty-btn" onClick={() => updateQty(item.id, -1)} aria-label={`Reducir cantidad de ${item.name}`}><Minus size={11} aria-hidden="true" /></button>
                      <span style={{ fontSize: "0.88rem", color: "#e8e0d0", minWidth: 20, textAlign: "center" }} aria-live="polite">{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.id, 1)} aria-label={`Aumentar cantidad de ${item.name}`}><Plus size={11} aria-hidden="true" /></button>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: "0.9rem", color: "#e8e0d0" }}>{fmt(price * item.qty)}</p>
                      <button onClick={() => removeFromCart(item.id)} aria-label={`Quitar ${item.name} del carrito`} style={{ background: "none", border: "none", cursor: "pointer", color: "#3a3530", fontSize: "0.58rem", letterSpacing: "0.1em", marginTop: 4, transition: "color 0.2s", fontFamily: "Jost, sans-serif" }} onMouseEnter={(e) => e.currentTarget.style.color = "#c97a7a"} onMouseLeave={(e) => e.currentTarget.style.color = "#3a3530"}>quitar</button>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            <div style={{padding:"12px 0",display:"flex",flexDirection:"column",gap:14}} className="anim-in">
              <p style={{fontSize:"0.62rem",color:"#888",marginBottom:8}}>Completá tus datos para agilizar el envío y validar si aplicás a beneficios de compra.</p>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Nombre *</p><input style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:3,color:"#e8e0d0",padding:"10px 14px",width:"100%",outline:"none"}} autoFocus value={formData.name} onChange={e=>fv("name",e.target.value)} /></div>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Apellido *</p><input style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:3,color:"#e8e0d0",padding:"10px 14px",width:"100%",outline:"none"}} value={formData.lastname} onChange={e=>fv("lastname",e.target.value)} /></div>
              </div>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Teléfono (WA) *</p><input style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:3,color:"#e8e0d0",padding:"10px 14px",width:"100%",outline:"none"}} type="tel" value={formData.phone} onChange={e=>fv("phone",e.target.value)} /></div>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>CUIT / CUIL</p><input style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:3,color:"#e8e0d0",padding:"10px 14px",width:"100%",outline:"none"}} value={formData.cuit} onChange={e=>fv("cuit",e.target.value)} /></div>
              </div>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Provincia *</p>
                  <select 
                    style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:3,color:"#e8e0d0",padding:"10px 14px",width:"100%",outline:"none"}}
                    value={formData.province} 
                    onChange={e=>fv("province", e.target.value)}
                  >
                    {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Dirección de Envío *</p><input style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:3,color:"#e8e0d0",padding:"10px 14px",width:"100%",outline:"none"}} value={formData.address} onChange={e=>fv("address",e.target.value)} /></div>
              </div>
              <div><p style={{fontSize:"0.56rem",color:"#555",marginBottom:4}}>Email (Opcional)</p><input style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:3,color:"#e8e0d0",padding:"10px 14px",width:"100%",outline:"none"}} type="email" value={formData.email} onChange={e=>fv("email",e.target.value)} /></div>
            </div>
          )}
        </div>

        <div style={{ padding: "22px 28px", borderTop: "1px solid rgba(255,255,255,0.055)", background:(totalKg>=10 && cartTotal>=400000 && !checkoutStep)?"rgba(100,200,100,0.03)":"transparent" }}>
          {!checkoutStep && cart.length > 0 && (
            <div style={{
              marginBottom: 18, padding: "16px 18px",
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: 4,
            }}>
              {/* Compra Mínima */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                <span style={{ fontSize: "0.56rem", letterSpacing: "0.22em", color: "#777", textTransform: "uppercase" }}>Requisitos del Pedido</span>
              </div>

              {/* Progress bar — Compra Mínima (Peso) */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: "0.54rem", color: totalKg >= 10 ? "#6acc6a" : "#c9a84c", letterSpacing: "0.08em", fontWeight: 500 }}>
                    {totalKg >= 10 ? "✓ Mínimo alcanzado" : `Faltan ${(10 - totalKg).toFixed(1)} kg para el mínimo`}
                  </span>
                  <span style={{ fontSize: "0.54rem", color: "#555" }}>Mín. 10 kg</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${Math.min(100, (totalKg / 10) * 100)}%`,
                    background: totalKg >= 10 ? "linear-gradient(90deg, #4a9a4a, #6acc6a)" : "linear-gradient(90deg, #8a7335, #c9a84c)",
                    transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
                  }} />
                </div>
              </div>

              {/* Progress bar — Envío Gratis (Solo 1° Compra) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: "0.54rem", color: cartTotal >= 400000 ? "#6acc6a" : "#888", letterSpacing: "0.08em" }}>
                    {cartTotal >= 400000 ? "✓ Envío Gratis (1° compra)" : `Faltan ${fmt(400000 - cartTotal)} para envío gratis`}
                  </span>
                  <span style={{ fontSize: "0.54rem", color: "#555" }}>{fmt(400000)}</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${Math.min(100, (cartTotal / 400000) * 100)}%`,
                    background: cartTotal >= 400000 ? "linear-gradient(90deg, #4a9a4a, #6acc6a)" : "rgba(255,255,255,0.1)",
                    transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Resumen de totales */}
          <div style={{ marginBottom: 20 }}>
            {checkoutStep && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "0.56rem", color: "#555", letterSpacing: "0.06em" }}>Envío a {formData.province}</span>
                <span style={{ fontSize: "0.7rem", color: shippingCost === 0 ? "#6acc6a" : "#aaa" }}>
                  {shippingCost === 0 ? "GRATIS" : fmt(shippingCost)}
                </span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: "0.62rem", letterSpacing: "0.28em", color: "#555", textTransform: "uppercase" }}>Total a Pagar</span>
              <span style={{ borderBottom: "1px dotted rgba(255,255,255,0.06)", flex: 1, margin: "0 10px" }}></span>
              <span className="serif" style={{ fontSize: "2rem", fontWeight: 300, color: "#c9a84c" }} aria-live="polite">{fmt(cartTotal + shippingCost)}</span>
            </div>
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)" }} />
          </div>

          {!checkoutStep ? (
            <button 
              onClick={()=>setCheckoutStep(true)} 
              disabled={cart.length === 0 || totalKg < 10} 
              className="btn-gold" 
              aria-label={`Continuar checkout`} 
              style={{ 
                width: "100%", padding: "14px", borderRadius: 2, 
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10, 
                fontSize: "0.7rem", letterSpacing: "0.15em",
                opacity: (cart.length === 0 || totalKg < 10) ? 0.5 : 1,
                cursor: (cart.length === 0 || totalKg < 10) ? "not-allowed" : "pointer"
              }}>
              {totalKg < 10 ? `Faltan ${(10 - totalKg).toFixed(1)} kg para comprar` : <>Continuar <ChevronRight size={14} aria-hidden="true" /></>}
            </button>
          ) : (
            <button onClick={handleProceed} disabled={submitting} className="btn-gold" aria-label={`Pagar con Mercado Pago`} style={{ width: "100%", padding: "14px", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: "0.7rem", letterSpacing: "0.15em", background:submitting?"#555":"linear-gradient(135deg,#c9a84c,#dbbe6a)" }}>
              <DollarSign size={15} aria-hidden="true" /> {submitting ? "Cargando Pago..." : "Pagar con Mercado Pago"}
            </button>
          )}

          <p style={{ textAlign: "center", marginTop: 12, fontSize: "0.56rem", color: "#3a3530", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {checkoutStep ? "Tus datos se guardarán de forma segura" : "Checkout seguro"}
          </p>

        </div>
      </div>
    </div>
  );
}
