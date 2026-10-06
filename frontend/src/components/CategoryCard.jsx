import { Link } from "react-router-dom";
import { imageUrl } from "../services/api";

const ICONS = { pizza: "🍕", burger: "🍔", rice: "🍚", drinks: "🥤", desserts: "🍰" };

export default function CategoryCard({ category }) {
  const icon = ICONS[category.name.toLowerCase()] || "🍽️";
  return (
    <Link to={`/foods?category=${category.id}`} className="card category-card">
      {category.image_url
        ? <img className="category-image" src={imageUrl(category.image_url)} alt="" />
        : <span className="cat-icon">{icon}</span>}
      <strong>{category.name}</strong>
    </Link>
  );
}
