/* The application shell's stylesheets, kept in the root layout on purpose.

   Chrome loads the shell's code only on a page that uses it (see Chrome.tsx).
   Its stylesheets reached every page through the same import until then, in
   this order, and public pages were drawn with them in the cascade. They stay
   here, in that order, so no page changes how it looks: only the scripts move.

   The order is the order Shell's own imports reach them (Shell → places →
   AuthProvider, Finder → AiPanel → Kaju, FileViewer, KajuHub → Reading, then
   Notifications, FirstDay, the brand fonts and Shell's own sheets). Keep it
   when editing: every page's stylesheets were compared before and after
   this file existed and came out identical. */
import "@/sp3/sp3.css";
import "@/kaju/kaju.css";
import "@/sp/demo/viewer.css";
import "@/sp3/ai/ai.css";
import "@/sp/ui/reading.css";
import "@/sp/ngo/kaju-hub.css";
import "@/oh/notifications.css";
import "@/sp/shell/firstday.css";
/* The brand faces' @font-face rules (next/font writes them as a stylesheet).
   Public stylesheets name these families too, so they stay with the rest.
   The build drops a font module whose value nobody reads, so it is read
   below. */
import { spFonts } from "@/sp/fonts";
import "@/sp/sp.css";
import "@/sp/shell/shell.css";
import "@/sp/folk.css";
import "@/sp/mobile.css";
import "@/sp/shell/shell3.css";
import "@/sp/shell/app3.css";
import "@/sp/shell/app4.css";
import "@/sp/shell/system5.css";
import "@/sp/shell/os.css";
import "@/sp/shell/console.css";
import "@/sp/ui/skin.css";
import "@/sp/ui/calm.css";

/* Read, not used: keeps @/sp/fonts (and its @font-face rules) in the root
   build. Shell itself applies these classes to its own element. */
void spFonts;
