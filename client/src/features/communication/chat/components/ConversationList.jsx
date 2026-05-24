import ConversationItem from './ConversationItem';

export default function ConversationList({
  conversations,
  activeParticipantId,
  loading,
  error,
  onSelectConversation,
  onDeleteConversation
}) {
  if (loading) {
    return <div className="p-4 text-gray-500">Loading conversations...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!conversations.length) {
    return <div className="p-4 text-gray-500">No conversations yet.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
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
