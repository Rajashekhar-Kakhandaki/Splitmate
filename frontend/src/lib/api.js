import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

// Attach the JWT (if we have one) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("splitmate_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Receipt images are served statically from the API origin (not under
// /api), so build the absolute URL from whatever the browser already
// returned as a relative path (e.g. "/uploads/receipts/abc.jpg").
export function receiptImageUrl(relativeUrl) {
  if (!relativeUrl) return null;
  
  // If it's already an absolute URL (like Cloudinary), return it directly
  if (relativeUrl.startsWith("http")) {
    return relativeUrl;
  }
  
  const origin = API_URL.replace(/\/api\/?$/, "");
  return `${origin}${relativeUrl}`;
}

export default api;
