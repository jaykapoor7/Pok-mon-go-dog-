import "server-only";
import { COURSES } from "@/sp/learn/content";
import type { ToolOut } from "./tools";

/** Lexical retrieval over published, versioned Academy content. No external
 * search or claim of current legal/medical advice; exercises are excluded. */
export function searchKnowledge(query: string): ToolOut {
  const terms = [...new Set(query.toLowerCase().match(/[a-z]{3,}/g) ?? [])].filter(t => !['what', 'does', 'how', 'the', 'are', 'can', 'you', 'explain', 'about'].includes(t));
  if (!terms.length) return { data: { passages: [] }, summary: "Use a specific knowledge topic", citations: [], ok: false };
  const matches = COURSES.flatMap(course => course.lessons.map(lesson => {
    const text = [lesson.takeaway, ...lesson.blocks.filter(b => b.kind === 'text').map(b => b.body)].join('\n');
    const title = `${course.title}: ${lesson.title}`;
    const searchable = `${title} ${text}`.toLowerCase();
    return { id: `knowledge:${course.id}/${lesson.id}`, title, text, href: `/learn/courses/${course.id}/${lesson.id}`, score: terms.reduce((n, t) => n + (searchable.includes(t) ? 1 : 0), 0) };
  })).filter(m => m.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  return {
    data: { passages: matches.map(({ id, title, text, href }) => ({ id, title, text, href })), source: "Published StrayPaw Academy lessons. Educational guidance, not current legislation or clinical advice." },
    summary: `${matches.length} published knowledge passages`,
    citations: matches.map(m => ({ id: m.id, label: m.title, href: m.href, kind: 'page' })),
  };
}
