import { useState } from "react";
import { money } from "../services/api";

export default function OrderCard({ order }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card order-card">
      <div className="order-head">
        <strong>#{order.id}</strong>
        <span>{order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}</span>
        <span>{money(order.total_amount)}</span>
        <span className={`badge ${order.status.toLowerCase()}`}>{order.status}</span>
        <button className="btn outline" onClick={() => setOpen(!open)}>{open ? "Hide" : "View"}</button>
      </div>
      {open && (
        <ul className="order-items">
          {order.items.map((i) => (
            <li key={i.id}>{i.food_name} × {i.quantity} — {money(i.price * i.quantity)}</li>
          ))}
          <li className="muted">Deliver to: {order.address}</li>
        </ul>
      )}
    </div>
  );
}
