import { CoShell, CoSec } from "@/components/co3/CoShell";
import registerPhotos from "@/data/register-photo-credits.json";

export const metadata = { title: "Image licences, StrayPaw", description: "Licences for the photographs StrayPaw shows from openly licensed sources." };

/* The one place photographs shared under attribution licences are credited,
   as those licences require. Paintings on StrayPaw are public domain (CC0). */
export default function LicencesPage() {
  return (
    <CoShell kicker="Licences" title="Image licences." close={false}>
      <CoSec title="Photographs.">
        <p>Some animal photographs on StrayPaw come from openly licensed sources. Each is credited here as its licence requires, and stays with its animal’s record.</p>
        <ul className="lc-list">
          {registerPhotos.map((photo) => (
            <li key={photo.animal_id}>
              <a href={photo.source_url} target="_blank" rel="noreferrer">{photo.straypaw_id} · {photo.photographer}</a>
              {" · "}<a href={photo.licence_url} target="_blank" rel="noreferrer">{photo.licence_url.includes("/by-sa/") ? "CC BY-SA" : photo.licence_url.includes("/by/") ? "CC BY" : "Public domain"}</a>
            </li>
          ))}
        </ul>
      </CoSec>
      <CoSec title="Paintings.">
        <p>The Indian paintings used across StrayPaw are public-domain (CC0) works from the open-access collections of The Metropolitan Museum of Art and the Cleveland Museum of Art.</p>
      </CoSec>
    </CoShell>
  );
}
