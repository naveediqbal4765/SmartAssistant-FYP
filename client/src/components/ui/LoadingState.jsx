import { SkeletonCard } from './Skeleton';

export default function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="min-h-[240px] space-y-6">
      <div>
        <div className="mb-2 h-5 w-40 animate-pulse rounded-lg bg-gray-200" />
        <p className="sr-only">{label}</p>
        <div className="h-3 w-64 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
