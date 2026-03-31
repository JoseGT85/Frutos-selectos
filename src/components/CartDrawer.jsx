import { useEffect, useRef } from "react";
import { X, Plus, Minus, Package, MessageCircle, ChevronRight, Trash2 } from "lucide-react";
import { calcSalePrice, fmt } from "../utils/pricing.js";

export default function CartDrawer({ cart, margin, cartTotal, cartCount, updateQty, removeFromCart, clearCart, onClose, onWhatsApp }) {
  const drawerRef = useRef(null);
  const closeRef  = useRef(null);

  // ── Focus trap: atrapar el foco dentro del drawer ──────────────────────
  useEffect(() => {
    // Guardar el elemento que tenía el foco antes de abrir
    const previousFocus = document.activeElement;

    // Foco al botón cerrar al montar
    closeRef.current?.focus();

    // Manejar Escape para cerrar
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
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
      // Restaurar foco al cerrar
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100 }}
      role="dialog"
      aria-modal="true"
      aria-label="Carrito de compras"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
        }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: "min(430px, 100vw)",
          background: "#0d0d0d",
          borderLeft: "1px solid rgba(255,255,255,0.055)",
          display: "flex", flexDirection: "column",
          animation: "slideIn 0.32s cubic-bezier(0.4,0,0.2,1) both",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "22px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.055)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h2 className="serif" style={{ fontSize: "1.3rem", fontWeight: 300, color: "#e8e0d0" }}>
              Tu Pedido
            </h2>
            <p style={{ fontSize: "0.58rem", letterSpacing: "0.25em", color: "#555", textTransform: "uppercase", marginTop: 3 }}>
              {cartCount} artículo{cartCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                aria-label="Vaciar carrito"
                style={{
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: 8, borderRadius: 2,
                  cursor: "pointer", color: "#555",
                  transition: "color 0.2s, border-color 0.2s",
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: "0.54rem", fontFamily: "Jost, sans-serif",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#c97a7a"; e.currentTarget.style.borderColor = "rgba(200,80,80,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                <Trash2 size={12} aria-hidden="true" />
                Vaciar
              </button>
            )}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Cerrar carrito"
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: 8, borderRadius: 2,
                cursor: "pointer", color: "#666",
                transition: "color 0.2s",
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 28px" }} role="list" aria-label="Productos en el carrito">
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#333" }}>
              <Package size={34} style={{ margin: "0 auto 14px", display: "block" }} aria-hidden="true" />
              <p style={{ fontSize: "0.78rem", letterSpacing: "0.12em" }}>
                Tu carrito está vacío
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const price = calcSalePrice(item.cost, margin);
              return (
                <div key={item.id} role="listitem" style={{
                  padding: "16px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <span style={{ fontSize: "1.7rem", flexShrink: 0 }} aria-hidden="true">{item.emoji}</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="serif" style={{ fontSize: "0.95rem", color: "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: "0.62rem", color: "#c9a84c", marginTop: 2 }}>
                      {fmt(price)} × unidad
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} role="group" aria-label={`Cantidad de ${item.name}`}>
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(item.id, -1)}
                      aria-label={`Reducir cantidad de ${item.name}`}
                    >
                      <Minus size={11} aria-hidden="true" />
                    </button>
                    <span style={{ fontSize: "0.88rem", color: "#e8e0d0", minWidth: 20, textAlign: "center" }} aria-live="polite">
                      {item.qty}
                    </span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(item.id, 1)}
                      aria-label={`Aumentar cantidad de ${item.name}`}
                    >
                      <Plus size={11} aria-hidden="true" />
                    </button>
                  </div>

                  {/* Subtotal + remove */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: "0.9rem", color: "#e8e0d0" }}>
                      {fmt(price * item.qty)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Quitar ${item.name} del carrito`}
                      style={{
                        background: "none", border: "none",
                        cursor: "pointer", color: "#3a3530",
                        fontSize: "0.58rem", letterSpacing: "0.1em",
                        marginTop: 4, transition: "color 0.2s",
                        fontFamily: "Jost, sans-serif",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#c97a7a"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "#3a3530"}
                    >
                      quitar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Checkout */}
        <div style={{
          padding: "22px 28px",
          borderTop: "1px solid rgba(255,255,255,0.055)",
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: "0.62rem", letterSpacing: "0.28em", color: "#555", textTransform: "uppercase" }}>
                Total estimado
              </span>
              <span className="serif" style={{ fontSize: "2rem", fontWeight: 300, color: "#c9a84c" }} aria-live="polite">
                {fmt(cartTotal)}
              </span>
            </div>
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)" }} />
          </div>

          <button
            id="whatsapp-checkout"
            onClick={onWhatsApp}
            disabled={cart.length === 0}
            className="btn-gold"
            aria-label={`Finalizar pedido por WhatsApp. Total: ${fmt(cartTotal)}`}
            style={{
              width: "100%", padding: "14px",
              borderRadius: 2, display: "flex",
              alignItems: "center", justifyContent: "center",
              gap: 10, fontSize: "0.7rem", letterSpacing: "0.15em",
            }}
          >
            <MessageCircle size={15} aria-hidden="true" />
            Finalizar por WhatsApp
            <ChevronRight size={14} aria-hidden="true" />
          </button>

          <p style={{
            textAlign: "center", marginTop: 12,
            fontSize: "0.56rem", color: "#3a3530",
            letterSpacing: "0.15em", textTransform: "uppercase",
          }}>
            Se abrirá WhatsApp con tu pedido completo
          </p>
        </div>
      </div>
    </div>
  );
}
