// src/components/ui/index.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEVCOLLAB — Design System Components
// Dark glassmorphism · Neon accents · Framer Motion
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// ── Tokens ────────────────────────────────────────────────
export const tokens = {
  purple: "#7c3aed",
  purpleLight: "#a78bfa",
  blue: "#2563eb",
  blueLight: "#60a5fa",
  cyan: "#06b6d4",
  green: "#10b981",
  red: "#ef4444",
  yellow: "#f59e0b",
};

// ── Gradient Button ───────────────────────────────────────
export function GradientButton({
  children, onClick, disabled, variant = "primary",
  size = "md", className = "", type = "button", icon,
}) {
  const variants = {
    primary: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
    danger:  "linear-gradient(135deg, #dc2626 0%, #9f1239 100%)",
    success: "linear-gradient(135deg, #059669 0%, #0891b2 100%)",
    ghost:   "transparent",
    subtle:  "rgba(124,58,237,0.12)",
  };
  const glows = {
    primary: "rgba(124,58,237,0.45)",
    danger:  "rgba(220,38,38,0.45)",
    success: "rgba(5,150,105,0.45)",
    ghost:   "transparent",
    subtle:  "rgba(124,58,237,0.2)",
  };
  const sizes = {
    xs: "px-2.5 py-1 text-xs gap-1",
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-sm gap-2",
    xl: "px-8 py-4 text-base gap-2.5",
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.03, boxShadow: disabled ? "none" : `0 0 24px ${glows[variant]}` }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center rounded-xl font-semibold text-white transition-colors overflow-hidden ${sizes[size]} ${className}`}
      style={{
        background: variants[variant],
        border: variant === "ghost" ? "1px solid rgba(255,255,255,0.1)"
              : variant === "subtle" ? "1px solid rgba(124,58,237,0.3)"
              : "none",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing: "0.01em",
      }}
    >
      {/* Shine sweep */}
      {variant !== "ghost" && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)", backgroundSize: "200% 100%" }}
          whileHover={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 0.6 }}
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
}

// ── Glass Card ────────────────────────────────────────────
export function GlassCard({ children, className = "", onClick, hover = true, glow = false, noPad = false }) {
  return (
    <motion.div
      whileHover={hover ? {
        scale: 1.015,
        boxShadow: glow
          ? "0 0 40px rgba(124,58,237,0.25), 0 20px 60px rgba(0,0,0,0.5)"
          : "0 20px 60px rgba(0,0,0,0.45)",
        borderColor: "rgba(139,92,246,0.35)",
      } : {}}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onClick={onClick}
      className={`rounded-2xl ${noPad ? "" : ""} ${className} ${onClick ? "cursor-pointer" : ""}`}
      style={{
        background: "rgba(13, 13, 30, 0.65)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ children, variant = "default", dot = false }) {
  const styles = {
    default: { bg: "rgba(255,255,255,0.07)", color: "#9ca3af",  border: "rgba(255,255,255,0.1)" },
    purple:  { bg: "rgba(124,58,237,0.18)",  color: "#c4b5fd",  border: "rgba(124,58,237,0.35)" },
    blue:    { bg: "rgba(37,99,235,0.18)",   color: "#93c5fd",  border: "rgba(37,99,235,0.35)"  },
    green:   { bg: "rgba(16,185,129,0.15)",  color: "#6ee7b7",  border: "rgba(16,185,129,0.35)" },
    red:     { bg: "rgba(239,68,68,0.15)",   color: "#fca5a5",  border: "rgba(239,68,68,0.35)"  },
    yellow:  { bg: "rgba(245,158,11,0.15)",  color: "#fcd34d",  border: "rgba(245,158,11,0.35)" },
    cyan:    { bg: "rgba(6,182,212,0.15)",   color: "#67e8f9",  border: "rgba(6,182,212,0.35)"  },
  };
  const s = styles[variant] || styles.default;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
      )}
      {children}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ name, size = "md", src, isAdmin = false, status }) {
  const sizes = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };
  const dotSizes = { xs: "w-1.5 h-1.5", sm: "w-2 h-2", md: "w-2.5 h-2.5", lg: "w-3 h-3", xl: "w-4 h-4" };
  const statusColors = { online: "#10b981", away: "#f59e0b", offline: "#6b7280" };

  const gradients = [
    "linear-gradient(135deg,#7c3aed,#2563eb)",
    "linear-gradient(135deg,#0891b2,#059669)",
    "linear-gradient(135deg,#dc2626,#7c3aed)",
    "linear-gradient(135deg,#d97706,#dc2626)",
    "linear-gradient(135deg,#059669,#0891b2)",
  ];
  const bg = isAdmin
    ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
    : gradients[(name?.charCodeAt(0) || 0) % gradients.length];

  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white overflow-hidden`}
        style={{ background: src ? undefined : bg, boxShadow: isAdmin ? "0 0 14px rgba(124,58,237,0.6)" : "none" }}
      >
        {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : (name?.[0]?.toUpperCase() || "?")}
      </div>
      {status && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2`}
          style={{ background: statusColors[status] || statusColors.offline, borderColor: "#0a0a1a" }}
        />
      )}
      {isAdmin && <span className="absolute -top-1 -right-1 text-[10px] leading-none">👑</span>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = "max-w-lg", subtitle }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    if (open) { window.addEventListener("keydown", h); document.body.style.overflow = "hidden"; }
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={`relative w-full ${width} rounded-3xl overflow-hidden`}
            style={{
              background: "rgba(10,10,26,0.97)",
              border: "1px solid rgba(139,92,246,0.18)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)" }} />
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90, background: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors ml-4 flex-shrink-0"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </motion.button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = "text", onKeyDown, autoFocus, label, error, icon, hint, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-semibold text-gray-400 tracking-wide uppercase">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" style={{ pointerEvents: "none" }}>
            {icon}
          </span>
        )}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onKeyDown={onKeyDown} autoFocus={autoFocus}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="w-full text-sm text-gray-200 py-2.5 rounded-xl outline-none placeholder-gray-600 transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: focused ? "1px solid rgba(139,92,246,0.6)"
                  : error ? "1px solid rgba(239,68,68,0.5)"
                  : "1px solid rgba(255,255,255,0.07)",
            boxShadow: focused ? "0 0 0 3px rgba(139,92,246,0.1)" : "none",
            paddingLeft: icon ? "2.75rem" : "1rem",
            paddingRight: "1rem",
          }}
          {...rest}
        />
      </div>
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><span>⚠</span>{error}</p>}
      {hint && !error && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────
export function Textarea({ value, onChange, placeholder, label, rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-semibold text-gray-400 tracking-wide uppercase">{label}</label>}
      <textarea
        value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="w-full text-sm text-gray-200 px-4 py-2.5 rounded-xl outline-none placeholder-gray-600 transition-all resize-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: focused ? "1px solid rgba(139,92,246,0.6)" : "1px solid rgba(255,255,255,0.07)",
          boxShadow: focused ? "0 0 0 3px rgba(139,92,246,0.1)" : "none",
        }}
      />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const cfg = {
    success: { border: "rgba(16,185,129,0.4)",  bg: "rgba(16,185,129,0.1)",  icon: "✓", color: "#6ee7b7" },
    error:   { border: "rgba(239,68,68,0.4)",   bg: "rgba(239,68,68,0.1)",   icon: "✕", color: "#fca5a5" },
    info:    { border: "rgba(96,165,250,0.4)",   bg: "rgba(96,165,250,0.1)",  icon: "ℹ", color: "#93c5fd" },
    warning: { border: "rgba(245,158,11,0.4)",   bg: "rgba(245,158,11,0.1)",  icon: "!", color: "#fcd34d" },
  };
  const s = cfg[type] || cfg.info;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, y: 8, scale: 0.95, x: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl min-w-64 max-w-sm"
      style={{
        background: s.bg, border: `1px solid ${s.border}`,
        backdropFilter: "blur(20px)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}40` }}>
        {s.icon}
      </span>
      <p className="text-sm text-gray-200 flex-1">{message}</p>
      <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors text-xs flex-shrink-0">✕</button>
    </motion.div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-16 right-6 z-[200] flex flex-col gap-2">
      <AnimatePresence>{toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}</AnimatePresence>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    setToasts(p => [...p, { id: Date.now() + Math.random(), message, type }]);
  };
  const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, addToast, removeToast };
}

// ── Skeleton ──────────────────────────────────────────────
export function Skeleton({ className = "", rounded = "rounded-xl" }) {
  return (
    <div className={`${rounded} overflow-hidden relative ${className}`} style={{ background: "rgba(255,255,255,0.05)" }}>
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)", backgroundSize: "200% 100%" }}
        animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center px-6"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="text-5xl mb-5"
      >{icon}</motion.div>
      <h3 className="text-sm font-bold text-white mb-1.5 tracking-tight">{title}</h3>
      <p className="text-xs text-gray-500 mb-5 max-w-xs leading-relaxed">{description}</p>
      {action}
    </motion.div>
  );
}

// ── Divider ───────────────────────────────────────────────
export function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      {label && <span className="text-xs text-gray-600 font-medium">{label}</span>}
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────
export function ProgressBar({ value = 0, color = "#7c3aed", label }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{label}</span><span>{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────
export function Tooltip({ children, content, side = "top" }) {
  const [show, setShow] = useState(false);
  const pos = { top: "bottom-full mb-2 left-1/2 -translate-x-1/2", bottom: "top-full mt-2 left-1/2 -translate-x-1/2", left: "right-full mr-2 top-1/2 -translate-y-1/2", right: "left-full ml-2 top-1/2 -translate-y-1/2" };
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute ${pos[side]} z-50 pointer-events-none whitespace-nowrap`}
          >
            <span className="text-xs text-gray-200 px-2.5 py-1.5 rounded-lg font-medium"
              style={{ background: "rgba(15,15,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
              {content}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}