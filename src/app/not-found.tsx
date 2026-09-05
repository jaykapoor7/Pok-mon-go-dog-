import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoverageGap } from "@/components/site/vectors";

export const metadata = { title: "Not found, StrayPaw" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start py-16">
      <span className="text-electric">
        <CoverageGap size={104} />
      </span>
      <p className="mt-6 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bark-500">
        404 / no record
      </p>
      <h1 className="mt-3 font-display text-4xl leading-none tracking-tight">
        Nothing at this address.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-bark-600">
        The page you asked for doesn&apos;t exist, or it moved. Nothing was lost, records keep their own URLs.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/map" className="btn-primary px-5 py-3">
          Open the living map <ArrowUpRight className="h-4 w-4" />
        </Link>
        <Link href="/app" className="btn-ghost px-5 py-3">
          Console home
        </Link>
      </div>
    </div>
  );
}
