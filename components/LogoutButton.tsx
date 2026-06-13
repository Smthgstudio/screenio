"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/8 hover:text-white"
    >
      Déconnexion
    </button>
  );
}
