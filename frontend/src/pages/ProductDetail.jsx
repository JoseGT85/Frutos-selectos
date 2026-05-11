import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { formatARS } from "@/lib/api";
import { ShoppingBag, ChevronLeft, Truck, Award } from "lucide-react";
import { useCart } from "@/store/cart";

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [selectedWeight, setSelectedWeight] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/products/${slug}`)
      .then((r) => {
        setProduct(r.data);
        setSelectedWeight(r.data.weight_options?.[0] || null);
      })
      .catch(() => navigate("/catalogo"))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  if (loading) return <div className="p-12 text-center" data-testid="product-loading">Cargando...</div>;
  if (!product) return null;

  const addToCart = () => {
    if (!selectedWeight) return;
    addItem({
      product_id: product.id,
      name: product.name,
      weight: selectedWeight.weight,
      unit_price: selectedWeight.price,
      image: product.image,
      quantity: qty,
    });
  };

  return (
    <main className="px-6 md:px-12 py-12 max-w-7xl mx-auto" data-testid="product-detail-page">
      <Link to="/catalogo" className="inline-flex items-center gap-2 text-sm text-[#5D4B41] hover:text-[#C35214] mb-8" data-testid="back-to-catalog">
        <ChevronLeft size={16} />
        Volver al catálogo
      </Link>

      <div className="grid md:grid-cols-2 gap-12 md:gap-20">
        <div className="aspect-square overflow-hidden rounded-3xl bg-[#E5D9C5]">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>

        <div>
          <p className="text-overline text-[#C35214] mb-3">{product.category.replace("-", " ")}</p>
          <h1 className="font-serif text-5xl text-[#2C1E16] mb-4">{product.name}</h1>
          <p className="text-lg text-[#5D4B41] leading-relaxed mb-8">{product.description}</p>

          {product.weight_options?.length > 0 && (
            <div className="mb-8">
              <p className="text-overline text-[#5D4B41] mb-3">Presentación</p>
              <div className="flex gap-3 flex-wrap">
                {product.weight_options.map((opt) => (
                  <button
                    key={opt.weight}
                    onClick={() => setSelectedWeight(opt)}
                    className={`px-5 py-3 rounded-full border text-sm font-medium transition-all ${
                      selectedWeight?.weight === opt.weight
                        ? "bg-[#2C1E16] text-white border-[#2C1E16]"
                        : "bg-white border-[#2C1E16]/20 text-[#2C1E16] hover:border-[#C35214]"
                    }`}
                    data-testid={`weight-option-${opt.weight}`}
                  >
                    <div>{opt.weight}</div>
                    <div className="text-xs opacity-70">{formatARS(opt.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-8">
            <span className="text-overline text-[#5D4B41]">Cantidad</span>
            <div className="flex items-center gap-1 bg-white border border-[#2C1E16]/20 rounded-full">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10" data-testid="qty-decrease">-</button>
              <span className="w-10 text-center" data-testid="qty-value">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-10 h-10" data-testid="qty-increase">+</button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div>
              <p className="text-xs text-[#968B83]">Total</p>
              <p className="text-3xl font-semibold text-[#C35214]" data-testid="product-total-price">
                {formatARS((selectedWeight?.price || product.base_price) * qty)}
              </p>
            </div>
            <button
              onClick={addToCart}
              className="ml-auto flex items-center gap-2 px-8 py-4 bg-[#C35214] hover:bg-[#A64B29] text-white rounded-full font-medium transition-all hover:-translate-y-1"
              data-testid="add-to-cart-btn"
            >
              <ShoppingBag size={18} />
              Agregar al carrito
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-8 border-t border-[#2C1E16]/10">
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-[#C35214]" />
              <div>
                <p className="text-xs text-[#968B83]">Envío</p>
                <p className="text-sm font-medium">Todo Argentina</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award size={20} className="text-[#C35214]" />
              <div>
                <p className="text-xs text-[#968B83]">Calidad</p>
                <p className="text-sm font-medium">Premium garantizada</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProductDetail;
