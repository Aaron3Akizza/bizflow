import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { type ReactNode, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import BizFlowApp from "./pages/AppShell";
import { AuthPage } from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AdminPage from "./pages/AdminPage";
import { useAuth, useBusiness } from "./context/AuthContext";
import { useAdmin } from "./context/AdminContext";
import { NewSalePage } from "./pages/SalesPage";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
      Loading BizFlow...
    </div>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children, setup = false }: { children: ReactNode; setup?: boolean }) {
  const { session, membership, loading, isDemo, refreshBusiness, accessStatus, createBusiness, user } = useAuth();

  useEffect(() => {
    if (!loading && session && !membership && !setup && !isDemo && accessStatus === "approved") {
      // Auto-create a placeholder business so the dashboard loads immediately
      const username = (user?.user_metadata?.username as string | undefined) ?? "Business";
      createBusiness({
        name: `${username}'s Business`,
        phone: "", email: "", location: "", currency: "UGX",
      })
        .catch(() => undefined)
        .finally(() => refreshBusiness().catch(() => undefined));
    }
  }, [loading, session, membership, setup, isDemo, accessStatus]);

  if (loading) return <LoadingScreen />;
  if (isDemo)  return <>{children}</>;
  if (!session) return <Navigate to="/login" replace />;
  if (accessStatus === null) return <LoadingScreen />;
  if (accessStatus !== "approved") return <Navigate to="/pending" replace />;
  // While auto-creating business show loading instead of redirecting to setup
  if (!setup && !membership) return <LoadingScreen />;
  return <>{children}</>;
}

// ─── Public Route ─────────────────────────────────────────────────────────────
function PublicRoute() {
  const { session, loading, isDemo, accessStatus } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isDemo && session && accessStatus === "approved") {
    return <Navigate to="/app" replace />;
  }
  return <AuthPage />;
}

// ─── Pending Route ────────────────────────────────────────────────────────────
function PendingRoute() {
  const { session, loading, accessStatus, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (accessStatus === "approved") return <Navigate to="/app" replace />;

  const username = (session.user?.user_metadata?.username as string | undefined) ?? "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">BizFlow</span>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
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
              account is registered and waiting for the BizFlow administrator to grant access.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
              <p className="text-xs font-semibold text-amber-800 mb-2">What happens next?</p>
              <ul className="text-xs text-amber-700 space-y-1.5">
                <li>• The admin will review your registration</li>
                <li>• Once approved, log in normally to access BizFlow</li>
                <li>• Come back and try logging in after you are notified</li>
              </ul>
            </div>
            <button
              onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}
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

// ─── Other routes ─────────────────────────────────────────────────────────────
function NewSaleRoute() {
  const { business } = useBusiness();
  if (!business) return <LoadingScreen />;
  return <NewSalePage businessId={business.id} />;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, adminLoading }          = useAdmin();
  if (authLoading || adminLoading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/app"   replace />;
  return <>{children}</>;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/"            element={<LandingPage />} />

        {/* Auth */}
        <Route path="/login"        element={<PublicRoute />} />
        <Route path="/signup"       element={<PublicRoute />} />
        <Route path="/get-started"  element={<PublicRoute />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Pending approval */}
        <Route path="/pending" element={<PendingRoute />} />

        {/* Owner approval dashboard — merged into /admin */}

        {/* Admin — combined approvals + businesses + stats */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/owner" element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* App — requires session + approved + membership */}
        <Route path="/app/sales/new" element={<ProtectedRoute><NewSaleRoute /></ProtectedRoute>} />
        <Route path="/app/*"         element={<ProtectedRoute><BizFlowApp /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
