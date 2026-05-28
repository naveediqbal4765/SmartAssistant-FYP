import ConversationItem from './ConversationItem';
import { SkeletonBlock, SkeletonLine } from '../../../../components/ui/Skeleton';

export default function ConversationList({
  conversations,
  activeParticipantId,
  loading,
  error,
  onSelectConversation,
  onDeleteConversation
}) {
  if (loading) {
    return (
      <div className="motion-card overflow-hidden rounded-xl bg-white">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="border-b p-4 last:border-b-0">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <SkeletonLine width="md" />
                <SkeletonLine width="lg" className="mt-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!conversations.length) {
    return <div className="p-4 text-gray-500">No conversations yet.</div>;
  }

  return (
    <div className="motion-card rounded-xl bg-white p-2">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          active={String(conversation.participant?._id || '') === String(activeParticipantId || '')}
          onSelect={onSelectConversation}
          onDelete={onDeleteConversation}
        />
      ))}
    </div>
  );
}
