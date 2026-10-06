import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useUser } from "./services/api";
import AuthPage from "./pages/customer/AuthPage.jsx";
import Categories from "./pages/customer/Categories.jsx";
import Navbar, { AdminLayout } from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/customer/Home.jsx";
import FoodListing from "./pages/customer/FoodListing.jsx";
import Cart from "./pages/customer/Cart.jsx";
import Checkout from "./pages/customer/Checkout.jsx";
import OrderConfirmation from "./pages/customer/OrderConfirmation.jsx";
import MyOrders from "./pages/customer/MyOrders.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import FoodManagement from "./pages/admin/FoodManagement.jsx";
import CategoryManagement from "./pages/admin/CategoryManagement.jsx";
import OrderManagement from "./pages/admin/OrderManagement.jsx";
import UserManagement from "./pages/admin/UserManagement.jsx";

function CustomerLayout() {
  const user = useUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "customer") return <Navigate to="/admin" replace />;
  return (
    <>
      <Navbar />
      <main className="container"><Outlet /></main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage registerMode />} />
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/foods" element={<FoodListing />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
        <Route path="/my-orders" element={<MyOrders />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="foods" element={<FoodManagement />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="customers" element={<UserManagement />} />
      </Route>
      <Route path="*" element={<CustomerLayout />}>
        <Route path="*" element={<p className="empty">Page not found.</p>} />
      </Route>
    </Routes>
  );
}
