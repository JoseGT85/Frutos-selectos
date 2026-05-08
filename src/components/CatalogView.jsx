import { useState } from "react";
import ProductCard from "./ProductCard.jsx";
import LoadingScreen from "./LoadingScreen.jsx";

export default function CatalogView({ products, margin, loaded, addToCart, cart }) {
  const cartMap = cart.reduce((acc, i) => ({ ...acc, [i.id]: i.qty }), {});
  const [cat, setCat] = useState("Todos");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [search, setSearch] = useState("");

  const cats = ["Todos", ...Array.from(new Set(products.map(p => p.category)))];
  
  const shown = products.filter(p => {
    const matchCat = (cat === "Todos" || p.category === cat);
    const matchTipo = (tipoFiltro === "Todos" || (tipoFiltro === "Bultos (10 kg)" && p.tipo_producto === "bulto_10kg") || (tipoFiltro === "Fraccionados" && p.tipo_producto === "fraccionado"));
    const matchSearch = (!search || p.name.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchTipo && matchSearch;
  });

  if (!loaded) return <LoadingScreen />;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 28px 100px" }}>
      {/* Hero */}
      <div className="anim-in" style={{ textAlign: "center", marginBottom: 80 }}>
        <p style={{
          fontSize: "0.6rem", letterSpacing: "0.45em",
          color: "#555", textTransform: "uppercase", marginBottom: 18,
        }}>
          Selección Curada · {new Date().getFullYear()}
        </p>
        <h2 className="serif" style={{
          fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
          fontWeight: 300, lineHeight: 1.08, color: "#e8e0d0",
        }}>
          La naturaleza en<br />
          su forma más{" "}
          <em style={{ color: "#c9a84c", fontWeight: 300 }}>pura</em>
        </h2>
        <div style={{
          width: 36, height: 1,
          background: "linear-gradient(90deg, transparent, #c9a84c, transparent)",
          margin: "30px auto 0",
        }} />
      </div>

      {/* Filters */}
      <div className="anim" style={{ marginBottom: 36 }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 18, maxWidth: 420 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input className="si" type="text" placeholder="Buscar nueces, frutas, mezclas…" value={search} onChange={e=>setSearch(e.target.value)} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:3, color:"#e8e0d0", fontFamily:"Jost,sans-serif", fontSize:"0.78rem", padding:"11px 14px 11px 38px", outline:"none", width:"100%", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.3)"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.06)"} />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.06)", border: "none", color: "#888", cursor: "pointer", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#c9a84c"} onMouseLeave={e => e.currentTarget.style.color = "#888"}>✕</button>
          )}
        </div>

        {/* Category + Type filters */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Categoría */}
          <div>
            <p style={{ fontSize: "0.48rem", letterSpacing: "0.3em", color: "#444", textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>Categoría</p>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {cats.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", border: `1px solid ${cat === c ? "#c9a84c" : "rgba(255,255,255,0.06)"}`, background: cat === c ? "rgba(201,168,76,0.1)" : "none", color: cat === c ? "#c9a84c" : "#555", fontSize: "0.62rem", letterSpacing: "0.1em", fontFamily: "Jost,sans-serif", textTransform: "uppercase", transition: "all 0.18s", display: "flex", alignItems: "center", gap: 5 }}>
                  {cat === c && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#c9a84c", flexShrink: 0 }} />}
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Separador vertical */}
          <div style={{ width: 1, height: 48, background: "rgba(255,255,255,0.06)", alignSelf: "center" }} />

          {/* Presentación */}
          <div>
            <p style={{ fontSize: "0.48rem", letterSpacing: "0.3em", color: "#444", textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>Presentación</p>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {["Todos", "Bultos (10 kg)", "Fraccionados"].map(c => (
                <button key={c} onClick={() => setTipoFiltro(c)} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", border: `1px solid ${tipoFiltro === c ? "#6acc6a" : "rgba(255,255,255,0.06)"}`, background: tipoFiltro === c ? "rgba(100,204,106,0.08)" : "none", color: tipoFiltro === c ? "#6acc6a" : "#555", fontSize: "0.62rem", letterSpacing: "0.1em", fontFamily: "Jost,sans-serif", textTransform: "uppercase", transition: "all 0.18s", display: "flex", alignItems: "center", gap: 5 }}>
                  {tipoFiltro === c && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#6acc6a", flexShrink: 0 }} />}
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result count */}
        <p style={{ fontSize: "0.52rem", color: "#3a3530", letterSpacing: "0.1em", marginTop: 16 }}>
          {shown.length === products.length 
            ? `Mostrando ${products.length} productos` 
            : `Mostrando ${shown.length} de ${products.length} productos`}
        </p>
      </div>

      {/* Product Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))",
        gap: 20,
      }}>
        {shown.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            margin={margin}
            inCart={cartMap[p.id] || 0}
            onAdd={() => addToCart(p)}
            delay={i * 75}
          />
        ))}
      </div>
    </main>
  );
}
