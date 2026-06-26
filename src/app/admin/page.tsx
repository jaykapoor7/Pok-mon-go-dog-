import { AdminClient } from "@/components/admin/AdminClient";

export const metadata = {
  title: "Moderation — StrayPaw",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminClient />;
}
