import type { Metadata } from "next";
import { Kaju } from "@/nx/pages/Kaju";
export const metadata: Metadata = { title: "Kaju, StrayPaw" };
/* On a slow phone a person can type and press Enter before the page has finished loading. The words stay in the box;
   this holds that Enter (no stray new line) so the composer sends it as soon as it is ready. It does nothing once a
   composer is running (window.__kjLive, set by the composer itself). */
const EARLY_ENTER = "document.addEventListener('keydown',function(e){var t=e.target;if(e.key==='Enter'&&!e.shiftKey&&t&&t.tagName==='TEXTAREA'&&t.getAttribute('aria-label')==='Ask Kaju'&&!window.__kjLive){e.preventDefault();window.__kjEnter=true;}},true);";
export default function Page() { return <><script dangerouslySetInnerHTML={{ __html: EARLY_ENTER }} /><Kaju /></>; }
