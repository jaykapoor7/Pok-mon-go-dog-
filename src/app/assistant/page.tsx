import { AiWorkspace } from "@/sp3/ai/AiPanel";

export const metadata = { title: "StrayPaw AI", robots: { index: false, follow: false } };

/* The full-screen StrayPaw AI workspace: the same conversation as the panel. */
export default function AssistantPage() { return <AiWorkspace />; }
