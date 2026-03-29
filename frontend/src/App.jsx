import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

// ── Pages ────────────────────────────────────────────────────────────
import LandingPage     from "./pages/LandingPage";
import Login           from "./pages/Login";
import Register        from "./pages/Register";
import Dashboard       from "./pages/Dashboard";
import ProfilePage     from "./pages/ProfilePage";
import Workspace       from "./pages/Workspace";
import ProjectPage     from "./pages/ProjectPage";
import InvitationsPage from "./pages/InvitationsPage";

// ── Components ───────────────────────────────────────────────────────
import Navbar from "./components/Navbar";

// ── Protected Route ──────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── Layout — Navbar + Page ───────────────────────────────────────────
function WithNavbar({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public Routes ── */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Protected Routes (Navbar included) ── */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <WithNavbar><Dashboard /></WithNavbar>
          </ProtectedRoute>
        } />

        <Route path="/projects" element={
          <ProtectedRoute>
            <WithNavbar><ProjectPage /></WithNavbar>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <WithNavbar><ProfilePage /></WithNavbar>
          </ProtectedRoute>
        } />

        <Route path="/profile/:id" element={
          <ProtectedRoute>
            <WithNavbar><ProfilePage /></WithNavbar>
          </ProtectedRoute>
        } />

        <Route path="/invitations" element={
          <ProtectedRoute>
            <WithNavbar><InvitationsPage /></WithNavbar>
          </ProtectedRoute>
        } />

        <Route path="/workspace/:id" element={
          <ProtectedRoute>
            <WithNavbar><Workspace /></WithNavbar>
          </ProtectedRoute>
        } />

        {/* ── 404 ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
