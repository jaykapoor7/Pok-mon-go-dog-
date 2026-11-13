import { Animals } from "@/sp/ngo/Animals";

export const dynamic = "force-dynamic";
export const metadata = { title: "Animals, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoAnimalsPage() { return <Animals />; }
