import { errorMessage } from "../../services/api";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { money } from "../../services/api";
import { getOrder } from "../../services/orderService";

export default function OrderConfirmation() {
  const [error, setError] = useState("");
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  useEffect(() => { getOrder(id).then(setOrder).catch((err) => setError(errorMessage(err))); }, [id]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!order) return <p className="empty">Loading...</p>;
  return (
    <div className="card confirm">
      <h2>🎉 Order Placed!</h2>
      <p>Your order <strong>#{order.id}</strong> has been received.</p>
      <ul className="order-items">
        {order.items.map((i) => <li key={i.id}>{i.food_name} × {i.quantity}</li>)}
      </ul>
      <h3>Total: {money(order.total_amount)}</h3>
      <span className={`badge ${order.status.toLowerCase()}`}>{order.status}</span>
      <p><Link to="/my-orders" className="btn">View My Orders</Link></p>
    </div>
  );
}
