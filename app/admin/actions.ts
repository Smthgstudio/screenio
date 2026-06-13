"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Role = "user" | "client" | "admin";

async function assertAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").single();
  if (data?.role !== "admin") throw new Error("Unauthorized");
}

export async function updateUserRole(userId: string, role: Role) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin");
}

export async function sendPasswordReset(email: string) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.auth.resetPasswordForEmail(email);
}

export async function toggleBlockUser(userId: string, block: boolean) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: block ? "876600h" : "none",
  });
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
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
  if (data.user) {
    await admin.from("profiles").update({ role }).eq("id", data.user.id);
  }
  revalidatePath("/admin");
}
