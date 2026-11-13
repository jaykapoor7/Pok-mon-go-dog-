import { AiWorkspace } from "@/sp3/ai/AiPanel";

export const metadata = { title: "Kaju", robots: { index: false, follow: false } };

/* The full-screen Kaju workspace: the same conversation as the panel. */
export default function AssistantPage() { return <AiWorkspace />; }
