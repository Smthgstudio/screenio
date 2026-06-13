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
    <button onClick={logout}
      className="rounded-full border border-black/8 bg-white px-4 py-1.5 text-xs font-semibold text-[#888880] transition-colors hover:bg-black/5 hover:text-[#141414]">
      Déconnexion
    </button>
  );
}
