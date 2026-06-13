"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push("/dashboard"); router.refresh(); }
  }

  return (
    <main className="flex min-h-screen bg-[#EDEAE4]">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 border-r border-black/8">
        <Logo height={28} />
        <div>
          <p className="text-[56px] font-black leading-[1.05] tracking-tight text-[#141414]">
            Transformez vos écrans en outils marketing puissants.
          </p>
        </div>
        <span className="text-xs text-[#888880]">© 2026 Screenio</span>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-sm mx-auto">
          <Logo height={24} className="lg:hidden mb-10" />
          <h1 className="text-2xl font-black text-[#141414] mb-1">Connexion</h1>
          <p className="text-sm text-[#888880] mb-8">Accède à ton espace</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#888880] uppercase tracking-wide">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#141414] outline-none placeholder:text-black/25 focus:border-black/30 focus:ring-2 focus:ring-black/5"
                placeholder="toi@exemple.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#888880] uppercase tracking-wide">Mot de passe</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#141414] outline-none placeholder:text-black/25 focus:border-black/30 focus:ring-2 focus:ring-black/5"
                placeholder="••••••••" />
            </div>
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-1 rounded-xl bg-[#C8F15A] px-6 py-3 text-sm font-black text-[#141414] transition-colors hover:bg-[#B8E048] disabled:opacity-50">
              {loading ? "Connexion…" : "Se connecter →"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#888880]">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="font-semibold text-[#141414] underline underline-offset-2 hover:text-black">S&apos;inscrire</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
