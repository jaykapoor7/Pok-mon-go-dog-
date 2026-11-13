import { AddFromChat } from "@/sp/ngo/AddFromChat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add an animal, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoAddPage() { return <AddFromChat />; }
