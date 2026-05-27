const variants = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-green-200 bg-green-50 text-green-700',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  info: 'border-blue-200 bg-blue-50 text-blue-700'
};

export default function StatusAlert({ children, variant = 'info', className = '' }) {
  if (!children) return null;

  return (
    <div className={`mb-4 rounded-xl border p-4 ${variants[variant] || variants.info} ${className}`}>
      {children}
    </div>
  );
}
