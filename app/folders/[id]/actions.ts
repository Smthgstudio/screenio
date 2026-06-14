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

// Split a multi-day schedule: detach one day into its own schedule with new times
export async function splitSchedule(
  folderId: string,
  scheduleId: string,
  detachDay: number,
  newStartTime: string,
  newEndTime: string,
): Promise<string | null> {
  const supabase = await assertOwner(folderId);

  // Get the original schedule
  const { data: orig } = await supabase.from("schedules").select("*").eq("id", scheduleId).single();
  if (!orig) throw new Error("Créneau introuvable");

  const remainingDays = (orig.days as number[]).filter(d => d !== detachDay);

  // Update original to remove the detached day (or delete if now empty)
  if (remainingDays.length === 0) {
    await supabase.from("schedules").delete().eq("id", scheduleId);
  } else {
    await supabase.from("schedules").update({ days: remainingDays }).eq("id", scheduleId);
  }

  // Create new single-day schedule with new times
  const { data, error } = await supabase.from("schedules").insert({
    folder_id: folderId,
    screen_id: orig.screen_id,
    days: [detachDay],
    all_day: false,
    start_time: newStartTime,
    end_time: newEndTime,
  }).select("id").single();
  if (error) throw new Error(error.message);

  revalidatePath("/schedule");
  return data?.id ?? null;
}

export async function deleteFolder(folderId: string) {
  const supabase = await assertOwner(folderId);
  await supabase.from("folders").delete().eq("id", folderId);
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
}
