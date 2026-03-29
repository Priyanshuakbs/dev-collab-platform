import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const register = async () => {
    if (!name || !email || !password) { setError("All fields are required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    try {
      setLoading(true);
      setError("");
      const res = await API.post("/auth/register", { name, email, password });

      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") register(); };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 font-mono">

      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-sm relative">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-gray-950 font-bold text-xl mx-auto mb-4">
            D
          </div>
          <h1 className="text-xl font-bold text-white">
            dev<span className="text-emerald-400">collab</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">

          {/* Error */}
          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg px-3 py-2">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="John Doe"
              className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2.5 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none placeholder-gray-600 transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKey}
              placeholder="you@example.com"
              className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2.5 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none placeholder-gray-600 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Min. 6 characters"
              className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2.5 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none placeholder-gray-600 transition-colors"
            />
          </div>

          {/* Register Button */}
          <button
            onClick={register}
            disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition-colors font-medium mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Account →"
            )}
          </button>
        </div>

        {/* Login link */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Already have an account?{" "}
          <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Sign in
          </Link>
          <Link to="/login">Sign in</Link>  // "/register" se "/login" karo
        </p>

      </div>
    </div>
  );
}
