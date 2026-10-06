import { useCart } from "../context/CartContext.jsx";
import { money } from "../services/api";
import FoodImage from "./FoodImage.jsx";

export default function FoodCard({ food }) {
  const { addToCart } = useCart();
  return (
    <div className="card food-card">
      <FoodImage src={food.image_url} alt={food.name} />
      <h4>{food.name}</h4>
      <p className="price">{money(food.price)}</p>
      <p className={food.is_available ? "avail" : "unavail"}>
        {food.is_available ? "★ Available" : "Out of stock"}
      </p>
      <button className="btn full" disabled={!food.is_available} onClick={() => addToCart(food)}>
        Add to Cart
      </button>
    </div>
  );
}
