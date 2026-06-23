import Link from "next/link";

/** Slim global footer shown on every page. */
export function SiteFooter() {
  return (
    <footer className="border-t border-bark-100 px-4 pb-28 pt-6 text-center text-xs text-bark-400 md:pb-8">
      <p>
        StrayPaw Delhi — built with 🧡 for the city&apos;s street dogs.
      </p>
      <p className="mt-1">
        Built in Delhi by{" "}
        <Link href="/" className="font-semibold text-paw-600 hover:underline">
          Jay
        </Link>
      </p>
    </footer>
  );
}
