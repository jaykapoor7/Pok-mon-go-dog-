/* An organisation's mark: its logo on a bone disc, or its initials when it
   has not given one. The same mark in the list, on its profile and beside
   each of its campaigns. */
export function OrgMark({ name, logoUrl, size = 40 }: { name: string; logoUrl: string | null | undefined; size?: number }) {
  const initials = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className={`om ${logoUrl ? "" : "is-initials"}`} style={{ ["--om" as string]: `${size}px` }} aria-hidden="true">
      {logoUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={logoUrl} alt="" loading="lazy" />
        : <span>{initials || "·"}</span>}
    </span>
  );
}
