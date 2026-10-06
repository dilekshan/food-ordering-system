import { Link } from "react-router-dom";
import CartItem from "../../components/CartItem.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { money } from "../../services/api";

export default function Cart() {
  const { items, total, clearCart } = useCart();
  if (items.length === 0)
    return (
      <div className="empty">
        <h2>Your cart is empty</h2>
        <Link to="/foods" className="btn">Browse Foods</Link>
      </div>
    );
  return (
    <>
      <h2>Your Cart</h2>
      <div className="card">
        {items.map((i) => <CartItem key={i.id} item={i} />)}
        <div className="cart-total">
          <button className="btn outline" onClick={clearCart}>Clear Cart</button>
          <h3>Total: {money(total)}</h3>
          <Link to="/checkout" className="btn">Checkout</Link>
        </div>
      </div>
    </>
  );
}
