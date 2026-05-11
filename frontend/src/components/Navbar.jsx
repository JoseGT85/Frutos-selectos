import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, User, Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { useCart } from "@/store/cart";
import { useAuth } from "@/store/auth";

const Navbar = () => {
  const { count, setOpen } = useCart();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/catalogo", label: "Catálogo" },
    { to: "/nosotros", label: "Nosotros" },
  ];

  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-xl bg-[#F9F6F0]/80 border-b border-[#2C1E16]/10"
      data-testid="main-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
          <span className="text-2xl font-serif tracking-tight">
            Frutos Secos<span className="text-[#C35214]">.</span>
          </span>
          <span className="text-overline text-[#968B83] hidden sm:inline">Premium</span>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-[#2C1E16] hover:text-[#C35214] transition-colors"
              data-testid={`nav-${l.label.toLowerCase()}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-[#2C1E16] text-white text-sm hover:bg-[#5D4B41] transition-colors"
              data-testid="admin-link"
            >
              <LayoutDashboard size={14} />
              Admin
            </Link>
          )}
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/mi-cuenta"
                className="text-sm text-[#2C1E16] hover:text-[#C35214] flex items-center gap-1"
                data-testid="my-account-link"
              >
                <User size={16} />
                {user.name?.split(" ")[0] || "Cuenta"}
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="text-[#968B83] hover:text-[#C35214]"
                data-testid="logout-btn"
                aria-label="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-1 text-sm text-[#2C1E16] hover:text-[#C35214]"
              data-testid="login-link"
            >
              <User size={16} />
              Ingresar
            </Link>
          )}
          <button
            onClick={() => setOpen(true)}
            className="relative p-2 hover:bg-[#E5D9C5] rounded-full transition-colors"
            aria-label="Carrito"
            data-testid="open-cart-btn"
          >
            <ShoppingBag size={20} />
            {count > 0 && (
              <span
                className="absolute -top-1 -right-1 bg-[#C35214] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                data-testid="cart-count-badge"
              >
                {count}
              </span>
            )}
          </button>
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menú"
            data-testid="mobile-menu-toggle"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#2C1E16]/10 bg-[#F9F6F0]">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium py-2"
                data-testid={`mobile-nav-${l.label.toLowerCase()}`}
              >
                {l.label}
              </Link>
            ))}
            {user?.role === "admin" && (
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-sm py-2">
                Panel Admin
              </Link>
            )}
            {user ? (
              <>
                <Link to="/mi-cuenta" onClick={() => setMobileOpen(false)} className="text-sm py-2">
                  Mi cuenta
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                    navigate("/");
                  }}
                  className="text-sm py-2 text-left"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm py-2">
                Ingresar / Crear cuenta
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
