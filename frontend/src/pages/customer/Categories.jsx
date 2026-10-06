import { useEffect, useState } from "react";
import CategoryCard from "../../components/CategoryCard.jsx";
import { getCategories } from "../../services/categoryService";
import { errorMessage } from "../../services/api";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getCategories().then(setCategories).catch((err) => setError(errorMessage(err))).finally(() => setLoading(false));
  }, []);
  return <><h2>Categories</h2>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p>Loading...</p> : <div className="grid cats">{categories.map((category) => <CategoryCard key={category.id} category={category} />)}</div>}
    {!loading && !error && !categories.length && <p>No categories yet.</p>}
  </>;
}
