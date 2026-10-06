import { useCart } from "../context/CartContext.jsx";
import { money } from "../services/api";

export default function CartItem({ item }) {
  const { updateQty, removeFromCart } = useCart();
  return (
    <div className="cart-item">
      <div className="ci-name">
        <strong>{item.name}</strong>
        <span>{money(item.price)}</span>
      </div>
      <div className="qty">
        <button aria-label={`Decrease ${item.name}`} disabled={item.qty <= 1} onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
        <span>{item.qty}</span>
        <button aria-label={`Increase ${item.name}`} disabled={item.qty >= 100} onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
      </div>
      <strong>{money(item.price * item.qty)}</strong>
      <button className="btn danger" onClick={() => removeFromCart(item.id)}>Remove</button>
    </div>
  );
}
