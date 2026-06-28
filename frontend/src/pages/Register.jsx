// frontend/src/pages/Register.jsx
import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ chars",  pass: password.length >= 8 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Number",    pass: /\d/.test(password) },
    { label: "Symbol",    pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ["#ef4444", "#f59e0b", "#10b981", "#10b981"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? colors[score - 1] : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map(c => (
            <span key={c.label} className="text-[10px]" style={{ color: c.pass ? "#34d399" : "var(--text-muted)" }}>
              {c.pass ? "✓" : "○"} {c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span className="text-[10px] font-bold" style={{ color: colors[score - 1] }}>{labels[score - 1]}</span>}
      </div>
    </motion.div>
  );
}

export default function Register() {
  const navigate    = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!name.trim() || !email || !password) { setError("Please fill in all fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { name, email, password });
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (e) {
      setError(e.response?.data?.message || "Registration failed. Please try again.");
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
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #4f46e5, transparent 70%)", filter: "blur(70px)" }} />
          <div className="absolute bottom-[10%] left-[-15%] w-[350px] h-[350px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)", filter: "blur(80px)" }} />
        </div>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg">D</div>
            <span className="text-white font-bold text-xl tracking-tight">DevCollab</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Join the<br />
            <span className="text-brand">next generation</span><br />
            of dev teams.
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Start free. Invite your team. Build together from day one.
          </p>

          <div className="mt-8 space-y-4">
            {[
              { icon: "⚡", title: "Instant onboarding", desc: "Be productive in under 2 minutes" },
              { icon: "🔒", title: "Private by default", desc: "Your projects, your team, no leaks" },
              { icon: "🌐", title: "Collaborate globally", desc: "Real-time sync across the world" },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
            Trusted by developers worldwide.
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
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">D</div>
            <span className="font-bold text-lg text-white">DevCollab</span>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.3)" }}>
                  <span className="text-3xl">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">You're in!</h2>
                <p style={{ color: "var(--text-secondary)" }}>Redirecting to your dashboard…</p>
              </motion.div>
            ) : (
              <motion.div key="form">
                <h2 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
                  Create account
                </h2>
                <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
                  Free forever. No credit card required.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      Full name
                    </label>
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-base"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      Work email
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

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Create a strong password"
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
                    <PasswordStrength password={password} />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                    >
                      <span>⚠</span> {error}
                    </motion.div>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-2">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating account…
                      </span>
                    ) : "Create free account →"}
                  </button>
                </form>

                <p className="text-sm text-center mt-8" style={{ color: "var(--text-muted)" }}>
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold" style={{ color: "#a78bfa" }}>
                    Sign in
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}