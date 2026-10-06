import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, money } from "../../services/api";
import { getOrders, updateOrderStatus } from "../../services/orderService";

const STATUSES = ["Pending", "Preparing", "Delivered", "Cancelled"];
export default function OrderManagement() {
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [message, setMessage] = useState("");
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError("");
    try {
      const result = await getOrders({ status: filter || undefined });
      if (version === requestVersion.current) setOrders(result);
    } catch (err) { if (version === requestVersion.current) setError(errorMessage(err)); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);
  const change = async (id, status) => {
    setSaving(id); setError(""); setMessage("");
    try { await updateOrderStatus(id, status); await load(); setMessage("Order status saved."); }
    catch (err) { setError(errorMessage(err)); }
    finally { setSaving(null); }
  };
  return <>
    <div className="section-head"><h2>Order Management</h2><div className="table-actions">
      <label htmlFor="order-filter">Filter status</label><select id="order-filter" disabled={saving !== null} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      <button className="btn outline" disabled={loading || saving !== null} onClick={load}>Refresh</button>
    </div></div>
    {error && <p className="error admin-message" role="alert">{error}</p>}
    {message && <p className="success admin-message" role="status">{message}</p>}
    {loading ? <p role="status">Loading orders...</p> : <div className="card table-wrap"><table>
      <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>{orders.map((order) => <tr key={order.id}>
        <td>#{order.id}</td><td>{order.customer_name}<small className="cell-note">{order.customer?.email}</small></td>
        <td>{order.items.map((item) => <div key={item.id}>{item.food_name} × {item.quantity}</div>)}</td>
        <td>{money(order.total_amount)}</td><td>{order.created_at ? new Date(order.created_at).toLocaleString() : "—"}</td>
        <td><select aria-label={"Status for order " + order.id} disabled={saving !== null} value={order.status} onChange={(e) => change(order.id, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
        <td><button className="btn outline" aria-expanded={expanded === order.id} onClick={() => setExpanded(expanded === order.id ? null : order.id)}>{expanded === order.id ? "Hide" : "View Details"}</button>
          {expanded === order.id && <section className="order-details" aria-label={"Order " + order.id + " details"}>
            <h3>Order #{order.id}</h3><p><strong>{order.customer_name}</strong><br />{order.customer?.email}<br />{order.customer?.phone || "No phone provided"}</p>
            <p>Deliver to: {order.address || "—"}</p>
            <ul className="order-items">{order.items.map((item) => <li key={item.id}>{item.food_name} × {item.quantity} @ {money(item.price)} = {money(item.price * item.quantity)}</li>)}</ul>
            <strong>Total: {money(order.total_amount)}</strong><p>Status: {order.status}</p>
          </section>}
        </td>
      </tr>)}</tbody></table>{!orders.length && !error && <p className="empty">No orders found.</p>}</div>}
  </>;
}
