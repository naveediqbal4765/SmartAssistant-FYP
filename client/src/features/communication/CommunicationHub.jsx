import { MessageCircle, Phone, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeaturePage from '../../components/ui/FeaturePage';

export default function CommunicationHub() {
  const navigate = useNavigate();

  return (
    <FeaturePage
      title="Communication Hub"
      description="Access conversations, groups, and call features from one dedicated communication module."
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="motion-card motion-interactive rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:bg-gray-50"
        >
          <MessageCircle size={30} className="text-brand-primary" />
          <h3 className="mt-4 text-xl font-bold text-gray-900">Chats</h3>
          <p className="mt-2 text-sm text-gray-600">Open private conversations and one-to-one calls.</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="motion-card motion-interactive rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:bg-gray-50"
        >
          <Users size={30} className="text-cyan-700" />
          <h3 className="mt-4 text-xl font-bold text-gray-900">Groups</h3>
          <p className="mt-2 text-sm text-gray-600">Open group chats and group audio/video calls.</p>
        </button>

        <div className="motion-card rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm">
          <Phone size={30} className="text-green-700" />
          <h3 className="mt-4 text-xl font-bold text-gray-900">Calls</h3>
          <p className="mt-2 text-sm text-gray-600">Start calls from private chats or active group conversations.</p>
        </div>
      </div>
    </FeaturePage>
  );
}
