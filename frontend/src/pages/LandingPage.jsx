// frontend/src/pages/LandingPage.jsx

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "⚡",
    title: "Real-time Collaboration",
    desc: "Code together live with your team. See cursors, edits, and changes instantly — no refresh needed.",
  },
  {
    icon: "🤖",
    title: "AI Code Assistant",
    desc: "Powered by Gemini AI. Explain code, fix bugs, generate functions, and convert between languages.",
  },
  {
    icon: "📋",
    title: "Kanban Task Board",
    desc: "Manage tasks with a beautiful drag-and-drop board. Assign, prioritize, and track progress.",
  },
  {
    icon: "📁",
    title: "Multi-language File System",
    desc: "Create files in any language — Python, Rust, Go, TypeScript, and 20+ more. All in one workspace.",
  },
  {
    icon: "🔔",
    title: "Real-time Notifications",
    desc: "Get instant alerts for invites, task assignments, and team activity. Never miss anything.",
  },
  {
    icon: "👥",
    title: "Team Invites",
    desc: "Invite developers to your projects. Control access — owners edit, guests read-only.",
  },
];

const STACK = [
  "React", "Node.js", "MongoDB", "Socket.io",
  "Tailwind CSS", "Monaco Editor", "Gemini AI", "JWT Auth",
];

const STEPS = [
  { num: "01", title: "Create Account", desc: "Sign up in seconds. No credit card required." },
  { num: "02", title: "Start a Project", desc: "Create a workspace and invite your team." },
  { num: "03", title: "Code Together", desc: "Build faster with real-time collaboration and AI." },
];

export default function LandingPage() {
  const heroRef = useRef();

  // Subtle parallax on hero
  useEffect(() => {
    const handle = (e) => {
      if (!heroRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      heroRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950 bg-opacity-80 backdrop-blur border-b border-gray-800 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-gray-950 font-bold text-sm">D</div>
            <span className="text-white font-bold text-sm">dev<span className="text-emerald-400">collab</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Link to="/register"
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg transition-colors">
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">

        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500 opacity-5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Now with AI-powered code assistance</span>
          </div>

          {/* Heading */}
          <div ref={heroRef} className="transition-transform duration-75 ease-out">
            <h1 className="text-5xl sm:text-7xl font-bold leading-tight tracking-tight">
              <span className="text-white">Code better,</span>
              <br />
              <span className="text-emerald-400">together.</span>
            </h1>
          </div>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A real-time collaborative platform for developers. Write code, manage tasks,
            invite your team — all in one place with AI assistance built in.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register"
              className="w-full sm:w-auto text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl transition-all hover:scale-105 font-medium">
              Start for Free →
            </Link>
            <Link to="/login"
              className="w-full sm:w-auto text-sm border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-3 rounded-xl transition-colors">
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-4">
            {[
              { val: "20+", label: "Languages" },
              { val: "Real-time", label: "Collaboration" },
              { val: "AI", label: "Powered" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-xl font-bold text-white">{s.val}</p>
                <p className="text-xs text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs text-emerald-400 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything you need to ship faster</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">
              Built for developers who want to collaborate without friction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="bg-gray-900 border border-gray-800 hover:border-emerald-800 rounded-2xl p-6 space-y-3 transition-all group hover:-translate-y-1">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs text-emerald-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl font-bold text-white">Up and running in minutes</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-900 border border-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
                  <span className="text-emerald-400 font-bold text-sm">{s.num}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[60%] w-[80%] h-px bg-gray-800" />
                )}
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="py-20 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-8">Built with</p>
          <div className="flex flex-wrap justify-center gap-3">
            {STACK.map((tech, i) => (
              <span key={i}
                className="text-xs px-4 py-2 bg-gray-900 border border-gray-800 rounded-full text-gray-400 hover:border-emerald-700 hover:text-emerald-400 transition-colors">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 px-6 border-t border-gray-800">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold text-white">
            Ready to build <span className="text-emerald-400">together?</span>
          </h2>
          <p className="text-gray-500 text-sm">
            Join developers who are already collaborating smarter with DevCollab.
          </p>
          <Link to="/register"
            className="inline-block text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3 rounded-xl transition-all hover:scale-105 font-medium">
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">D</div>
            <span className="text-sm text-gray-500">dev<span className="text-emerald-400">collab</span></span>
          </div>
          <p className="text-xs text-gray-700">Built with React, Node.js & Socket.io</p>
          <div className="flex gap-4">
            <Link to="/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Sign In</Link>
            <Link to="/register" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
