import { useNavigate } from 'react-router-dom';
import DashboardPanels from './DashboardPanels';
import { useDialog } from '../../components/ui/GlobalDialogProvider';

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

const caregiverOwnedModuleTitles = {
  '/health/medications': 'Medications',
  '/health/appointments': 'Appointments',
  '/health/telemetry': 'Health Telemetry',
  '/task-requests': 'Task Requests'
};

export default function DashboardHome({ config, context, greeting }) {
  const navigate = useNavigate();
  const dialog = useDialog();
  const isCaregiverDashboard = config.roleLabel === 'Caregiver';
  const seniorName = context?.linkedSenior?.name?.trim();
  const seniorOwnerLabel = seniorName || 'Senior';
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (err) {
      return {};
    }
  })();

  const handleModuleClick = async (module) => {
    if (module.relationshipTarget === 'linkedSenior') {
      const seniorId = context?.linkedSenior?._id || context?.linkedSenior?.id;
      if (seniorId) {
        navigate(`/profile/${seniorId}`);
      }
      return;
    }

    if (module.vaultTarget) {
      const targetUserId = module.vaultTarget === 'linkedSenior'
        ? context?.linkedSenior?._id || context?.linkedSenior?.id
        : currentUser._id || currentUser.id;

      if (targetUserId) {
        navigate(`/health/vault/${targetUserId}`);
      }
      return;
    }

    if (module.route) {
      navigate(module.route);
      return;
    }

    if (module.comingSoon) {
      await dialog.showAlert({
        title: 'Coming soon',
        message: module.comingSoon
      });
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
          const ownedModuleName = isCaregiverDashboard
            ? module.vaultTarget === 'linkedSenior'
              ? 'Health Vault'
              : caregiverOwnedModuleTitles[module.route]
            : null;
          const moduleTitle = ownedModuleName
            ? `${seniorOwnerLabel}'s ${ownedModuleName}`
            : module.title;

          return (
            <button
              key={module.route || module.vaultTarget || module.title}
              type="button"
              onClick={() => handleModuleClick(module)}
              className={`${toneClass} motion-card motion-interactive flex h-48 flex-col items-center justify-center rounded-2xl p-6 focus:outline-none focus:ring-4 focus:ring-white/70`}
            >
              <div className="mb-5 text-white">
                <Icon size={32} />
              </div>
              <span className="text-center text-xl font-bold text-white">{moduleTitle}</span>
            </button>
          );
        })}
      </div>

      <div className="motion-card rounded-2xl border border-gray-200 bg-white/90 p-8 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-4xl">{config.summary.icon}</span>
          <h3 className="text-2xl font-bold text-brand-primary">{config.summary.title}</h3>
        </div>
        <p className="text-lg leading-relaxed text-gray-700">{config.summary.description}</p>
      </div>
    </div>
  );
}
