import axios from "axios";
import { API_BASE_URL } from "../config";
import { getGeminiKeys } from "./geminiKey";

const TOKEN_KEY = "token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Module-level session hooks, set by AuthProvider. They let request code that
// runs outside React (interceptors, the streaming fetch) reach the session.
let sessionUserId = null;
let unauthorizedHandler = null;

export const setSessionUser = (userId) => {
  sessionUserId = userId;
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export const handleUnauthorized = () => unauthorizedHandler?.();

// Shared by axios and by the streaming fetch(), which axios cannot replace
// because it does not expose a response body as a stream in the browser.
export const authHeaders = () => {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  // In priority order; the server falls through them and uses its own key last.
  const geminiKeys = getGeminiKeys(sessionUserId);
  if (geminiKeys.length) headers["x-gemini-keys"] = geminiKeys.map((entry) => entry.key).join(",");
  return headers;
};

export const apiUrl = (path) => `${API_BASE_URL}/api${path}`;

const api = axios.create({ baseURL: `${API_BASE_URL}/api` });

api.interceptors.request.use((config) => {
  Object.assign(config.headers, authHeaders());
  return config;
});

// An expired or revoked token anywhere ends the session. Login and register
// answer 401 for a wrong password, which is not a session problem.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && !url.startsWith("/auth/login") && !url.startsWith("/auth/register")) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) return serverMessage;
  if (error?.code === "ERR_NETWORK") return "Can't reach the server. Check your connection and try again.";
  if (error?.isAxiosError) return fallback;
  return error?.message || fallback;
};

export default api;
