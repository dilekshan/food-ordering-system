import api from "./api";

export const getFoods = (params = {}) => api.get("/foods/", { params }).then((r) => r.data);
export const getFood = (id) => api.get(`/foods/${id}`).then((r) => r.data);
export const createFood = (data) => api.post("/foods/", data).then((r) => r.data);
export const updateFood = (id, data) => api.put(`/foods/${id}`, data).then((r) => r.data);
export const deleteFood = (id) => api.delete(`/foods/${id}`);
export const uploadFoodImage = (file) => {
  const data = new FormData();
  data.append("file", file);
  return api.post("/foods/images", data).then((response) => response.data.image_url);
};
export const discardFoodImage = (url) => api.delete(`/foods/images/${url.split("/").pop()}`);
