"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
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
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push("/dashboard"); router.refresh(); }
  }

  return (
    <main className="flex min-h-screen bg-[#EDEAE4]">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 border-r border-black/8">
        <span className="text-sm font-black tracking-tight text-[#141414]">Screenio</span>
        <div>
          <p className="text-[56px] font-black leading-[1.05] tracking-tight text-[#141414]">
            Votre premier écran en moins de 2 minutes.
          </p>
        </div>
        <span className="text-xs text-[#888880]">© 2026 Screenio</span>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-sm mx-auto">
          <span className="lg:hidden block text-sm font-black tracking-tight text-[#141414] mb-10">Screenio</span>
          <h1 className="text-2xl font-black text-[#141414] mb-1">Créer un compte</h1>
          <p className="text-sm text-[#888880] mb-8">Gratuit, sans carte bancaire</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#888880] uppercase tracking-wide">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#141414] outline-none placeholder:text-black/25 focus:border-black/30 focus:ring-2 focus:ring-black/5"
                placeholder="toi@exemple.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#888880] uppercase tracking-wide">Mot de passe</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#141414] outline-none placeholder:text-black/25 focus:border-black/30 focus:ring-2 focus:ring-black/5"
                placeholder="6 caractères minimum" />
            </div>
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-1 rounded-xl bg-[#C8F15A] px-6 py-3 text-sm font-black text-[#141414] transition-colors hover:bg-[#B8E048] disabled:opacity-50">
              {loading ? "Création…" : "Créer mon compte →"}
            </button>
          </form>

          <div className="mt-5 rounded-xl border border-black/8 bg-white/60 px-4 py-3">
            <p className="text-xs font-bold text-[#141414]">Plan gratuit inclus</p>
            <p className="mt-0.5 text-xs text-[#888880]">Widget Texte disponible. Passez Pro pour débloquer Image, Slideshow et Menu.</p>
          </div>

          <p className="mt-6 text-sm text-[#888880]">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-semibold text-[#141414] underline underline-offset-2 hover:text-black">Se connecter</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
