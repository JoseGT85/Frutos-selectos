import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, User, Menu, X, LayoutDashboard, LogOut, Sun, Moon } from "lucide-react";
import { useCart } from "@/store/cart";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/store/theme";

const Navbar = () => {
  const { count, setOpen } = useCart();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/catalogo", label: "Catálogo" },
    { to: "/nosotros", label: "Nosotros" },
  ];

  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-xl border-b"
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-default) 80%, transparent)",
        borderColor: "var(--border)",
      }}
      data-testid="main-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-end gap-2 group" data-testid="logo-link">
          <span className="text-2xl md:text-3xl font-serif tracking-tight" style={{ color: "var(--text-primary)" }}>
            Frutos<span style={{ color: "var(--primary)" }}>Selectos</span>
          </span>
          <span className="text-[9px] tracking-[0.18em] uppercase font-bold hidden sm:block pb-1.5" style={{ color: "var(--text-muted)" }}>
            Mendoza · AR
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium link-fancy"
              style={{ color: "var(--text-primary)" }}
              data-testid={`nav-${l.label.toLowerCase()}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-full transition-colors"
            style={{ color: "var(--text-primary)" }}
            aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            data-testid="theme-toggle"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-alt)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors"
              style={{ backgroundColor: "var(--text-primary)", color: "var(--text-inverse)" }}
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
                className="text-sm flex items-center gap-1 link-fancy"
                style={{ color: "var(--text-primary)" }}
                data-testid="my-account-link"
              >
                <User size={16} />
                {user.name?.split(" ")[0] || "Cuenta"}
              </Link>
              <button
                onClick={() => { logout(); navigate("/"); }}
                style={{ color: "var(--text-muted)" }}
                data-testid="logout-btn"
                aria-label="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-1 text-sm link-fancy"
              style={{ color: "var(--text-primary)" }}
              data-testid="login-link"
            >
              <User size={16} />
              Ingresar
            </Link>
          )}
          <button
            onClick={() => setOpen(true)}
            className="relative p-2 rounded-full transition-colors"
            style={{ color: "var(--text-primary)" }}
            aria-label="Carrito"
            data-testid="open-cart-btn"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-alt)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <ShoppingBag size={20} />
            {count > 0 && (
              <span
                className="absolute -top-1 -right-1 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--primary)", color: "#fff" }}
                data-testid="cart-count-badge"
              >
                {count}
              </span>
            )}
          </button>
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: "var(--text-primary)" }}
            aria-label="Menú"
            data-testid="mobile-menu-toggle"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-default)" }}>
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2" data-testid={`mobile-nav-${l.label.toLowerCase()}`}>
                {l.label}
              </Link>
            ))}
            {user?.role === "admin" && <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-sm py-2">Panel Admin</Link>}
            {user ? (
              <>
                <Link to="/mi-cuenta" onClick={() => setMobileOpen(false)} className="text-sm py-2">Mi cuenta</Link>
                <button onClick={() => { logout(); setMobileOpen(false); navigate("/"); }} className="text-sm py-2 text-left">Cerrar sesión</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm py-2">Ingresar / Crear cuenta</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
