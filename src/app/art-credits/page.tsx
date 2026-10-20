import { AppShell } from "@/components/app/AppShell";
import { DeskHeader } from "@/components/app/DeskHeader";
import { WORKS, DOG_ART, FOLK_CUTOUTS, FOLK_PANELS } from "@/lib/art/sources";
import registerPhotos from "@/data/register-photo-credits.json";

export const metadata = {
  title: "Art on StrayPaw",
  description: "The Indian paintings StrayPaw shows, where each one comes from, and its open licence.",
};

/* One image per work: the file StrayPaw actually shows. */
function imageFor(key: string): string | null {
  const cut = Object.values(FOLK_CUTOUTS).find((c) => c.work === key);
  if (cut) return cut.src;
  const panel = FOLK_PANELS.find((p) => p.work === key);
  if (panel) return panel.src;
  return DOG_ART.find((d) => d.work === key)?.src ?? null;
}

export default function ArtCreditsPage() {
  const works = Object.values(WORKS);
  return (
    <AppShell>
      <div className="ac-page">
        <DeskHeader
          kicker="About the art"
          title="Paintings, not placeholders"
          lede="The animals around StrayPaw are real Indian paintings shared under open licences: Rajasthani, Company-school and Mithila works from the Cleveland Museum of Art’s Open Access collection (public domain), and contemporary Gond paintings from Wikimedia Commons. A painting on an animal’s record stands in for a missing photograph; it is never a likeness of that animal."
        />
        <section className="ac-grid" aria-label="Artworks">
          {works.map((w) => {
            const src = imageFor(w.key);
            return (
              <article key={w.key} className="ac-card">
                <div className="ac-img">{src && <img src={src} alt={w.title} loading="lazy" />}</div>
                <h2>{w.title}</h2>
                <p>{[w.maker, w.date].filter(Boolean).join(", ")}</p>
                <p className="ac-lic">
                  <a href={w.sourceUrl} target="_blank" rel="noreferrer">{w.source}</a>
                  {" · "}
                  {w.licenceUrl ? <a href={w.licenceUrl} target="_blank" rel="noreferrer">{w.licence}</a> : w.licence}
                  {w.adapted && (w.licence === "CC0" ? " · cropped by StrayPaw" : " · cut out by StrayPaw, shared under the same licence")}
                </p>
              </article>
            );
          })}
        </section>
        <section id="register-photos" aria-labelledby="register-photos-title">
          <h2 id="register-photos-title">Register photographs</h2>
          <p>The homepage uses locally hosted copies of these photographs from its archived public profiles. Each photograph stays with its original animal record. Images are resized and converted to WebP, with a responsive crop.</p>
          <ul>
            {registerPhotos.map((photo) => (
              <li key={photo.animal_id}>
                <a href={photo.source_url} target="_blank" rel="noreferrer">{photo.straypaw_id} · {photo.photographer}</a>
                {" · "}<a href={photo.licence_url} target="_blank" rel="noreferrer">{photo.licence_url.includes("/by-sa/") ? "CC BY-SA" : photo.licence_url.includes("/by/") ? "CC BY" : "Public domain"}</a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
