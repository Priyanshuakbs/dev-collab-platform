import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// ── Request interceptor: attach JWT token ─────────────────────────────
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ── Response interceptor: handle 401 globally ────────────────────────
// If the server returns 401 (token invalid/expired), dispatch a global
// logout event. AuthContext listens to this event and clears the state.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";
      const isInviteAccept =
        requestUrl.includes("/projects/invites/accept/") ||
        requestUrl.includes("/invite/accept/");

      // Invite accept should not force a global logout when the user is
      // simply opening a mail link without an active session.
      if (!isInviteAccept) {
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
    }
    return Promise.reject(error);
  }
);

export default API;
