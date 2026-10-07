import { supabase } from "./supabase";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

const isDemo = () => !supabase;

export type StaffMember = {
  id: string; user_id: string; role: string; is_active: boolean;
  created_at: string; full_name: string; email: string; phone: string | null;
};

const DEMO_STAFF: StaffMember[] = [
  { id: "mem-001", user_id: "demo-user-001", role: "owner", is_active: true, created_at: new Date(Date.now() - 30 * 86400000).toISOString(), full_name: "Demo Owner", email: "demo@bizrise.app", phone: "+256 700 000 000" },
  { id: "mem-002", user_id: "demo-user-002", role: "cashier", is_active: true, created_at: new Date(Date.now() - 14 * 86400000).toISOString(), full_name: "Sarah Namukasa", email: "sarah@abc.com", phone: "+256 772 111 222" },
  { id: "mem-003", user_id: "demo-user-003", role: "inventory", is_active: false, created_at: new Date(Date.now() - 7 * 86400000).toISOString(), full_name: "Daniel Okello", email: "daniel@abc.com", phone: null },
];

export async function listStaff(businessId: string): Promise<StaffMember[]> {
  if (isDemo()) return [...DEMO_STAFF];
  const db = client();
  const { data, error } = await db.from("business_members").select("id, user_id, role, is_active, created_at, profiles(full_name, phone)").eq("business_id", businessId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((m: any) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return { id: m.id, user_id: m.user_id, role: m.role, is_active: m.is_active, created_at: m.created_at, full_name: profile?.full_name ?? "Unknown", email: "", phone: profile?.phone ?? null };
  });
}

export async function updateMemberRole(memberId: string, role: string): Promise<void> {
  if (isDemo()) { const m = DEMO_STAFF.find((s) => s.id === memberId); if (m) m.role = role; return; }
  const { error } = await client().from("business_members").update({ role }).eq("id", memberId);
  if (error) throw error;
}

export async function deactivateMember(memberId: string): Promise<void> {
  if (isDemo()) { const m = DEMO_STAFF.find((s) => s.id === memberId); if (m) m.is_active = false; return; }
  const { error } = await client().from("business_members").update({ is_active: false }).eq("id", memberId);
  if (error) throw error;
}

export async function reactivateMember(memberId: string): Promise<void> {
  if (isDemo()) { const m = DEMO_STAFF.find((s) => s.id === memberId); if (m) m.is_active = true; return; }
  const { error } = await client().from("business_members").update({ is_active: true }).eq("id", memberId);
  if (error) throw error;
}

/**
 * Add a staff member to a business by their username.
 * The user must already have an approved BizRise account.
 * Returns the display name of the added user on success.
 */
export async function addStaffByUsername(businessId: string, username: string, role: string): Promise<string> {
  if (isDemo()) {
    DEMO_STAFF.push({ id: "mem-" + Date.now(), user_id: "demo-" + Date.now(), role, is_active: true, created_at: new Date().toISOString(), full_name: username, email: "", phone: null });
    return username;
  }
  const db = client();

  // Resolve the username to a user_id via the profiles table
  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .select("id, full_name, username, access_status")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (profileErr) throw profileErr;
  if (!profile) throw new Error("No BizRise account found for that username. Make sure they've registered first.");
  if (profile.access_status !== "approved") throw new Error(`That account is not yet approved (status: ${profile.access_status}). The admin must approve them first.`);

  // Check they're not already a member
  const { data: existing } = await db
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) throw new Error("That user is already a member of this business.");

  // Add them
  const { error: insertErr } = await db.from("business_members").insert({
    business_id: businessId,
    user_id: profile.id,
    role,
    is_active: true,
  });
  if (insertErr) throw insertErr;

  return profile.full_name ?? username;
}
