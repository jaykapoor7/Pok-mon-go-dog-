export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-6 space-y-2">
        <div className="skeleton h-3.5 w-28" />
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-3.5 w-72" />
      </header>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-3 p-4">
            <div className="skeleton h-8 w-8 rounded-xl" />
            <div className="skeleton h-7 w-16" />
            <div className="skeleton h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
