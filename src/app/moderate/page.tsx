import { AdminClient } from "@/components/admin/AdminClient";

// Same moderation tool as /admin, on a fresh path. /admin can get stuck behind
// a cached edge 404 on some hosts; this alias is guaranteed to route.
export const metadata = {
  title: "Moderation — StrayPaw",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ModeratePage() {
  return <AdminClient />;
}
