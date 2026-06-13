import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import BentoDisplay from "@/components/BentoDisplay";
import BroadcastRefresher from "@/components/BroadcastRefresher";

export const dynamic = "force-dynamic";

export default async function BroadcastScreenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: screen } = await admin
    .from("screens")
    .select("id, name, layout")
    .eq("id", id)
    .single();

  if (!screen) notFound();

  const layout = screen.layout as { widgets: [] } | null;
  const widgets = layout?.widgets ?? [];

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#1a1a1a]">
      <BroadcastRefresher />
      <BentoDisplay widgets={widgets} />
    </div>
  );
}
