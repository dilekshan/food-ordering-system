import api from "./api";

export const getDashboard = () => api.get("/dashboard/").then((r) => r.data);
export const getOrderNotifications = (afterId) => api.get("/dashboard/notifications", {
  params: afterId === undefined ? {} : { after_id: afterId },
}).then((r) => r.data);
