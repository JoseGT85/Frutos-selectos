import { X, Plus, Minus, Package, MessageCircle, ChevronRight } from "lucide-react";
import { calcSalePrice, fmt } from "../utils/pricing.js";

export default function CartDrawer({ cart, margin, cartTotal, cartCount, updateQty, removeFromCart, onClose, onWhatsApp }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: "min(430px, 100vw)",
        background: "#0d0d0d",
        borderLeft: "1px solid rgba(255,255,255,0.055)",
        display: "flex", flexDirection: "column",
        animation: "slideIn 0.32s cubic-bezier(0.4,0,0.2,1) both",
      }}>
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
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: 8, borderRadius: 2,
              cursor: "pointer", color: "#666",
              transition: "color 0.2s",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 28px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#333" }}>
              <Package size={34} style={{ margin: "0 auto 14px", display: "block" }} />
              <p style={{ fontSize: "0.78rem", letterSpacing: "0.12em" }}>
                Tu carrito está vacío
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const price = calcSalePrice(item.cost, margin);
              return (
                <div key={item.id} style={{
                  padding: "16px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <span style={{ fontSize: "1.7rem", flexShrink: 0 }}>{item.emoji}</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="serif" style={{ fontSize: "0.95rem", color: "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: "0.62rem", color: "#c9a84c", marginTop: 2 }}>
                      {fmt(price)} × unidad
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>
                      <Minus size={11} />
                    </button>
                    <span style={{ fontSize: "0.88rem", color: "#e8e0d0", minWidth: 20, textAlign: "center" }}>
                      {item.qty}
                    </span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Subtotal + remove */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: "0.9rem", color: "#e8e0d0" }}>
                      {fmt(price * item.qty)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
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
              <span className="serif" style={{ fontSize: "2rem", fontWeight: 300, color: "#c9a84c" }}>
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
            style={{
              width: "100%", padding: "14px",
              borderRadius: 2, display: "flex",
              alignItems: "center", justifyContent: "center",
              gap: 10, fontSize: "0.7rem", letterSpacing: "0.15em",
            }}
          >
            <MessageCircle size={15} />
            Finalizar por WhatsApp
            <ChevronRight size={14} />
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
