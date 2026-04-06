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
      <div className="anim" style={{display:"flex",gap:14,marginBottom:36,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:"1 1 260px"}}>
          <input className="si" type="text" placeholder="Buscar producto…" value={search} onChange={e=>setSearch(e.target.value)} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:2,color:"#e8e0d0",fontFamily:"Jost,sans-serif",fontSize:"0.78rem",padding:"9px 14px",outline:"none",width:"100%"}}/>
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
