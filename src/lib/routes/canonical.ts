/* Links written before the rebuild still exist in stored rows: notifications, Kaju findings and automation notices
   carry the address of the screen that was current when they were made. This maps each of those addresses to the page
   that does the same work now, so an old link opens the right record instead of a missing page. It is applied where a
   stored link is shown; new code writes the current addresses directly. Query strings are kept unless the new page
   uses a different one. */

type Rule = [RegExp, string | ((m: RegExpMatchArray) => string)];

const RULES: Rule[] = [
  /* NGO */
  [/^\/(?:ngo|partner)\/verification\/([^/?#]+)/, (m) => `/ngo/cases/${m[1]}?tab=abc`],
  [/^\/(?:ngo|partner)\/packages\/([^/?#]+)/, (m) => `/ngo/submissions/${m[1]}`],
  [/^\/(?:ngo|partner)\/(?:drives|programmes)\/zones/, "/ngo/programmes?tab=zones"],
  [/^\/(?:ngo|partner)\/(?:drives|programmes)\/([^/?#]+)/, (m) => `/ngo/programmes/${m[1]}`],
  [/^\/partner\/cases\/new/, "/ngo/cases/new"],
  [/^\/(?:partner\/)?cases\/([^/?#]+)/, (m) => `/ngo/cases/${m[1]}`],
  [/^\/partner\/animals\/([^/?#]+)/, (m) => `/ngo/animals/${m[1]}`],
  [/^\/(?:ngo\/(?:work|review|pipeline)|partner\/(?:cases|followups|operations)?|dashboard|cases)(?=$|[?#])/, "/ngo/cases"],
  [/^\/ngo\/add(?=$|[?#])/, "/ngo/inbox"],
  [/^\/partner\/(?:inbox|incoming)(?=$|[?#])/, "/ngo/inbox"],
  [/^\/(?:ngo|partner)\/animals\/identity/, "/ngo/animals?view=identity"],
  [/^\/(?:ngo|partner)\/animals\/scan/, "/ngo/animals?view=scan"],
  [/^\/partner\/(?:animals|records)(?=$|[?#])/, "/ngo/animals"],
  [/^\/(?:ngo|partner)\/(?:care|medical)(?=$|[?#])/, "/ngo/operations?view=care-log"],
  [/^\/(?:ngo|partner)\/map(?=$|[?#])/, "/ngo/operations?view=map"],
  [/^\/ngo\/rescues(?=$|[?#])/, "/ngo/operations?view=rescues"],
  [/^\/ngo\/sterilisation(?=$|[?#])/, "/ngo/operations?view=sterilisation"],
  [/^\/(?:ngo|partner)\/(?:offline|field)(?=$|[?#])/, "/ngo/field"],
  [/^\/(?:ngo|partner)\/verification(?=$|[?#])/, "/ngo/submissions?tab=evidence"],
  [/^\/(?:ngo|partner)\/packages(?=$|[?#])/, "/ngo/submissions"],
  [/^\/ngo\/contracts(?=$|[?#])/, "/ngo/submissions?tab=contracts"],
  [/^\/(?:ngo\/evidence|partner\/resources)(?=$|[?#])/, "/ngo/submissions?tab=documents"],
  [/^\/(?:ngo\/proof|partner\/reports)(?=$|[?#])/, "/ngo/submissions?tab=exports"],
  [/^\/(?:ngo|partner)\/stories(?=$|[?#])/, "/ngo/submissions"],
  [/^\/(?:ngo|partner)\/quality(?=$|[?#])/, "/ngo/submissions?tab=quality"],
  [/^\/(?:ngo|partner)\/(?:surveys|projects)(?=$|[?#])/, "/ngo/programmes?tab=surveys"],
  [/^\/surveys\/([^/?#]+)/, (m) => `/ngo/programmes/surveys/${m[1]}`],
  [/^\/surveys(?=$|[?#])/, "/ngo/programmes?tab=surveys"],
  [/^\/(?:ngo|partner)\/feeding(?=$|[?#])/, "/ngo/programmes"],
  [/^\/(?:ngo\/fundraising|partner\/fundraising|partner\/fundraisers)(?:\/new)?(?=$|[?#])/, "/ngo/programmes"],
  [/^\/partner\/drives(?=$|[?#])/, "/ngo/programmes"],
  [/^\/(?:ngo|partner)\/(?:volunteers|codes)(?=$|[?#])/, "/ngo/team"],
  [/^\/partner\/team(?=$|[?#])/, "/ngo/team"],
  [/^\/(?:ngo|partner)\/settings\/connections/, "/ngo/settings?tab=connections"],
  [/^\/ngo\/settings\/policies/, "/ngo/settings?tab=policies"],
  [/^\/ngo\/readiness(?=$|[?#])/, "/ngo/settings?tab=connected"],
  [/^\/partner\/settings(?=$|[?#])/, "/ngo/settings"],
  [/^\/partner\/import(?=$|[?#])/, "/ngo/import"],
  [/^\/(?:ngo|partner)\/automations/, "/kaju/automations"],
  [/^\/(?:ngo|partner)(?=$|[?#])/, "/ngo/today"],
  /* Government and programmes */
  [/^\/city\/review\/([^/?#]+)/, (m) => `/gov/verification/${m[1]}`],
  [/^\/city\/review(?=$|[?#])/, "/gov/verification"],
  [/^\/city\/contracts(?=$|[?#])/, "/gov/reports?tab=contracts"],
  [/^\/city\/connections(?=$|[?#])/, "/settings"],
  [/^\/programme\/([^/?#]+)\/(coverage|data|network|report|work|setup)/, (m) => `/gov/programmes/${m[1]}?tab=${m[2]}`],
  [/^\/programme\/([^/?#]+)/, (m) => `/gov/programmes/${m[1]}`],
  /* Healthcare and laboratory */
  [/^\/workspace\/[^/?#]+\/record\/([^/?#]+)/, (m) => `/health/bites/${m[1]}`],
  [/^\/workspace\/[^/?#]+\/new/, "/health/bites/new"],
  [/^\/workspace\/[^/?#]+\/sample/, "/health/samples/new"],
  [/^\/workspace\/[^/?#]+\/services/, "/health/facilities/ours"],
  [/^\/workspace\/[^/?#]+\/register/, "/health/bites"],
  [/^\/workspace(?:\/[^/?#]+)?(?=$|[?#])/, "/health/today"],
  /* Kaju and the start of the day */
  [/^\/assistant(?=$|[?#])/, "/kaju"],
  [/^\/today(?=$|[?#])/, "/home"],
];

/** The current address for a link that may have been stored before the rebuild. Unknown and outside links are returned as they are. */
export function canonicalHref(href: string): string {
  if (!href || !href.startsWith("/")) return href;
  for (const [re, to] of RULES) {
    const m = href.match(re);
    if (!m) continue;
    const head = typeof to === "string" ? to : to(m);
    const rest = href.slice(m[0].length);
    /* Keep the old query only when the new address has none of its own. */
    if (!rest) return head;
    if (head.includes("?")) return rest.startsWith("#") ? head + rest : head;
    return head + rest;
  }
  return href;
}
