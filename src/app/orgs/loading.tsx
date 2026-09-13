/* Holds the shape of the page while its data arrives, so the layout does
   not jump when it lands. Matches the real page's structure rather than
   showing a spinner, which tells a reader nothing about what is coming. */
export default function OrgsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="skeleton h-4 w-28" />
      <div className="skeleton mt-3 h-9 w-64" />
      <div className="skeleton mt-3 h-4 w-full max-w-md" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-36 w-full" />
        ))}
      </div>
    </div>
  );
}
