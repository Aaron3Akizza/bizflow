/**
 * BizFlow Admin Dashboard
 * ========================
 * For the platform owner (super admin) only.
 * Accessible at /admin
 *
 * Tabs:
 *   1. Approvals  — pending business owners waiting for access
 *   2. Businesses — all registered businesses + subscription management
 *   3. Stats      — platform-wide metrics
 */
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, BarChart3, Building2, CheckCircle,
  ChevronRight, Clock, Globe, LogOut, RefreshCw, Search,
  ShieldOff, TrendingUp, UserCheck, Users, X, XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAllBusinesses, getPlatformStats, updateSubscription,
  type BusinessRow, type PlatformStats, type SubscriptionStatus,
} from "../lib/admin";
import { supabase } from "../lib/supabase";
import { formatMoney } from "../lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccessStatus = "pending" | "approved" | "suspended" | "revoked";

type UserRow = {
  user_id:       string;
  username:      string | null;
  full_name:     string | null;
  access_status: AccessStatus;
  registered_at: string;
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  active:    "bg-green-50 text-green-700 border-green-200",
  trial:     "bg-amber-50 text-amber-700 border-amber-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const ACCESS_STYLES: Record<AccessStatus, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-green-50 text-green-700 border-green-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  revoked:   "bg-gray-100 text-gray-500 border-gray-200",
};

function SubBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function AccessBadge({ status }: { status: AccessStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${ACCESS_STYLES[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

async function setUserAccess(userId: string, status: AccessStatus) {
  if (!supabase) throw new Error("Not connected");
  const { error } = await supabase.rpc("set_user_access", {
    target_user_id: userId,
    new_status:     status,
  });
  if (error) throw error;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, tone = "neutral" }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; tone?: "positive" | "warning" | "danger" | "neutral";
}) {
  const c = { positive: "text-green-600", warning: "text-amber-600", danger: "text-red-600", neutral: "text-gray-400" }[tone];
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <Icon size={15} className={c} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className={`text-xs font-medium mt-1.5 ${c}`}>{sub}</p>}
    </div>
  );
}

// ─── TAB 1: Approvals ─────────────────────────────────────────────────────────

function ApprovalsTab() {
  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [query,   setQuery]   = useState("");
  const [filter,  setFilter]  = useState<"all" | "pending" | "approved" | "suspended">("pending");
  const [acting,  setActing]  = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true); setError("");
    try {
      const { data, error: err } = await supabase.rpc("list_users_for_owner", {
        p_status: filter === "all" ? null : filter,
        p_limit:  200,
        p_offset: 0,
      });
      if (err) throw err;
      setUsers((data ?? []) as UserRow[]);
    } catch (e: any) {
      setError(e?.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (userId: string, status: AccessStatus) => {
    setActing(userId);
    try { await setUserAccess(userId, status); await load(); }
    catch (e: any) { setError(e?.message || "Action failed."); }
    finally { setActing(null); }
  };

  const filtered = users.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (u.username ?? "").toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
  });

  const pendingCount = users.filter((u) => u.access_status === "pending").length;

  return (
    <div className="flex flex-col gap-5">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pending approval", value: users.filter(u => u.access_status === "pending").length,   color: "text-amber-500",  icon: Clock        },
          { label: "Approved",          value: users.filter(u => u.access_status === "approved").length,  color: "text-green-600", icon: CheckCircle  },
          { label: "Suspended",         value: users.filter(u => u.access_status === "suspended").length, color: "text-red-500",   icon: ShieldOff    },
          { label: "Total users",       value: users.length,                                               color: "text-gray-400",  icon: Users        },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">{label}</p>
              <Icon size={14} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && filter !== "pending" && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
          <Clock size={15} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            {pendingCount} business owner{pendingCount !== 1 ? "s are" : " is"} waiting for your approval.
          </p>
          <button onClick={() => setFilter("pending")} className="ml-auto text-xs font-bold text-amber-700 hover:underline">
            Review now →
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {(["pending", "approved", "suspended", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? "bg-green-50 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
              {f === "pending" && pendingCount > 0 ? `Pending (${pendingCount})` : f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search username…" className="flex-1 text-sm outline-none" />
          {query && <button onClick={() => setQuery("")}><X size={12} className="text-gray-400" /></button>}
        </div>
        <button onClick={() => load()} disabled={loading} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-40">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading && filtered.length === 0 ? (
          <p className="p-12 text-center text-sm text-gray-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={32} className="mx-auto text-green-200 mb-3" />
            <p className="text-sm font-semibold text-gray-900">
              {filter === "pending" ? "No pending registrations" : "No users found"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === "pending" ? "All caught up! New signups appear here." : "Try a different filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-5 py-3 font-medium">Business Owner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Registered</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-xs font-bold text-green-600 shrink-0">
                          {(u.username ?? u.full_name ?? "?")[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.username ?? "—"}</p>
                          {u.full_name && u.full_name !== u.username && (
                            <p className="text-xs text-gray-400">{u.full_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><AccessBadge status={u.access_status as AccessStatus} /></td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(u.registered_at).toLocaleString("en-UG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {u.access_status === "pending" && (
                          <button disabled={acting === u.user_id} onClick={() => act(u.user_id, "approved")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                            <UserCheck size={13} /> {acting === u.user_id ? "…" : "Grant Access"}
                          </button>
                        )}
                        {u.access_status === "approved" && (
                          <button disabled={acting === u.user_id} onClick={() => act(u.user_id, "suspended")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-50 disabled:opacity-50">
                            <ShieldOff size={13} /> {acting === u.user_id ? "…" : "Suspend"}
                          </button>
                        )}
                        {(u.access_status === "suspended" || u.access_status === "revoked") && (
                          <button disabled={acting === u.user_id} onClick={() => act(u.user_id, "approved")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 text-green-700 px-3 py-1.5 text-xs font-medium hover:bg-green-50 disabled:opacity-50">
                            <CheckCircle size={13} /> {acting === u.user_id ? "…" : "Restore Access"}
                          </button>
                        )}
                        {u.access_status !== "revoked" && u.access_status !== "pending" && (
                          <button disabled={acting === u.user_id} onClick={() => act(u.user_id, "revoked")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-500 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
                            <XCircle size={13} /> {acting === u.user_id ? "…" : "Revoke"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB 2: Businesses ────────────────────────────────────────────────────────

function BusinessesTab() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [query,      setQuery]      = useState("");
  const [managing,   setManaging]   = useState<BusinessRow | null>(null);
  const [subFilter,  setSubFilter]  = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const rows = await getAllBusinesses({ limit: 100, offset: 0, status: subFilter !== "all" ? subFilter as SubscriptionStatus : null });
      setBusinesses(rows);
    } catch (e: any) {
      setError(e?.message || "Could not load businesses.");
    } finally {
      setLoading(false);
    }
  }, [subFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = businesses.filter((b) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.owner_email.toLowerCase().includes(q) || (b.owner_name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {["all", "trial", "active", "suspended"].map((f) => (
            <button key={f} onClick={() => setSubFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${subFilter === f ? "bg-green-50 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email…" className="flex-1 text-sm outline-none" />
          {query && <button onClick={() => setQuery("")}><X size={12} className="text-gray-400" /></button>}
        </div>
        <button onClick={() => load()} disabled={loading} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-40">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading && filtered.length === 0 ? (
          <p className="p-12 text-center text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-5 py-3 font-medium">Business</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Sales</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${b.subscription_status === "suspended" ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-xs font-bold text-green-600 shrink-0">
                          {b.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[140px]">{b.name}</p>
                          {b.location && <p className="text-xs text-gray-400 flex items-center gap-1"><Globe size={10} />{b.location}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-800">{b.owner_name || "—"}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">{b.owner_email}</p>
                    </td>
                    <td className="px-5 py-3"><SubBadge status={b.subscription_status} /></td>
                    <td className="px-5 py-3 text-gray-700">{b.sale_count.toLocaleString()}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => setManaging(b)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        Manage <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="p-10 text-center text-sm text-gray-400">No businesses found.</p>}
          </div>
        )}
      </div>

      {managing && <ManageModal business={managing} onClose={() => setManaging(null)} onSaved={() => { setManaging(null); load(); }} />}
    </div>
  );
}

// ─── Manage Business Modal ────────────────────────────────────────────────────

function ManageModal({ business, onClose, onSaved }: { business: BusinessRow; onClose: () => void; onSaved: () => void }) {
  const [status,    setStatus]    = useState<SubscriptionStatus>(business.subscription_status);
  const [expiresAt, setExpiresAt] = useState(business.subscription_expires_at?.slice(0, 10) ?? "");
  const [note,      setNote]      = useState(business.notes ?? "");
  const [reason,    setReason]    = useState(business.suspended_reason ?? "");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const save = async () => {
    setError("");
    if (status === "suspended" && !reason.trim()) { setError("Enter a reason for suspension."); return; }
    setSaving(true);
    try {
      await updateSubscription(business.id, status, { expiresAt: expiresAt || null, note: note.trim() || null, suspendReason: status === "suspended" ? reason.trim() : null });
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div><h2 className="text-base font-bold text-gray-900">{business.name}</h2><p className="text-xs text-gray-500">{business.owner_email}</p></div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Subscription status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
              <option value="trial">Trial</option>
              <option value="active">Active (paid)</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Subscription expires</span>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </label>
          {status === "suspended" && (
            <label className="block">
              <span className="block text-sm font-medium text-red-600 mb-1.5">Reason *</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Payment overdue"
                className="w-full rounded-lg border border-red-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </label>
          )}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Admin note</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Internal note…"
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </label>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-600 flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{error}</div>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium">Cancel</button>
            <button disabled={saving} onClick={save} className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: Stats ─────────────────────────────────────────────────────────────

function StatsTab() {
  const [stats,   setStats]   = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .catch((e) => setError(e?.message || "Could not load stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-sm text-gray-400">Loading stats…</div>;
  if (error)   return <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>;
  if (!stats)  return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total businesses"    value={stats.total_businesses}    icon={Building2}  />
        <StatCard label="Active (paid)"       value={stats.active_businesses}   icon={CheckCircle} tone="positive" sub={`${stats.trial_businesses} on trial`} />
        <StatCard label="Total users"         value={stats.total_users}         icon={Users}       sub={`${stats.new_businesses_this_month} new this month`} />
        <StatCard label="Total sales"         value={stats.total_sales.toLocaleString()} icon={BarChart3} tone="positive" />
        <StatCard label="All-time revenue"    value={formatMoney(stats.total_revenue, "UGX")} icon={TrendingUp} tone="positive" />
      </div>
    </div>
  );
}

// ─── MAIN ADMIN PAGE ──────────────────────────────────────────────────────────

type AdminTab = "approvals" | "businesses" | "stats";

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("approvals");

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">

      {/* Top nav */}
      <div className="bg-gray-900 text-white h-14 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-green-600 flex items-center justify-center">
            <TrendingUp size={14} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="font-bold tracking-tight">BizFlow</span>
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 border border-amber-500/40 text-amber-400">
            Admin
          </span>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
          <LogOut size={14} /> Sign out
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-7 flex flex-col gap-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage access approvals, businesses, and platform statistics.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {([
            { id: "approvals",  label: "Approvals",  icon: UserCheck  },
            { id: "businesses", label: "Businesses", icon: Building2  },
            { id: "stats",      label: "Stats",      icon: BarChart3  },
          ] as { id: AdminTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {tab === "approvals"  && <ApprovalsTab />}
        {tab === "businesses" && <BusinessesTab />}
        {tab === "stats"      && <StatsTab />}

      </div>
    </div>
  );
}
