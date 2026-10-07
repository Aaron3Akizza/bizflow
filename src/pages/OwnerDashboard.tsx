import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, Clock, LogOut, RefreshCw, Search,
  ShieldOff, TrendingUp, UserCheck, Users, XCircle, X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type AccessStatus = "pending" | "approved" | "suspended" | "revoked";

type UserRow = {
  user_id:       string;
  username:      string | null;
  full_name:     string | null;
  access_status: AccessStatus;
  registered_at: string;
};

const STATUS_STYLE: Record<AccessStatus, string> = {
  pending:   "bg-amber-50  text-amber-700  border-amber-200",
  approved:  "bg-green-50  text-green-700  border-green-200",
  suspended: "bg-red-50    text-red-700    border-red-200",
  revoked:   "bg-gray-100  text-gray-500   border-gray-200",
};

const STATUS_LABEL: Record<AccessStatus, string> = {
  pending:   "Pending",
  approved:  "Approved",
  suspended: "Suspended",
  revoked:   "Revoked",
};

function StatusBadge({ status }: { status: AccessStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

async function setAccess(userId: string, status: AccessStatus): Promise<void> {
  if (!supabase) throw new Error("Not connected");
  const { error } = await supabase.rpc("set_user_access", {
    target_user_id: userId,
    new_status:     status,
  });
  if (error) throw error;
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [query,    setQuery]    = useState("");
  const [tab,      setTab]      = useState<"pending" | "all">("pending");
  const [acting,   setActing]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase.rpc("list_users_for_owner", {
        p_status: tab === "pending" ? "pending" : null,
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
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (userId: string, status: AccessStatus) => {
    setActing(userId);
    try {
      await setAccess(userId, status);
      await load();
    } catch (e: any) {
      setError(e?.message || "Action failed.");
    } finally {
      setActing(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (u.username   ?? "").toLowerCase().includes(q) ||
      (u.full_name  ?? "").toLowerCase().includes(q)
    );
  });

  const pendingCount = users.filter((u) => u.access_status === "pending").length;

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
          <span className="font-bold tracking-tight">BizRise</span>
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-600/20 border border-green-600/40 text-green-400">
            Owner
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => load()} disabled={loading} className="text-gray-400 hover:text-white disabled:opacity-40" aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 lg:px-8 py-7 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review registrations and grant access to approved clients.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending",  value: users.filter(u => u.access_status === "pending").length,   icon: Clock,       color: "text-amber-500" },
            { label: "Approved", value: users.filter(u => u.access_status === "approved").length,  icon: CheckCircle, color: "text-green-600" },
            { label: "Total",    value: users.length,                                               icon: Users,       color: "text-gray-400"  },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <Icon size={15} className={color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{tab === "pending" && label === "Total" ? "…" : value}</p>
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {(["pending", "all"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${tab === t ? "bg-green-50 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
                {t === "pending" ? `Pending ${pendingCount > 0 ? `(${pendingCount})` : ""}` : "All users"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search username…" className="flex-1 text-sm outline-none" />
            {query && <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading && filtered.length === 0 ? (
            <p className="p-12 text-center text-sm text-gray-400">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle size={32} className="mx-auto text-green-200 mb-3" />
              <p className="text-sm font-semibold text-gray-900">
                {tab === "pending" ? "No pending registrations" : "No users found"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {tab === "pending" ? "All caught up! New signups will appear here." : "Try adjusting your search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                    <th className="px-5 py-3 font-medium">Username</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Registered</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.user_id} className="border-b border-gray-50 last:border-0">
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
                      <td className="px-5 py-3">
                        <StatusBadge status={u.access_status as AccessStatus} />
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(u.registered_at).toLocaleString("en-UG", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {u.access_status === "pending" && (
                            <button
                              disabled={acting === u.user_id}
                              onClick={() => handleAction(u.user_id, "approved")}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                            >
                              <UserCheck size={13} />
                              {acting === u.user_id ? "…" : "Grant Access"}
                            </button>
                          )}
                          {u.access_status === "approved" && (
                            <button
                              disabled={acting === u.user_id}
                              onClick={() => handleAction(u.user_id, "suspended")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                            >
                              <ShieldOff size={13} />
                              {acting === u.user_id ? "…" : "Suspend"}
                            </button>
                          )}
                          {(u.access_status === "suspended" || u.access_status === "revoked") && (
                            <button
                              disabled={acting === u.user_id}
                              onClick={() => handleAction(u.user_id, "approved")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 text-green-700 px-3 py-1.5 text-xs font-medium hover:bg-green-50 disabled:opacity-50"
                            >
                              <CheckCircle size={13} />
                              {acting === u.user_id ? "…" : "Restore Access"}
                            </button>
                          )}
                          {u.access_status !== "revoked" && u.access_status !== "pending" && (
                            <button
                              disabled={acting === u.user_id}
                              onClick={() => handleAction(u.user_id, "revoked")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-500 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                              <XCircle size={13} />
                              {acting === u.user_id ? "…" : "Revoke"}
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

        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-700">Access is enforced at the database level.</strong>{" "}
            A user with "Pending" status cannot access any BizRise data even if they are logged in.
            Only "Approved" users can use the dashboard.
          </p>
        </div>

      </div>
    </div>
  );
}
