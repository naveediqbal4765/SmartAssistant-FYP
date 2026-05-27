const variants = {
  default: 'border-gray-200 bg-white',
  danger: 'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  success: 'border-green-200 bg-green-50',
  info: 'border-blue-200 bg-blue-50'
};

export default function FeatureCard({ children, variant = 'default', className = '' }) {
  return (
    <section className={`motion-card rounded-2xl border p-6 shadow-sm ${variants[variant] || variants.default} ${className}`}>
      {children}
    </section>
  );
}
