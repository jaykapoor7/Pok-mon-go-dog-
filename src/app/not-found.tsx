import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin, PawPrint } from "lucide-react";
import "@/components/site/site.css";

export const metadata = { title: "Not found, StrayPaw" };

export default function NotFound() {
  return (
    <div className="sp min-h-screen bg-[#f4f5f7] text-[#0b1020]">
      <div data-not-found-recovery className="mx-auto flex min-h-[72vh] max-w-7xl items-center px-5 py-12 sm:px-8 lg:px-12">
        <section className="grid w-full gap-10 border-y border-[#0b1020]/10 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:py-16">
          <div>
            <p className="sp-kicker"><span>404</span> · Record not found</p>
            <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-full border border-[#0b1020]/10 bg-white shadow-sm">
              <PawPrint className="h-8 w-8" aria-hidden />
            </div>
          </div>

          <div>
            <h1 className="max-w-3xl text-[clamp(3rem,8vw,6.8rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              This trail ends here.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#0b1020]/60">
              The page may have moved, the link may be old, or the record may no longer be public. You can return home, open the live map, or report an animal without needing an account.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className="sp-btn sp-btn-dark">
                <ArrowLeft size={16} /> Home
              </Link>
              <Link href="/map" className="sp-btn sp-btn-ghost">
                <MapPin size={16} /> Open live map
              </Link>
              <Link href="/report" className="sp-btn sp-btn-primary">
                Report an animal <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
