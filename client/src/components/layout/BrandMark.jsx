export default function BrandMark({ subtitle, compact = false }) {
  return (
    <div className="flex items-center gap-3 text-left">
      <img
        src="/images/logo.png"
        alt="Smart Assistant Logo"
        className={`${compact ? 'h-10 w-10' : 'h-11 w-11'} rounded-xl object-contain`}
      />
      <div>
        <h1 className={`${compact ? 'text-xl' : 'text-xl sm:text-2xl'} font-bold text-white`}>
          Smart Assistant
        </h1>
        {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
      </div>
    </div>
  );
}
