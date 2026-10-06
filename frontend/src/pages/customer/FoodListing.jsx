import { errorMessage } from "../../services/api";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FoodCard from "../../components/FoodCard.jsx";
import Pagination from "../../components/Pagination.jsx";
import SearchBar from "../../components/SearchBar.jsx";
import { getCategories } from "../../services/categoryService";
import { getFoods } from "../../services/foodService";

export default function FoodListing() {
  const [error, setError] = useState("");
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ items: [], pages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { getCategories().then(setCategories).catch((err) => setError(errorMessage(err))); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    getFoods({ search: search || undefined, category_id: category || undefined, page, limit: 8, available_only: true })
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(errorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, category, page]);

  const update = (changes) => {
    const next = Object.fromEntries(params.entries());
    Object.assign(next, { page: 1 }, changes);
    Object.keys(next).forEach((k) => !next[k] && delete next[k]);
    setParams(next);
  };

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      <h2>Our Menu</h2>
      <SearchBar key={search} initial={search} onSearch={(q) => update({ search: q })} />
      <div className="chips">
        <button className={!category ? "active" : ""} onClick={() => update({ category: "" })}>All</button>
        {categories.map((c) => (
          <button key={c.id} className={String(c.id) === category ? "active" : ""} onClick={() => update({ category: c.id })}>
            {c.name}
          </button>
        ))}
      </div>
      {loading ? <p role="status">Loading foods...</p> : <div className="grid">{data.items.map((f) => <FoodCard key={f.id} food={f} />)}</div>}
      {!loading && !error && data.items.length === 0 && <p className="empty">No foods found.</p>}
      {!loading && <Pagination page={page} pages={data.pages} onChange={(p) => update({ page: p })} />}
    </>
  );
}
