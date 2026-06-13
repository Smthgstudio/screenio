"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "dossier";
  const suffix = Math.random().toString(36).slice(2, 8);
  const slug = `${base}-${suffix}`;
  return slug === "screen" ? `dossier-${suffix}` : slug;
}

export async function createFolder(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const slug = generateSlug(name);
  const { data, error } = await supabase.from("folders").insert({ name, slug, user_id: user.id }).select("id").single();
  if (error || !data) throw new Error("Erreur lors de la création");

  revalidatePath("/dashboard");
  redirect(`/folders/${data.id}`);
}

export async function createScreen() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("screens")
    .insert({ name: "Nouvel écran", layout: { widgets: [] }, user_id: user.id })
    .select("id")
    .single();

  if (error || !data) throw new Error("Erreur lors de la création");
  revalidatePath("/dashboard");
  redirect(`/screen/${data.id}`);
}
