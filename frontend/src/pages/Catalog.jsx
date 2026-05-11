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
    <main className="px-6 md:px-12 py-12 md:py-20 max-w-7xl mx-auto" data-testid="catalog-page">
      <div className="mb-12">
        <p className="text-overline text-[#C35214] mb-4">Tienda</p>
        <h1 className="font-serif text-5xl md:text-6xl text-[#2C1E16] mb-6">Nuestro catálogo</h1>

        <div className="flex items-center gap-3 max-w-md mt-8">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#968B83]" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full bg-white border border-[#2C1E16]/10 outline-none focus:ring-2 focus:ring-[#C35214]/30 text-sm"
              data-testid="search-input"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6 flex-wrap">
          <Link
            to="/catalogo"
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              !category ? "bg-[#2C1E16] text-white border-[#2C1E16]" : "border-[#2C1E16]/20 hover:bg-[#E5D9C5]"
            }`}
            data-testid="filter-all"
          >
            Todos
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              to={`/catalogo?category=${c}`}
              className={`px-4 py-2 rounded-full text-sm border transition-colors capitalize ${
                category === c ? "bg-[#2C1E16] text-white border-[#2C1E16]" : "border-[#2C1E16]/20 hover:bg-[#E5D9C5]"
              }`}
              data-testid={`filter-${c}`}
            >
              {c.replace("-", " ")}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-[#E5D9C5] rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/producto/${p.slug}`}
              className="group block bg-white rounded-2xl border border-[#2C1E16]/10 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
              data-testid={`product-card-${p.slug}`}
            >
              <div className="aspect-square overflow-hidden bg-[#E5D9C5] relative">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.featured && (
                  <span className="absolute top-3 left-3 bg-[#D4AF37] text-[#2C1E16] text-overline px-3 py-1 rounded-full">
                    Destacado
                  </span>
                )}
              </div>
              <div className="p-6">
                <h3 className="font-serif text-2xl text-[#2C1E16] mb-2">{p.name}</h3>
                <p className="text-sm text-[#5D4B41] mb-4 line-clamp-2 leading-relaxed">{p.description}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-[#968B83] mb-1">desde</p>
                    <p className="text-xl font-semibold text-[#C35214]">
                      {formatARS(p.weight_options?.[0]?.price || p.base_price)}
                    </p>
                  </div>
                  <span className="text-sm font-medium border border-[#2C1E16]/20 rounded-full px-4 py-2 group-hover:bg-[#2C1E16] group-hover:text-white transition-colors">
                    Ver más
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-[#968B83]">No se encontraron productos.</div>
      )}
    </main>
  );
};

export default Catalog;
