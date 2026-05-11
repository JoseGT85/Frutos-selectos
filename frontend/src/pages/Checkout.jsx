import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/store/cart";
import { useAuth } from "@/store/auth";
import api, { formatARS } from "@/lib/api";
import { Lock, ChevronLeft, Sparkles } from "lucide-react";

const PROVINCES = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
]; = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const Checkout = () => {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shippingInfo, setShippingInfo] = useState({ shipping_cost: 4500, free_shipping_applied: false, is_first_order: true, free_threshold: 400000 });

  const [form, setForm] = useState({
    email: user?.email || "",
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
    city: "",
    province: "Buenos Aires",
    zip: "",
    notes: "",
  });

  const shipping = shippingInfo.shipping_cost;
  const total = subtotal + shipping;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Recalcular envío cuando cambia email o subtotal
  React.useEffect(() => {
    const fetchShipping = async () => {
      try {
        const { data } = await api.post("/orders/shipping-quote", {
          email: form.email,
          subtotal,
        });
        setShippingInfo(data);
      } catch {}
    };
    if (subtotal > 0) fetchShipping();
  }, [form.email, subtotal]);

  if (items.length === 0) {
    return (
      <main className="px-6 md:px-12 py-20 max-w-3xl mx-auto text-center" data-testid="empty-checkout">
        <h1 className="font-serif text-4xl text-[#2C1E16] mb-4">Tu carrito está vacío</h1>
        <p className="text-[#5D4B41] mb-8">Sumá productos antes de finalizar tu compra.</p>
        <Link to="/catalogo" className="inline-block px-8 py-4 bg-[#C35214] text-white rounded-full">
          Ir al catálogo
        </Link>
      </main>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/orders", {
        items: items.map((i) => ({
          product_id: i.product_id,
          name: i.name,
          weight: i.weight,
          unit_price: i.unit_price,
          quantity: i.quantity,
          image: i.image,
        })),
        customer: form,
        shipping_cost: shipping,
      });
      clear();
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.response?.data?.detail || "Error al procesar el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="px-6 md:px-12 py-12 max-w-6xl mx-auto" data-testid="checkout-page">
      <Link to="/catalogo" className="inline-flex items-center gap-2 text-sm text-[#5D4B41] hover:text-[#C35214] mb-6" data-testid="back-from-checkout">
        <ChevronLeft size={16} /> Seguir comprando
      </Link>
      <h1 className="font-serif text-5xl text-[#2C1E16] mb-10">Finalizar compra</h1>

      <form onSubmit={submit} className="grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#2C1E16]/10">
            <h2 className="font-serif text-2xl mb-6">Datos de contacto</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" required testid="checkout-email" />
              <Field label="Nombre completo" value={form.name} onChange={(v) => set("name", v)} required testid="checkout-name" />
              <Field label="Teléfono" value={form.phone} onChange={(v) => set("phone", v)} required testid="checkout-phone" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#2C1E16]/10">
            <h2 className="font-serif text-2xl mb-6">Dirección de envío</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Dirección" value={form.address} onChange={(v) => set("address", v)} required testid="checkout-address" />
              <Field label="Ciudad" value={form.city} onChange={(v) => set("city", v)} required testid="checkout-city" />
              <div>
                <label className="text-overline text-[#5D4B41] block mb-2">Provincia</label>
                <select
                  value={form.province}
                  onChange={(e) => set("province", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#2C1E16]/15 bg-white outline-none focus:ring-2 focus:ring-[#C35214]/30"
                  data-testid="checkout-province"
                >
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <Field label="Código Postal" value={form.zip} onChange={(v) => set("zip", v)} required testid="checkout-zip" />
              <div className="md:col-span-2">
                <label className="text-overline text-[#5D4B41] block mb-2">Notas (opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-[#2C1E16]/15 bg-white outline-none focus:ring-2 focus:ring-[#C35214]/30"
                  data-testid="checkout-notes"
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="bg-white p-6 rounded-2xl border border-[#2C1E16]/10 h-fit sticky top-24">
          <h2 className="font-serif text-2xl mb-6">Tu pedido</h2>
          <div className="space-y-3 mb-6 max-h-60 overflow-y-auto scrollbar-thin">
            {items.map((i) => (
              <div key={`${i.product_id}-${i.weight}`} className="flex gap-3 text-sm">
                <img src={i.image} alt={i.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-xs text-[#968B83]">{i.weight} · x{i.quantity}</div>
                </div>
                <div className="font-medium">{formatARS(i.unit_price * i.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm border-t border-[#2C1E16]/10 pt-4">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatARS(subtotal)}</span></div>
            <div className="flex justify-between">
              <span>Envío</span>
              <span>{shipping === 0 ? <span className="text-[#8A9A86] font-medium">GRATIS</span> : formatARS(shipping)}</span>
            </div>
            {!shippingInfo.free_shipping_applied && shippingInfo.is_first_order && (
              <div className="text-[11px] text-[#968B83] italic">
                💡 Sumá {formatARS(shippingInfo.free_threshold - subtotal)} más en tu primera compra y el envío es gratis.
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-3 border-t border-[#2C1E16]/10">
              <span>Total</span>
              <span data-testid="checkout-total">{formatARS(total)}</span>
            </div>
          </div>
          {error && <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl" data-testid="checkout-error">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-[#C35214] hover:bg-[#A64B29] text-white py-4 rounded-full font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            data-testid="pay-mercadopago-btn"
          >
            <Lock size={16} />
            {loading ? "Procesando..." : "Pagar con Mercado Pago"}
          </button>
          <p className="text-[10px] text-[#968B83] text-center mt-3 flex items-center justify-center gap-1">
            <Sparkles size={10} /> Pago 100% seguro · Cifrado SSL
          </p>
        </aside>
      </form>
    </main>
  );
};

const Field = ({ label, value, onChange, type = "text", required, testid }) => (
  <div>
    <label className="text-overline text-[#5D4B41] block mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full px-4 py-3 rounded-xl border border-[#2C1E16]/15 bg-white outline-none focus:ring-2 focus:ring-[#C35214]/30"
      data-testid={testid}
    />
  </div>
);

export default Checkout;
