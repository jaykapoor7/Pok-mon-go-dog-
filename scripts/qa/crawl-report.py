#!/usr/bin/env python3
"""Turn /tmp/crawl.json (scripts/qa/crawl.mjs) into a markdown route table."""
import json, sys, collections
d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "/tmp/crawl.json"))
LOCAL_ONLY = "Failed to load resource: the server responded with a status of 404"  # /_vercel/insights on a local build
by = collections.defaultdict(dict)
for x in d["results"]:
    errs = [e for e in x.get("errs", []) if not (e.startswith(LOCAL_ONLY) and not x.get("fails"))]
    issues = []
    if x.get("crash"): issues.append("crash")
    if x["status"] >= 400: issues.append(f"HTTP {x['status']}")
    if errs: issues.append(f"{len(errs)} console error(s)")
    if x.get("fails"): issues.append("; ".join(x["fails"][:2]))
    if x.get("overflowX", 0) > 1: issues.append(f"overflow {x['overflowX']}px")
    if x.get("imgs"): issues.append(f"{len(x['imgs'])} broken image(s)")
    if x.get("deadLinks"): issues.append(f"{len(x['deadLinks'])} link(s) without destination")
    if x.get("unnamed"): issues.append(f"{len(x['unnamed'])} unnamed control(s)")
    if x.get("h1") != 1 and not x.get("crash"): issues.append(f"{x.get('h1')} h1")
    by[x["r"]][x["vp"]] = (x["status"], issues)
print(f"Pages loaded: {len(d['results'])} · internal links checked: {d['linksChecked']} · broken links: {len(d['broken'])}\n")
print("| Route | Desktop | Tablet | Phone |\n|---|---|---|---|")
for r in sorted(by):
    cells = []
    for vp in ("desktop", "tablet", "phone"):
        if vp not in by[r]: cells.append("—"); continue
        st, iss = by[r][vp]
        cells.append(f"{st} OK" if not iss else f"{st} " + ", ".join(iss))
    print(f"| `{r}` | " + " | ".join(cells) + " |")
for b in d["broken"]: print(f"\nBroken link: `{b['h']}` from `{b['from']}` → {b['status']}")
