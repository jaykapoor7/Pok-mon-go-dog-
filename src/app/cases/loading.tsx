export default function CasesLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-5 flex items-end justify-between">
        <div className="space-y-2">
          <div className="skeleton h-8 w-32" />
          <div className="skeleton h-3.5 w-44" />
        </div>
        <div className="skeleton h-10 w-24 rounded-full" />
      </header>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card flex items-start gap-3 p-4">
            <div className="skeleton h-9 w-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
              <div className="flex gap-1.5">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-14 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
