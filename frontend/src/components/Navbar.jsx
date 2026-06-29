// src/components/Navbar.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sticky glassmorphism navbar with active-tab indicator,
// animated hover effects, notification bell, user menu.
// Auto-hides on scroll down; reveals on scroll up or mouse-hover at top edge.
// On workspace route, auto-hides by default and reveals only on hover.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Badge } from "./ui";
import NotificationBell from "./NotificationBell";

const NAV_LINKS = [
  { path: "/dashboard",   label: "Dashboard",   icon: "⬡" },
  { path: "/projects",    label: "Projects",    icon: "◈" },
  { path: "/invitations", label: "Invitations", icon: "✉" },
  { path: "/profile",     label: "Profile",     icon: "◉" },
];

export default function Navbar({ user, onLogout, notifCount = 0 }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  // Auto-hide states
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const prevScrollY = useRef(0);

  const isWorkspace = location.pathname.includes("/workspace/");

  // ── Scroll listener for auto-hide ─────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 12);

      // On workspace page, scroll events don't control visibility
      if (isWorkspace) return;

      if (currentScrollY < 10) {
        setVisible(true);
      } else if (currentScrollY > prevScrollY.current) {
        setVisible(false); // scrolling down -> hide
      } else {
        setVisible(true);  // scrolling up -> show
      }
      prevScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isWorkspace]);

  // ── Mouse hover near top edge to reveal ───────────────────────────
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Reveal if mouse is in top 16px of screen
      if (e.clientY < 16) {
        setHovered(true);
      }
      // Re-hide if mouse moves below navbar (56px) + some buffer
      else if (e.clientY > 72 && !userMenuOpen && !mobileOpen) {
        setHovered(false);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [userMenuOpen, mobileOpen]);

  // ── Sync CSS Variable for page layout spacing ─────────────────────
  const showNavbar = isWorkspace ? hovered : (visible || hovered);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--navbar-height",
      showNavbar ? "56px" : "0px"
    );
  }, [showNavbar]);

  // Close menu on outside click
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => { setUserMenuOpen(false); onLogout?.(); };

  return (
    <>
      <motion.nav
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: showNavbar ? 0 : -56 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
        style={{
          height: "56px",
          background: scrolled
            ? "rgba(8,8,20,0.92)"
            : "rgba(8,8,20,0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid transparent",
          boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <Link to="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 group">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow: "0 0 16px rgba(124,58,237,0.5)" }}
            >
              D
            </motion.div>
            <span className="text-sm font-bold text-white tracking-tight">
              Dev<span style={{ color: "#a78bfa" }}>Collab</span>
            </span>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ path, label, icon }) => {
              const active = location.pathname.startsWith(path);
              return (
                <Link key={path} to={path} className="relative px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors group"
                  style={{ color: active ? "#c4b5fd" : "#6b7280" }}>
                  {/* Active background */}
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {/* Hover background */}
                  <motion.span
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  />
                  <span className="relative flex items-center gap-1.5">
                    <span className="opacity-60">{icon}</span>
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* ── Right Controls ── */}
          <div className="flex items-center gap-2">

            {/* Search shortcut */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-gray-500 transition-colors hover:text-gray-300"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              onClick={() => {/* open global search */}}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.25"/><path d="M8.5 8.5l2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
              <span>Search</span>
              <span className="px-1 rounded text-[9px]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>⌘K</span>
            </motion.button>

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl transition-colors"
                style={{ background: userMenuOpen ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Avatar name={user?.name || "U"} size="sm" isAdmin={user?.isAdmin} status="online" />
                <span className="hidden sm:block text-xs font-semibold text-gray-300 max-w-20 truncate">{user?.name?.split(" ")[0] || "User"}</span>
                <motion.svg
                  animate={{ rotate: userMenuOpen ? 180 : 0 }}
                  width="10" height="10" viewBox="0 0 10 10" fill="none"
                  className="text-gray-500 flex-shrink-0"
                >
                  <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </motion.svg>
              </motion.button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(10,10,24,0.97)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(20px)",
                      boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
                    }}
                  >
                    {/* User info header */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <p className="text-xs font-bold text-white truncate">{user?.name || "User"}</p>
                      <p className="text-[10px] text-gray-500 truncate">{user?.email || ""}</p>
                    </div>
                    {[
                      { label: "Profile", icon: "◉", path: "/profile" },
                      { label: "Settings", icon: "⚙", path: "/settings" },
                    ].map(item => (
                      <motion.button
                        key={item.label}
                        whileHover={{ x: 4, background: "rgba(255,255,255,0.04)" }}
                        onClick={() => { navigate(item.path); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="opacity-50">{item.icon}</span> {item.label}
                      </motion.button>
                    ))}
                    <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }} />
                    <motion.button
                      whileHover={{ x: 4, background: "rgba(239,68,68,0.08)" }}
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      <span className="opacity-70">⏻</span> Sign out
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile hamburger */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-gray-400"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <motion.path animate={{ d: mobileOpen ? "M2 2l10 10" : "M2 3h10" }} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" transition={{ duration: 0.2 }} />
                {!mobileOpen && <path d="M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}
                <motion.path animate={{ d: mobileOpen ? "M12 2L2 12" : "M2 11h10" }} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" transition={{ duration: 0.2 }} />
              </svg>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-14 right-0 bottom-0 w-64 z-[99] md:hidden"
            style={{ background: "rgba(8,8,20,0.98)", borderLeft: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}
          >
            <div className="p-4 space-y-1">
              {NAV_LINKS.map(({ path, label, icon }) => {
                const active = location.pathname.startsWith(path);
                return (
                  <Link key={path} to={path}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                    style={{ color: active ? "#c4b5fd" : "#6b7280", background: active ? "rgba(124,58,237,0.12)" : "transparent" }}
                  >
                    <span>{icon}</span> {label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}