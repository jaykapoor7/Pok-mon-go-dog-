import { Shell } from "@/sp/shell/Shell";
import { ToastHost } from "@/oh/ui";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Shell><ToastHost>{children}</ToastHost></Shell>;
}
