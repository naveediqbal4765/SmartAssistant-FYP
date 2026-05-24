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
  callDisabled,
  onStartAudioCall,
  onStartVideoCall
}) {
  return (
    <div className="flex h-[70vh] flex-col rounded-xl bg-white shadow">
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
        />
      </div>
      <ChatInput
        disabled={!conversation}
        sending={sending}
        onSend={onSendMessage}
        onSendVoice={onSendVoice}
      />
    </div>
  );
}
