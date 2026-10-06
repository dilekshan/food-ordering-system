import { Link, Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useUser, logout } from "../services/api";

export default function Navbar() {
  const { count, clearCart } = useCart();
  const navigate = useNavigate();
  const user = useUser();

  const doLogout = () => {
    clearCart();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="navbar">
      <Link to="/" className="logo">🍴 Foodora</Link>
      <nav>
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/foods">Foods</NavLink>
        <NavLink to="/categories">Categories</NavLink>
        <NavLink to="/my-orders">My Orders</NavLink>
        {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="nav-right">
        <Link to="/cart" className="cart-link" aria-label="Cart">🛒{count > 0 && <span className="cart-badge">{count}</span>}</Link>
        {user ? (
          <>
            <span className="hello">Hi, {user.name}</span>
            <button className="btn" onClick={doLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </header>
  );
}

export function AdminLayout() {
  const user = useUser();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/login" state={{ adminRequired: true }} replace />;

  const doLogout = () => {
    clearCart();
    logout();
    navigate("/login", { replace: true });
  };
  const links = [
    ["/admin", "🏠 Dashboard", true],
    ["/admin/categories", "🗂 Categories"],
    ["/admin/foods", "🍔 Foods"],
    ["/admin/orders", "🧾 Orders"],
    ["/admin/customers", "👥 Customers"],
  ];

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="logo">🍴 Foodora <small>Admin</small></div>
        {links.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end}>{label}</NavLink>
        ))}
        <button onClick={doLogout} className="btn outline logout">Logout</button>
      </aside>
      <section className="admin-main"><Outlet /></section>
    </div>
  );
}
