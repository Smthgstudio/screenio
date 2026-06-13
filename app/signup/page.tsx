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
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e14] px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-black text-white">Screenio</h1>
        <p className="mb-8 text-sm text-white/50">Crée ton compte gratuitement</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40"
              placeholder="toi@exemple.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40"
              placeholder="6 caractères minimum"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
          <p className="text-xs font-bold text-violet-300">Plan gratuit inclus</p>
          <p className="mt-0.5 text-xs text-white/40">Widget Texte disponible. Passe en Pro pour débloquer Image, Slideshow et Menu.</p>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-violet-400 hover:text-violet-300">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
