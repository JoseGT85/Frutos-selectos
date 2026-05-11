import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api, { formatARS } from "@/lib/api";
import { CreditCard, Sparkles, AlertCircle } from "lucide-react";

/** Página de pago mock cuando no hay token real de Mercado Pago. */
const CheckoutMock = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId) api.get(`/orders/${orderId}`).then((r) => setOrder(r.data));
  }, [orderId]);

  const pay = async (success) => {
    setLoading(true);
    try {
      if (success) {
        await api.post(`/orders/${orderId}/mock-pay`);
        navigate(`/checkout/success?order=${orderId}`);
      } else {
        navigate(`/checkout/failure?order=${orderId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!order) return <div className="p-20 text-center" data-testid="mock-loading">Cargando...</div>;

  return (
    <main className="px-6 md:px-12 py-20 max-w-xl mx-auto" data-testid="checkout-mock">
      <div className="bg-white rounded-2xl border border-[#2C1E16]/10 p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#2C1E16]/10">
          <div className="w-12 h-12 rounded-xl bg-[#009EE3] flex items-center justify-center">
            <CreditCard className="text-white" size={24} />
          </div>
          <div>
            <p className="text-overline text-[#968B83]">Simulador de pago</p>
            <h1 className="font-serif text-2xl">Mercado Pago (modo demo)</h1>
          </div>
        </div>

        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle size={18} className="text-[#D4AF37] mt-0.5 flex-shrink-0" />
          <div className="text-sm text-[#5D4B41]">
            <strong>Modo demo activo.</strong> Configurá tu MP_ACCESS_TOKEN real en el backend para
            habilitar pagos en producción.
          </div>
        </div>

        <div className="space-y-2 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-[#968B83]">Pedido</span>
            <span className="font-mono">{order.external_reference.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#968B83]">Cliente</span>
            <span>{order.customer.name}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold pt-3 border-t border-[#2C1E16]/10">
            <span>Total</span>
            <span data-testid="mock-total">{formatARS(order.total)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => pay(true)}
            disabled={loading}
            className="w-full bg-[#8A9A86] hover:bg-[#6F7C6B] text-white py-4 rounded-full font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            data-testid="mock-pay-success"
          >
            <Sparkles size={16} />
            {loading ? "Procesando..." : "Simular pago aprobado"}
          </button>
          <button
            onClick={() => pay(false)}
            disabled={loading}
            className="w-full border border-red-300 text-red-600 hover:bg-red-50 py-4 rounded-full font-medium transition-all"
            data-testid="mock-pay-fail"
          >
            Simular pago rechazado
          </button>
        </div>
      </div>
    </main>
  );
};

export default CheckoutMock;
