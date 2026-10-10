export default function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto max-w-4xl space-y-4 py-4">
      <span className="sr-only">Loading</span>
      <div className="skeleton h-8 w-1/3" />
      <div className="skeleton h-4 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="card space-y-3 p-5">
            <div className="skeleton h-5 w-1/2" />
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
