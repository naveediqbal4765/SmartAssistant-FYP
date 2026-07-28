import { Calendar, Megaphone, MessageSquareText, Users, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeaturePage from '../../components/ui/FeaturePage';

const tiles = [
  {
    title: 'Hobby Groups & Forums',
    description: 'Discover interest-based groups, join discussions, and share posts with people who enjoy what you enjoy.',
    icon: Users,
    color: 'text-brand-primary',
    route: '/community/forums'
  },
  {
    title: 'Event Discovery',
    description: 'Find local and virtual community events, and RSVP to the ones you want to attend.',
    icon: Calendar,
    color: 'text-cyan-700',
    route: '/community/events'
  },
  {
    title: 'Virtual Group Activities',
    description: 'Join recurring online activities like chair yoga, bingo, book club, and coffee chats.',
    icon: Video,
    color: 'text-purple-700',
    route: '/community/activities'
  },
  {
    title: 'Community Announcements',
    description: 'Stay up to date with important community-wide updates and news.',
    icon: Megaphone,
    color: 'text-orange-700',
    route: '/community/announcements'
  },
  {
    title: 'Auto-Reply Assistant',
    description: 'Get quick reply suggestions in chat, and set an away message for when you cannot respond right away.',
    icon: MessageSquareText,
    color: 'text-green-700',
    route: '/community/autoreply'
  }
];

export default function CommunityHub() {
  const navigate = useNavigate();

  return (
    <FeaturePage
      title="Community & Social Engagement"
      description="Stay connected with hobby groups, events, activities, and community news."
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ title, description, icon: Icon, color, route }) => (
          <button
            key={route}
            type="button"
            onClick={() => navigate(route)}
            className="motion-card motion-interactive rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:bg-gray-50"
          >
            <Icon size={30} className={color} />
            <h3 className="mt-4 text-xl font-bold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          </button>
        ))}
      </div>
    </FeaturePage>
  );
}
