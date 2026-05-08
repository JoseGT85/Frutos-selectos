import { useState } from "react";
import { Plus } from "lucide-react";
import { calcSalePrice, fmt } from "../utils/pricing.js";

export default function ProductCard({ product, margin, inCart, onAdd, delay }) {
  const salePrice = calcSalePrice(product.cost, margin);

  const bg = {
    Nueces:  "linear-gradient(135deg, #1c1508 0%, #0e0b04 100%)",
    Mezclas: "linear-gradient(135deg, #0d1308 0%, #060a04 100%)",
    Frutas:  "linear-gradient(135deg, #150a0a 0%, #0a0505 100%)",
  }[product.category] || "linear-gradient(135deg, #111 0%, #080808 100%)";

  const [imgError, setImgError] = useState(false);

  const productWeight = product.tipo_producto === "bulto_10kg" ? 10 * inCart : (product.peso_kg || 0) * inCart;
  const productTotal = salePrice * inCart;
  // Envío gratis solo depende del monto ($400.000). Los 10 kg son compra mínima, no condición de envío.
  const qualifiesFreeShipping = productTotal >= 400000;

  return (
    <article
      className="card-hover glass anim-in"
      style={{ borderRadius: 3, overflow: "hidden", animationDelay: `${delay}ms` }}
      aria-label={`${product.name}, ${product.unit}, ${fmt(salePrice)}`}
    >
      {/* Image area */}
      <div style={{
        height: 210, background: bg, position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {product.imageUrl && !imgError ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <>
            {/* Radial glow */}
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 35% 45%, rgba(201,168,76,0.07) 0%, transparent 65%)",
            }} aria-hidden="true" />
            {/* Subtle grid texture */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }} aria-hidden="true" />
            <span style={{ fontSize: "3.8rem", position: "relative", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))" }} aria-hidden="true">
              {product.emoji}
            </span>
          </>
        )}
        <span className="tag-pill" style={{ position: "absolute", top: 14, right: 14 }}>
          {product.category}
        </span>
        {inCart > 0 && (
          <span
            className="badge-bounce"
            key={inCart}
            style={{
              position: "absolute", top: 14, left: 14,
              background: "#c9a84c", color: "#070707",
              borderRadius: "50%", width: 22, height: 22,
              fontSize: "0.65rem", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label={`${inCart} en el carrito`}
          >
            {inCart}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "20px 22px 22px" }}>
        <h3 className="serif" style={{
          fontSize: "1.15rem", fontWeight: 400,
          color: "#e0d8c8", marginBottom: 4, lineHeight: 1.2,
        }}>
          {product.name}
        </h3>
        <p style={{ fontSize: "0.6rem", color: "#4a4540", letterSpacing: "0.15em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          {product.unit}
          {product.tipo_producto === "bulto_10kg" && (
            <span style={{ fontSize: "0.5rem", background: "rgba(201,168,76,0.08)", color: "#c9a84c", padding: "1px 6px", borderRadius: 8, letterSpacing: "0.08em" }}>BULTO</span>
          )}
        </p>

        {/* Zona de precio — glass aislada */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 4, padding: "12px 14px", marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span className="serif" style={{ fontSize: "1.45rem", fontWeight: 300, color: "#c9a84c", lineHeight: 1 }}>
              {fmt(calcSalePrice(product.costPerKg || (product.cost / (product.peso_kg || 1)), margin))}
              <span style={{ fontSize: "0.78rem", fontWeight: 400, color: "#666", marginLeft: 3 }}>/ kg</span>
            </span>
            {product.tipo_producto === "bulto_10kg" && (
              <span style={{ fontSize: "0.5rem", color: "#888", letterSpacing: "0.04em" }}>
                Bulto {product.peso_kg || 10} kg
              </span>
            )}
          </div>
          {product.tipo_producto !== "bulto_10kg" && product.peso_kg > 0 && product.peso_kg !== 1 && (
            <span style={{ fontSize: "0.5rem", color: "#555", marginTop: 4, display: "block", letterSpacing: "0.04em" }}>
              Presentación: {product.unit}
            </span>
          )}
        </div>

        {/* Indicador de envío */}
        <p style={{
          fontSize: "0.52rem", 
          color: qualifiesFreeShipping ? "#6acc6a" : "#666", 
          marginBottom: 14, display: "flex", alignItems: "center", gap: 5,
          letterSpacing: "0.06em",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
            background: qualifiesFreeShipping ? "#6acc6a" : "#444",
            boxShadow: qualifiesFreeShipping ? "0 0 6px rgba(106,204,106,0.4)" : "none",
          }} />
          {qualifiesFreeShipping ? "Envío gratis en tu 1° compra" : "Envío a cargo del comprador"}
        </p>

        {/* Botón full-width */}
        <button
          onClick={onAdd}
          className="btn-gold"
          aria-label={`Agregar ${product.name} al carrito`}
          style={{
            width: "100%", padding: "10px 16px", borderRadius: 2,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: inCart > 0 ? "linear-gradient(135deg, #c9a84c, #dbbe6a)" : "#c9a84c",
          }}
        >
          <Plus size={12} aria-hidden="true" />
          {inCart > 0 ? `Agregar otra (${inCart} en carrito)` : "Agregar al carrito"}
        </button>
      </div>
    </article>
  );
}
