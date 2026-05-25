import { Link } from 'react-router-dom';

export default function HealthPlaceholder({ title, children }) {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow">
        <Link to="/dashboard" className="text-sm font-semibold text-green-700">
          Back to Dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-3 text-lg text-gray-600">Feature under development</p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
