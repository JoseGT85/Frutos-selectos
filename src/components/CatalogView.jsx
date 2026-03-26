import ProductCard from "./ProductCard.jsx";
import LoadingScreen from "./LoadingScreen.jsx";

export default function CatalogView({ products, margin, loaded, addToCart, cart }) {
  const cartMap = cart.reduce((acc, i) => ({ ...acc, [i.id]: i.qty }), {});

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

      {/* Product Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))",
        gap: 20,
      }}>
        {products.map((p, i) => (
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
