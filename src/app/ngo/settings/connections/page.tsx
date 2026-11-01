import { Connections } from "@/sp/connections/Connections";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connections · StrayPaw", robots: { index: false, follow: false } };
export default function Page() { return <Connections back="/ngo/settings/connections" />; }
