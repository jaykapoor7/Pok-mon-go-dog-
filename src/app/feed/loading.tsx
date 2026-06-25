export default function FeedLoading() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <div className="skeleton h-8 w-36" />
        <div className="skeleton h-9 w-20 rounded-full" />
      </header>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <div className="skeleton h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-28" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
            <div className="skeleton aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
