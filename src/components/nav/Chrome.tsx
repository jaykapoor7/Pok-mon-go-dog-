"use client";

import { usePathname, useSelectedLayoutSegments } from "next/navigation";

/* The application frame is not imported here. App pages live in the (app) route group, whose one layout mounts the
   frame once for all of them; public pages (the site, documents, the bite finder) never load it. */

/**
 * Marketing and auth pages render their own full-bleed chrome.
 */
const OWN_CHROME = new Set<string>([
  "/",
  "/about",
  "/our-story",
  "/product",
  "/solutions",
  // This is a server redirect to the organisation directory. Rendering the
  // client console around an empty redirect boundary caused a hydration
  // warning on phones before the redirect completed.
  "/adopt",
  "/privacy",
  "/terms",
  "/safety",
  "/community-guidelines",
  "/cookies",
  "/contact",
  "/partner-apply",
  "/partnerships",
  "/reset-password",
  // Someone arriving with a code needs the code box, not the console
  // around it and not the role picker in front of it.
  "/join",
  "/access",
  // Moderation is its own console. Wrapping it in the app's console put a
  // sidebar, a search bar and a role picker around a sidebar, which is
  // where most of the confusion on this page came from.
  "/moderate",
  "/admin",
  // Explainer pages behind the header nav, they render SiteHeader themselves.
  "/the-network",
  "/for-funders",
  "/for-ngos",
  "/for-community",
  "/for-feeders",
  "/for-governments",
  "/for-hospitals",
  // Footer and demo pages that render the site header themselves.
  "/status",
  "/data-processing",
  "/report-content",
  "/try",
  "/about",
  "/our-story",
  "/product",
  "/solutions",
  "/data-governance",
  "/how-to-help",
  "/research-standards",
  // Everything reachable from the site header is a page, not a screen of
  // the app. Clicking "Evidence" in the header used to drop you inside the
  // console — sidebar, rail, role picker and all — with no way back to the
  // site. These render SiteHeader and the site footer themselves, through
  // SitePage.
  "/evidence",
  "/explore",
  "/education",
  "/get-involved",
  "/partner-programmes",
  "/mission",
  "/licences",
]);

/**
 * Pages that already mount AppShell themselves, directly, or through
 * PlatformShell / the partner layout. Wrapping them again would nest the
 * console inside itself.
 */
const SELF_SHELLED = new Set<string>([
  "/app",
  "/map",
  "/studies",
  "/outcomes",
  "/interventions",
  "/following",
  "/insights",
  "/resources",
  "/stories",
  "/orgs",
]);

/** StrayPaw 3.0 public and entry pages render their own nav and footer. */
const S3_PUBLIC = /^\/(talk|pricing|abc-operations|security|research|for-governments|for-ngos|for-funders|for-hospitals|platform|ai|kaju-agents|blog|product-updates|roadmap|events|teams|whatsapp|customers|demo|docs|solutions|sign-in|app|partners|faq|donate|safety|bite-help|privacy|terms|cookies)(\/|$)/;

/** The app's own routes, in the (work) route group, which mounts its frame (src/nx/Shell) with its own skip link and
    main landmark. Public pages at nearby addresses (/research/access, /research/catalogue, /ai) are not in this list. */
const SP2 = /^\/(ngo|gov|health|kaju|channels|home|start|settings|requests|research\/(datasets|explore|maps|reports|studies))(\/|$)/;

/** Public record pages rebuilt on the public site kit (src/sp4/pub), outside the (app) group: they render
    the site header and footer themselves (the operator console at /trust its own bar), never the app frame. */
const PUBLIC_RECORD = /^\/(community|animal|fundraisers|learn|search|offline|city|trust)(\/|$)/;

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  /* App pages get their frame from the (work) layout. */
  if (SP2.test(pathname)) return <>{children}</>;
  // Marketing and profile routes have their own main landmark.
  // ISR can render the root through an internal pathname. The route tree
  // identifies the landing page consistently during regeneration and in the
  // browser, so its server HTML never acquires the application console.
  const own = segments.length === 0 || OWN_CHROME.has(pathname) || S3_PUBLIC.test(pathname) || PUBLIC_RECORD.test(pathname) || pathname.startsWith("/org/") || pathname.startsWith("/dog/");
  /* The wrapper holds the page's own header too, so "Skip to content" moves focus to the page's <main> when it has one
     (it used to land on the header's first link). */
  if (own) return <><a href="#main-content" className="skip-link" onClick={skipToMain}>Skip to content</a><div id="main-content" tabIndex={-1}>{children}</div></>;

  if (pathname.startsWith("/embed/") || pathname.startsWith("/org/")) return <>{children}</>;
  if (OWN_CHROME.has(pathname)) return <>{children}</>;
  if (SELF_SHELLED.has(pathname) || pathname.startsWith("/partner")) {
    return <>{children}</>;
  }

  // Everything else that is an app surface lives in the (app) group and is framed there.
  return <>{children}</>;
}

function skipToMain(e: React.MouseEvent<HTMLAnchorElement>) {
  const main = document.querySelector<HTMLElement>("#main-content main");
  if (!main) return;
  e.preventDefault();
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  main.focus();
  main.scrollIntoView({ block: "start" });
}
