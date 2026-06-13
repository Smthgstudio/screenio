import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewScreenButton from "@/components/NewScreenButton";
import NewFolderButton from "@/components/NewFolderButton";
import LogoutButton from "@/components/LogoutButton";
import ScreenCard from "@/components/ScreenCard";
import Logo from "@/components/Logo";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: screens }, { data: folders }] = await Promise.all([
    supabase.from("profiles").select("plan, role").single(),
    supabase.from("screens").select("id, name, updated_at").order("updated_at", { ascending: false }),
    supabase.from("folders").select("id, name, slug, schedules(count)").order("created_at", { ascending: false }),
  ]);

  const isPro = profile?.role === "admin" || profile?.role === "client" || profile?.plan === "pro";
  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen bg-[#EDEAE4] text-[#141414]">
      {/* Navbar */}
      <header className="flex items-center justify-between border-b border-black/8 bg-[#EDEAE4] px-6 py-4">
        <Logo height={24} />
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

      <main className="mx-auto max-w-5xl px-6 py-12 space-y-14">

        {/* Freemium banner */}
        {!isPro && (
          <div className="flex items-center gap-4 rounded-2xl border border-black/8 bg-white px-5 py-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-[#141414]">Plan gratuit — widget Texte uniquement</p>
              <p className="mt-0.5 text-xs text-[#888880]">Passez Pro pour débloquer Image, Slideshow, Vidéo et Menu.</p>
            </div>
            <button className="shrink-0 rounded-xl bg-[#C8F15A] px-5 py-2.5 text-sm font-black text-[#141414] transition-colors hover:bg-[#B8E048]">
              Voir les offres →
            </button>
          </div>
        )}

        {/* Folders */}
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Dossiers</h2>
              <p className="mt-0.5 text-sm text-[#888880]">
                {folders?.length ?? 0} dossier{(folders?.length ?? 0) !== 1 ? "s" : ""} — diffusion planifiée
              </p>
            </div>
            <NewFolderButton />
          </div>

          {folders && folders.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map(f => {
                const count = (f.schedules as { count: number }[])?.[0]?.count ?? 0;
                return (
                  <Link key={f.id} href={`/folders/${f.id}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-black/8 bg-white p-5 transition-all hover:border-black/20 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#141414]">{f.name}</p>
                        <p className="mt-0.5 text-xs text-[#888880]">{count} créneau{count !== 1 ? "x" : ""}</p>
                      </div>
                      <span className="shrink-0 rounded-lg border border-black/8 bg-[#EDEAE4] px-2 py-1 text-[10px] font-mono text-[#888880]">
                        📡
                      </span>
                    </div>
                    <div className="rounded-lg border border-black/6 bg-[#EDEAE4] px-2.5 py-1.5">
                      <p className="text-[10px] font-mono text-[#888880] truncate">/broadcast/{f.slug}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/15 bg-white/50 py-12 text-center">
              <p className="text-sm font-bold text-[#888880]">Aucun dossier</p>
              <p className="text-xs text-[#888880]/60">Crée un dossier pour programmer plusieurs écrans sur une même URL</p>
              <NewFolderButton />
            </div>
          )}
        </section>

        {/* Screens */}
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Mes écrans</h2>
              <p className="mt-0.5 text-sm text-[#888880]">
                {screens?.length ?? 0} écran{(screens?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <NewScreenButton />
          </div>

          {screens && screens.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {screens.map((screen) => (
                <ScreenCard key={screen.id} id={screen.id} name={screen.name} updatedAt={screen.updated_at} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-black/15 bg-white/50 py-16 text-center">
              <p className="text-lg font-bold text-[#888880]">Aucun écran pour l&apos;instant</p>
              <p className="text-sm text-[#888880]/60">Crée ton premier écran pour commencer</p>
              <NewScreenButton />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
