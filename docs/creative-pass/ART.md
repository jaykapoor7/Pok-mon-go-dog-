# Visual provenance

No AI-generated images, code-drawn cartoon artwork or stock photographs are included. The main visuals are real product UI and geographic data; human-made Indian art is a restrained background detail and a small company illustration.

- Hero and ecosystem botanical accents: a crop of *Palampore (tree of life)*, Coromandel Coast, first quarter of the 18th century, [The Metropolitan Museum of Art 75909](https://www.metmuseum.org/art/collection/search/75909), CC0. Existing `public/art/works/palampore-border.webp`, registered in `src/lib/art/sources.ts` and credited on `/art-credits`.
- Company illustration: *Dog with pups*, Rajasthan, Ajmer, probably Sawar school, c. 1780, [Cleveland Museum of Art 1969.77](https://clevelandart.org/art/1969.77), CC0. Existing `public/art/works/rajasthan-dog-with-pups.webp`; visible credit links to `/art-credits`. It is not presented as a StrayPaw commission or an actual animal record.
- Hero cartography: existing `src/sp/atlas/india-path.ts`, the same outline used by the application. City markers derive only from existing public city rollups with valid coordinates and animal records. No invented markers are rendered when data is unavailable.
- Request and ecosystem geography: existing bounded landing story, H3 r8 area centers (approximately 0.7 km²), projected on the server and capped at 300 public areas. The geographic preview is labelled as an area sample; the illustrative request is explicitly not on that map. No individual animal position is exposed.

All experimental image assets have been removed from the change. No new image asset or licence is introduced.
