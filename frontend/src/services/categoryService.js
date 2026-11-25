import api from "./api";

export const getCategories = () => api.get("/categories/").then((r) => r.data);
export const createCategory = (data) => api.post("/categories/", data).then((r) => r.data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data).then((r) => r.data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);
export const uploadCategoryImage = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/categories/images", form, { timeout: 60000 }).then((r) => r.data);
};
export const deleteCategoryImage = (url) => api.delete("/categories/images", { params: { image_url: url } });
