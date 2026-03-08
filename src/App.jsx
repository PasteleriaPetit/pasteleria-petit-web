import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Spinner from "./components/Spinner";
import CartButton from "./components/CartButton";
import CartDrawer from "./components/CartDrawer";

// ✅ NUEVO
import RappiButton from "./components/RappiButton";
import RappiDrawer from "./components/RappiDrawer";

// Lazy imports
const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const Nosotros = lazy(() => import("./pages/Nosotros"));
const Cafeteria = lazy(() => import("./pages/Cafeteria"));
const Sucursales = lazy(() => import("./pages/Sucursales"));
const BolsaTrabajo = lazy(() => import("./pages/BolsaTrabajo"));
const Facturacion = lazy(() => import("./pages/Facturacion"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const ProductsAdmin = lazy(() => import("./pages/admin/ProductsAdmin"));
const Register = lazy(() => import("./pages/Register"));
const UsersAdmin = lazy(() => import("./pages/admin/UsersAdmin"));
const CafeteriaAdmin = lazy(() => import("./pages/admin/CafeteriaAdmin"));
const PedidosEspeciales = lazy(() => import("./pages/PedidosEspeciales"));
const Privacidad = lazy(() => import("./pages/Privacidad"));
const PedidosEspecialesAdmin = lazy(() =>import("./pages/admin/PedidosEspecialesAdmin"));
const BolsaTrabajoAdmin = lazy(() => import("./pages/admin/BolsaTrabajoAdmin"));
const FacturacionAdmin = lazy(() => import("./pages/admin/FacturacionAdmin"));
const SeedData = lazy(() => import("./pages/admin/SeedData"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Novedades = lazy(() => import("./pages/Novedades"));
const NovedadesAdmin = lazy(() => import("./pages/admin/NovedadesAdmin"));
const OrdersAdmin = lazy(() => import("./pages/admin/OrdersAdmin"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutPending = lazy(() => import("./pages/CheckoutPending"));
const CheckoutCancel = lazy(() => import("./pages/CheckoutCancel"));
const GoogleAnalytics = lazy(() => import("./pages/google2c9b13ae1cb961e7.html"));

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);

  // NUEVO
  const [rappiOpen, setRappiOpen] = useState(false);

  // Permite abrir el drawer desde cualquier parte sin prop-drilling:
  // window.dispatchEvent(new CustomEvent("open-rappi-drawer"))
  useEffect(() => {
    const handler = () => setRappiOpen(true);
    window.addEventListener("open-rappi-drawer", handler);
    return () => window.removeEventListener("open-rappi-drawer", handler);
  }, []);

  return (
    <AuthProvider>
      <>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/productos"
                  element={<Products />}
                />
                <Route 
                path="/google2c9b13ae1cb961e7.html" 
                element={<GoogleAnalytics />} 
                />
                <Route
                  path="/nosotros"
                  element={<Nosotros />}
                />
                <Route
                  path="/cafeteria"
                  element={<Cafeteria />}
                />
                <Route
                  path="/sucursales"
                  element={<Sucursales />}
                />
                <Route
                  path="/bolsa-de-trabajo"
                  element={<BolsaTrabajo />}
                />
                <Route
                  path="/facturacion"
                  element={<Facturacion />}
                />
                <Route
                  path="/login"
                  element={<Login />}
                />
                <Route
                  path="/register"
                  element={<Register />}
                />
                <Route
                  path="/pedidos-especiales"
                  element={<PedidosEspeciales />}
                />
                <Route
                  path="/privacidad"
                  element={<Privacidad />}
                />
                <Route
                  path="/novedades"
                  element={<Novedades />}
                />

                <Route 
                  path="/checkout"
                  element={<Checkout />} 
                />
                <Route 
                  path="/checkout-success"
                  element={<CheckoutSuccess />}
                />
                <Route 
                  path="/checkout-pending"
                  element={<CheckoutPending />} 
                />
                <Route 
                  path="/checkout-cancel"
                  element={<CheckoutCancel />} 
                />

                {/* Admin */}
                <Route
                  path="/1fPaYyxWaapylzV/Gipj4gVqPJKP4I3QS54tSatEwL9qiUdzePZJBJAdxC8ZFupN"
                  element={
                    <ProtectedRoute allow={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/Fcm5Qpimck7lCl+L35tOt3qNoIe0FVVSmhdFs//ik+Xn3k+ZcwPpYgjUmlwytLRd"
                  element={
                    <ProtectedRoute allow={["admin"]}>
                      <ProductsAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/WvSIxhg7Zi0x2P0+vwlvRVxU5qqY4p5T/A10OYD0ajivoZ58dIcjpjZvGb7+MlSK"
                  element={
                    <ProtectedRoute allow={["admin"]}>
                      <CafeteriaAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/Uj5zYyvghCo66RKvCzhrOPxvaS8ke24ccckQVOpEIIy0e895p3CpJvwCxwsGf4FV"
                  element={
                    <ProtectedRoute allow={["admin"]}>
                      <UsersAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rbuvrD9G0kE6JYHvC39TuU0g8Lfj97IByG/45n6NfcPDShkIdeuc4Tv7CtY9zyTpnhCyxRImHyZLPDLXsHInpw"
                  element={
                    <ProtectedRoute requiredRole={["admin"]}>
                      <PedidosEspecialesAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/e/gwQysFs3gp3skmr7JaaQbw9Ehet1NTVeXeqROMFPrk1nu/A80K86WwSvMNwc56tcByHjA4KAhUjJgAohtbrA"
                  element={
                    <ProtectedRoute requiredRole={["admin"]}>
                      <BolsaTrabajoAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chWDrcJtqc4R7GqAaRD84hTBtiIVBVr7pRNnysODTRZYUM70/Bx/DUEhmZF9nDPpJn6ZVvER6CQW1iK5VbWEw"
                  element={
                    <ProtectedRoute requiredRole={["admin"]}>
                      <FacturacionAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/HbsbotNucBKduoJPAD5pOMSdRZjfbumJhIxMpxJ/TpIzropUy7H63/D4fUg8qSj2"
                  element={
                    <ProtectedRoute requiredRole={["admin"]}>
                      <SeedData />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/hyrfr/gwQysFs3gp3skmr7JaaQbw9Ehet1NTVeXeqROMFPrk1nu/A80K86WwSvMNwc56tcByHjA4KAhUjJgAohtbrA"
                  element={
                    <ProtectedRoute allow={["admin"]}>
                      <NovedadesAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/heoie/gwQysFs3gp3skmr7JaaQbw9Ehet1NTVeXeqROMFPrk1nu/A80K86WwSvMNwc56tcByHjA4KAhUjJgAohtbrA"
                  element={
                    <ProtectedRoute allow={["admin"]}>
                      <OrdersAdmin />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>

        {/* Botones flotantes */}
        <CartButton onClick={() => setCartOpen(true)} />
        <RappiButton onClick={() => setRappiOpen(true)} />

        {/* Drawers */}
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        <RappiDrawer open={rappiOpen} onClose={() => setRappiOpen(false)} />
      </>
    </AuthProvider>
  );
}
