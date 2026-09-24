/* The workspace's shape while a view arrives. It also gives each partner
   view its own suspense boundary inside the shared shell, so a view that is
   still loading never holds the whole navigation back. */
export default function PartnerLoading() {
  return (
    <div className="w-full py-6" aria-busy="true">
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
