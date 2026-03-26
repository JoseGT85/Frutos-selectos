import { useState, useEffect } from "react";
import config from "./config/index.js";
import { fetchProducts } from "./services/api.js";
import { buildOrderMessage, openWhatsApp } from "./services/whatsapp.js";
import { sendOrderToWebhook } from "./services/automation.js";
import { calcSalePrice } from "./utils/pricing.js";
import Header from "./components/Header.jsx";
import CatalogView from "./components/CatalogView.jsx";
import AdminView from "./components/AdminView.jsx";
import CartDrawer from "./components/CartDrawer.jsx";

export default function App() {
  const [products, setProducts] = useState([]);
  const [margin, setMargin]     = useState(config.defaultMargin);
  const [cart, setCart]         = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView]         = useState("catalog"); // 'catalog' | 'admin'
  const [syncing, setSyncing]   = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | 'ok' | 'err'
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => { handleSync(); }, []);

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
  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
          .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

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
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#070707" }}>
      <Header
        view={view}
        setView={setView}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
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
          onClose={() => setCartOpen(false)}
          onWhatsApp={handleWhatsApp}
        />
      )}
    </div>
  );
}
