import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://ai-chat-rag-lang.onrender.com",
});

// Add request interceptor to attach JWT token and custom Gemini Key if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const geminiKey = localStorage.getItem("gemini_api_key");
    if (geminiKey) {
      config.headers["x-gemini-key"] = geminiKey;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
