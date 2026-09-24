/* The shape of a living record while it loads: the portrait, the identity
   beside it, and the ruled strip of what is known. */
export default function DogLoading() {
  return (
    <div className="mx-auto w-full max-w-[1120px]" aria-busy="true" aria-label="Loading the record">
      <div className="grid gap-7 md:grid-cols-[0.9fr_1.1fr] md:items-end">
        <div className="skeleton aspect-[4/5] max-h-[560px] w-full rounded-[22px]" />
        <div className="space-y-4">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-14 w-4/5" />
          <div className="skeleton h-5 w-full" />
          <div className="skeleton h-5 w-2/3" />
          <div className="flex gap-2 pt-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-9 w-24 rounded-full" />)}
          </div>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}
      </div>
    </div>
  );
}
