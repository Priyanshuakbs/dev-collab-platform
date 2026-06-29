import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  // ── Synchronous init: read user from localStorage on first render ────
  // Must be synchronous so ProtectedRoute sees the user immediately on
  // page refresh — before any useEffect runs — preventing a false logout.
  const [user, setUserState] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    return null;
  });

  // ── setUser: keeps localStorage in sync with React state ─────────────
  const setUser = (userData) => {
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
    setUserState(userData);
  };

  // ── Listen for global 401 events dispatched by the Axios interceptor ─
  // When the API receives a 401 (expired/invalid token), it fires this
  // event. We catch it here and log the user out cleanly.
  useEffect(() => {
    const handleAuthLogout = () => setUser(null);
    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, []);

  // ── Global socket connection ─────────────────────────────────────────
  useEffect(() => {
    let activeSocket = null;
    if (user) {
      import("../socket/socket").then(({ default: socket }) => {
        activeSocket = socket;
        if (!socket.connected) {
          socket.connect();
        }
        socket.emit("registerUser", user._id);
      });
    } else {
      import("../socket/socket").then(({ default: socket }) => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );

};

