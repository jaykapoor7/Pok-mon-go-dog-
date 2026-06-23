import Link from "next/link";
import { PawPrint, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-paw-100 text-paw-500">
        <PawPrint className="h-10 w-10" />
      </span>
      <h1 className="font-display text-3xl font-extrabold">This pup wandered off</h1>
      <p className="mt-2 max-w-sm text-bark-500">
        We couldn&apos;t find the page you were looking for. Let&apos;s get you
        back to the dogs.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-primary px-6 py-3">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <Link href="/map" className="btn-ghost px-6 py-3">
          Explore the map
        </Link>
      </div>
    </div>
  );
}
