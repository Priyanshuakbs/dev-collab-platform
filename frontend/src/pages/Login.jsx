// frontend/src/pages/Login.jsx
import { useState, useContext } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

export default function Login() {
  const navigate        = useNavigate();
  const { setUser }     = useContext(AuthContext);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      {/* ── Left: Branding ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="hidden lg:flex flex-col justify-between p-12 w-[45%] relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f0a1e 0%, #0d0d20 60%, #09090f 100%)" }}
      >
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)", filter: "blur(60px)" }} />
          <div className="absolute bottom-[-10%] right-[-20%] w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #2563eb, transparent 70%)", filter: "blur(80px)" }} />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg shadow-lg glow-brand">
              D
            </div>
            <span className="text-white font-bold text-xl tracking-tight">DevCollab</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Build together.<br />
            <span className="text-brand">Ship faster.</span>
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Real-time collaboration, powerful code editor, instant execution — all in one place.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {["Real-time editing", "Secure workspaces", "Code execution", "Team chat", "Kanban boards"].map(f => (
              <span key={f} className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", color: "#c4b5fd" }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative z-10">
          <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
            "The best teams ship with DevCollab."
          </p>
        </div>
      </motion.div>

      {/* ── Right: Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">D</div>
            <span className="font-bold text-lg text-white">DevCollab</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
            Welcome back
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Sign in to your workspace
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
              >
                <span>⚠</span> {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : "Sign in →"}
            </button>
          </form>

          <p className="text-sm text-center mt-8" style={{ color: "var(--text-muted)" }}>
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold" style={{ color: "#a78bfa" }}>
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}