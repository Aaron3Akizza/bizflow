/**
 * Business Owner Login Page
 * ─────────────────────────
 * Separate login page for business owners.
 * URL: /bo-login
 *
 * Also handles signup via ?mode=signup
 * and shows the pending approval screen after registration.
 */
import { FormEvent, useState, useEffect, useRef } from "react";
import { ArrowRight, Eye, EyeOff, TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const EMAIL_DOMAIN = "users.bizflow.internal";
function makeEmail(u: string) { return `${u.trim().toLowerCase()}@${EMAIL_DOMAIN}`; }
function isValidUsername(v: string) { return /^[a-zA-Z0-9_]{3,30}$/.test(v.trim()); }

function Shell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">BizFlow</span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-600 via-green-400 to-emerald-500" />
          <div className="p-8">{children}</div>
        </div>

        {footer && <p className="text-center text-sm text-gray-500 mt-5">{footer}</p>}
      </div>
    </div>
  );
}

function Btn({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return (
    <button type="submit" disabled={loading}
      className="inline-flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-3 text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 w-full">
      {loading
        ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Please wait…</>
        : children}
    </button>
  );
}

export default function BOLoginPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { signOut, isDemo } = useAuth();

  const isSignup   = location.pathname === "/get-started" || location.pathname === "/signup" || new URLSearchParams(location.search).get("mode") === "signup";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [pending,   setPending]   = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check username availability (signup only)
  useEffect(() => {
    if (!isSignup || !username.trim() || !isValidUsername(username)) { setAvailable(null); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!supabase) return;
      const { data } = await supabase.rpc("check_username_available", { p_username: username.trim() });
      setAvailable(!!data);
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [username, isSignup]);

  // Demo mode
  if (isDemo) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-3">BizFlow Demo</h1>
          <p className="text-sm text-gray-500 mb-6">No account needed. Click below to explore.</p>
          <button onClick={() => navigate("/app", { replace: true })}
            className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white px-4 py-3 text-sm font-semibold hover:bg-green-700">
            Enter demo <ArrowRight size={16} />
          </button>
        </div>
      </Shell>
    );
  }

  // Pending screen after signup
  if (pending) {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Registration Submitted!</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Welcome, <strong className="text-gray-900">{pending}</strong>! Your account is registered and waiting for the BizFlow administrator to grant you access.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-semibold text-amber-800 mb-2">What happens next?</p>
            <ul className="text-xs text-amber-700 space-y-1.5">
              <li>• The admin reviews your registration</li>
              <li>• Once approved, come back and log in</li>
              <li>• You'll have full access to your BizFlow dashboard</li>
            </ul>
          </div>
          <button onClick={async () => { await signOut(); setPending(null); navigate("/bo-login", { replace: true }); }}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Back to Login
          </button>
        </div>
      </Shell>
    );
  }

  // ── Signup ─────────────────────────────────────────────────────────────────
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!supabase) { setError("BizFlow is not connected."); return; }
    if (!isValidUsername(username)) { setError("Username: 3–30 characters, letters, numbers and underscores only."); return; }
    if (available === false) { setError("That username is already taken. Choose another."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: makeEmail(username),
        password,
        options: { data: { username: username.trim(), full_name: username.trim() } },
      });
      if (err) { setError(err.message.toLowerCase().includes("already") ? "That username is already registered." : err.message); return; }
      if (data.session) {
        const { data: status } = await supabase.rpc("get_access_status");
        if (status === "approved") { navigate("/app", { replace: true }); }
        else { setPending(username.trim()); }
      } else {
        setPending(username.trim());
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!supabase) { setError("BizFlow is not connected."); return; }
    if (!username.trim()) { setError("Please enter your username."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setLoading(true);
    try {
      // Resolve email from username
      const { data: emailData, error: emailErr } = await supabase.rpc("get_email_for_username", { p_username: username.trim() });
      if (emailErr || !emailData) { setError("Username not found. Check your username or register."); return; }

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email: emailData as string, password });
      if (signInErr) {
        const msg = signInErr.message.toLowerCase();
        setError(msg.includes("invalid") || msg.includes("credentials") ? "Incorrect password. Please try again." : msg.includes("too many") ? "Too many attempts. Wait a few minutes." : signInErr.message);
        return;
      }
      if (!data.session) { setError("Login failed. Please try again."); return; }

      const { data: status } = await supabase.rpc("get_access_status");
      if (status === "approved") {
        navigate("/app", { replace: true });
      } else if (status === "suspended") {
        setError("Your account has been suspended. Contact the BizFlow administrator.");
        await supabase.auth.signOut();
      } else if (status === "revoked") {
        setError("Your access has been revoked. Contact the BizFlow administrator.");
        await supabase.auth.signOut();
      } else {
        setPending(username.trim());
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isSignup) {
    return (
      <Shell footer={
        <>Already registered? <button onClick={() => navigate("/bo-login")} className="text-green-600 font-medium hover:underline">Log in</button></>
      }>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 mb-6">Start your free trial — no email needed.</p>

        {error && (
          <div role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <p className="text-xs text-gray-400 mb-1.5">Letters, numbers and underscores. 3–30 characters.</p>
            <div className="relative">
              <input type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); setAvailable(null); }}
                placeholder="e.g. john_shop" required disabled={loading} autoComplete="username"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 pr-9 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50" />
              {username.length >= 3 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {available === true  && <CheckCircle size={16} className="text-green-500" />}
                  {available === false && <XCircle    size={16} className="text-red-500"   />}
                </span>
              )}
            </div>
            {available === false && <p className="text-xs text-red-500 mt-1">Username taken. Try another.</p>}
            {available === true  && <p className="text-xs text-green-600 mt-1">Username available!</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="At least 8 characters" required disabled={loading} autoComplete="new-password"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50" />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              placeholder="Repeat your password" required disabled={loading} autoComplete="new-password"
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50" />
            {confirm && password !== confirm && <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>}
          </div>

          <Btn loading={loading}>Create account <ArrowRight size={16} /></Btn>
        </form>
      </Shell>
    );
  }

  // Login form
  return (
    <Shell footer={
      <>Don't have an account?{" "}
        <button onClick={() => navigate("/get-started")} className="text-green-600 font-medium hover:underline">Register free</button>
      </>
    }>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Business Owner Login</h1>
      <p className="text-sm text-gray-500 mb-6">Enter your username and password to access your dashboard.</p>

      {error && (
        <div role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
          <input type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="Your username" required disabled={loading} autoComplete="username"
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Your password" required disabled={loading} autoComplete="current-password"
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50" />
            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Btn loading={loading}>Log in to BizFlow</Btn>
      </form>

      {/* Admin login link */}
      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600">
          Admin? Log in here →
        </Link>
      </div>
    </Shell>
  );
}
