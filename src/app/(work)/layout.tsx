import type { Metadata } from "next";
import { LiveProvider } from "@/nx/live";
import { Frame } from "@/nx/Shell";

/* The app's frame is mounted here once, so the sidebar, channels and Kaju stay in place while pages change. */
export const metadata: Metadata = { robots: { index: false, follow: false } };
/* Before the page paints: a browser that holds a session is marked, so the sample page that visitors see at once (it is
   in the server HTML) stays hidden for members until their own workspace has been read (see .nx-main in nx.css). */
const MEMBER_HINT = "try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&/^sb-.+-auth-token$/.test(k)){document.documentElement.setAttribute('data-member','');break}}}catch(e){}";
export default function NextLayout({ children }: { children: React.ReactNode }) {
  return <><script dangerouslySetInnerHTML={{ __html: MEMBER_HINT }} /><LiveProvider><Frame>{children}</Frame></LiveProvider></>;
}
