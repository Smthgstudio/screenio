import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewScreenButton from "@/components/NewScreenButton";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: screens }] = await Promise.all([
    supabase.from("profiles").select("plan, role").single(),
    supabase.from("screens").select("id, name, updated_at").order("updated_at", { ascending: false }),
  ]);

  const isPro = profile?.role === "admin" || profile?.role === "client" || profile?.plan === "pro";

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white">
      {/* Navbar */}
      <header className="flex items-center justify-between border-b border-white/8 px-6 py-4">
        <span className="text-lg font-black tracking-tight">Screenio</span>
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
            isPro
              ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
              : "border-white/10 bg-white/5 text-white/50"
          }`}>
            {isPro ? "Pro" : "Gratuit"}
          </span>
          {!isPro && (
            <button className="rounded-full bg-violet-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-500">
              Passer Pro
            </button>
          )}
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Mes écrans</h1>
            <p className="mt-1 text-sm text-white/40">
              {screens?.length ?? 0} écran{(screens?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <NewScreenButton />
        </div>

        {!isPro && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-5 py-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-violet-300">Plan gratuit — widget Texte uniquement</p>
              <p className="mt-0.5 text-xs text-white/40">
                Passe en Pro pour débloquer Image, Slideshow et Menu.
              </p>
            </div>
            <button className="shrink-0 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500">
              Voir les offres
            </button>
          </div>
        )}

        {screens && screens.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {screens.map((screen) => (
              <Link
                key={screen.id}
                href={`/screen/${screen.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 p-5 transition-all hover:border-violet-500/40 hover:bg-white/5"
              >
                {/* Thumbnail placeholder */}
                <div className="aspect-video w-full rounded-xl border border-white/6 bg-white/3 grid place-items-center">
                  <span className="text-2xl opacity-20">⬜</span>
                </div>
                <div>
                  <p className="font-bold text-white group-hover:text-violet-300 transition-colors">{screen.name}</p>
                  <p className="mt-0.5 text-xs text-white/35">
                    Modifié le {new Date(screen.updated_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <p className="text-lg font-bold text-white/40">Aucun écran pour l&apos;instant</p>
            <p className="text-sm text-white/25">Crée ton premier écran pour commencer</p>
            <NewScreenButton />
          </div>
        )}
      </main>
    </div>
  );
}
