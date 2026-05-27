import { ArrowLeft } from 'lucide-react';
import Button from './Button';

export default function FeatureHeader({
  title,
  description,
  backLabel = 'Back',
  onBack,
  actions
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 mb-2">
            <ArrowLeft size={18} /> {backLabel}
          </Button>
        )}
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-gray-700">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3 sm:justify-end">{actions}</div>}
    </div>
  );
}
