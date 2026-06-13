"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NewScreenButton() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("screens")
      .insert({ user_id: user.id, name: "Nouvel écran" })
      .select("id")
      .single();
    if (!error && data) router.push(`/screen/${data.id}`);
    setLoading(false);
  }

  return (
    <button onClick={create} disabled={loading}
      className="rounded-xl bg-[#C8F15A] px-5 py-2.5 text-sm font-black text-[#141414] transition-colors hover:bg-[#B8E048] disabled:opacity-50">
      {loading ? "Création…" : "+ Nouvel écran"}
    </button>
  );
}
