import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import BentoComposer from "@/components/BentoComposer";

export default async function ScreenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: screen }, { data: profile }] = await Promise.all([
    supabase.from("screens").select("id, name, layout").eq("id", id).single(),
    supabase.from("profiles").select("plan, role").single(),
  ]);

  if (!screen) notFound();

  // Admin and client roles get pro access
  const plan = profile?.role === "admin" || profile?.role === "client" ? "client" : "user";

  return (
    <BentoComposer
      screenId={screen.id}
      screenName={screen.name}
      initialLayout={screen.layout as { widgets: [] }}
      plan={plan as "free" | "client" | "admin"}
    />
  );
}
