import { AppShell } from "@/components/app/AppShell";
import { ModerationQueue } from "@/components/admin/ModerationQueue";

// The focused review queue. Every other admin tool stays at /admin.
export const metadata = {
  title: "Moderation, StrayPaw",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ModeratePage() {
  return <AppShell><ModerationQueue /></AppShell>;
}
