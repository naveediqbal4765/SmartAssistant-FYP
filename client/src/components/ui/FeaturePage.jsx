import { useState } from 'react';
import FeatureHeader from './FeatureHeader';

export default function FeaturePage({
  title,
  description,
  backLabel,
  onBack,
  actions,
  children,
  maxWidth = 'max-w-7xl'
}) {
  const [leaving, setLeaving] = useState(false);
  const handleBack = onBack
    ? () => {
      if (leaving) return;
      setLeaving(true);
      window.setTimeout(() => {
        onBack();
      }, 160);
    }
    : undefined;

  return (
    <div className={`min-h-full bg-gray-50 pb-20 ${leaving ? 'motion-page-exit-backward' : ''}`}>
      <div className={`mx-auto px-6 py-8 ${maxWidth}`}>
        <FeatureHeader
          title={title}
          description={description}
          backLabel={backLabel}
          onBack={handleBack}
          actions={actions}
        />
        {children}
      </div>
    </div>
  );
}
