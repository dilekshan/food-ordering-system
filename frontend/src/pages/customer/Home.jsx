import { errorMessage } from "../../services/api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CategoryCard from "../../components/CategoryCard.jsx";
import FoodCard from "../../components/FoodCard.jsx";
import SearchBar from "../../components/SearchBar.jsx";
import { getCategories } from "../../services/categoryService";
import { getFoods } from "../../services/foodService";
import heroImage from "../../assets/images/Rustic Margherita Pizza Hero Scene.png";

export default function Home() {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);

  useEffect(() => {
    getCategories().then(setCategories).catch((err) => setError(errorMessage(err)));
    getFoods({ limit: 4, available_only: true }).then((d) => setFoods(d.items)).catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      <section
        className="hero hero-with-image"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(20, 10, 5, 0.82), rgba(20, 10, 5, 0.18)), url("${heroImage}")` }}
      >
        <div className="hero-copy">
          <span className="hero-kicker">Fast • Fresh • Flavorful</span>
          <h1>Delicious Food <br /><span>Delivered</span> to You</h1>
          <p>Order your favorite food from the best restaurant in town. Fresh. Tasty. Fast.</p>
          <SearchBar onSearch={(q) => navigate(`/foods?search=${encodeURIComponent(q)}`)} />
        </div>
      </section>

      <div className="grid cats">
        {categories.map((c) => <CategoryCard key={c.id} category={c} />)}
      </div>

      <div className="section-head">
        <h2>Popular Foods</h2>
        <Link to="/foods">View All</Link>
      </div>
      <div className="grid">
        {foods.map((f) => <FoodCard key={f.id} food={f} />)}
      </div>
      {foods.length === 0 && <p className="empty">No foods yet.</p>}
    </>
  );
}
