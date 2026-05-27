const widthClasses = {
  sm: 'w-20',
  md: 'w-32',
  lg: 'w-48',
  full: 'w-full'
};

export function SkeletonBlock({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-200/80 ${className}`} />
  );
}

export function SkeletonLine({ width = 'full', className = '' }) {
  return (
    <SkeletonBlock className={`h-3 ${widthClasses[width] || widthClasses.full} ${className}`} />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-900/5 ${className}`}>
      <SkeletonBlock className="h-10 w-10 rounded-full" />
      <SkeletonLine width="lg" className="mt-5" />
      <SkeletonLine width="md" className="mt-3" />
      <SkeletonLine width="full" className="mt-5" />
      <SkeletonLine width="lg" className="mt-3" />
    </div>
  );
}

export function MessageSkeleton({ align = 'left' }) {
  const mine = align === 'right';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl p-4 ${mine ? 'bg-green-100' : 'bg-white'}`}>
        <SkeletonLine width="md" />
        <SkeletonLine width="lg" className="mt-3" />
        <SkeletonLine width="sm" className="mt-4" />
      </div>
    </div>
  );
}

export function ChatSkeleton({ showHeader = true }) {
  return (
    <div className="flex h-full flex-col">
      {showHeader && (
        <div className="border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <SkeletonLine width="lg" className="h-4" />
              <SkeletonLine width="sm" className="mt-3" />
            </div>
            <SkeletonBlock className="h-10 w-10 rounded-full" />
          </div>
        </div>
      )}
      <div className="flex-1 space-y-4 bg-gray-50 px-4 pb-16 pt-16">
        <MessageSkeleton align="left" />
        <MessageSkeleton align="right" />
        <MessageSkeleton align="left" />
        <MessageSkeleton align="right" />
      </div>
      <div className="border-t bg-white p-4">
        <div className="flex gap-3">
          <SkeletonBlock className="h-12 w-12 rounded-full" />
          <SkeletonBlock className="h-12 flex-1" />
          <SkeletonBlock className="h-12 w-20" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-12">
        <SkeletonLine width="lg" className="h-8" />
        <SkeletonLine width="md" className="mt-4 h-5" />
      </div>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-48 rounded-2xl" />
        ))}
      </div>
      <SkeletonCard />
    </div>
  );
}

export function NotificationSkeletonList() {
  return (
    <div className="divide-y">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3 p-4">
          <SkeletonBlock className="h-9 w-9 rounded-full" />
          <div className="flex-1">
            <SkeletonLine width="lg" />
            <SkeletonLine width="full" className="mt-3" />
            <SkeletonLine width="sm" className="mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
