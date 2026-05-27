import ChatInput from './ChatInput';
import ChatWindow from './ChatWindow';

export default function ChatBox({
  conversation,
  messages,
  currentUserId,
  loadingMessages,
  sending,
  onSendMessage,
  onSendVoice,
  onDeleteMessage,
  onReactToMessage,
  onReplyToMessage,
  replyTo,
  onCancelReply,
  targetMessageId,
  callDisabled,
  onStartAudioCall,
  onStartVideoCall
}) {
  return (
    <div className="motion-panel-in flex h-[70vh] flex-col rounded-xl bg-white shadow-lg shadow-gray-900/10">
      <div className="min-h-0 flex-1">
        <ChatWindow
          conversation={conversation}
          messages={messages}
          currentUserId={currentUserId}
          loading={loadingMessages}
          callDisabled={callDisabled}
          onStartAudioCall={onStartAudioCall}
          onStartVideoCall={onStartVideoCall}
          onDeleteMessage={onDeleteMessage}
          onReactToMessage={onReactToMessage}
          onReplyToMessage={onReplyToMessage}
          targetMessageId={targetMessageId}
        />
      </div>
      <ChatInput
        disabled={!conversation}
        sending={sending}
        onSend={onSendMessage}
        onSendVoice={onSendVoice}
        replyTo={replyTo}
        onCancelReply={onCancelReply}
      />
    </div>
  );
}
