import { useCallback, useEffect, useState } from "react";
import { errorMessage, imageUrl } from "../../services/api";
import { createCategory, deleteCategory, deleteCategoryImage, getCategories, updateCategory, uploadCategoryImage } from "../../services/categoryService";

const EMPTY = { name: "", description: "", image_url: "" };
export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setCategories(await getCategories()); } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.name.trim()) { setError("Category name is required"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const data = { name: form.name.trim(), description: form.description.trim() || null, image_url: form.image_url || null };
      if (editId !== null) await updateCategory(editId, data); else await createCategory(data);
      setForm(EMPTY); setEditId(null); setPendingImage(null); await load(); setMessage("Category saved.");
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (pendingImage) {
        await deleteCategoryImage(pendingImage.split("/").pop());
        setPendingImage(null);
      }
      const uploaded = await uploadCategoryImage(file);
      setForm((current) => ({ ...current, image_url: uploaded.image_url }));
      setPendingImage(uploaded.image_url);
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const clearImage = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (pendingImage) await deleteCategoryImage(pendingImage.split("/").pop());
      setPendingImage(null);
      setForm((current) => ({ ...current, image_url: "" }));
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const cancelEdit = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (pendingImage) await deleteCategoryImage(pendingImage.split("/").pop());
      setPendingImage(null); setEditId(null); setForm(EMPTY); setError("");
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await deleteCategory(id);
      if (editId === id) { setEditId(null); setForm(EMPTY); }
      await load(); setMessage("Category deleted.");
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  return <>
    <div className="section-head"><h2>Category Management</h2><button className="btn outline" disabled={busy || loading} onClick={load}>Refresh</button></div>
    <form className="card admin-form category-form" onSubmit={save}>
      <h3>{editId ? "Edit category" : "Add category"}</h3>
      <label htmlFor="category-name">Category name</label><input id="category-name" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} />
      <label htmlFor="category-description">Description</label><textarea id="category-description" maxLength={255} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={busy} />
      <label htmlFor="category-image">Category image</label>
      <input id="category-image" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={busy} />
      {form.image_url && <div className="category-image-editor">
        <img src={imageUrl(form.image_url)} alt="Category image preview" />
        <button type="button" className="btn outline" onClick={clearImage} disabled={busy}>Remove image</button>
      </div>}
      <div className="form-actions"><button className="btn" disabled={busy}>{busy ? "Saving..." : editId ? "Update Category" : "Add Category"}</button>
        {editId !== null && <button type="button" className="btn outline" disabled={busy} onClick={cancelEdit}>Cancel</button>}</div>
    </form>
    {error && <p className="error admin-message" role="alert">{error}</p>}
    {message && <p className="success admin-message" role="status">{message}</p>}
    {loading ? <p role="status">Loading categories...</p> : <div className="card table-wrap"><table>
      <thead><tr><th>ID</th><th>Image</th><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
      <tbody>{categories.map((category) => <tr key={category.id}>
        <td>{category.id}</td><td>{category.image_url ? <img className="thumb" src={imageUrl(category.image_url)} alt="" /> : "—"}</td><td>{category.name}</td><td className="description-cell">{category.description || "—"}</td>
        <td><div className="table-actions"><button className="btn blue" disabled={busy} onClick={() => { setEditId(category.id); setPendingImage(null); setForm({ name: category.name, description: category.description || "", image_url: category.image_url || "" }); setError(""); setMessage(""); }}>Edit</button>
          <button className="btn danger" disabled={busy} onClick={() => remove(category.id)}>Delete</button></div></td>
      </tr>)}</tbody></table>{!categories.length && !error && <p className="empty">No categories yet.</p>}</div>}
  </>;
}
