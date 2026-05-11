import React, { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { Link, Navigate } from "react-router-dom";
import api, { formatARS } from "@/lib/api";
import {
  LayoutDashboard, Package, ShoppingCart, Users, MessageSquare, LogOut,
  TrendingUp, DollarSign, UserCheck, Plus, X, Edit2, Trash2,
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
  name: "", description: "", category: "frutos-secos", base_price: 0,
  image: "", images: [], weight_options: [{ weight: "500g", price: 0, stock: 0 }],
  featured: false, active: true, tags: [],
};

const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get("/products").then((r) => setProducts(r.data));
  useEffect(() => { load(); }, []);

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

  return (
    <div data-testid="admin-products">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-4xl">Productos</h1>
        <button
          onClick={() => { setEditing(emptyProduct); setShowForm(true); }}
          className="bg-[#C35214] text-white px-5 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-[#A64B29]"
          data-testid="add-product-btn"
        >
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      <table className="w-full text-sm border border-[#2C1E16]/10 rounded-xl overflow-hidden">
        <thead className="bg-[#F9F6F0] text-left text-xs uppercase tracking-wider text-[#5D4B41]">
          <tr>
            <th className="p-3">Producto</th>
            <th className="p-3">Categoría</th>
            <th className="p-3">Precio base</th>
            <th className="p-3">Estado</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t border-[#2C1E16]/10" data-testid={`product-row-${p.slug}`}>
              <td className="p-3 flex items-center gap-3">
                <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-[#968B83]">{p.slug}</div>
                </div>
              </td>
              <td className="p-3 capitalize">{p.category.replace("-", " ")}</td>
              <td className="p-3">{formatARS(p.base_price)}</td>
              <td className="p-3">
                {p.active ? <span className="text-[#8A9A86]">Activo</span> : <span className="text-[#968B83]">Inactivo</span>}
                {p.featured && <span className="ml-2 text-[#D4AF37]">★</span>}
              </td>
              <td className="p-3 text-right">
                <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-2 hover:bg-[#E5D9C5] rounded" data-testid={`edit-product-${p.slug}`}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => del(p.id)} className="p-2 hover:bg-red-50 text-red-500 rounded" data-testid={`delete-product-${p.slug}`}>
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
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
    opts[i] = { ...opts[i], [k]: k === "weight" ? v : parseFloat(v) || 0 };
    set("weight_options", opts);
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="product-form-modal">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#2C1E16]/10">
          <h2 className="font-serif text-2xl">{initial?.id ? "Editar" : "Nuevo"} producto</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Inp label="Nombre" v={form.name} on={(v) => set("name", v)} testid="form-name" />
          <Inp label="Imagen URL" v={form.image} on={(v) => set("image", v)} testid="form-image" />
          <Inp label="Descripción" v={form.description} on={(v) => set("description", v)} ta testid="form-desc" />
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Categoría" v={form.category} on={(v) => set("category", v)} testid="form-category" />
            <Inp label="Precio base" v={form.base_price} on={(v) => set("base_price", parseFloat(v) || 0)} type="number" testid="form-price" />
          </div>
          <div>
            <label className="text-overline block mb-2">Presentaciones</label>
            {form.weight_options.map((o, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <input value={o.weight} onChange={(e) => setOpt(i, "weight", e.target.value)} placeholder="500g" className="px-3 py-2 rounded-lg border border-[#2C1E16]/15" />
                <input value={o.price} onChange={(e) => setOpt(i, "price", e.target.value)} type="number" placeholder="Precio" className="px-3 py-2 rounded-lg border border-[#2C1E16]/15" />
                <input value={o.stock} onChange={(e) => setOpt(i, "stock", e.target.value)} type="number" placeholder="Stock" className="px-3 py-2 rounded-lg border border-[#2C1E16]/15" />
              </div>
            ))}
            <button onClick={() => set("weight_options", [...form.weight_options, { weight: "", price: 0, stock: 0 }])} className="text-sm text-[#C35214]">
              + Agregar presentación
            </button>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} data-testid="form-featured" /> Destacado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} data-testid="form-active" /> Activo
            </label>
          </div>
        </div>
        <div className="p-6 border-t border-[#2C1E16]/10 flex justify-end gap-3">
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
