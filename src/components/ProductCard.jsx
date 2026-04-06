import { Plus, Truck } from "lucide-react";
import { calcSalePrice, fmt } from "../utils/pricing.js";

export default function ProductCard({ product, margin, inCart, onAdd, delay }) {
  const salePrice = calcSalePrice(product.cost, margin);

  const bg = {
    Nueces:  "linear-gradient(135deg, #1c1508 0%, #0e0b04 100%)",
    Mezclas: "linear-gradient(135deg, #0d1308 0%, #060a04 100%)",
    Frutas:  "linear-gradient(135deg, #150a0a 0%, #0a0505 100%)",
  }[product.category] || "linear-gradient(135deg, #111 0%, #080808 100%)";

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
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            loading="lazy"
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
      <div style={{ padding: "20px 22px 24px" }}>
        <h3 className="serif" style={{
          fontSize: "1.12rem", fontWeight: 400,
          color: "#e0d8c8", marginBottom: 5,
        }}>
          {product.name}
        </h3>
        <p style={{ fontSize: "0.62rem", color: "#4a4540", letterSpacing: "0.18em", marginBottom: 18 }}>
          {product.unit}
        </p>
        <p style={{fontSize:"0.52rem",color:product.tipo_producto==="bulto_10kg"?"#6acc6a":"#888",marginBottom:16,display:"flex",alignItems:"center",gap:4}}><Truck size={10}/> {product.tipo_producto==="bulto_10kg"?"Envío gratis en primer pedido":"Envío a cargo del comprador"}</p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="serif" style={{ fontSize: "1.5rem", fontWeight: 300, color: "#c9a84c" }}>
            {fmt(salePrice)}
          </span>
          <button
            onClick={onAdd}
            className="btn-gold"
            aria-label={`Agregar ${product.name} al carrito, ${fmt(salePrice)}`}
            style={{ padding: "9px 16px", borderRadius: 2, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={11} aria-hidden="true" />
            {inCart > 0 ? `Agregar (${inCart})` : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
