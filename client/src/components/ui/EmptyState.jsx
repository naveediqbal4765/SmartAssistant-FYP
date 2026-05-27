export default function EmptyState({ title, description, children }) {
  return (
    <div className="motion-card rounded-2xl border border-gray-200 bg-white p-10 text-center">
      <p className="text-lg font-semibold text-gray-700">{title}</p>
      {description && <p className="mt-2 text-gray-500">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
