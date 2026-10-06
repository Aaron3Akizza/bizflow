import { FormEvent, useState, useEffect, useRef } from "react";
import { ArrowRight, Eye, EyeOff, TrendingUp, AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Internal email domain — never shown to users
const EMAIL_DOMAIN = "users.bizflow.internal";

function makeEmail(username: string) {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

function isValidUsername(v: string) {
  return /^[a-zA-Z0-9_]{3,30}$/.test(v.trim());
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
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

function SubmitBtn({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return (
    <button type="submit" disabled={loading}
      className="inline-flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2.5 text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 w-full">
      {loading
        ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg> Please wait…</>
        : children}
    </button>
  );
}

// ─── Pending screen ───────────────────────────────────────────────────────────
function PendingScreen({ username, onSignOut }: { username: string; onSignOut: () => void }) {
  return (
    <AuthShell>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
          <Clock size={28} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Awaiting Approval</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Hi <strong className="text-gray-900">{username}</strong>, your account has been created.
          The BizFlow administrator will grant you access shortly.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
          <p className="text-xs font-semibold text-amber-800 mb-2">What happens next?</p>
          <ul className="text-xs text-amber-700 space-y-1.5">
            <li>• The admin will review your registration</li>
            <li>• Once approved, you can log back in and use BizFlow</li>
            <li>• Try logging in again after you have been notified</li>
          </ul>
        </div>
        <button onClick={onSignOut}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Sign out
        </button>
      </div>
    </AuthShell>
  );
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────
export function AuthPage() {
  const navigate                          = useNavigate();
  const location                          = useLocation();
  const { isDemo, configured, signOut }   = useAuth();
  // Default to signup only if coming from /signup or /get-started
  const defaultMode = (location.pathname === "/signup" || location.pathname === "/get-started") ? "signup" : "login";
  const [mode,       setMode]             = useState<"login" | "signup">(defaultMode);
  const [username,   setUsername]         = useState("");
  const [password,   setPassword]         = useState("");
  const [confirm,    setConfirm]          = useState("");
  const [showPwd,    setShowPwd]          = useState(false);
  const [loading,    setLoading]          = useState(false);
  const [error,      setError]            = useState("");
  const [pending,    setPending]          = useState<string | null>(null);
  const [available,  setAvailable]        = useState<boolean | null>(null);
  const checkTimer                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check username availability with debounce
  useEffect(() => {
    if (mode !== "signup" || !username.trim() || !isValidUsername(username)) {
      setAvailable(null);
      return;
    }
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      if (!supabase) return;
      const { data } = await supabase.rpc("check_username_available", { p_username: username.trim() });
      setAvailable(!!data);
    }, 500);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [username, mode]);

  const resetForm = () => { setUsername(""); setPassword(""); setConfirm(""); setError(""); setAvailable(null); };

  // ── Demo mode ──────────────────────────────────────────────────────────────
  if (isDemo) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={24} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">BizFlow Demo</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            No account needed in demo mode. Click below to explore with sample data.
          </p>
          <button onClick={() => navigate("/app", { replace: true })}
            className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white px-4 py-3 text-sm font-semibold hover:bg-green-700">
            Enter demo <ArrowRight size={16} />
          </button>
        </div>
      </AuthShell>
    );
  }

  // Pending approval screen
  if (pending) {
    return <PendingScreen username={pending} onSignOut={async () => { await signOut(); setPending(null); }} />;
  }

  // ── Signup ─────────────────────────────────────────────────────────────────
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!configured || !supabase) { setError("BizFlow is not connected."); return; }
    if (!isValidUsername(username)) { setError("Username must be 3–30 characters, letters, numbers and underscores only."); return; }
    if (available === false) { setError("That username is already taken. Choose another."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const email = makeEmail(username);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username.trim(), full_name: username.trim() },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setError("That username is already taken. Choose another.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.session) {
        // Signed up and immediately logged in — check access status
        const { data: statusData } = await supabase.rpc("get_access_status");
        if (statusData === "approved") {
          navigate("/app/setup", { replace: true });
        } else {
          setPending(username.trim());
        }
      } else {
        // Should not happen with email confirmation OFF — but handle gracefully
        setPending(username.trim());
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!configured || !supabase) { setError("BizFlow is not connected."); return; }
    if (!username.trim()) { setError("Please enter your username."); return; }
    if (!password) { setError("Please enter your password."); return; }

    setLoading(true);
    try {
      // Step 1: resolve fake email from username
      const { data: emailData, error: emailErr } = await supabase.rpc("get_email_for_username", {
        p_username: username.trim(),
      });

      if (emailErr || !emailData) {
        setError("Username not found. Check your username and try again.");
        return;
      }

      // Step 2: sign in with the resolved email
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailData as string,
        password,
      });

      if (signInErr) {
        const msg = signInErr.message.toLowerCase();
        if (msg.includes("invalid") || msg.includes("credentials")) {
          setError("Incorrect password. Please try again.");
        } else if (msg.includes("too many")) {
          setError("Too many attempts. Please wait a few minutes.");
        } else {
          setError(signInErr.message);
        }
        return;
      }

      if (!data.session) {
        setError("Login failed. Please try again.");
        return;
      }

      // Step 3: check access status, then check if platform admin
      const { data: statusData } = await supabase.rpc("get_access_status");

      if (statusData === "approved") {
        // Check if this user is a platform admin — if so, send them to /admin
        const { data: isAdminData } = await supabase.rpc("is_platform_admin");
        navigate(isAdminData ? "/admin" : "/app", { replace: true });
      } else if (statusData === "suspended") {
        setError("Your account has been suspended. Please contact the BizFlow administrator.");
        await supabase.auth.signOut();
      } else if (statusData === "revoked") {
        setError("Your access has been revoked. Please contact the BizFlow administrator.");
        await supabase.auth.signOut();
      } else {
        // Pending
        setPending(username.trim());
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AuthShell
      footer={
        mode === "signup" ? (
          <>Already have an account?{" "}
            <button onClick={() => { setMode("login"); resetForm(); }} className="text-green-600 font-medium hover:underline">Log in</button>
          </>
        ) : (
          <>Don't have an account?{" "}
            <button onClick={() => { setMode("signup"); resetForm(); }} className="text-green-600 font-medium hover:underline">Register free</button>
          </>
        )
      }
    >
      <h1 className="text-xl font-bold text-gray-900 mb-1">
        {mode === "signup" ? "Create your account" : "Log in to BizFlow"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {mode === "signup"
          ? "Start your free trial — no email needed."
          : "Welcome back. Enter your details to continue."}
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 leading-snug">{error}</p>
        </div>
      )}

      <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="flex flex-col gap-4" noValidate>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
          {mode === "signup" && (
            <p className="text-xs text-gray-400 mb-1.5">Letters, numbers and underscores only. 3–30 characters.</p>
          )}
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); setAvailable(null); }}
              placeholder={mode === "signup" ? "e.g. john_mukasa" : "Your username"}
              required
              disabled={loading}
              autoComplete="username"
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 pr-9 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            />
            {mode === "signup" && username.length >= 3 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {available === true  && <CheckCircle size={16} className="text-green-500" />}
                {available === false && <XCircle    size={16} className="text-red-500"   />}
              </span>
            )}
          </div>
          {mode === "signup" && available === false && (
            <p className="text-xs text-red-500 mt-1">Username already taken. Try another.</p>
          )}
          {mode === "signup" && available === true && (
            <p className="text-xs text-green-600 mt-1">Username is available.</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              required
              disabled={loading}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 pr-10 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Toggle password">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm password (signup only) */}
        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              placeholder="Repeat your password"
              required
              disabled={loading}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            />
            {confirm && password !== confirm && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
          </div>
        )}

        <SubmitBtn loading={loading}>
          {mode === "signup" ? <>Create account <ArrowRight size={16} /></> : "Log in"}
        </SubmitBtn>
      </form>
    </AuthShell>
  );
}

// ─── Business setup page ──────────────────────────────────────────────────────
export function SetupPage() {
  const navigate = useNavigate();
  const { user, createBusiness, refreshBusiness } = useAuth();

  // Get username from profile or email
  const rawEmail    = user?.email ?? "";
  const defaultName = user?.user_metadata?.username || rawEmail.replace(`@${EMAIL_DOMAIN}`, "") || "";

  const [form,      setForm]      = useState({ name: "", phone: "", location: "", currency: "UGX" });
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    setError("");
    if (!form.name.trim()) { setError("Business name is required."); return; }
    setSubmitted(true);
    setLoading(true);
    try {
      await createBusiness({ ...form, email: "" });
      await refreshBusiness();
      navigate("/app", { replace: true });
    } catch (err: any) {
      setSubmitted(false);
      const msg: string = err?.message ?? "";
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already")) {
        try { await refreshBusiness(); navigate("/app", { replace: true }); } catch { setError("You already have a business. Try logging out and back in."); }
      } else {
        setError(msg || "Could not create your business. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">BizFlow</span>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-600 via-green-400 to-emerald-500" />
          <div className="p-8">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={18} className="text-green-600" />
              <h1 className="text-xl font-bold text-gray-900">Set up your business</h1>
            </div>
            <p className="text-sm text-gray-500 mb-6">Almost there! Tell us about your shop.</p>
            {defaultName && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">Welcome, <strong>{defaultName}</strong>! Your account has been approved.</p>}
            {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-600">{error}</div>}
            <form className="flex flex-col gap-4" onSubmit={submit}>
              {[
                { label: "Business name", key: "name", placeholder: "e.g. ABC Mobile Phones", required: true },
                { label: "Phone number", key: "phone", placeholder: "+256 700 000 000" },
                { label: "Location", key: "location", placeholder: "e.g. Kampala, Uganda" },
              ].map(({ label, key, placeholder, required }) => (
                <label key={key} className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
                  <input
                    value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder} required={required}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </label>
              ))}
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Currency</span>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                  <option value="UGX">UGX — Ugandan Shilling</option>
                  <option value="KES">KES — Kenyan Shilling</option>
                  <option value="TZS">TZS — Tanzanian Shilling</option>
                  <option value="USD">USD — US Dollar</option>
                </select>
              </label>
              <button type="submit" disabled={loading}
                className="inline-flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2.5 text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 w-full mt-1">
                {loading ? "Setting up…" : <>Continue to BizFlow <ArrowRight size={16} /></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
