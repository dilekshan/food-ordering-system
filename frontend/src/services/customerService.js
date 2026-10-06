import api from "./api";

export const login = (email, password) => api.post("/customers/login", { email, password }).then((r) => r.data);
export const register = (data) => api.post("/customers/register", data).then((r) => r.data);
export const getCustomers = () => api.get("/customers/").then((r) => r.data);
