"use client";

/* Shows one screen of a list at a time, so long queues never become a long scroll. */
export function pageOf<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const pg = Math.min(Math.max(0, page), pages - 1);
  return { pg, pages, slice: items.slice(pg * size, pg * size + size) };
}

export function Pager({ pg, pages, total, size, onPage }: { pg: number; pages: number; total: number; size: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="row ngo-pager">
      <button type="button" className="btn is-s" disabled={pg === 0} onClick={() => onPage(pg - 1)}>Previous</button>
      <span className="small" aria-live="polite">{pg * size + 1}–{Math.min(total, (pg + 1) * size)} of {total}</span>
      <button type="button" className="btn is-s" disabled={pg + 1 >= pages} onClick={() => onPage(pg + 1)}>Next</button>
    </div>
  );
}
