import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/store/auth";
import { CartProvider } from "@/store/cart";
import { ThemeProvider } from "@/store/theme";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import Chatbot from "@/components/Chatbot";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import CheckoutStatus from "@/pages/CheckoutStatus";
import CheckoutMock from "@/pages/CheckoutMock";
import AuthPage from "@/pages/AuthPage";
import MyAccount from "@/pages/MyAccount";
import About from "@/pages/About";
import AdminPanel from "@/pages/AdminPanel";

const StorefrontLayout = ({ children }) => (
  <>
    <Navbar />
    {children}
    <Footer />
    <CartDrawer />
    <Chatbot />
  </>
);

const AppRoutes = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    );
  }

  return (
    <StorefrontLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/producto/:slug" element={<ProductDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/mock" element={<CheckoutMock />} />
        <Route path="/checkout/success" element={<CheckoutStatus status="success" />} />
        <Route path="/checkout/failure" element={<CheckoutStatus status="failure" />} />
        <Route path="/checkout/pending" element={<CheckoutStatus status="pending" />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/registro" element={<AuthPage mode="register" />} />
        <Route path="/mi-cuenta" element={<MyAccount />} />
        <Route path="/nosotros" element={<About />} />
      </Routes>
    </StorefrontLayout>
  );
};

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <AppRoutes />
              <Toaster />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
