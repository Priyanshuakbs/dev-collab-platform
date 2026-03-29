// frontend/src/components/ProjectCard.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const PRIORITY_STYLE = {
  high:   "bg-red-900 text-red-300 border-red-800",
  medium: "bg-yellow-900 text-yellow-300 border-yellow-800",
  low:    "bg-gray-800 text-gray-400 border-gray-700",
};

const STATUS_STYLE = {
  active:    "bg-emerald-900 text-emerald-300 border-emerald-800",
  completed: "bg-blue-900 text-blue-300 border-blue-800",
  archived:  "bg-gray-800 text-gray-500 border-gray-700",
};

export default function ProjectCard({ project, currentUser, onOpen, compact = false }) {
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);

  const isOwner = (() => {
    const ownerId = project.owner?._id || project.owner;
    return ownerId?.toString() === currentUser?._id?.toString();
  })();

  const deadlinePassed = project.deadline && new Date(project.deadline) < new Date();
  const memberCount    = project.collaborators?.length || 1;

  // ✅ FIX: workspace navigate karo — agar nahi hai toh create karo
  const handleOpenWorkspace = async (e) => {
    e.stopPropagation();
    try {
      setLoading(true);

      // Agar project ke saath workspace already linked hai
      if (project.workspace) {
        const wsId = project.workspace?._id || project.workspace;
        navigate(`/workspace/${wsId}`);
        return;
      }

      // Workspace nahi hai — naya banao aur project se link karo
      const wsRes = await api.post("/workspaces", { name: project.title });
      const wsId  = wsRes.data._id;

      // Project mein workspace ID save karo
      await api.put(`/projects/${project._id}`, { workspace: wsId });

      navigate(`/workspace/${wsId}`);
    } catch (err) {
      console.error("Workspace error:", err);
      alert(err.response?.data?.message || "Workspace open nahi hua");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex flex-col gap-3 transition-all group">

      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug flex-1 truncate">
          {project.title}
        </h3>
        <div className="flex gap-1.5 flex-shrink-0">
          {project.priority && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[project.priority] || PRIORITY_STYLE.medium}`}>
              {project.priority}
            </span>
          )}
          {project.status && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[project.status] || STATUS_STYLE.active}`}>
              {project.status}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {!compact && project.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{project.description}</p>
      )}

      {/* Tech stack */}
      {project.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.techStack.slice(0, 3).map((t, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-emerald-300">
              {t}
            </span>
          ))}
          {project.techStack.length > 3 && (
            <span className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-gray-500">
              +{project.techStack.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Members + Deadline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {[project.owner, ...(project.collaborators || [])]
              .filter(Boolean)
              .slice(0, 4)
              .map((m, i) => (
                <div key={i} title={m?.name}
                  className="w-5 h-5 rounded-full bg-emerald-800 border border-gray-900 flex items-center justify-center text-xs font-bold text-emerald-200 flex-shrink-0">
                  {(m?.name || "?")?.[0]?.toUpperCase()}
                </div>
              ))}
          </div>
          <span className="text-xs text-gray-600">
            {memberCount} member{memberCount !== 1 ? "s" : ""}
          </span>
        </div>

        {project.deadline && (
          <span className={`text-xs ${deadlinePassed ? "text-red-400" : "text-gray-600"}`}>
            {deadlinePassed
              ? "Overdue"
              : new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
        <button
          onClick={handleOpenWorkspace}
          disabled={loading}
          className="flex-1 text-xs py-1.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-emerald-100 rounded-lg transition-colors"
        >
          {loading ? "Opening..." : "Open Workspace"}
        </button>

        {isOwner && (
          <span className="text-xs px-2 py-1 border border-gray-700 text-gray-500 rounded-lg">
            Owner
          </span>
        )}

        {project.githubRepo && (
          <a href={project.githubRepo} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs px-2 py-1 border border-gray-700 text-gray-400 hover:text-emerald-400 rounded-lg transition-colors">
            GitHub
          </a>
        )}
      </div>
    </div>
  );
}