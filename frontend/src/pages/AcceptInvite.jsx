import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("No token provided");
      setLoading(false);
      return;
    }

    const authToken = localStorage.getItem("token");
    if (!authToken) {
      setError("Please sign in first to accept this invitation.");
      setLoading(false);
      return;
    }

    api.post(`/projects/invites/accept/${token}`)
      .then((res) => {
        // Successfully accepted! Navigate to projects page
        navigate("/projects");
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Invalid or expired invitation token.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 font-mono text-gray-100 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
        <h2 className="text-lg font-bold text-white">✉ Team Invitation</h2>
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500">Processing invitation...</p>
          </div>
        ) : error ? (
          <div className="space-y-4 py-4">
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-4 py-3 leading-relaxed">
              ⚠ {error}
            </p>
            <button onClick={() => navigate("/dashboard")} className="btn-primary text-xs px-6 py-2">
              Go to Dashboard
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
