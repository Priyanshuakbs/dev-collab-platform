// frontend/src/pages/ProfilePage.jsx

import { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

export default function ProfilePage() {
  const { id } = useParams();           // /profile/:id  — agar id nahi hai toh apna profile
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileRef = useRef();

  const [profile, setProfile]   = useState(null);
  const [projects, setProjects]  = useState([]);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState("");
  const [editMode, setEditMode]  = useState(false);
  const [saving, setSaving]      = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    name: "", bio: "", skills: "", github: "", linkedin: "", isPublic: true, avatar: "",
  });

  const isOwner = !id || id === user?._id;

  // ── Fetch Profile ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = isOwner
          ? await api.get("/users/me")
          : await api.get(`/users/${id}`);

        setProfile(res.data);
        setProjects(res.data.projects || []);
        setForm({
          name:      res.data.name      || "",
          bio:       res.data.bio       || "",
          skills:    (res.data.skills || []).join(", "),
          github:    res.data.github    || "",
          linkedin:  res.data.linkedin  || "",
          isPublic:  res.data.isPublic  ?? true,
          avatar:    res.data.avatar    || "",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  // ── Avatar Upload (base64) ────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, avatar: reader.result }));
    reader.readAsDataURL(file);
  };

  // ── Save Profile ──────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put("/users/me", form);
      setProfile(res.data.user);
      setUser(res.data.user);             // AuthContext update
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ── UI States ─────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-gray-400">
      <p className="text-red-400 mb-4">{error}</p>
      <button onClick={() => navigate(-1)} className="text-sm underline">Go back</button>
    </div>
  );

  const avatarSrc = editMode ? form.avatar : profile?.avatar;
  const initials  = profile?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header Card ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-start gap-5">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-800 flex items-center justify-center text-2xl font-bold text-emerald-200">
                  {initials}
                </div>
              )}
              {editMode && (
                <>
                  <button
                    onClick={() => fileRef.current.click()}
                    className="absolute bottom-0 right-0 bg-gray-700 hover:bg-gray-600 text-xs px-2 py-0.5 rounded-full border border-gray-600"
                  >
                    edit
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </>
              )}
            </div>

            {/* Name & Meta */}
            <div className="flex-1 min-w-0">
              {editMode ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-gray-800 text-white text-xl font-bold w-full rounded-lg px-3 py-1.5 outline-none border border-gray-700 focus:border-emerald-500 mb-2"
                />
              ) : (
                <h1 className="text-xl font-bold text-white">{profile?.name}</h1>
              )}
              <p className="text-xs text-gray-500">{profile?.email}</p>
              <p className="text-xs text-gray-600 mt-1">
                Joined {new Date(profile?.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </p>

              {/* Public/Private toggle */}
              {isOwner && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">Profile:</span>
                  {editMode ? (
                    <button
                      onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        form.isPublic
                          ? "border-emerald-600 text-emerald-400"
                          : "border-gray-600 text-gray-400"
                      }`}
                    >
                      {form.isPublic ? "public" : "private"}
                    </button>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      profile?.isPublic
                        ? "border-emerald-700 text-emerald-400"
                        : "border-gray-700 text-gray-500"
                    }`}>
                      {profile?.isPublic ? "public" : "private"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Edit / Save buttons */}
            {isOwner && (
              <div className="flex gap-2 flex-shrink-0">
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="text-xs px-3 py-1.5 border border-gray-700 rounded-lg hover:bg-gray-800"
                    >
                      cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-xs px-3 py-1.5 border border-gray-700 rounded-lg hover:bg-gray-800"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="mt-4">
            {editMode ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={300}
                rows={3}
                placeholder="Tell others about yourself..."
                className="w-full bg-gray-800 text-sm text-gray-200 rounded-lg px-3 py-2 outline-none border border-gray-700 focus:border-emerald-500 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-400 leading-relaxed">
                {profile?.bio || (isOwner ? "No bio yet. Click edit profile to add one." : "No bio yet.")}
              </p>
            )}
          </div>
        </div>

        {/* ── Skills ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Skills</h2>
          {editMode ? (
            <input
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="React, Node.js, MongoDB, Tailwind..."
              className="w-full bg-gray-800 text-sm text-gray-200 rounded-lg px-3 py-2 outline-none border border-gray-700 focus:border-emerald-500"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(profile?.skills || []).length > 0 ? (
                profile.skills.map((skill, i) => (
                  <span key={i} className="text-xs px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-emerald-300">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-xs text-gray-600">No skills added yet.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Links ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Links</h2>
          {editMode ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">GitHub</span>
                <input
                  value={form.github}
                  onChange={(e) => setForm({ ...form, github: e.target.value })}
                  placeholder="https://github.com/username"
                  className="flex-1 bg-gray-800 text-sm text-gray-200 rounded-lg px-3 py-1.5 outline-none border border-gray-700 focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">LinkedIn</span>
                <input
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="flex-1 bg-gray-800 text-sm text-gray-200 rounded-lg px-3 py-1.5 outline-none border border-gray-700 focus:border-emerald-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {profile?.github ? (
                <a href={profile.github} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-400 hover:underline">
                  <span className="text-gray-500 text-xs w-16">GitHub</span>
                  {profile.github}
                </a>
              ) : null}
              {profile?.linkedin ? (
                <a href={profile.linkedin} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-400 hover:underline">
                  <span className="text-gray-500 text-xs w-16">LinkedIn</span>
                  {profile.linkedin}
                </a>
              ) : null}
              {!profile?.github && !profile?.linkedin && (
                <p className="text-xs text-gray-600">No links added yet.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Projects ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            Projects — {projects.length}
          </h2>
          {projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((proj) => (
                <Link
                  key={proj._id}
                  to={`/workspace/${proj._id}`}
                  className="block bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl px-4 py-3 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white group-hover:text-emerald-300 transition-colors">
                      {proj.name}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(proj.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  {proj.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{proj.description}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600">No projects yet.</p>
          )}
        </div>

        {/* ── Activity Feed ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Recent Activity</h2>
          <div className="space-y-3">
            {projects.slice(0, 5).map((proj, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-300">
                    Joined project <span className="text-emerald-400">{proj.name}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(proj.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </p>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-xs text-gray-600">No activity yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
