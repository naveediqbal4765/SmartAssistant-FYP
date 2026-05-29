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
  onSendMedia,
  onTypingStart,
  onTypingStop,
  onDeleteMessage,
  onReactToMessage,
  onReplyToMessage,
  onForwardMessage,
  typingLabel,
  replyTo,
  onCancelReply,
  targetMessageId,
  callDisabled,
  onStartAudioCall,
  onStartVideoCall,
  callScreen
}) {
  return (
    <div className="motion-panel-in motion-card flex h-[70vh] flex-col overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-gray-200/70 ring-1 ring-gray-200/70">
      {callScreen || (
        <>
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
              onForwardMessage={onForwardMessage}
              typingLabel={typingLabel}
              targetMessageId={targetMessageId}
            />
          </div>
          <ChatInput
            disabled={!conversation}
            sending={sending}
            onSend={onSendMessage}
            onSendVoice={onSendVoice}
            onSendMedia={onSendMedia}
            onTypingStart={onTypingStart}
            onTypingStop={onTypingStop}
            replyTo={replyTo}
            onCancelReply={onCancelReply}
          />
        </>
      )}
    </div>
  );
}
