import { errorMessage } from "../../services/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { money } from "../../services/api";
import { Link } from "react-router-dom";
import { getDashboard, getOrderNotifications } from "../../services/dashboardService";

export default function AdminDashboard() {
  const [error, setError] = useState("");
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState({ count: 0, latestOrderId: 0, orders: [] });
  const [notificationError, setNotificationError] = useState("");
  const notificationCursor = useRef(null);
  const notificationInitialized = useRef(false);
  const notificationRequest = useRef(false);
  const load = useCallback(async () => {
    setError(""); setLoading(true);
    try { setD(await getDashboard()); } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (notificationRequest.current) return;
      notificationRequest.current = true;
      try {
        const stored = localStorage.getItem("foodora_admin_orders_seen");
        const savedCursor = stored !== null && Number.isSafeInteger(Number(stored)) && Number(stored) >= 0
          ? Number(stored)
          : undefined;
        const afterId = notificationInitialized.current
          ? notificationCursor.current
          : savedCursor;
        const result = await getOrderNotifications(afterId);
        if (!active) return;
        notificationCursor.current = result.latest_order_id;
        setNotificationError("");
        if (!notificationInitialized.current) {
          notificationInitialized.current = true;
          if (savedCursor === undefined || savedCursor > result.latest_order_id) {
            localStorage.setItem("foodora_admin_orders_seen", String(result.latest_order_id));
            setNotifications({ count: 0, latestOrderId: result.latest_order_id, orders: [] });
          } else {
            setNotifications({
              count: result.new_count,
              latestOrderId: result.latest_order_id,
              orders: result.orders,
            });
          }
        } else if (result.new_count > 0) {
          setNotifications((current) => {
            const existingIds = new Set(current.orders.map((order) => order.id));
            return {
              count: current.count + result.new_count,
              latestOrderId: result.latest_order_id,
              orders: [...result.orders.filter((order) => !existingIds.has(order.id)), ...current.orders].slice(0, 10),
            };
          });
        } else {
          setNotifications((current) => ({ ...current, latestOrderId: result.latest_order_id }));
        }
      } catch (err) {
        if (active) setNotificationError(errorMessage(err));
      } finally {
        notificationRequest.current = false;
      }
    };
    poll();
    const interval = window.setInterval(poll, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);
  if (loading) return <p className="empty" role="status">Loading dashboard...</p>;
  if (error) return <><p className="error" role="alert">{error}</p><button className="btn outline" onClick={load}>Retry</button></>;
  if (!d) return null;

  const stats = [
    ["Total Foods", d.total_foods], ["Total Categories", d.total_categories],
    ["Total Customers", d.total_customers], ["Total Orders", d.total_orders],
    ["Total Revenue", money(d.total_revenue)], ["Pending Orders", d.pending_orders],
    ["Delivered Orders", d.delivered_orders],
  ];
  const max = Math.max(1, ...d.popular_foods.map((p) => p.orders));
  const toggleNotifications = () => {
    if (!notificationsOpen && notificationInitialized.current) {
      localStorage.setItem("foodora_admin_orders_seen", String(notifications.latestOrderId));
      setNotifications((current) => ({ ...current, count: 0 }));
    }
    setNotificationsOpen((open) => !open);
  };

  return (
    <>
      <div className="section-head">
        <h2>Dashboard</h2>
        <div className="dashboard-actions">
          <div className="notification-wrap">
            <button className="notification-button" type="button" aria-label={notifications.count ? `Notifications, ${notifications.count} new orders` : "Notifications"} aria-expanded={notificationsOpen} onClick={toggleNotifications}>
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
              {notifications.count > 0 && <span className="notification-count">{notifications.count > 99 ? "99+" : notifications.count}</span>}
            </button>
            {notificationsOpen && <section className="notification-panel" aria-label="Order notifications">
              <div className="notification-heading"><strong>New orders</strong><span>{notifications.count} unread</span></div>
              {notificationError && <p className="error" role="alert">{notificationError}</p>}
              {notifications.orders.length
                ? <ul>{notifications.orders.map((order) => <li key={order.id}>
                  <span className="notification-dot" aria-hidden="true" />
                  <span><strong>Order #{order.id}</strong><small>{order.customer_name} · {money(order.total_amount)}</small></span>
                </li>)}</ul>
                : <p className="muted notification-empty">{notificationError ? "Notifications could not be loaded." : "No new orders yet."}</p>}
              <Link to="/admin/orders" onClick={() => setNotificationsOpen(false)}>View all orders</Link>
            </section>}
          </div>
          <button className="btn outline" onClick={load}>Refresh</button>
        </div>
      </div>
      <p className="muted">Revenue and popular foods exclude cancelled orders.</p>
      <div className="stats">
        {stats.map(([label, value]) => (
          <div key={label} className="card stat"><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="two-col">
        <div className="card table-wrap">
          <h3>Popular Foods</h3>
          {d.popular_foods.map((p, i) => (
            <div key={p.name} className="bar-row">
              <span>{i + 1}. {p.name}</span>
              <div className="bar"><div style={{ width: `${(p.orders / max) * 100}%` }} /></div>
              <small>{p.orders} orders</small>
            </div>
          ))}
          {d.popular_foods.length === 0 && <p className="muted">No orders yet.</p>}
        </div>
        <div className="card table-wrap">
          <h3>Recent Orders</h3>
          <table>
            <thead><tr><th>#</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {d.recent_orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td><td>{money(o.total_amount)}</td>
                  <td><span className={`badge ${o.status.toLowerCase()}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!d.recent_orders.length && <p className="muted">No orders yet.</p>}
        </div>
      </div>
    </>
  );
}
