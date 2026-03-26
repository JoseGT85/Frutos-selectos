import { useState } from "react";
import {
  RefreshCw, Lock, TrendingUp, DollarSign,
  Eye, EyeOff, CheckCircle, AlertCircle
} from "lucide-react";
import { calcSalePrice, fmt } from "../utils/pricing.js";

export default function AdminView({ products, margin, setMargin, syncing, syncStatus, onSync }) {
  const [showCosts, setShowCosts] = useState(false);

  const rangeStyle = { "--pct": `${margin}%` };

  return (
    <main style={{ maxWidth: 1020, margin: "0 auto", padding: "52px 28px 100px" }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 52 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Lock size={11} style={{ color: "#c9a84c" }} />
            <p style={{ fontSize: "0.56rem", letterSpacing: "0.38em", color: "#4a4540", textTransform: "uppercase" }}>
              Panel Interno — Solo Administradores
            </p>
          </div>
          <h2 className="serif" style={{ fontSize: "2.2rem", fontWeight: 300, color: "#e8e0d0", lineHeight: 1.1 }}>
            Gestión de{" "}
            <em style={{ color: "#c9a84c", fontStyle: "italic" }}>Precios</em>
          </h2>
        </div>

        {/* Sync button */}
        <button
          id="sync-button"
          onClick={onSync}
          disabled={syncing}
          style={{
            background: "none",
            border: "1px solid rgba(201,168,76,0.28)",
            color: "#c9a84c",
            padding: "10px 20px", borderRadius: 2,
            cursor: syncing ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 8,
            fontSize: "0.65rem", letterSpacing: "0.2em",
            textTransform: "uppercase", fontFamily: "Jost, sans-serif",
            opacity: syncing ? 0.55 : 1,
            transition: "all 0.2s",
          }}
        >
          <RefreshCw size={13} style={{ animation: syncing ? "spin 0.9s linear infinite" : "none" }} />
          {syncing ? "Sincronizando…" : "Sincronizar"}
        </button>
      </div>

      {/* Sync status banner */}
      {syncStatus === "ok" && (
        <div style={{
          background: "rgba(100,180,100,0.05)",
          border: "1px solid rgba(100,180,100,0.2)",
          borderRadius: 2, padding: "10px 16px",
          marginBottom: 24, display: "flex", alignItems: "center", gap: 10,
          fontSize: "0.68rem", color: "#80b880", letterSpacing: "0.08em",
        }}>
          <CheckCircle size={13} />
          Datos sincronizados · {new Date().toLocaleTimeString("es-AR")} — {products.length} productos cargados
        </div>
      )}
      {syncStatus === "err" && (
        <div style={{
          background: "rgba(180,80,80,0.05)",
          border: "1px solid rgba(180,80,80,0.2)",
          borderRadius: 2, padding: "10px 16px",
          marginBottom: 24, display: "flex", alignItems: "center", gap: 10,
          fontSize: "0.68rem", color: "#c88080", letterSpacing: "0.08em",
        }}>
          <AlertCircle size={13} />
          Error al sincronizar. Verifique el endpoint de la API.
        </div>
      )}

      {/* Margin control card */}
      <div className="glass anim-in" style={{ padding: "30px 32px", borderRadius: 3, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <TrendingUp size={13} style={{ color: "#c9a84c" }} />
          <span style={{ fontSize: "0.6rem", letterSpacing: "0.28em", color: "#777", textTransform: "uppercase" }}>
            Margen de Rentabilidad Global
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <input
            type="range" min={0} max={100} step={1}
            value={margin}
            style={{ ...rangeStyle, flex: 1 }}
            onChange={(e) => setMargin(+e.target.value)}
          />
          <span className="serif" style={{ fontSize: "2.2rem", fontWeight: 300, color: "#c9a84c", minWidth: 90, textAlign: "right" }}>
            {margin}%
          </span>
        </div>

        {/* Quick presets */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {[10, 15, 20, 25, 30, 50].map((v) => (
            <button
              key={v}
              onClick={() => setMargin(v)}
              style={{
                padding: "5px 12px", borderRadius: 20,
                border: `1px solid ${margin === v ? "#c9a84c" : "rgba(255,255,255,0.06)"}`,
                background: margin === v ? "rgba(201,168,76,0.1)" : "none",
                color: margin === v ? "#c9a84c" : "#555",
                fontSize: "0.65rem", cursor: "pointer",
                fontFamily: "Jost, sans-serif",
                transition: "all 0.18s",
              }}
            >
              {v}%
            </button>
          ))}
        </div>

        {/* Formula display */}
        <div style={{
          marginTop: 18,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 2,
        }}>
          <p style={{ fontSize: "0.62rem", color: "#555", letterSpacing: "0.08em", fontFamily: "monospace" }}>
            <span style={{ color: "#777" }}>Precio Venta</span>
            {" = "}
            <span style={{ color: "#888" }}>Costo</span>
            {" × (1 + "}
            <span style={{ color: "#c9a84c" }}>{margin}</span>
            {" / 100)"}
            {"  →  "}
            <span style={{ color: "#777" }}>factor: </span>
            <span style={{ color: "#c9a84c" }}>×{(1 + margin / 100).toFixed(2)}</span>
          </p>
        </div>
      </div>

      {/* Products table */}
      <div className="glass anim-in" style={{ borderRadius: 3, overflow: "hidden", animationDelay: "100ms" }}>
        {/* Table header */}
        <div style={{
          padding: "14px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DollarSign size={12} style={{ color: "#c9a84c" }} />
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.28em", color: "#666", textTransform: "uppercase" }}>
              Lista de Productos — {products.length} ítems
            </span>
          </div>
          <button
            onClick={() => setShowCosts(!showCosts)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#555", display: "flex", alignItems: "center", gap: 6,
              fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase",
              fontFamily: "Jost, sans-serif", transition: "color 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#c9a84c"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#555"}
          >
            {showCosts ? <EyeOff size={12} /> : <Eye size={12} />}
            {showCosts ? "Ocultar costos" : "Ver costos"}
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {["Producto", "Categoría", "Unidad", ...(showCosts ? ["Costo"] : []), "Precio Venta", "Ganancia"].map((h) => (
                <th key={h} style={{
                  padding: "11px 22px", textAlign: "left",
                  fontSize: "0.56rem", letterSpacing: "0.22em",
                  color: "#444", textTransform: "uppercase", fontWeight: 400,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const sale = calcSalePrice(p.cost, margin);
              const gain = sale - p.cost;
              const gainPct = ((gain / p.cost) * 100).toFixed(1);
              return (
                <tr
                  key={p.id}
                  className="product-row"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.008)",
                  }}
                >
                  <td style={{ padding: "14px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: "1.25rem" }}>{p.emoji}</span>
                      <span className="serif" style={{ fontSize: "0.95rem", color: "#d8d0c0" }}>
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <span className="tag-pill">{p.category}</span>
                  </td>
                  <td style={{ padding: "14px 22px", fontSize: "0.72rem", color: "#555" }}>
                    {p.unit}
                  </td>
                  {showCosts && (
                    <td style={{ padding: "14px 22px", fontSize: "0.85rem", color: "#666", fontFamily: "monospace" }}>
                      {fmt(p.cost)}
                    </td>
                  )}
                  <td style={{ padding: "14px 22px" }}>
                    <span className="serif" style={{ fontSize: "1rem", color: "#c9a84c" }}>
                      {fmt(sale)}
                    </span>
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.8rem", color: "#6aaf6a" }}>+{fmt(gain)}</span>
                      <span style={{
                        fontSize: "0.55rem", color: "#4a804a",
                        background: "rgba(100,180,100,0.07)",
                        border: "1px solid rgba(100,180,100,0.15)",
                        padding: "2px 6px", borderRadius: 20,
                        letterSpacing: "0.1em",
                      }}>
                        {gainPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Integration note */}
      <div style={{
        marginTop: 20,
        padding: "16px 20px",
        border: "1px solid rgba(255,255,255,0.035)",
        borderRadius: 2,
      }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#3a3530", lineHeight: 1.9 }}>
          <span style={{ color: "#555" }}>📡 Integración API →</span>{" "}
          Configurá{" "}
          <code style={{ color: "#c9a84c", background: "rgba(201,168,76,0.07)", padding: "1px 7px", borderRadius: 2 }}>
            VITE_API_ENDPOINT
          </code>{" "}
          en tu archivo{" "}
          <code style={{ color: "#888" }}>.env</code>{" "}
          para conectar con Google Sheets Apps Script o cualquier JSON externo.
          <br />
          Estructura esperada:{" "}
          <code style={{ color: "#666" }}>
            {"[{ id, name, cost, category, unit, emoji }]"}
          </code>
        </p>
      </div>
    </main>
  );
}
