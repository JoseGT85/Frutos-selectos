import React, { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { Link, Navigate } from "react-router-dom";
import api, { formatARS } from "@/lib/api";
import {
  LayoutDashboard, Package, ShoppingCart, Users, MessageSquare, LogOut,
  TrendingUp, DollarSign, UserCheck, Plus, X, Edit2, Trash2, RefreshCw,
} from "lucide-react";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Productos", icon: Package },
  { id: "orders", label: "Pedidos", icon: ShoppingCart },
  { id: "leads", label: "CRM Leads", icon: Users },
  { id: "chats", label: "Conversaciones", icon: MessageSquare },
];

const AdminPanel = () => {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");

  if (loading) return <div className="p-20 text-center">Cargando...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-white flex" data-testid="admin-panel">
      <aside className="w-60 bg-[#2C1E16] text-white p-6 flex flex-col">
        <Link to="/" className="font-serif text-xl mb-10">
          Frutos Secos<span className="text-[#D97742]">.</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  tab === t.id ? "bg-[#C35214]" : "hover:bg-white/10"
                }`}
                data-testid={`admin-tab-${t.id}`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white"
          data-testid="admin-logout"
        >
          <LogOut size={16} />
          Salir
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {tab === "dashboard" && <Dashboard />}
        {tab === "products" && <ProductsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "leads" && <LeadsTab />}
        {tab === "chats" && <ChatsTab />}
      </main>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/admin/dashboard").then((r) => setStats(r.data));
  }, []);
  if (!stats) return <div data-testid="dashboard-loading">Cargando métricas...</div>;
  const cards = [
    { label: "Ingresos totales", value: formatARS(stats.revenue), icon: DollarSign, color: "bg-[#8A9A86]" },
    { label: "Pedidos pagados", value: stats.paid_orders, icon: ShoppingCart, color: "bg-[#C35214]" },
    { label: "Pedidos pendientes", value: stats.pending_orders, icon: TrendingUp, color: "bg-[#D4AF37]" },
    { label: "Clientes (CRM)", value: stats.customers, icon: UserCheck, color: "bg-[#2C1E16]" },
    { label: "Leads totales", value: stats.total_leads, icon: Users, color: "bg-[#D97742]" },
    { label: "Conversaciones IA", value: stats.chat_sessions, icon: MessageSquare, color: "bg-[#5D4B41]" },
  ];
  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-serif text-4xl mb-2">Panel general</h1>
      <p className="text-[#5D4B41] mb-8">Métricas en tiempo real del ecommerce.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="border border-[#2C1E16]/10 rounded-xl p-5" data-testid={`stat-card-${i}`}>
              <div className={`w-10 h-10 rounded-lg ${c.color} text-white flex items-center justify-center mb-4`}>
                <Icon size={18} />
              </div>
              <p className="text-xs text-[#968B83] uppercase tracking-wider mb-1">{c.label}</p>
              <p className="text-2xl font-semibold">{c.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const emptyProduct = {
  name: "", description: "", category: "frutos-secos",
  cost_per_kg: 0, margin_percent: 25,
  supplier_price_5kg: null, supplier_price_1kg: null,
  image: "", images: [],
  weight_options: [
    { weight: "250g", weight_kg: 0.25, price: null, stock: 30 },
    { weight: "500g", weight_kg: 0.5, price: null, stock: 25 },
    { weight: "1kg", weight_kg: 1.0, price: null, stock: 15 },
  ],
  featured: false, active: true, tags: [],
};

const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [lastSync, setLastSync] = useState(null);

  const load = () => api.get("/products").then((r) => setProducts(r.data));
  const loadSync = () => api.get("/admin/sync-status").then((r) => setLastSync(r.data.last_synced_at));
  useEffect(() => { load(); loadSync(); }, []);

  const save = async (data) => {
    if (editing?.id) await api.put(`/admin/products/${editing.id}`, data);
    else await api.post("/admin/products", data);
    setShowForm(false);
    setEditing(null);
    load();
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar producto?")) return;
    await api.delete(`/admin/products/${id}`);
    load();
  };

  const sync = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const { data } = await api.post("/admin/sync-supplier");
      setSyncMsg(`✓ ${data.updated} productos actualizados${data.skipped?.length ? `, ${data.skipped.length} sin match` : ""}`);
      load();
      loadSync();
    } catch (e) {
      setSyncMsg("Error al sincronizar");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 6000);
    }
  };

  const updateMarginQuick = async (id, margin) => {
    await api.patch(`/admin/products/${id}/margin`, { margin_percent: margin });
    load();
  };

  return (
    <div data-testid="admin-products">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-4xl">Productos</h1>
          {lastSync && (
            <p className="text-xs text-[#968B83] mt-1">
              Último sync proveedor: {new Date(lastSync).toLocaleString("es-AR")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {syncMsg && <span className="text-xs text-[#8A9A86] bg-[#8A9A86]/10 px-3 py-1.5 rounded-full" data-testid="sync-msg">{syncMsg}</span>}
          <button
            onClick={sync}
            disabled={syncing}
            className="bg-[#2C1E16] text-white px-4 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-[#5D4B41] disabled:opacity-50"
            data-testid="sync-supplier-btn"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sync proveedor"}
          </button>
          <button
            onClick={() => { setEditing(emptyProduct); setShowForm(true); }}
            className="bg-[#C35214] text-white px-5 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-[#A64B29]"
            data-testid="add-product-btn"
          >
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
      </div>

      <table className="w-full text-sm border border-[#2C1E16]/10 rounded-xl overflow-hidden">
        <thead className="bg-[#F9F6F0] text-left text-xs uppercase tracking-wider text-[#5D4B41]">
          <tr>
            <th className="p-3">Producto</th>
            <th className="p-3">Categoría</th>
            <th className="p-3">Costo/kg</th>
            <th className="p-3 w-48">Margen</th>
            <th className="p-3">Precio 1kg</th>
            <th className="p-3">Estado</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const kgOpt = p.weight_options?.find((o) => o.weight_kg === 1.0);
            return (
              <tr key={p.id} className="border-t border-[#2C1E16]/10" data-testid={`product-row-${p.slug}`}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-[#968B83]">{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 capitalize text-xs">{p.category.replace(/-/g, " ")}</td>
                <td className="p-3 font-mono text-xs">{formatARS(p.cost_per_kg || 0)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="1"
                      value={p.margin_percent || 25}
                      onChange={(e) => updateMarginQuick(p.id, parseFloat(e.target.value))}
                      className="flex-1 accent-[#C35214]"
                      data-testid={`margin-slider-${p.slug}`}
                    />
                    <span className="text-xs font-mono font-semibold w-10 text-right">{p.margin_percent || 25}%</span>
                  </div>
                </td>
                <td className="p-3 font-medium text-[#C35214]">{formatARS(kgOpt?.price || 0)}</td>
                <td className="p-3 text-xs">
                  {p.active ? <span className="text-[#8A9A86]">Activo</span> : <span className="text-[#968B83]">Inactivo</span>}
                  {p.featured && <span className="ml-2 text-[#D4AF37]">★</span>}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-2 hover:bg-[#E5D9C5] rounded" data-testid={`edit-product-${p.slug}`}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => del(p.id)} className="p-2 hover:bg-red-50 text-red-500 rounded" data-testid={`delete-product-${p.slug}`}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showForm && (
        <ProductForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={save}
        />
      )}
    </div>
  );
};

const ProductForm = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState({ ...initial });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setOpt = (i, k, v) => {
    const opts = [...form.weight_options];
    let val = v;
    if (k !== "weight") val = v === "" ? null : (parseFloat(v) || 0);
    opts[i] = { ...opts[i], [k]: val };
    set("weight_options", opts);
  };

  const computedPrice = (opt) => {
    if (opt.price !== null && opt.price !== undefined && opt.price !== "") return opt.price;
    const cost = parseFloat(form.cost_per_kg) || 0;
    const margin = parseFloat(form.margin_percent) || 25;
    const wk = parseFloat(opt.weight_kg) || 0;
    return Math.round(cost * wk * (1 + margin / 100));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="product-form-modal">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#2C1E16]/10 sticky top-0 bg-white z-10">
          <h2 className="font-serif text-2xl">{initial?.id ? "Editar" : "Nuevo"} producto</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Inp label="Nombre" v={form.name} on={(v) => set("name", v)} testid="form-name" />
            <Inp label="Categoría" v={form.category} on={(v) => set("category", v)} testid="form-category" />
          </div>
          <Inp label="Imagen URL" v={form.image} on={(v) => set("image", v)} testid="form-image" />
          <Inp label="Descripción" v={form.description} on={(v) => set("description", v)} ta testid="form-desc" />

          {/* PRICING */}
          <div className="bg-[#F9F6F0] rounded-xl p-5 space-y-4">
            <h3 className="font-serif text-lg">Precios</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-overline block mb-2">Costo/kg (supplier)</label>
                <input
                  type="number"
                  value={form.cost_per_kg || 0}
                  onChange={(e) => set("cost_per_kg", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-[#2C1E16]/15"
                  data-testid="form-cost"
                />
                <p className="text-[10px] text-[#968B83] mt-1">Columna 1 de DIFRUMARKET</p>
              </div>
              <div>
                <label className="text-overline block mb-2">Ref. 5kg supplier</label>
                <input
                  type="number"
                  value={form.supplier_price_5kg || ""}
                  onChange={(e) => set("supplier_price_5kg", e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-lg border border-[#2C1E16]/15"
                  placeholder="—"
                  data-testid="form-sup5"
                />
                <p className="text-[10px] text-[#968B83] mt-1">Columna 2 (referencia)</p>
              </div>
              <div>
                <label className="text-overline block mb-2">Ref. 1kg supplier</label>
                <input
                  type="number"
                  value={form.supplier_price_1kg || ""}
                  onChange={(e) => set("supplier_price_1kg", e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-lg border border-[#2C1E16]/15"
                  placeholder="—"
                  data-testid="form-sup1"
                />
                <p className="text-[10px] text-[#968B83] mt-1">Columna 3 (referencia)</p>
              </div>
            </div>

            {/* SLIDER */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-overline">Margen de venta</label>
                <span className="text-2xl font-serif text-[#C35214]">{form.margin_percent || 25}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="1"
                value={form.margin_percent || 25}
                onChange={(e) => set("margin_percent", parseFloat(e.target.value))}
                className="w-full accent-[#C35214]"
                data-testid="form-margin-slider"
              />
              <div className="flex justify-between text-[10px] text-[#968B83] mt-1">
                <span>10%</span>
                <span>20%</span>
                <span>30%</span>
                <span>40%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* PRESENTACIONES */}
          <div>
            <label className="text-overline block mb-3">Presentaciones</label>
            <div className="grid grid-cols-12 gap-2 text-[10px] text-[#968B83] uppercase tracking-wider mb-1">
              <div className="col-span-3">Etiqueta</div>
              <div className="col-span-2">Peso (kg)</div>
              <div className="col-span-3">Precio manual</div>
              <div className="col-span-2">Calculado</div>
              <div className="col-span-1">Stock</div>
              <div className="col-span-1"></div>
            </div>
            {form.weight_options.map((o, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
                <input value={o.weight || ""} onChange={(e) => setOpt(i, "weight", e.target.value)} placeholder="500g" className="col-span-3 px-3 py-2 rounded-lg border border-[#2C1E16]/15 text-sm" />
                <input value={o.weight_kg || 0} onChange={(e) => setOpt(i, "weight_kg", e.target.value)} type="number" step="0.01" placeholder="0.5" className="col-span-2 px-3 py-2 rounded-lg border border-[#2C1E16]/15 text-sm" />
                <input value={o.price ?? ""} onChange={(e) => setOpt(i, "price", e.target.value)} type="number" placeholder="auto" className="col-span-3 px-3 py-2 rounded-lg border border-[#2C1E16]/15 text-sm" />
                <div className="col-span-2 text-sm text-[#C35214] font-medium">{formatARS(computedPrice(o))}</div>
                <input value={o.stock ?? 0} onChange={(e) => setOpt(i, "stock", e.target.value)} type="number" placeholder="0" className="col-span-1 px-2 py-2 rounded-lg border border-[#2C1E16]/15 text-sm" />
                <button
                  onClick={() => set("weight_options", form.weight_options.filter((_, j) => j !== i))}
                  className="col-span-1 text-[#968B83] hover:text-red-500"
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("weight_options", [...form.weight_options, { weight: "", weight_kg: 0, price: null, stock: 0 }])}
              className="text-sm text-[#C35214] mt-2 flex items-center gap-1"
            >
              <Plus size={14} /> Agregar presentación
            </button>
            <p className="text-[10px] text-[#968B83] mt-2">
              "Precio manual" sobrescribe el cálculo automático. Dejá vacío para usar costo × peso × (1 + margen).
            </p>
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} data-testid="form-featured" /> Destacado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} data-testid="form-active" /> Activo
            </label>
          </div>
        </div>
        <div className="p-6 border-t border-[#2C1E16]/10 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full border border-[#2C1E16]/20" data-testid="form-cancel">Cancelar</button>
          <button onClick={() => onSave(form)} className="px-5 py-2.5 rounded-full bg-[#C35214] text-white" data-testid="form-save">Guardar</button>
        </div>
      </div>
    </div>
  );
};

const Inp = ({ label, v, on, type = "text", ta, testid }) => (
  <div>
    <label className="text-overline block mb-2">{label}</label>
    {ta ? (
      <textarea value={v} onChange={(e) => on(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-[#2C1E16]/15" data-testid={testid} />
    ) : (
      <input type={type} value={v} onChange={(e) => on(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#2C1E16]/15" data-testid={testid} />
    )}
  </div>
);

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get("/admin/orders").then((r) => setOrders(r.data)); }, []);

  const statusColor = (s) => ({
    approved: "text-[#8A9A86] bg-[#8A9A86]/10",
    pending: "text-[#D4AF37] bg-[#D4AF37]/10",
    rejected: "text-red-600 bg-red-50",
    cancelled: "text-[#968B83] bg-[#968B83]/10",
  }[s] || "text-[#968B83] bg-[#968B83]/10");

  return (
    <div data-testid="admin-orders">
      <h1 className="font-serif text-4xl mb-8">Pedidos</h1>
      <table className="w-full text-sm border border-[#2C1E16]/10 rounded-xl overflow-hidden">
        <thead className="bg-[#F9F6F0] text-left text-xs uppercase tracking-wider text-[#5D4B41]">
          <tr>
            <th className="p-3">Pedido</th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Items</th>
            <th className="p-3">Total</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-[#2C1E16]/10" data-testid={`order-row-${o.external_reference}`}>
              <td className="p-3 font-mono text-xs">{o.external_reference.slice(0, 8).toUpperCase()}</td>
              <td className="p-3">
                <div className="font-medium">{o.customer.name}</div>
                <div className="text-xs text-[#968B83]">{o.customer.email}</div>
              </td>
              <td className="p-3">{o.items.length}</td>
              <td className="p-3 font-medium">{formatARS(o.total)}</td>
              <td className="p-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium uppercase ${statusColor(o.status)}`}>{o.status}</span>
              </td>
              <td className="p-3 text-xs text-[#968B83]">{new Date(o.created_at).toLocaleString("es-AR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p className="text-center text-[#968B83] py-12">Sin pedidos aún.</p>}
    </div>
  );
};

const LeadsTab = () => {
  const [leads, setLeads] = useState([]);
  const load = () => api.get("/admin/leads").then((r) => setLeads(r.data));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.put(`/admin/leads/${id}`, { status });
    load();
  };

  const statusColors = {
    new: "bg-[#D4AF37]/20 text-[#967A1F]",
    contacted: "bg-[#C35214]/20 text-[#A64B29]",
    customer: "bg-[#8A9A86]/20 text-[#5C6E5A]",
    recurrent: "bg-[#2C1E16] text-white",
  };

  return (
    <div data-testid="admin-leads">
      <h1 className="font-serif text-4xl mb-2">CRM · Leads</h1>
      <p className="text-[#5D4B41] mb-8">Todos los contactos capturados automáticamente desde chat, registros y compras.</p>
      <table className="w-full text-sm border border-[#2C1E16]/10 rounded-xl overflow-hidden">
        <thead className="bg-[#F9F6F0] text-left text-xs uppercase tracking-wider text-[#5D4B41]">
          <tr>
            <th className="p-3">Contacto</th>
            <th className="p-3">Origen</th>
            <th className="p-3">Pedidos</th>
            <th className="p-3">Total gastado</th>
            <th className="p-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} className="border-t border-[#2C1E16]/10" data-testid={`lead-row-${l.id}`}>
              <td className="p-3">
                <div className="font-medium">{l.name || "—"}</div>
                <div className="text-xs text-[#968B83]">{l.email}</div>
                {l.phone && <div className="text-xs text-[#968B83]">{l.phone}</div>}
              </td>
              <td className="p-3 capitalize text-xs">{l.source}</td>
              <td className="p-3">{l.orders_count || 0}</td>
              <td className="p-3">{formatARS(l.total_spent || 0)}</td>
              <td className="p-3">
                <select
                  value={l.status}
                  onChange={(e) => updateStatus(l.id, e.target.value)}
                  className={`text-xs px-3 py-1 rounded-full font-medium uppercase border-0 outline-none ${statusColors[l.status] || ""}`}
                  data-testid={`lead-status-${l.id}`}
                >
                  <option value="new">Nuevo</option>
                  <option value="contacted">Contactado</option>
                  <option value="customer">Cliente</option>
                  <option value="recurrent">Recurrente</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && <p className="text-center text-[#968B83] py-12">Sin leads aún.</p>}
    </div>
  );
};

const ChatsTab = () => {
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => { api.get("/admin/chat-sessions").then((r) => setSessions(r.data)); }, []);

  const openChat = async (s) => {
    setActive(s);
    const { data } = await api.get(`/admin/chat-sessions/${s.session_id}/messages`);
    setMessages(data);
  };

  return (
    <div data-testid="admin-chats">
      <h1 className="font-serif text-4xl mb-2">Conversaciones IA</h1>
      <p className="text-[#5D4B41] mb-8">Historial de chats del asistente con visitantes.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-[#2C1E16]/10 rounded-xl divide-y divide-[#2C1E16]/10 max-h-[600px] overflow-y-auto">
          {sessions.map((s) => (
            <button
              key={s.session_id}
              onClick={() => openChat(s)}
              className={`block w-full text-left p-4 text-sm hover:bg-[#F9F6F0] ${active?.session_id === s.session_id ? "bg-[#F9F6F0]" : ""}`}
              data-testid={`chat-session-${s.session_id}`}
            >
              <div className="font-medium">{s.user_name || s.user_email || "Anónimo"}</div>
              <div className="text-xs text-[#968B83] truncate">{s.session_id}</div>
              <div className="text-xs text-[#968B83]">{new Date(s.last_message_at).toLocaleString("es-AR")}</div>
            </button>
          ))}
          {sessions.length === 0 && <p className="p-6 text-sm text-[#968B83]">Sin conversaciones.</p>}
        </div>
        <div className="md:col-span-2 border border-[#2C1E16]/10 rounded-xl p-4 max-h-[600px] overflow-y-auto bg-[#F9F6F0]">
          {!active ? (
            <p className="text-sm text-[#968B83] text-center py-12">Seleccioná una conversación.</p>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "bg-[#C35214] text-white" : "bg-white border border-[#2C1E16]/10"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
