import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewScreenButton from "@/components/NewScreenButton";
import LogoutButton from "@/components/LogoutButton";
import ScreenCard from "@/components/ScreenCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: screens }] = await Promise.all([
    supabase.from("profiles").select("plan, role").single(),
    supabase.from("screens").select("id, name, updated_at").order("updated_at", { ascending: false }),
  ]);

  const isPro = profile?.role === "admin" || profile?.role === "client" || profile?.plan === "pro";
  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen bg-[#EDEAE4] text-[#141414]">
      {/* Navbar */}
      <header className="flex items-center justify-between border-b border-black/8 bg-[#EDEAE4] px-6 py-4">
        <span className="text-sm font-black tracking-tight">Screenio</span>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin" className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#141414] hover:bg-black/5">
              Admin
            </Link>
          )}
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
            isPro ? "border-black/10 bg-[#C8F15A] text-[#141414]" : "border-black/8 bg-white text-[#888880]"
          }`}>
            {isPro ? "Pro" : "Gratuit"}
          </span>
          {!isPro && (
            <button className="rounded-full bg-[#141414] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-black">
              Passer Pro
            </button>
          )}
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Mes écrans</h1>
            <p className="mt-1 text-sm text-[#888880]">
              {screens?.length ?? 0} écran{(screens?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <NewScreenButton />
        </div>

        {!isPro && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-black/8 bg-white px-5 py-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-[#141414]">Plan gratuit — widget Texte uniquement</p>
              <p className="mt-0.5 text-xs text-[#888880]">Passez Pro pour débloquer Image, Slideshow et Menu.</p>
            </div>
            <button className="shrink-0 rounded-xl bg-[#C8F15A] px-5 py-2.5 text-sm font-black text-[#141414] transition-colors hover:bg-[#B8E048]">
              Voir les offres →
            </button>
          </div>
        )}

        {screens && screens.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {screens.map((screen) => (
              <ScreenCard key={screen.id} id={screen.id} name={screen.name} updatedAt={screen.updated_at} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-black/15 bg-white/50 py-24 text-center">
            <p className="text-lg font-bold text-[#888880]">Aucun écran pour l&apos;instant</p>
            <p className="text-sm text-[#888880]/60">Crée ton premier écran pour commencer</p>
            <NewScreenButton />
          </div>
        )}
      </main>
    </div>
  );
}
