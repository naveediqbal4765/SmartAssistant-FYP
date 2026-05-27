export default function VitalsCard({ label, value, unit = '', helperText = '', tone = 'green' }) {
  const toneClasses = {
    green: 'border-green-100 bg-green-50 text-green-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700'
  };

  return (
    <div className={`motion-card rounded-2xl border p-5 ${toneClasses[tone] || toneClasses.green}`}>
      <p className="text-sm font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-black text-brand-primary">{value}</span>
        {unit && <span className="mb-1 text-lg font-bold text-gray-700">{unit}</span>}
      </div>
      {helperText && <p className="mt-3 text-sm font-medium text-gray-700">{helperText}</p>}
    </div>
  );
}
