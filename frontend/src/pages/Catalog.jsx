import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { formatARS } from "@/lib/api";
import { Search } from "lucide-react";

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");

  useEffect(() => {
    setLoading(true);
    const url = category ? `/products?category=${category}` : "/products";
    api.get(url).then((r) => setProducts(r.data)).finally(() => setLoading(false));
  }, [category]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <main className="px-6 md:px-12 py-12 md:py-20 max-w-7xl mx-auto" data-testid="catalog-page" style={{ color: "var(--text-primary)" }}>
      <div className="mb-12">
        <p className="text-overline mb-4" style={{ color: "var(--primary)" }}>Tienda</p>
        <h1 className="font-serif text-5xl md:text-6xl mb-6" style={{ color: "var(--text-primary)" }}>Nuestro catálogo</h1>

        <div className="flex items-center gap-3 max-w-md mt-8">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full border outline-none text-sm"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              data-testid="search-input"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6 flex-wrap">
          <Link
            to="/catalogo"
            className="px-4 py-2 rounded-full text-sm border transition-colors"
            style={
              !category
                ? { backgroundColor: "var(--text-primary)", color: "var(--text-inverse)", borderColor: "var(--text-primary)" }
                : { borderColor: "var(--border-strong)", color: "var(--text-primary)" }
            }
            data-testid="filter-all"
          >
            Todos
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              to={`/catalogo?category=${c}`}
              className="px-4 py-2 rounded-full text-sm border transition-colors capitalize"
              style={
                category === c
                  ? { backgroundColor: "var(--text-primary)", color: "var(--text-inverse)", borderColor: "var(--text-primary)" }
                  : { borderColor: "var(--border-strong)", color: "var(--text-primary)" }
              }
              data-testid={`filter-${c}`}
            >
              {c.replace(/-/g, " ")}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl animate-pulse" style={{ backgroundColor: "var(--bg-alt)" }}></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/producto/${p.slug}`}
              className="group block rounded-2xl border overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              data-testid={`product-card-${p.slug}`}
            >
              <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: "var(--bg-alt)" }}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.featured && (
                  <span className="absolute top-3 left-3 text-overline px-3 py-1 rounded-full" style={{ backgroundColor: "var(--gold)", color: "var(--text-primary)" }}>
                    Destacado
                  </span>
                )}
              </div>
              <div className="p-6">
                <h3 className="font-serif text-2xl mb-2" style={{ color: "var(--text-primary)" }}>{p.name}</h3>
                <p className="text-sm mb-4 line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p.description}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>desde</p>
                    <p className="text-xl font-semibold" style={{ color: "var(--primary)" }}>
                      {formatARS(p.weight_options?.[0]?.price || p.base_price)}
                    </p>
                  </div>
                  <span className="text-sm font-medium border rounded-full px-4 py-2 transition-colors group-hover:bg-current"
                        style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}>
                    Ver más
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>No se encontraron productos.</div>
      )}
    </main>
  );
};

export default Catalog;
