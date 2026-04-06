import { ShoppingCart } from "lucide-react";
import { useState, useRef } from "react";

export default function Header({ view, setView, cartCount, onOpenCart, onUnlockAdmin }) {
  const [clicks, setClicks] = useState(0);
  const clickTimeout = useRef(null);

  const handleLogoClick = () => {
    setClicks((c) => {
      const next = c + 1;
      if (next >= 5) {
        onUnlockAdmin?.();
        return 0;
      }
      return next;
    });

    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      setClicks(0); // Reiniciar si tarda más de 1.5s entre clics
    }, 1500);
  };

  return (
    <header
      role="banner"
      style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(7,7,7,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "0 28px", height: 70,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo Oculto - 5 Clics para Admin */}
        <div 
          onClick={handleLogoClick} 
          style={{ cursor: "pointer", userSelect: "none" }}
          title={clicks > 0 ? `Clics: ${clicks}` : ""}
        >
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
            Calidad Premium · Mendoza
          </p>
        </div>

        {/* Nav */}
        <nav role="navigation" aria-label="Navegación principal" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <button
            className="nav-link"
            onClick={() => setView("catalog")}
            style={{ color: view === "catalog" ? "#c9a84c" : "#888" }}
            aria-current={view === "catalog" ? "page" : undefined}
          >
            Catálogo
          </button>

          {/* Cart button */}
          <button
            id="cart-button"
            onClick={onOpenCart}
            aria-label={`Abrir carrito${cartCount > 0 ? `, ${cartCount} artículo${cartCount !== 1 ? "s" : ""}` : ""}`}
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
            <ShoppingCart size={15} aria-hidden="true" />
            {cartCount > 0 && (
              <span
                className="badge-bounce"
                key={cartCount}
                style={{
                  position: "absolute", top: -7, right: -7,
                  background: "#c9a84c", color: "#070707",
                  borderRadius: "50%", width: 18, height: 18,
                  fontSize: "0.6rem", fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                aria-hidden="true"
              >
                {cartCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
