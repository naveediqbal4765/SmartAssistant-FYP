import { Shield } from 'lucide-react';

export default function RoleStabilityPanel({ title, description, children }) {
  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Shield size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-gray-700">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
