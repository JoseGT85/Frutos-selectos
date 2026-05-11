import React from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatARS } from "@/lib/api";

const CartDrawer = () => {
  const { items, open, setOpen, updateQty, removeItem, subtotal } = useCart();
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        className="border-l w-full sm:max-w-md flex flex-col"
        style={{ backgroundColor: "var(--bg-default)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        data-testid="cart-drawer"
      >
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl" style={{ color: "var(--text-primary)" }}>Tu carrito</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <ShoppingBag size={48} style={{ color: "var(--text-muted)" }} className="mb-4" />
            <p style={{ color: "var(--text-secondary)" }}>Tu carrito está vacío</p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Sumá frutos selectos premium y aprovechá envío gratis en tu primera compra superando $400.000.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin py-4 space-y-4">
            {items.map((it) => {
              const key = `${it.product_id}-${it.weight}`;
              return (
                <div key={key} className="flex gap-3 items-start" data-testid={`cart-item-${key}`}>
                  <img
                    src={it.image}
                    alt={it.name}
                    className="w-16 h-16 object-cover rounded-xl border border-[#2C1E16]/10"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-[#2C1E16]">{it.name}</div>
                    <div className="text-xs text-[#968B83]">{it.weight}</div>
                    <div className="text-sm font-semibold mt-1">{formatARS(it.unit_price)}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQty(key, it.quantity - 1)}
                        className="w-7 h-7 rounded-full border border-[#2C1E16]/20 flex items-center justify-center hover:bg-[#E5D9C5]"
                        data-testid={`decrease-${key}`}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm w-6 text-center">{it.quantity}</span>
                      <button
                        onClick={() => updateQty(key, it.quantity + 1)}
                        className="w-7 h-7 rounded-full border border-[#2C1E16]/20 flex items-center justify-center hover:bg-[#E5D9C5]"
                        data-testid={`increase-${key}`}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeItem(key)}
                        className="ml-auto text-[#968B83] hover:text-[#C35214]"
                        data-testid={`remove-${key}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter className="border-t border-[#2C1E16]/10 pt-4 flex-col gap-3 sm:flex-col">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-[#5D4B41]">Subtotal</span>
              <span className="font-semibold text-lg" data-testid="cart-subtotal">{formatARS(subtotal)}</span>
            </div>
            <Button
              className="w-full bg-[#C35214] hover:bg-[#A64B29] text-white rounded-full py-6 text-base"
              onClick={() => {
                setOpen(false);
                navigate("/checkout");
              }}
              data-testid="go-to-checkout-btn"
            >
              Finalizar compra
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
