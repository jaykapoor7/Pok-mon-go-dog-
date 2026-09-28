import { AppShell } from "@/components/app/AppShell";
import "./feeding.css";

export default function FeedingLayout({ children }: { children: React.ReactNode }) {
  return <AppShell><div className="feeding-experience">{children}</div></AppShell>;
}
