"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function assertOwner(folderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data } = await supabase.from("folders").select("id").eq("id", folderId).single();
  if (!data) throw new Error("Dossier introuvable");
  return supabase;
}

export async function updateFolderName(folderId: string, name: string) {
  const supabase = await assertOwner(folderId);
  await supabase.from("folders").update({ name }).eq("id", folderId);
  revalidatePath(`/folders/${folderId}`);
  revalidatePath("/schedule");
}

export async function addSchedule(
  folderId: string,
  screenId: string,
  days: number[],
  allDay: boolean,
  startTime: string | null,
  endTime: string | null,
) {
  const supabase = await assertOwner(folderId);
  const { data, error } = await supabase.from("schedules").insert({
    folder_id: folderId,
    screen_id: screenId,
    days,
    all_day: allDay,
    start_time: allDay ? null : startTime,
    end_time: allDay ? null : endTime,
  }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
  return data?.id ?? null;
}

export async function updateSchedule(
  folderId: string,
  scheduleId: string,
  days: number[],
  allDay: boolean,
  startTime: string | null,
  endTime: string | null,
) {
  const supabase = await assertOwner(folderId);
  const { error } = await supabase.from("schedules").update({
    days,
    all_day: allDay,
    start_time: allDay ? null : startTime,
    end_time: allDay ? null : endTime,
  }).eq("id", scheduleId).eq("folder_id", folderId);
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}

export async function deleteSchedule(folderId: string, scheduleId: string) {
  const supabase = await assertOwner(folderId);
  await supabase.from("schedules").delete().eq("id", scheduleId).eq("folder_id", folderId);
  revalidatePath("/schedule");
}

export async function deleteFolder(folderId: string) {
  const supabase = await assertOwner(folderId);
  await supabase.from("folders").delete().eq("id", folderId);
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
}
