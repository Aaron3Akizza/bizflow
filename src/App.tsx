import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { type ReactNode } from "react";
import LandingPage from "./pages/LandingPage";
import BizFlowApp from "./pages/AppShell";
import { AuthPage } from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AdminPage from "./pages/AdminPage";
import BOLoginPage from "./pages/BOLoginPage";
import { useAuth, useBusiness } from "./context/AuthContext";
import { useAdmin } from "./context/AdminContext";
import { NewSalePage } from "./pages/SalesPage";

// ─── Shared loading screen ────────────────────────────────────────────────────
function LoadingScreen({ message = "Loading BizFlow..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center mx-auto mb-4">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

// ─── ProtectedRoute — for Business Owners ────────────────────────────────────
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, membership, loading, isDemo, accessStatus } = useAuth();

  if (loading) return <LoadingScreen />;
  if (isDemo)  return <>{children}</>;
  if (!session) return <Navigate to="/bo-login" replace />;
  if (accessStatus === null) return <LoadingScreen message="Checking your account…" />;
  if (accessStatus !== "approved") return <Navigate to="/pending" replace />;
  // refreshBusiness handles auto-creating the business — show loading until done
  if (!membership) return <LoadingScreen message="Setting up your workspace…" />;
  return <>{children}</>;
}

// ─── PublicRoute — redirects logged-in approved users away from auth pages ───
function PublicRoute() {
  const { session, loading, isDemo, accessStatus } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isDemo && session && accessStatus === "approved") return <Navigate to="/app" replace />;
  if (!isDemo && session && accessStatus && accessStatus !== "approved") return <Navigate to="/pending" replace />;
  return <AuthPage />;
}

// ─── AdminRoute — only platform admins ───────────────────────────────────────
function AdminRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, adminLoading }          = useAdmin();
  if (authLoading || adminLoading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  // Non-admins go to their own dashboard, not back to /app (avoids redirect loop)
  if (!isAdmin) return <Navigate to="/bo-login" replace />;
  return <>{children}</>;
}

// ─── Pending screen ───────────────────────────────────────────────────────────
function PendingRoute() {
  const { session, loading, accessStatus, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/bo-login" replace />;
  if (accessStatus === "approved") return <Navigate to="/app" replace />;

  const username = (session.user?.user_metadata?.username as string | undefined) ?? "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">BizFlow</span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Awaiting Approval</h1>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {username && <><strong className="text-gray-900">{username}</strong>, your </>}
              account is pending. The BizFlow administrator will review and grant you access.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
              <p className="text-xs font-semibold text-amber-800 mb-2">What happens next?</p>
              <ul className="text-xs text-amber-700 space-y-1.5">
                <li>• The admin reviews your registration</li>
                <li>• Once approved, log in to access your BizFlow dashboard</li>
                <li>• Check back after you receive notification</li>
              </ul>
            </div>
            <button
              onClick={async () => { await signOut(); navigate("/bo-login", { replace: true }); }}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Sale Route ───────────────────────────────────────────────────────────
function NewSaleRoute() {
  const { business } = useBusiness();
  if (!business) return <LoadingScreen />;
  return <NewSalePage businessId={business.id} />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"             element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* ── Admin login (you) ── */}
        <Route path="/login"        element={<PublicRoute />} />

        {/* ── Business Owner pages ── */}
        <Route path="/bo-login"     element={<BOLoginPage />} />
        <Route path="/get-started"  element={<BOLoginPage />} />
        <Route path="/signup"       element={<BOLoginPage />} />
        <Route path="/pending"      element={<PendingRoute />} />

        {/* ── Admin dashboard (you only) ── */}
        <Route path="/admin"        element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/owner"        element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* ── Business Owner dashboard ── */}
        <Route path="/app/sales/new" element={<ProtectedRoute><NewSaleRoute /></ProtectedRoute>} />
        <Route path="/app/*"         element={<ProtectedRoute><BizFlowApp /></ProtectedRoute>} />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
