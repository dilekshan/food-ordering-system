import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { errorMessage, setUser, useUser } from "../../services/api";
import { login, register } from "../../services/customerService";
import { useCart } from "../../context/CartContext.jsx";
import heroImage from "../../assets/images/Rustic Margherita Pizza Hero Scene.png";

export default function AuthPage({ registerMode = false }) {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const adminRequired = location.state?.adminRequired && user?.role !== "admin";
  if (user && !adminRequired) return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (registerMode) {
        await register({ ...form, name: form.name.trim(), email: form.email.trim() });
        setForm({ ...form, password: "" });
        setMessage("Account created. Please log in with your email and password.");
        navigate("/login", { replace: true });
      } else {
        const result = await login(form.email.trim(), form.password);
        clearCart();
        setUser(result);
        navigate(result.role === "admin" ? "/admin" : "/", { replace: true });
      }
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  return <main className="auth-page">
    <section className="auth-showcase" style={{ backgroundImage: `linear-gradient(180deg, rgba(25, 13, 7, 0.08), rgba(25, 13, 7, 0.78)), url("${heroImage}")` }}>
      <Link to="/login" className="auth-brand">🍴 Foodora</Link>
      <div className="auth-showcase-copy">
        <span className="auth-eyebrow">GOOD FOOD, GOOD MOOD</span>
        <h2>A little taste of<br /><span>happiness.</span></h2>
        <p>Fresh favorites, made with care and delivered right to your door.</p>
      </div>
      <span className="auth-showcase-note">Freshly prepared. Lovingly delivered.</span>
    </section>
    <section className="auth-content">
      <form className="form auth-form" onSubmit={submit}>
        <span className="auth-form-kicker">{registerMode ? "JOIN FOODIE" : "WELCOME BACK"}</span>
        <h1>{registerMode ? "Create account" : "Login"}</h1>
        <p className="auth-subtitle">{registerMode ? "Create an account to start ordering your favorites." : "Sign in to discover something delicious today."}</p>
        {adminRequired && <p className="auth-notice" role="status">Please log in with an admin account. <Link to="/">Return to Home</Link></p>}
        {registerMode && <>
          <label htmlFor="name">Full name</label><input id="name" name="name" required maxLength={100} value={form.name} onChange={change} />
          <label htmlFor="phone">Phone</label><input id="phone" name="phone" maxLength={20} value={form.phone} onChange={change} />
          <label htmlFor="address">Address</label><textarea id="address" name="address" maxLength={255} value={form.address} onChange={change} />
        </>}
        <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={150} value={form.email} onChange={change} />
        <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={registerMode ? "new-password" : "current-password"} required minLength={registerMode ? 4 : 1} value={form.password} onChange={change} />
        {error && <p className="error auth-error" role="alert">{error}</p>}
        {message && <p className="auth-notice" role="status">{message}</p>}
        <button className="btn auth-submit" disabled={busy}>{busy ? "Please wait..." : registerMode ? "Register" : "Login"}<span aria-hidden="true">→</span></button>
        <p className="auth-switch">{registerMode ? "Already have an account?" : "New to Foodora?"} <Link to={registerMode ? "/login" : "/register"} onClick={() => { setError(""); setMessage(""); }}>{registerMode ? "Login" : "Create an account"}</Link></p>
        <p className="auth-secure">🔒 Your account details are securely protected</p>
      </form>
    </section>
  </main>;
}
