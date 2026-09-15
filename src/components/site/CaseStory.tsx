import { MapPin, ShieldCheck } from "lucide-react";
import type { FeaturedStory } from "@/lib/stories";

export function CaseStory({ story }: { story: FeaturedStory | null }) {
  if (!story) return null;
  return <section className="landing-case-story" aria-labelledby="landing-case-story-title"><div className="landing-case-copy"><p className="field-eyebrow">From a real field record</p><h2 id="landing-case-story-title">{story.title}</h2><p>{story.public_summary}</p>{story.location_label && <span className="landing-case-location"><MapPin size={15} /> {story.location_label}</span>}<span className="landing-case-proof"><ShieldCheck size={15} /> Published intentionally by the field team</span></div><div className="landing-case-record">{story.cover_url && <img src={story.cover_url} alt="" />}<div className="landing-case-stages">{story.stages.map((stage, index) => <div key={`${stage.label}-${index}`}><i>{index + 1}</i><div><b>{stage.label}</b>{stage.date && <span>{stage.date}</span>}</div></div>)}</div></div></section>;
}
