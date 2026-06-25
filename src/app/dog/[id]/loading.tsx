export default function DogLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-24 sm:px-6">
      <div className="skeleton h-64 w-full rounded-[2rem] sm:h-80" />
      <div className="mt-5 space-y-3">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-32" />
        <div className="flex gap-2">
          <div className="skeleton h-7 w-20 rounded-full" />
          <div className="skeleton h-7 w-24 rounded-full" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-20 w-full" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}
