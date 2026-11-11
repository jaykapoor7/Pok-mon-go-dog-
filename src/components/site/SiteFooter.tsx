/* The public site footer. The implementation lives in src/site6/Footer.tsx. */
import { Footer } from "@/site6/Footer";
import "@/sp3/sp3.css";
import "@/sp4/sp4.css";

export function SiteFooter({ className = "", cta = true }: { className?: string; cta?: boolean }) {
  void cta;
  return <Footer className={className} />;
}
