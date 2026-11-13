import { Shell } from "@/sp/shell/Shell";

/* Every page of the application shares this one layout, so the frame (sidebar, open tabs, Kaju) is mounted once and
   stays in place while pages change. The group does not appear in any address. Public pages are outside it and never
   load the frame. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
