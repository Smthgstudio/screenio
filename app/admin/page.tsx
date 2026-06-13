import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminUserTable from "@/components/AdminUserTable";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    admin.from("profiles").select("id, email, role, created_at, screens(count)").order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const bannedIds = new Set(
    (authData?.users ?? [])
      .filter(u => u.banned_until && new Date(u.banned_until) > new Date())
      .map(u => u.id)
  );

  const users = (profiles ?? []).map(p => ({
    id: p.id,
    email: p.email ?? null,
    role: p.role as "user" | "client" | "admin",
    created_at: p.created_at,
    screens_count: (p.screens as unknown as { count: number }[])?.[0]?.count ?? 0,
    blocked: bannedIds.has(p.id),
  }));

  const stats = {
    total: users.length,
    clients: users.filter(u => u.role === "client").length,
    blocked: users.filter(u => u.blocked).length,
    free: users.filter(u => u.role === "user").length,
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white">
      <header className="flex items-center justify-between border-b border-white/8 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/70">← Dashboard</Link>
          <span className="text-white/20">/</span>
          <span className="text-sm font-black">Admin</span>
        </div>
        <span className="rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-300">Admin</span>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-8 text-2xl font-black">Gestion des utilisateurs</h1>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Clients payants", value: stats.clients },
            { label: "Gratuits", value: stats.free },
            { label: "Bloqués", value: stats.blocked, danger: stats.blocked > 0 },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border px-5 py-4 ${s.danger ? "border-red-500/20 bg-red-500/5" : "border-white/8 bg-white/3"}`}>
              <p className={`text-2xl font-black ${s.danger ? "text-red-400" : "text-white"}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>

        <AdminUserTable users={users} />
      </main>
    </div>
  );
}
