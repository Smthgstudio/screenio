import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import BentoDisplay from "@/components/BentoDisplay";
import BroadcastRefresher from "@/components/BroadcastRefresher";

export const dynamic = "force-dynamic";

function getActiveSchedule(schedules: {
  id: string;
  days: number[];
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  screen: { layout: { widgets: [] } | null } | null;
}[]) {
  const now = new Date();
  // JS getDay(): 0=Sun → convert to 0=Mon
  const day = (now.getDay() + 6) % 7;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${hh}:${mm}:00`;

  return schedules.find(s => {
    if (!s.days.includes(day)) return false;
    if (s.all_day) return true;
    if (!s.start_time || !s.end_time) return false;
    return currentTime >= s.start_time && currentTime < s.end_time;
  }) ?? null;
}

export default async function BroadcastFolderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: folder } = await admin
    .from("folders")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!folder) notFound();

  const { data: rawSchedules } = await admin
    .from("schedules")
    .select("id, days, start_time, end_time, all_day, screens(layout)")
    .eq("folder_id", folder.id);

  type ScheduleRow = {
    id: string; days: number[]; start_time: string | null; end_time: string | null; all_day: boolean;
    screen: { layout: { widgets: [] } | null } | null;
  };

  const schedules: ScheduleRow[] = (rawSchedules ?? []).map(s => ({
    ...s,
    days: s.days as number[],
    screen: Array.isArray(s.screens) ? (s.screens[0] as { layout: { widgets: [] } | null } ?? null) : (s.screens as { layout: { widgets: [] } | null } | null),
  }));

  const active = getActiveSchedule(schedules);
  const widgets = active?.screen?.layout?.widgets ?? null;

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#1a1a1a]">
      <BroadcastRefresher />
      {widgets ? (
        <BentoDisplay widgets={widgets} />
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
  );
}
