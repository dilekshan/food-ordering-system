import { useCallback, useEffect, useRef, useState } from "react";
import Pagination from "../../components/Pagination.jsx";
import FoodImage from "../../components/FoodImage.jsx";
import { errorMessage, money } from "../../services/api";
import { getCategories } from "../../services/categoryService";
import { createFood, deleteFood, getFoods, updateFood, uploadFoodImage, discardFoodImage } from "../../services/foodService";

const EMPTY = { name: "", description: "", price: "", image_url: "", is_available: true, category_id: "" };
export default function FoodManagement() {
  const [data, setData] = useState({ items: [], pages: 1 });
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef(null);
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError("");
    try {
      const [foods, cats] = await Promise.all([getFoods({ page, limit: 8 }), getCategories()]);
      if (version !== requestVersion.current) return;
      setData(foods); setCategories(cats);
      if (page > foods.pages) setPage(foods.pages);
    } catch (err) { if (version === requestVersion.current) setError(errorMessage(err)); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (editing) dialog.current?.showModal(); else dialog.current?.close();
  }, [Boolean(editing)]);
  const open = (food) => {
    setEditing({ ...(food || EMPTY), description: food?.description || "", image_url: food?.image_url || "" });
    setFile(null); setFormError(""); setMessage("");
  };
  const close = () => { if (!busy) { setEditing(null); setFile(null); setFormError(""); } };
  const chooseImage = (event) => {
    const selected = event.target.files?.[0];
    setFormError("");
    if (!selected) return;
    if (!/\.(jpe?g|png|webp)$/i.test(selected.name) || !["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setFormError("Choose a JPG, JPEG, PNG or WEBP image"); event.target.value = ""; return;
    }
    if (selected.size > 5 * 1024 * 1024) { setFormError("Image must be 5 MB or smaller"); event.target.value = ""; return; }
    setFile(selected);
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!editing.name.trim()) { setFormError("Food name is required"); return; }
    setBusy(true); setFormError("");
    let uploaded;
    try {
      if (file) uploaded = await uploadFoodImage(file);
      const payload = { name: editing.name.trim(), description: editing.description.trim() || null, price: Number(editing.price), category_id: Number(editing.category_id), is_available: editing.is_available, image_url: uploaded || editing.image_url || null };
      if (editing.id) await updateFood(editing.id, payload); else await createFood(payload);
      const created = !editing.id;
      setEditing(null); setFile(null);
      if (created && page !== 1) setPage(1); else await load();
      setMessage("Food saved.");
    } catch (err) {
      setFormError(errorMessage(err));
      if (uploaded) await discardFoodImage(uploaded).catch(() => {});
    } finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this food?")) return;
    setBusy(true); setError(""); setMessage("");
    try { await deleteFood(id); await load(); setMessage("Food deleted."); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const set = (key, value) => setEditing((current) => ({ ...current, [key]: value }));
  return <>
    <div className="section-head"><h2>Food Management</h2><div className="table-actions">
      <button className="btn outline" onClick={load} disabled={busy || loading}>Refresh</button>
      <button className="btn" onClick={() => open()} disabled={busy || loading}>+ Add Food</button>
    </div></div>
    {error && <p className="error admin-message" role="alert">{error}</p>}
    {message && <p className="success admin-message" role="status">{message}</p>}
    {loading ? <p role="status">Loading foods...</p> : <div className="card table-wrap"><table>
      <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr></thead>
      <tbody>{data.items.map((food) => <tr key={food.id}>
        <td><FoodImage src={food.image_url} alt={food.name} className="thumb" /></td><td>{food.name}</td><td>{food.category_name}</td><td>{money(food.price)}</td>
        <td><span className={"badge " + (food.is_available ? "delivered" : "cancelled")}>{food.is_available ? "Available" : "Unavailable"}</span></td>
        <td><div className="table-actions"><button className="btn blue" disabled={busy} onClick={() => open(food)}>Edit</button><button className="btn danger" disabled={busy} onClick={() => remove(food.id)}>Delete</button></div></td>
      </tr>)}</tbody></table>{!data.items.length && !error && <p className="empty">No foods yet. Add your first food.</p>}</div>}
    {!loading && <Pagination page={page} pages={data.pages} onChange={setPage} />}
    <dialog ref={dialog} className="food-dialog" aria-labelledby="food-form-title" onCancel={(event) => { event.preventDefault(); close(); }}>
      {editing && <form className="admin-form" onSubmit={save}>
        <h2 id="food-form-title">{editing.id ? "Edit Food" : "Add Food"}</h2>
        <p className="muted">Update your menu with a clear description and food image.</p>
        <fieldset disabled={busy}>
          <div className="food-form-grid"><div className="admin-form">
            <label htmlFor="food-name">Food Name</label><input id="food-name" autoFocus required maxLength={150} value={editing.name} onChange={(e) => set("name", e.target.value)} />
            <label htmlFor="food-description">Description</label><textarea id="food-description" rows={3} maxLength={500} value={editing.description} onChange={(e) => set("description", e.target.value)} />
            <label htmlFor="food-price">Price (Rs.)</label><input id="food-price" type="number" required min="0.01" max="99999999.99" step="0.01" value={editing.price} onChange={(e) => set("price", e.target.value)} />
            <label htmlFor="food-category">Category</label><select id="food-category" required value={editing.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">Select category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            {!categories.length && <p className="muted">Add a category before creating food.</p>}
            <label className="check"><input type="checkbox" checked={editing.is_available} onChange={(e) => set("is_available", e.target.checked)} />Available</label>
          </div><div className="admin-form image-panel">
            <label htmlFor="food-image">Food Image</label><input id="food-image" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={chooseImage} />
            <small className="muted">JPG, JPEG, PNG or WEBP. Up to 5 MB and 16 megapixels.</small>
            <FoodImage src={preview || editing.image_url} alt="Food image preview" className="image-preview" />
            <small>{file ? file.name : editing.image_url ? "Current image — kept unless you choose a replacement." : "No image selected. A placeholder will be displayed."}</small>
          </div></div>
        </fieldset>
        {formError && <p className="error admin-message" role="alert">{formError}</p>}
        <div className="form-actions"><button className="btn" disabled={busy || !categories.length}>{busy ? "Saving..." : "Save"}</button><button className="btn outline" type="button" onClick={close} disabled={busy}>Cancel</button></div>
      </form>}
    </dialog>
  </>;
}
