import { useNavigate } from 'react-router-dom';
import DashboardPanels from './DashboardPanels';

const moduleToneClasses = {
  brand: 'bg-brand-primary hover:bg-brand-secondary',
  success: 'bg-gradient-to-r from-green-500 to-green-700',
  info: 'bg-gradient-to-r from-blue-500 to-blue-700',
  highlight: 'bg-gradient-to-r from-purple-500 to-purple-700',
  warning: 'bg-gradient-to-r from-orange-500 to-orange-700',
  indigo: 'bg-gradient-to-r from-indigo-500 to-indigo-700',
  cyan: 'bg-gradient-to-r from-cyan-500 to-cyan-700',
  teal: 'bg-gradient-to-r from-teal-500 to-teal-700',
  lime: 'bg-gradient-to-r from-lime-500 to-lime-700',
  danger: 'bg-gradient-to-r from-rose-500 to-rose-700',
  reward: 'bg-gradient-to-r from-yellow-500 to-yellow-700'
};

export default function DashboardHome({ config, context, greeting }) {
  const navigate = useNavigate();

  const handleModuleClick = (module) => {
    if (module.route) {
      navigate(module.route);
      return;
    }

    if (module.comingSoon) {
      window.alert(module.comingSoon);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-12">
        <h2 className="mb-2 text-4xl font-bold text-brand-primary">{greeting}!</h2>
        <p className="text-xl text-gray-700">{config.greetingSubtitle}</p>
      </div>

      <DashboardPanels panels={config.panels} context={context} />

      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {config.modules.map((module) => {
          const Icon = module.icon;
          const toneClass = moduleToneClasses[module.tone] || moduleToneClasses.brand;

          return (
            <button
              key={module.title}
              type="button"
              onClick={() => handleModuleClick(module)}
              className={`${toneClass} motion-card motion-interactive flex h-48 flex-col items-center justify-center rounded-2xl p-6 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-white/70`}
            >
              <div className="mb-5 text-white">
                <Icon size={32} />
              </div>
              <span className="text-center text-xl font-bold text-white">{module.title}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/90 p-8 shadow-lg backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-4xl">{config.summary.icon}</span>
          <h3 className="text-2xl font-bold text-gray-900">{config.summary.title}</h3>
        </div>
        <p className="text-lg leading-relaxed text-gray-700">{config.summary.description}</p>
      </div>
    </div>
  );
}
