import { errorMessage } from "../../services/api";
import { useEffect, useState } from "react";
import OrderCard from "../../components/OrderCard.jsx";
import { useUser } from "../../services/api";
import { getOrders } from "../../services/orderService";

export default function MyOrders() {
  const [error, setError] = useState("");
  const user = useUser();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user?.role === "customer") getOrders({ customer_id: user.id }).then(setOrders).catch((err) => setError(errorMessage(err)));
  }, [user?.id, user?.role]);

  if (!user || user.role !== "customer") return <p className="empty">Please login to view your orders.</p>;
  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      <h2>My Orders</h2>
      {orders.map((o) => <OrderCard key={o.id} order={o} />)}
      {orders.length === 0 && <p className="empty">You have no orders yet.</p>}
    </>
  );
}
