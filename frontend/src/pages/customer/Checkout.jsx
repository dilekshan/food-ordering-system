import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { errorMessage, useUser, money } from "../../services/api";
import { placeOrder } from "../../services/orderService";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const user = useUser();
  const navigate = useNavigate();
  const [address, setAddress] = useState(user?.address || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || user.role !== "customer")
    return <p className="empty">Please login with a customer account to place an order.</p>;
  if (items.length === 0)
    return <p className="empty">Your cart is empty. <Link to="/foods">Browse foods</Link></p>;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const order = await placeOrder({
        customer_id: user.id,
        address,
        items: items.map((i) => ({ food_id: i.id, quantity: i.qty })),
      });
      clearCart();
      navigate(`/order-confirmation/${order.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <>
      <h2>Checkout</h2>
      <form className="card form" onSubmit={submit}>
        {items.map((i) => (
          <div key={i.id} className="row"><span>{i.name} × {i.qty}</span><span>{money(i.price * i.qty)}</span></div>
        ))}
        <h3>Total: {money(total)}</h3>
        <label htmlFor="delivery-address">Delivery address</label>
        <textarea id="delivery-address" value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} />
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Placing..." : "Place Order"}</button>
      </form>
    </>
  );
}
