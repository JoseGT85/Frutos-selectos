import { useState, useEffect, useCallback, useRef } from "react";
import config from "./config/index.js";
import { fetchProducts } from "./services/api.js";
import { buildOrderMessage, openWhatsApp } from "./services/whatsapp.js";
import { sendOrderToWebhook } from "./services/automation.js";
import { calcSalePrice } from "./utils/pricing.js";
import Header from "./components/Header.jsx";
import CatalogView from "./components/CatalogView.jsx";
import AdminView from "./components/AdminView.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import { loginAdmin } from "./services/api.js";

// ─── Persistencia del carrito en localStorage ────────────────────────────────
const CART_KEY = "difrumarket:cart";

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch { /* silenciar errores de storage */ }
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [margin, setMargin]     = useState(config.defaultMargin);
  const [cart, setCart]         = useState(loadCart); // ← carga desde localStorage
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView]         = useState("catalog"); // 'catalog' | 'admin'
  const [syncing, setSyncing]   = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | 'ok' | 'err'
  const [loaded, setLoaded]     = useState(false);
  
  // ── Login Secreto ─────────────────────────────────────────────────────────
  const [showLogin, setShowLogin]   = useState(false);
  const [adminUser, setAdminUser]   = useState("");
  const [adminPass, setAdminPass]   = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (adminUser.trim().toLowerCase() !== "admin") {
      setLoginError("Usuario incorrecto");
      return;
    }
    try {
      await loginAdmin(adminPass);
      setShowLogin(false);
      setView("admin");
      setAdminUser("");
      setAdminPass("");
      showToast("🔐 Acceso Administrador Autorizado");
    } catch (err) {
      setLoginError(err.message || "Credenciales incorrectas");
    }
  };

  // ── Toast notifications ─────────────────────────────────────────────────
  const [toast, setToast]       = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, duration = 2500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
      setTimeout(() => setToast(null), 300);
    }, duration);
  }, []);

  useEffect(() => { handleSync(); }, []);

  // ── Persistir carrito cada vez que cambia ──────────────────────────────
  useEffect(() => { saveCart(cart); }, [cart]);

  // ── Sincronización ──────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
      setSyncStatus("ok");
    } catch {
      setSyncStatus("err");
    } finally {
      setSyncing(false);
      setLoaded(true);
    }
  };

  // ── Carrito ─────────────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`🌰 ${product.name} agregado al carrito`);
  }, [showToast]);

  const updateQty = useCallback((id, delta) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
          .filter((i) => i.qty > 0)
    );
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    showToast("Carrito vaciado");
  }, [showToast]);

  const cartTotal = cart.reduce(
    (sum, item) => sum + calcSalePrice(item.cost, margin) * item.qty, 0
  );
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  // ── Checkout WhatsApp ───────────────────────────────────────────────────
  const handleWhatsApp = async () => {
    const message = buildOrderMessage(cart, margin);
    openWhatsApp(message);

    // Enviar datos al webhook de automatización (si está configurado)
    await sendOrderToWebhook({
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        qty: item.qty,
        unitPrice: calcSalePrice(item.cost, margin),
        subtotal: calcSalePrice(item.cost, margin) * item.qty,
      })),
      total: cartTotal,
      margin,
      timestamp: new Date().toISOString(),
    });

    showToast("¡Pedido enviado por WhatsApp! 🎉");
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#070707" }}>
      <Header
        view={view}
        setView={setView}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onUnlockAdmin={() => {
          if (view !== "admin") setShowLogin(true);
        }}
      />

      {view === "catalog" ? (
        <CatalogView
          products={products}
          margin={margin}
          loaded={loaded}
          addToCart={addToCart}
          cart={cart}
        />
      ) : (
        <AdminView
          products={products}
          margin={margin}
          setMargin={setMargin}
          syncing={syncing}
          syncStatus={syncStatus}
          onSync={handleSync}
        />
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          margin={margin}
          cartTotal={cartTotal}
          cartCount={cartCount}
          updateQty={updateQty}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
          onClose={() => setCartOpen(false)}
          onWhatsApp={handleWhatsApp}
        />
      )}

      {/* Login Modal */}
      {showLogin && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div className="glass anim-in" style={{
            padding: "40px 32px", width: "90%", maxWidth: 360, borderRadius: 4,
            border: "1px solid rgba(201,168,76,0.2)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.8)"
          }}>
            <h2 className="serif" style={{ color: "#c9a84c", textAlign: "center", marginBottom: 6, fontSize: "1.6rem", fontWeight: 300 }}>
              Acceso Restringido
            </h2>
            <p style={{ color: "#777", fontSize: "0.7rem", textAlign: "center", marginBottom: 24, letterSpacing: "0.05em" }}>
              Panel de control operativo
            </p>
            
            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", color: "#aaa", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Usuario</label>
                <input 
                  type="text" 
                  value={adminUser} 
                  onChange={e => setAdminUser(e.target.value)} 
                  placeholder="admin"
                  autoFocus
                  style={{
                    width: "100%", padding: "12px", background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.1)", color: "#eee", borderRadius: 2,
                    fontFamily: "monospace", fontSize: "0.9rem"
                  }} 
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", color: "#aaa", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Contraseña</label>
                <input 
                  type="password" 
                  value={adminPass} 
                  onChange={e => setAdminPass(e.target.value)} 
                  style={{
                    width: "100%", padding: "12px", background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.1)", color: "#eee", borderRadius: 2,
                    fontFamily: "monospace", fontSize: "0.9rem"
                  }} 
                />
              </div>
              
              {loginError && <div style={{ color: "#cc5555", fontSize: "0.75rem", textAlign: "center", background: "rgba(200,80,80,0.1)", padding: "8px", borderRadius: 2 }}>{loginError}</div>}
              
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowLogin(false)} style={{
                  flex: 1, padding: "12px", background: "none", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#aaa", cursor: "pointer", borderRadius: 2, fontSize: "0.75rem", letterSpacing: "0.1em"
                }}>CANCELAR</button>
                <button type="submit" style={{
                  flex: 1, padding: "12px", background: "#c9a84c", border: "none",
                  color: "#070707", cursor: "pointer", borderRadius: 2, fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.1em"
                }}>INGRESAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`toast${toast.visible ? "" : " out"}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      {/* WhatsApp Floating Button */}
      <a
        href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent("Hola, tengo una consulta sobre sus productos 🌰")}`}
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
        </svg>
      </a>
    </div>
  );
}
