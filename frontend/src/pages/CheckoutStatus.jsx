import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Clock, Sparkles } from "lucide-react";
import api, { formatARS } from "@/lib/api";

const statusConfig = {
  success: {
    icon: CheckCircle,
    color: "text-[#8A9A86]",
    bg: "bg-[#8A9A86]/10",
    title: "¡Pago aprobado!",
    desc: "Gracias por tu compra. Te enviaremos un email con los detalles del envío.",
  },
  failure: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    title: "Pago rechazado",
    desc: "Hubo un problema con el pago. Probá nuevamente o usá otro medio de pago.",
  },
  pending: {
    icon: Clock,
    color: "text-[#D4AF37]",
    bg: "bg-[#D4AF37]/10",
    title: "Pago pendiente",
    desc: "Tu pago está siendo procesado. Te avisaremos por email cuando se acredite.",
  },
};

const CheckoutStatus = ({ status }) => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState(null);
  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  useEffect(() => {
    if (orderId) {
      api.get(`/orders/${orderId}`).then((r) => setOrder(r.data)).catch(() => {});
    }
  }, [orderId]);

  return (
    <main className="px-6 md:px-12 py-20 max-w-2xl mx-auto text-center" data-testid={`checkout-${status}`}>
      <div className={`w-24 h-24 mx-auto rounded-full ${cfg.bg} flex items-center justify-center mb-8 fade-up`}>
        <Icon className={cfg.color} size={48} />
      </div>
      <h1 className="font-serif text-5xl text-[#2C1E16] mb-4">{cfg.title}</h1>
      <p className="text-[#5D4B41] mb-10 text-lg">{cfg.desc}</p>

      {order && (
        <div className="bg-white border border-[#2C1E16]/10 rounded-2xl p-6 text-left mb-8">
          <p className="text-overline text-[#968B83] mb-3">Resumen del pedido</p>
          <div className="flex justify-between text-sm py-2 border-b border-[#2C1E16]/10">
            <span>Pedido #</span>
            <span className="font-mono">{order.external_reference.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b border-[#2C1E16]/10">
            <span>Estado</span>
            <span className="font-medium capitalize">{order.status}</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b border-[#2C1E16]/10">
            <span>Items</span>
            <span>{order.items.length}</span>
          </div>
          <div className="flex justify-between text-base py-2 font-semibold">
            <span>Total</span>
            <span>{formatARS(order.total)}</span>
          </div>
        </div>
      )}

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-8 py-4 bg-[#C35214] text-white rounded-full hover:bg-[#A64B29] transition-all"
        data-testid="back-home-btn"
      >
        <Sparkles size={16} />
        Volver al inicio
      </Link>
    </main>
  );
};

export default CheckoutStatus;
