"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Role = "user" | "client" | "admin";

export async function updateUserRole(userId: string, role: Role) {
  // Verify caller is admin
  const supabase = await createClient();
  const { data: caller } = await supabase.from("profiles").select("role").single();
  if (caller?.role !== "admin") throw new Error("Unauthorized");

  const admin = createAdminClient();
  await admin.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  const supabase = await createClient();
  const { data: caller } = await supabase.from("profiles").select("role").single();
  if (caller?.role !== "admin") throw new Error("Unauthorized");

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}
