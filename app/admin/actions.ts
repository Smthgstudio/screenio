"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Role = "user" | "client" | "admin";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") throw new Error("Accès refusé");
  return user.id;
}

export async function updateUserRole(userId: string, role: Role) {
  const adminId = await assertAdmin();
  // Prevent admin from demoting themselves
  if (userId === adminId) throw new Error("Impossible de modifier votre propre rôle");
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function sendPasswordReset(email: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
}

export async function toggleBlockUser(userId: string, block: boolean) {
  const adminId = await assertAdmin();
  if (userId === adminId) throw new Error("Impossible de se bloquer soi-même");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: block ? "876600h" : "none",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  const adminId = await assertAdmin();
  if (userId === adminId) throw new Error("Impossible de supprimer son propre compte");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createUser(email: string, password: string, role: Role) {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Utilisateur non créé");

  // Upsert profile (handles both trigger-already-fired and not-yet-fired cases)
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    plan: "free",
    role,
  }, { onConflict: "id" });
  if (profileError) throw new Error(profileError.message);

  revalidatePath("/admin");
}
