import { ShoppingCart } from "lucide-react";

export default function Header({ view, setView, cartCount, onOpenCart }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(7,7,7,0.9)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "0 28px", height: 70,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <div>
          <h1 className="serif" style={{
            fontSize: "1.45rem", fontWeight: 300,
            letterSpacing: "0.14em", color: "#e8e0d0",
          }}>
            FRUTOS <span style={{ color: "#c9a84c", fontStyle: "italic" }}>Selectos</span>
          </h1>
          <p style={{
            fontSize: "0.55rem", letterSpacing: "0.38em",
            color: "#555", textTransform: "uppercase", marginTop: 2,
          }}>
            Calidad Premium · Buenos Aires
          </p>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <button
            className="nav-link"
            onClick={() => setView("catalog")}
            style={{ color: view === "catalog" ? "#c9a84c" : "#888" }}
          >
            Catálogo
          </button>
          <button
            className="nav-link"
            onClick={() => setView("admin")}
            style={{ color: view === "admin" ? "#c9a84c" : "#444", fontSize: "0.6rem" }}
          >
            ⚙ Admin
          </button>

          {/* Cart button */}
          <button
            id="cart-button"
            onClick={onOpenCart}
            style={{
              background: "none",
              border: "1px solid rgba(201,168,76,0.28)",
              padding: "8px 14px", borderRadius: 2,
              cursor: "pointer", color: "#c9a84c",
              display: "flex", alignItems: "center", gap: 8,
              position: "relative",
              transition: "border-color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(201,168,76,0.06)";
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.55)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.28)";
            }}
          >
            <ShoppingCart size={15} />
            {cartCount > 0 && (
              <span style={{
                position: "absolute", top: -7, right: -7,
                background: "#c9a84c", color: "#070707",
                borderRadius: "50%", width: 18, height: 18,
                fontSize: "0.6rem", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
